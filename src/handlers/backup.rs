use axum::extract::{Path, State};
use axum::routing::{delete, get, post};
use axum::{Json, Router};
use uuid::Uuid;

use crate::errors::AppError;
use crate::middleware::auth::AuthUser;
use crate::models::{
    BackupMetadata, CreateBackupRequest, CreateBackupResponse, RestoreBackupResponse,
};
use crate::services::BackupService;
use crate::AppState;

#[utoipa::path(
    get,
    tag = "backups",
    path = "/api/backups",
    responses((status = 200, description = "Lista de backups", body = Vec<BackupMetadata>)),
    security(("session_cookie" = []))
)]
pub async fn list_backups(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<Json<Vec<BackupMetadata>>, AppError> {
    Ok(Json(BackupService::list(&state.pool, auth.user_id).await?))
}

#[utoipa::path(
    post,
    tag = "backups",
    path = "/api/backups",
    request_body = CreateBackupRequest,
    responses((status = 201, description = "Backup creado", body = CreateBackupResponse)),
    security(("session_cookie" = []))
)]
pub async fn create_backup(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(req): Json<CreateBackupRequest>,
) -> Result<Json<CreateBackupResponse>, AppError> {
    Ok(Json(BackupService::create(&state.pool, auth.user_id, req).await?))
}

#[utoipa::path(
    post,
    tag = "backups",
    path = "/api/backups/:id/restore",
    responses((status = 200, description = "Backup restaurado", body = RestoreBackupResponse)),
    security(("session_cookie" = []))
)]
pub async fn restore_backup(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<RestoreBackupResponse>, AppError> {
    Ok(Json(
        BackupService::restore(&state.pool, auth.user_id, id).await?,
    ))
}

#[utoipa::path(
    delete,
    tag = "backups",
    path = "/api/backups/:id",
    responses((status = 204, description = "Backup eliminado")),
    security(("session_cookie" = []))
)]
pub async fn delete_backup(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<axum::http::StatusCode, AppError> {
    BackupService::delete(&state.pool, auth.user_id, id).await?;
    Ok(axum::http::StatusCode::NO_CONTENT)
}

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/backups", get(list_backups).post(create_backup))
        .route("/backups/:id/restore", post(restore_backup))
        .route("/backups/:id", delete(delete_backup))
}
