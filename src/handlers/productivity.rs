use axum::extract::{Path, State};
use axum::{Json, Router};

use crate::errors::AppError;
use crate::middleware::AuthUser;
use crate::models::productivity::{
    ProductivityWriteResponse, UpsertProjectRequest, UpsertTaskRequest,
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
    Ok(Json(
        ProductivityService::upsert_task(&state.pool, auth.user_id, legacy_id, request).await?,
    ))
}

fn validate_legacy_id(legacy_id: i64) -> Result<(), AppError> {
    if legacy_id <= 0 {
        return Err(AppError::Validation("legacy_id debe ser positivo".into()));
    }
    Ok(())
}

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/projects/:legacy_id", axum::routing::put(upsert_project))
        .route("/tasks/:legacy_id", axum::routing::put(upsert_task))
}
