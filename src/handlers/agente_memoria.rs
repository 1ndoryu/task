/* [029A-1 03-09-2026] Submódulo de `handlers/agente.rs` (limite-lineas):
 * endpoints de memoria persistente del agente. Código movido verbatim desde
 * `agente.rs` (incluido `tipo_clave_invalido`, usado solo por
 * `guardar_memoria`); ninguna lógica cambia. Se expone `rutas_memoria()` y
 * `agente::routes()` lo fusiona. */

use axum::extract::State;
use axum::{Json, Router};

use crate::errors::AppError;
use crate::middleware::auth::AuthUser;
use crate::repositories::AgenteRepository;
use crate::AppState;

#[derive(Debug, serde::Serialize)]
#[allow(non_snake_case)]
pub struct MemoriaResponse {
    pub clave: String,
    pub contenido: String,
}

#[derive(Debug, serde::Deserialize)]
#[allow(non_snake_case)]
pub struct GuardarMemoriaRequest {
    pub clave: String,
    pub contenido: String,
}

/// Lista la memoria persistente del usuario (preferencias/lecciones).
pub async fn listar_memoria(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<Json<Vec<MemoriaResponse>>, AppError> {
    let filas: Vec<(String, String)> =
        AgenteRepository::listar_memoria(&state.pool, auth.user_id).await?;
    Ok(Json(
        filas
            .into_iter()
            .map(|(clave, contenido)| MemoriaResponse { clave, contenido })
            .collect(),
    ))
}

/// Crea o actualiza una entrada de memoria (upsert por clave, idempotente).
pub async fn guardar_memoria(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(req): Json<GuardarMemoriaRequest>,
) -> Result<Json<MemoriaResponse>, AppError> {
    let clave = req.clave.trim();
    let contenido = req.contenido.trim();
    if clave.is_empty() || tipo_clave_invalido(clave) {
        return Err(AppError::BadRequest(
            "Clave inválida (1-128 chars alfanumérica/._-".into(),
        ));
    }
    if contenido.is_empty() || contenido.chars().count() > 4000 {
        return Err(AppError::BadRequest(
            "El contenido debe tener entre 1 y 4000 caracteres".into(),
        ));
    }
    AgenteRepository::guardar_memoria(&state.pool, auth.user_id, clave, contenido).await?;
    Ok(Json(MemoriaResponse {
        clave: clave.into(),
        contenido: contenido.into(),
    }))
}

/// Borra una entrada de memoria (solo del propietario).
pub async fn eliminar_memoria(
    State(state): State<AppState>,
    auth: AuthUser,
    axum::extract::Path(clave): axum::extract::Path<String>,
) -> Result<axum::http::StatusCode, AppError> {
    let borrada = AgenteRepository::eliminar_memoria(&state.pool, auth.user_id, &clave).await?;
    if borrada == 0 {
        return Err(AppError::NotFound(
            "Entrada de memoria no encontrada".into(),
        ));
    }
    Ok(axum::http::StatusCode::NO_CONTENT)
}

/// Valida una clave de memoria: 1-128 chars, alfanumérico + . _ -
/// Rechaza claves de solo puntos o con `..` (para evitar ambigüedad de ruta
/// en el DELETE /:clave y colisiones de segmentos).
fn tipo_clave_invalido(clave: &str) -> bool {
    clave.len() > 128
        || clave.contains("..")
        || clave.chars().all(|c| c == '.')
        || !clave
            .chars()
            .all(|c| c.is_alphanumeric() || c == '.' || c == '_' || c == '-')
}

pub fn rutas_memoria() -> Router<AppState> {
    Router::new()
        .route(
            "/agente/memoria",
            axum::routing::get(listar_memoria).put(guardar_memoria),
        )
        .route(
            "/agente/memoria/:clave",
            axum::routing::delete(eliminar_memoria),
        )
}
