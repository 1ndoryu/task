use axum::extract::{Path, State};
use axum::{http::StatusCode, Json, Router};
use validator::Validate;

use crate::errors::AppError;
use crate::middleware::AuthUser;
use crate::models::productivity::{
    ProductivityWriteResponse, UpsertHabitRequest, UpsertProjectRequest, UpsertTaskRequest,
};
use crate::services::ProductivityService;
use crate::AppState;

#[utoipa::path(
    put,
    tag = "projects",
    path = "/api/projects/{legacy_id}",
    params(("legacy_id" = i64, Path, description = "ID legacy del proyecto")),
    request_body = UpsertProjectRequest,
    responses(
        (status = 200, description = "Proyecto guardado", body = ProductivityWriteResponse),
        (status = 409, description = "Conflicto de versión", body = ErrorResponse),
        (status = 422, description = "Error de validación", body = ErrorResponse)
    ),
    security(("session_cookie" = []))
)]
pub async fn upsert_project(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(legacy_id): Path<i64>,
    Json(request): Json<UpsertProjectRequest>,
) -> Result<Json<ProductivityWriteResponse>, AppError> {
    validate_legacy_id(legacy_id)?;
    request
        .validate()
        .map_err(|error| AppError::Validation(error.to_string()))?;
    Ok(Json(
        ProductivityService::upsert_project(&state.pool, auth.user_id, legacy_id, request).await?,
    ))
}

#[utoipa::path(
    put,
    tag = "tasks",
    path = "/api/tasks/{legacy_id}",
    params(("legacy_id" = i64, Path, description = "ID legacy de la tarea")),
    request_body = UpsertTaskRequest,
    responses(
        (status = 200, description = "Tarea guardada", body = ProductivityWriteResponse),
        (status = 409, description = "Conflicto de versión", body = ErrorResponse),
        (status = 422, description = "Error de validación", body = ErrorResponse)
    ),
    security(("session_cookie" = []))
)]
pub async fn upsert_task(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(legacy_id): Path<i64>,
    Json(request): Json<UpsertTaskRequest>,
) -> Result<Json<ProductivityWriteResponse>, AppError> {
    validate_legacy_id(legacy_id)?;
    request
        .validate()
        .map_err(|error| AppError::Validation(error.to_string()))?;
    Ok(Json(
        ProductivityService::upsert_task(&state.pool, auth.user_id, legacy_id, request).await?,
    ))
}

#[utoipa::path(
    put,
    tag = "habits",
    path = "/api/habits/{legacy_id}",
    params(("legacy_id" = i64, Path, description = "ID legacy del hábito")),
    request_body = UpsertHabitRequest,
    responses(
        (status = 200, description = "Hábito guardado", body = ProductivityWriteResponse),
        (status = 409, description = "Conflicto de versión", body = ErrorResponse),
        (status = 422, description = "Error de validación", body = ErrorResponse)
    ),
    security(("session_cookie" = []))
)]
pub async fn upsert_habit(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(legacy_id): Path<i64>,
    Json(request): Json<UpsertHabitRequest>,
) -> Result<Json<ProductivityWriteResponse>, AppError> {
    validate_legacy_id(legacy_id)?;
    request
        .validate()
        .map_err(|error| AppError::Validation(error.to_string()))?;
    Ok(Json(
        ProductivityService::upsert_habit(&state.pool, auth.user_id, legacy_id, request).await?,
    ))
}

fn validate_legacy_id(legacy_id: i64) -> Result<(), AppError> {
    if legacy_id <= 0 {
        return Err(AppError::Validation("legacy_id debe ser positivo".into()));
    }
    Ok(())
}

/// Soft-delete de proyecto (solo del propietario; idempotente).
/// [18-08-2026] El front syncroniza borrados por entidad; sin este endpoint las
/// tareas/proyectos/hábitos eliminados localmente volvían a aparecer en el
/// siguiente refresh (el guardado solo hace upsert de lo presente).
#[utoipa::path(
    delete,
    tag = "projects",
    path = "/api/projects/{legacy_id}",
    params(("legacy_id" = i64, Path, description = "ID legacy del proyecto")),
    responses((status = 204, description = "Proyecto eliminado (soft)")),
    security(("session_cookie" = []))
)]
pub async fn delete_project(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(legacy_id): Path<i64>,
) -> Result<StatusCode, AppError> {
    validate_legacy_id(legacy_id)?;
    ProductivityService::delete_project(&state.pool, auth.user_id, legacy_id).await?;
    Ok(StatusCode::NO_CONTENT)
}

#[utoipa::path(
    delete,
    tag = "tasks",
    path = "/api/tasks/{legacy_id}",
    params(("legacy_id" = i64, Path, description = "ID legacy de la tarea")),
    responses((status = 204, description = "Tarea eliminada (soft)")),
    security(("session_cookie" = []))
)]
pub async fn delete_task(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(legacy_id): Path<i64>,
) -> Result<StatusCode, AppError> {
    validate_legacy_id(legacy_id)?;
    ProductivityService::delete_task(&state.pool, auth.user_id, legacy_id).await?;
    Ok(StatusCode::NO_CONTENT)
}

#[utoipa::path(
    delete,
    tag = "habits",
    path = "/api/habits/{legacy_id}",
    params(("legacy_id" = i64, Path, description = "ID legacy del hábito")),
    responses((status = 204, description = "Hábito eliminado (soft)")),
    security(("session_cookie" = []))
)]
pub async fn delete_habit(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(legacy_id): Path<i64>,
) -> Result<StatusCode, AppError> {
    validate_legacy_id(legacy_id)?;
    ProductivityService::delete_habit(&state.pool, auth.user_id, legacy_id).await?;
    Ok(StatusCode::NO_CONTENT)
}

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/projects/:legacy_id", axum::routing::put(upsert_project).delete(delete_project))
        .route("/tasks/:legacy_id", axum::routing::put(upsert_task).delete(delete_task))
        .route("/habits/:legacy_id", axum::routing::put(upsert_habit).delete(delete_habit))
}
