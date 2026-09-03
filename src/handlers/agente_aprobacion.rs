/* [03-09-2026] Aprobación explícita por conversación (plan 318A-16, F2,
 * ítems 3-4, lado PROYECTO TASKS).
 *
 * El runtime del núcleo (glory-harness) se reconstruye POR TURNO en PT, así
 * que las decisiones de aprobación no pueden vivir en el registro del runtime
 * como en el CLI (runtime por conversación): aquí viven en un almacén por
 * conversación (`AlmacenPermisos` en AppState) y el stream las siembra en el
 * registro nuevo antes de evaluar la primera llamada:
 *
 * - `siempre` / `rechazar` → regla F1 por CLASE (categoría + patrón `**`):
 *   la respuesta materializa la clase derivada de la petición (`categoria`
 *   delante del primer `:` de `clasificacion`), última regla gana, y se
 *   aplica a cualquier llamada futura de esa clase (no al comando literal).
 * - `aprobar` → token de UNA vez (categoría + patrón exactos de la petición):
 *   se siembra al arrancar el siguiente stream de esa conversación y se
 *   consume en la primera llamada cuya clave coincida (semántica del núcleo
 *   `aprobacion_una_vez`, pensada para consumidores con runtime por turno).
 *
 * v1 en memoria (mismo alcance que el registry por conversación del CLI): las
 * reglas se pierden al reiniciar el backend, igual que el estado de cualquier
 * stream en curso. Persistencia en BD = decisión abierta del plan (§7).
 * Endpoints: POST responder aprobación, GET listar reglas, DELETE borrar por
 * categoría (aditivo al SSE; nunca toca el flujo de turnos). */

use axum::extract::{Path, State};
use axum::response::Json;
use axum::routing::{get, post};
use axum::Router;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use std::time::{Duration, Instant};
use uuid::Uuid;

use crate::errors::AppError;
use crate::middleware::auth::AuthUser;
use crate::AppState;

/* ── Almacén por conversación ─────────────────────────────────────────── */

/// Regla persistida de la conversación (port de `ReglaPermiso` del núcleo,
/// serializable para el endpoint de listado).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct ReglaConversacion {
    pub categoria: String,
    pub patron: String,
    pub accion: String, // "allow" | "deny"
}

/// Token "permitir una vez": categoría + patrón exactos de la clase aprobada.
#[derive(Debug, Clone)]
struct TokenUnaVez {
    categoria: String,
    patron: String,
    creada_en: Instant,
}

const TTL_TOKEN_UNA_VEZ_SECS: u64 = 10 * 60;

/// Almacén por conversación de reglas y tokens de aprobación (v1 en memoria).
#[derive(Default)]
pub struct AlmacenPermisos {
    reglas: RwLock<HashMap<Uuid, Vec<ReglaConversacion>>>,
    una_vez: RwLock<HashMap<Uuid, Vec<TokenUnaVez>>>,
}

impl AlmacenPermisos {
    #[must_use]
    pub fn nuevo() -> Arc<Self> {
        Arc::new(Self::default())
    }

    fn purgar_expirados(mapa: &mut HashMap<Uuid, Vec<TokenUnaVez>>) {
        let tope = Duration::from_secs(TTL_TOKEN_UNA_VEZ_SECS);
        mapa.retain(|_, tokens| {
            tokens.retain(|t| t.creada_en.elapsed() < tope);
            !tokens.is_empty()
        });
    }

    /// Reglas vigentes de la conversación (para listado y siembra).
    pub fn reglas_de(&self, conversacion_id: Uuid) -> Vec<ReglaConversacion> {
        self.reglas
            .read()
            .unwrap_or_else(|p| p.into_inner())
            .get(&conversacion_id)
            .cloned()
            .unwrap_or_default()
    }

    /// Registra una regla de clase (Siempre/Rechazar). Si ya existe la misma
    /// categoría+patrón la REEMPLAZA (la última decisión del usuario manda);
    /// si no, se agrega al final (última coincidencia gana, findLast).
    pub fn guardar_regla(&self, conversacion_id: Uuid, regla: ReglaConversacion) {
        let mut mapa = self.reglas.write().unwrap_or_else(|p| p.into_inner());
        let lista = mapa.entry(conversacion_id).or_default();
        if let Some(existente) = lista
            .iter_mut()
            .find(|r| r.categoria == regla.categoria && r.patron == regla.patron)
        {
            *existente = regla;
        } else {
            lista.push(regla);
        }
    }

    /// Borra las reglas de una categoría (varias si hay patrones distintos).
    pub fn borrar_reglas_categoria(&self, conversacion_id: Uuid, categoria: &str) {
        let mut mapa = self.reglas.write().unwrap_or_else(|p| p.into_inner());
        if let Some(lista) = mapa.get_mut(&conversacion_id) {
            lista.retain(|r| r.categoria != categoria);
            if lista.is_empty() {
                mapa.remove(&conversacion_id);
            }
        }
    }

    /// Token "una vez": consume el registro del turno anterior al arrancar el
    /// siguiente stream (lo siembra el handler) y devuelve los (categoría,
    /// patrón) exactos a inyectar vía `aprobacion_una_vez`.
    pub fn tomar_tokens_una_vez(&self, conversacion_id: Uuid) -> Vec<(String, String)> {
        let mut mapa = self.una_vez.write().unwrap_or_else(|p| p.into_inner());
        Self::purgar_expirados(&mut mapa);
        let tokens = mapa.remove(&conversacion_id).unwrap_or_default();
        tokens
            .into_iter()
            .map(|t| (t.categoria, t.patron))
            .collect()
    }

    /// Registra un token "una vez" (Permitir) para el siguiente stream.
    pub fn guardar_token_una_vez(
        &self,
        conversacion_id: Uuid,
        categoria: impl Into<String>,
        patron: impl Into<String>,
    ) {
        let mut mapa = self.una_vez.write().unwrap_or_else(|p| p.into_inner());
        mapa.entry(conversacion_id)
            .or_default()
            .push(TokenUnaVez {
                categoria: categoria.into(),
                patron: patron.into(),
                creada_en: Instant::now(),
            });
    }
}

/* ── Rutas ─────────────────────────────────────────────────────────────── */

pub fn rutas_aprobacion() -> Router<AppState> {
    Router::new()
        .route(
            "/agente/conversaciones/:id/aprobacion",
            post(responder_aprobacion),
        )
        .route(
            "/agente/conversaciones/:id/reglas",
            get(listar_reglas).delete(borrar_reglas_categoria),
        )
}

#[derive(Debug, Deserialize)]
#[allow(non_snake_case)]
pub struct ResponderAprobacionRequest {
    /// decisión del usuario: aprobar | siempre | rechazar.
    pub decision: String,
    /// Tool propuesta (del evento `PeticionAprobacion`).
    pub tool: String,
    /// Clase derivada F1 ("categoria:patrón" o "tool:*") del evento.
    pub clasificacion: String,
}

#[derive(Debug, Serialize)]
pub struct ReglasResponse {
    pub reglas: Vec<ReglaConversacion>,
}

/// Separa "categoria:patrón" en (categoría, patrón). Las categorías del
/// vocabulario F1 no contienen `:`; el patrón puede contenerlo (rutas con
/// drive Windows), así que solo se corta en el PRIMER `:`. Sin `:` → la
/// categoría es la tool entera con patrón `*`.
fn separar_clasificacion(clasificacion: &str, tool: &str) -> (String, String) {
    match clasificacion.split_once(':') {
        Some((cat, pat)) if !cat.is_empty() => (cat.to_string(), pat.to_string()),
        _ => (tool.to_string(), "*".to_string()),
    }
}

/// POST /api/agente/conversaciones/:id/aprobacion — responde una petición
/// pendiente con las tres vías (Rechazar / Permitir / Permitir siempre).
pub async fn responder_aprobacion(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
    Json(req): Json<ResponderAprobacionRequest>,
) -> Result<Json<ReglasResponse>, AppError> {
    /* Verificar propiedad de la conversación antes de mutar su estado. */
    let existe = crate::repositories::AgenteRepository::buscar_conversacion(&state.pool, id, auth.user_id)
        .await
        .map_err(AppError::from)?;
    if existe.is_none() {
        return Err(AppError::NotFound("Conversación no encontrada".into()));
    }

    let (categoria, patron) = separar_clasificacion(&req.clasificacion, &req.tool);
    match req.decision.as_str() {
        "aprobar" => state.agente_permisos.guardar_token_una_vez(id, categoria, patron),
        "siempre" => state.agente_permisos.guardar_regla(
            id,
            ReglaConversacion {
                categoria: categoria.clone(),
                patron: "**".to_string(),
                accion: "allow".to_string(),
            },
        ),
        "rechazar" => state.agente_permisos.guardar_regla(
            id,
            ReglaConversacion {
                categoria: categoria.clone(),
                patron: "**".to_string(),
                accion: "deny".to_string(),
            },
        ),
        otra => {
            return Err(AppError::BadRequest(format!(
                "Decisión de aprobación inválida: {otra} (esperada aprobar|siempre|rechazar)"
            )));
        }
    }
    Ok(Json(ReglasResponse {
        reglas: state.agente_permisos.reglas_de(id),
    }))
}

/// GET /api/agente/conversaciones/:id/reglas — reglas de permiso vigentes.
pub async fn listar_reglas(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<ReglasResponse>, AppError> {
    let existe = crate::repositories::AgenteRepository::buscar_conversacion(&state.pool, id, auth.user_id)
        .await
        .map_err(AppError::from)?;
    if existe.is_none() {
        return Err(AppError::NotFound("Conversación no encontrada".into()));
    }
    Ok(Json(ReglasResponse {
        reglas: state.agente_permisos.reglas_de(id),
    }))
}

#[derive(Debug, Deserialize)]
pub struct BorrarReglaRequest {
    pub categoria: String,
}

/// DELETE /api/agente/conversaciones/:id/reglas — borra las reglas de una
/// categoría (body `{ categoria }`; la tool entera usa su id como categoría).
pub async fn borrar_reglas_categoria(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
    Json(req): Json<BorrarReglaRequest>,
) -> Result<Json<ReglasResponse>, AppError> {
    let existe = crate::repositories::AgenteRepository::buscar_conversacion(&state.pool, id, auth.user_id)
        .await
        .map_err(AppError::from)?;
    if existe.is_none() {
        return Err(AppError::NotFound("Conversación no encontrada".into()));
    }
    if req.categoria.trim().is_empty() {
        return Err(AppError::BadRequest("Falta la categoría a borrar".into()));
    }
    state
        .agente_permisos
        .borrar_reglas_categoria(id, req.categoria.trim());
    Ok(Json(ReglasResponse {
        reglas: state.agente_permisos.reglas_de(id),
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn almacen_con_regla() -> AlmacenPermisos {
        let almacen = AlmacenPermisos::default();
        let id = Uuid::new_v4();
        almacen.guardar_regla(
            id,
            ReglaConversacion {
                categoria: "tarea_crear".into(),
                patron: "**".into(),
                accion: "allow".into(),
            },
        );
        almacen
    }

    #[test]
    fn separa_categoria_y_patron_en_primer_dos_puntos() {
        let (cat, pat) = separar_clasificacion("escritura_fuera_repo:C:/x/a.txt", "file_write");
        assert_eq!(cat, "escritura_fuera_repo");
        assert_eq!(pat, "C:/x/a.txt");
    }

    #[test]
    fn sin_clasificacion_cae_a_la_tool_entera() {
        let (cat, pat) = separar_clasificacion("", "tarea_crear");
        assert_eq!(cat, "tarea_crear");
        assert_eq!(pat, "*");
    }

    #[test]
    fn guardar_regla_reemplaza_la_misma_clase() {
        let almacen = AlmacenPermisos::default();
        let id = Uuid::new_v4();
        almacen.guardar_regla(
            id,
            ReglaConversacion {
                categoria: "red".into(),
                patron: "**".into(),
                accion: "allow".into(),
            },
        );
        almacen.guardar_regla(
            id,
            ReglaConversacion {
                categoria: "red".into(),
                patron: "**".into(),
                accion: "deny".into(),
            },
        );
        let reglas = almacen.reglas_de(id);
        assert_eq!(reglas.len(), 1);
        assert_eq!(reglas[0].accion, "deny");
    }

    #[test]
    fn token_una_vez_se_toma_una_sola_vez() {
        let almacen = AlmacenPermisos::default();
        let id = Uuid::new_v4();
        almacen.guardar_token_una_vez(id, "tarea_crear", "*");
        let tokens = almacen.tomar_tokens_una_vez(id);
        assert_eq!(tokens, vec![("tarea_crear".to_string(), "*".to_string())]);
        assert!(almacen.tomar_tokens_una_vez(id).is_empty());
    }

    #[test]
    fn borrar_reglas_por_categoria() {
        let almacen = almacen_con_regla();
        let id = Uuid::new_v4();
        almacen.guardar_regla(
            id,
            ReglaConversacion {
                categoria: "red".into(),
                patron: "**".into(),
                accion: "allow".into(),
            },
        );
        almacen.borrar_reglas_categoria(id, "tarea_crear");
        let reglas = almacen.reglas_de(id);
        assert_eq!(reglas.len(), 1);
        assert_eq!(reglas[0].categoria, "red");
    }
}
