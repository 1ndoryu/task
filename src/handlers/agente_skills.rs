/* [029A-1 03-09-2026] Submódulo de `handlers/agente.rs` (limite-lineas):
 * endpoints de skills del agente. Código movido verbatim desde `agente.rs`
 * (incluidos `default_activa`, `validar_skill` y `fila_a_skill`, usados solo
 * por estos endpoints); ninguna lógica cambia. Se expone `rutas_skills()` y
 * `agente::routes()` lo fusiona. */

use axum::extract::{Path, State};
use axum::{Json, Router};
use serde::Deserialize;
use uuid::Uuid;

use crate::errors::AppError;
use crate::middleware::auth::AuthUser;
use crate::repositories::AgenteRepository;
use crate::AppState;

#[derive(Debug, serde::Serialize)]
#[allow(non_snake_case)]
pub struct SkillResponse {
    pub id: Uuid,
    pub nombre: String,
    pub descripcion: String,
    pub activa: bool,
}

#[derive(Debug, Deserialize)]
#[allow(non_snake_case)]
pub struct CrearSkillRequest {
    pub nombre: String,
    pub descripcion: String,
    #[serde(default = "default_activa")]
    pub activa: bool,
}

#[derive(Debug, Deserialize)]
#[allow(non_snake_case)]
pub struct ActualizarSkillRequest {
    pub nombre: Option<String>,
    pub descripcion: Option<String>,
    pub activa: Option<bool>,
}

fn default_activa() -> bool {
    true
}

fn validar_skill(nombre: &str, descripcion: &str) -> Result<(), AppError> {
    let nombre = nombre.trim();
    if nombre.is_empty() || nombre.chars().count() > 128 {
        return Err(AppError::BadRequest(
            "El nombre de la skill debe tener entre 1 y 128 caracteres".into(),
        ));
    }
    if descripcion.trim().is_empty() || descripcion.chars().count() > 4000 {
        return Err(AppError::BadRequest(
            "La descripción de la skill debe tener entre 1 y 4000 caracteres".into(),
        ));
    }
    Ok(())
}

/// Lista las skills del usuario (activas e inactivas).
pub async fn listar_skills(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<Json<Vec<SkillResponse>>, AppError> {
    let filas: Vec<(Uuid, String, String, bool)> =
        AgenteRepository::listar_skills(&state.pool, auth.user_id).await?;
    Ok(Json(
        filas
            .into_iter()
            .map(|(id, nombre, descripcion, activa)| SkillResponse {
                id,
                nombre,
                descripcion,
                activa,
            })
            .collect(),
    ))
}

/// Crea o actualiza una skill por nombre (idempotente: misma clave => misma
/// fila, sin duplicados). La crea inactiva si `activa=false`.
pub async fn crear_skill(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(req): Json<CrearSkillRequest>,
) -> Result<Json<SkillResponse>, AppError> {
    let nombre = req.nombre.trim();
    let descripcion = req.descripcion.trim();
    validar_skill(nombre, descripcion)?;
    let fila: (Uuid, String, String, bool) =
        AgenteRepository::crear_skill(&state.pool, auth.user_id, nombre, descripcion, req.activa)
            .await?;
    Ok(Json(fila_a_skill(fila)))
}

/// Actualiza nombre/descripción/activa de una skill (solo del propietario).
pub async fn actualizar_skill(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
    Json(req): Json<ActualizarSkillRequest>,
) -> Result<Json<SkillResponse>, AppError> {
    let actual: (String, String, bool) =
        AgenteRepository::cargar_skill(&state.pool, id, auth.user_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Skill no encontrada".into()))?;
    let nombre = req
        .nombre
        .as_deref()
        .unwrap_or(&actual.0)
        .trim()
        .to_string();
    let descripcion = req
        .descripcion
        .as_deref()
        .unwrap_or(&actual.1)
        .trim()
        .to_string();
    let activa = req.activa.unwrap_or(actual.2);
    validar_skill(&nombre, &descripcion)?;
    let fila: (Uuid, String, String, bool) = AgenteRepository::actualizar_skill(
        &state.pool,
        &nombre,
        &descripcion,
        activa,
        id,
        auth.user_id,
    )
    .await?;
    Ok(Json(fila_a_skill(fila)))
}

/// Borra una skill (solo del propietario).
pub async fn eliminar_skill(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<axum::http::StatusCode, AppError> {
    let borrada = AgenteRepository::eliminar_skill(&state.pool, id, auth.user_id).await?;
    if borrada == 0 {
        return Err(AppError::NotFound("Skill no encontrada".into()));
    }
    Ok(axum::http::StatusCode::NO_CONTENT)
}

fn fila_a_skill((id, nombre, descripcion, activa): (Uuid, String, String, bool)) -> SkillResponse {
    SkillResponse {
        id,
        nombre,
        descripcion,
        activa,
    }
}

pub fn rutas_skills() -> Router<AppState> {
    Router::new()
        .route(
            "/agente/skills",
            axum::routing::get(listar_skills).post(crear_skill),
        )
        .route(
            "/agente/skills/:id",
            axum::routing::put(actualizar_skill).delete(eliminar_skill),
        )
}
