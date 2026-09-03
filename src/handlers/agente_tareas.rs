/* [029A-1 03-09-2026] Submódulo de `handlers/agente.rs` (limite-lineas):
 * endpoints de tareas programadas del agente. Código movido verbatim desde
 * `agente.rs`; ninguna lógica cambia. Se expone `rutas_tareas()` y
 * `agente::routes()` lo fusiona. */

use axum::extract::State;
use axum::routing::post;
use axum::{Json, Router};
use serde::Deserialize;
use uuid::Uuid;

use crate::errors::AppError;
use crate::middleware::auth::AuthUser;
use crate::repositories::{AgenteRepository, TareaInsert};
use crate::AppState;

/// Límite de tareas programadas activas por usuario.
const MAX_TAREAS_PROGRAMADAS: i64 = 20;

#[derive(Debug, Deserialize)]
#[allow(non_snake_case)]
pub struct CrearTareaProgramadaRequest {
    pub nombre: String,
    pub prompt: String,
    #[serde(default = "default_tipo")]
    pub tipo: String,
    pub cron_expr: Option<String>,
    pub ejecutar_en: Option<chrono::DateTime<chrono::Utc>>,
}

fn default_tipo() -> String {
    "una_vez".to_string()
}

#[derive(Debug, serde::Serialize)]
#[allow(non_snake_case)]
pub struct TareaProgramadaResponse {
    pub id: Uuid,
    pub nombre: String,
    pub prompt: String,
    pub tipo: String,
    pub cron_expr: Option<String>,
    pub estado: String,
    pub proxima_ejecucion: Option<chrono::DateTime<chrono::Utc>>,
    pub result_summary: Option<String>,
}

/// Crea una tarea programada (el usuario programa; el agente ejecuta como
/// turno). Valida nombre/prompt y el límite de activas por usuario.
pub async fn crear_tarea_programada(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(req): Json<CrearTareaProgramadaRequest>,
) -> Result<Json<TareaProgramadaResponse>, AppError> {
    let nombre = req.nombre.trim();
    if nombre.is_empty() || nombre.chars().count() > 255 {
        return Err(AppError::BadRequest("Nombre inválido".into()));
    }
    let prompt = req.prompt.trim();
    if prompt.is_empty() || prompt.chars().count() > 4000 {
        return Err(AppError::BadRequest("Prompt inválido".into()));
    }
    if !matches!(req.tipo.as_str(), "una_vez" | "recurrente") {
        return Err(AppError::BadRequest(
            "Tipo inválido (una_vez|recurrente)".into(),
        ));
    }
    if req.tipo == "recurrente" && req.cron_expr.is_none() {
        return Err(AppError::BadRequest(
            "Las tareas recurrentes requieren cron_expr (diario, cada{N}min, cada{N}h, cada{N}d)"
                .into(),
        ));
    }
    let activas = AgenteRepository::contar_tareas_activas(&state.pool, auth.user_id).await?;
    if activas >= MAX_TAREAS_PROGRAMADAS {
        return Err(AppError::Validation(format!(
            "Límite de tareas programadas alcanzado ({MAX_TAREAS_PROGRAMADAS})"
        )));
    }

    let id = Uuid::new_v4();
    let proxima: Option<chrono::DateTime<chrono::Utc>> = if req.tipo == "recurrente" {
        Some(chrono::Utc::now() + chrono::Duration::minutes(1))
    } else {
        req.ejecutar_en
    };
    AgenteRepository::crear_tarea(
        &state.pool,
        &TareaInsert {
            id,
            user_id: auth.user_id,
            nombre,
            prompt,
            tipo: &req.tipo,
            cron_expr: req.cron_expr.as_deref(),
            ejecutar_en: req.ejecutar_en,
            proxima,
        },
    )
    .await?;

    Ok(Json(TareaProgramadaResponse {
        id,
        nombre: nombre.to_string(),
        prompt: prompt.to_string(),
        tipo: req.tipo.clone(),
        cron_expr: req.cron_expr,
        estado: "pendiente".to_string(),
        proxima_ejecucion: proxima,
        result_summary: None,
    }))
}

/// Fila de `AgenteRepository::listar_tareas`: alias para el tipo tupla
/// (clippy `type_complexity`).
type FilaTareaProgramada = (
    Uuid,
    String,
    String,
    String,
    Option<String>,
    String,
    Option<chrono::DateTime<chrono::Utc>>,
    Option<String>,
);

/// Lista las tareas programadas del usuario.
pub async fn listar_tareas_programadas(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<Json<Vec<TareaProgramadaResponse>>, AppError> {
    let filas: Vec<FilaTareaProgramada> =
        AgenteRepository::listar_tareas(&state.pool, auth.user_id).await?;
    Ok(Json(
        filas
            .into_iter()
            .map(
                |(
                    id,
                    nombre,
                    prompt,
                    tipo,
                    cron_expr,
                    estado,
                    proxima_ejecucion,
                    result_summary,
                )| {
                    TareaProgramadaResponse {
                        id,
                        nombre,
                        prompt,
                        tipo,
                        cron_expr,
                        estado,
                        proxima_ejecucion,
                        result_summary,
                    }
                },
            )
            .collect(),
    ))
}

/// Elimina una tarea programada (solo del propietario).
pub async fn eliminar_tarea_programada(
    State(state): State<AppState>,
    auth: AuthUser,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
) -> Result<axum::http::StatusCode, AppError> {
    let borrada = AgenteRepository::eliminar_tarea(&state.pool, id, auth.user_id).await?;
    if borrada == 0 {
        return Err(AppError::NotFound("Tarea programada no encontrada".into()));
    }
    Ok(axum::http::StatusCode::NO_CONTENT)
}

pub fn rutas_tareas() -> Router<AppState> {
    Router::new()
        .route(
            "/agente/tareas-programadas",
            post(crear_tarea_programada).get(listar_tareas_programadas),
        )
        .route(
            "/agente/tareas-programadas/:id",
            axum::routing::delete(eliminar_tarea_programada),
        )
}
