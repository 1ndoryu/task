use axum::extract::State;
use axum::http::StatusCode;
use axum::{Json, Router};

use crate::errors::AppError;
use crate::middleware::AuthUser;
use crate::models::dashboard::UpdateDashboardSettingsRequest;
use crate::models::DashboardReadResponse;
use crate::services::DashboardService;
use crate::AppState;

/// Lee el agregado propio del dashboard sin ejecutar sincronización ni escrituras bulk.
#[utoipa::path(
    get,
    tag = "dashboard",
    path = "/api/dashboard",
    responses(
        (status = 200, description = "Agregado de dashboard", body = DashboardReadResponse),
        (status = 401, description = "No autorizado", body = ErrorResponse),
        (status = 500, description = "Error interno", body = ErrorResponse)
    ),
    security(("session_cookie" = []))
)]
pub async fn get_dashboard(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<Json<DashboardReadResponse>, AppError> {
    Ok(Json(
        DashboardService::read(&state.pool, auth.user_id).await?,
    ))
}

/// Guarda el scratchpad de notas y la configuración de usuario del dashboard.
#[utoipa::path(
    put,
    tag = "dashboard",
    path = "/api/dashboard/settings",
    request_body = UpdateDashboardSettingsRequest,
    responses(
        (status = 204, description = "Guardado"),
        (status = 401, description = "No autorizado", body = ErrorResponse),
        (status = 500, description = "Error interno", body = ErrorResponse)
    ),
    security(("session_cookie" = []))
)]
pub async fn update_settings(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(request): Json<UpdateDashboardSettingsRequest>,
) -> Result<StatusCode, AppError> {
    DashboardService::update_settings(&state.pool, auth.user_id, request).await?;
    Ok(StatusCode::NO_CONTENT)
}

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/dashboard", axum::routing::get(get_dashboard))
        .route("/dashboard/settings", axum::routing::put(update_settings))
}
