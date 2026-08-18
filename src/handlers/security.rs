use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::routing::{delete, get, put};
use axum::{Json, Router};
use uuid::Uuid;

use crate::errors::AppError;
use crate::middleware::auth::AuthUser;
use crate::models::{
    ChangePasswordRequest, ChangePasswordResponse, E2EState, McpTokenGenerated, McpTokenRevoked,
    McpTokenState, SaveE2ERequest, SaveE2EResponse,
};
use crate::services::SecurityService;
use crate::AppState;

#[utoipa::path(
    get,
    tag = "security",
    path = "/api/security/e2e",
    responses((status = 200, description = "Estado E2E", body = E2EState)),
    security(("session_cookie" = []))
)]
pub async fn get_e2e(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<Json<E2EState>, AppError> {
    Ok(Json(SecurityService::e2e_state(&state.pool, auth.user_id).await?))
}

#[utoipa::path(
    put,
    tag = "security",
    path = "/api/security/e2e",
    request_body = SaveE2ERequest,
    responses((status = 200, description = "Estado E2E guardado", body = SaveE2EResponse)),
    security(("session_cookie" = []))
)]
pub async fn save_e2e(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(req): Json<SaveE2ERequest>,
) -> Result<Json<SaveE2EResponse>, AppError> {
    Ok(Json(SecurityService::save_e2e(&state.pool, auth.user_id, req).await?))
}

#[utoipa::path(
    put,
    tag = "security",
    path = "/api/security/password",
    request_body = ChangePasswordRequest,
    responses((status = 200, description = "Contraseña actualizada", body = ChangePasswordResponse)),
    security(("session_cookie" = []))
)]
pub async fn change_password(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(req): Json<ChangePasswordRequest>,
) -> Result<Json<ChangePasswordResponse>, AppError> {
    Ok(Json(
        SecurityService::change_password(&state.pool, auth.user_id, req).await?,
    ))
}

#[utoipa::path(
    get,
    tag = "security",
    path = "/api/security/mcp/token",
    responses((status = 200, description = "Estado del token MCP", body = McpTokenState)),
    security(("session_cookie" = []))
)]
pub async fn mcp_token_state(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<Json<McpTokenState>, AppError> {
    Ok(Json(SecurityService::mcp_state(&state.pool, auth.user_id).await?))
}

#[utoipa::path(
    post,
    tag = "security",
    path = "/api/security/mcp/token",
    responses((status = 201, description = "Token generado", body = McpTokenGenerated)),
    security(("session_cookie" = []))
)]
pub async fn mcp_token_generate(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<(StatusCode, Json<McpTokenGenerated>), AppError> {
    Ok((
        StatusCode::CREATED,
        Json(SecurityService::mcp_generate(&state.pool, auth.user_id).await?),
    ))
}

#[utoipa::path(
    delete,
    tag = "security",
    path = "/api/security/mcp/token/:id",
    responses((status = 200, description = "Token revocado", body = McpTokenRevoked)),
    security(("session_cookie" = []))
)]
pub async fn mcp_token_revoke(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<McpTokenRevoked>, AppError> {
    Ok(Json(
        SecurityService::mcp_revoke(&state.pool, auth.user_id, id).await?,
    ))
}

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/security/e2e", get(get_e2e).put(save_e2e))
        .route("/security/password", put(change_password))
        .route("/security/mcp/token", get(mcp_token_state).post(mcp_token_generate))
        .route("/security/mcp/token/:id", delete(mcp_token_revoke))
}
