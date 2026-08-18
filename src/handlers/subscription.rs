use axum::extract::State;
use axum::routing::{get, post};
use axum::{Json, Router};

use crate::errors::AppError;
use crate::middleware::auth::AuthUser;
use crate::models::{CheckoutResponse, SubscriptionInfo, TrialResponse};
use crate::services::SubscriptionService;
use crate::AppState;

#[utoipa::path(
    get,
    tag = "subscription",
    path = "/api/subscription",
    responses((status = 200, description = "Información de suscripción", body = SubscriptionInfo)),
    security(("session_cookie" = []))
)]
pub async fn get_subscription(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<Json<SubscriptionInfo>, AppError> {
    Ok(Json(SubscriptionService::info(&state.pool, auth.user_id).await?))
}

#[utoipa::path(
    post,
    tag = "subscription",
    path = "/api/subscription/trial",
    responses((status = 200, description = "Trial activado", body = TrialResponse)),
    security(("session_cookie" = []))
)]
pub async fn activate_trial(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<Json<TrialResponse>, AppError> {
    Ok(Json(
        SubscriptionService::activate_trial(&state.pool, auth.user_id).await?,
    ))
}

#[utoipa::path(
    post,
    tag = "subscription",
    path = "/api/subscription/checkout",
    responses((status = 200, description = "URL de checkout", body = CheckoutResponse)),
    security(("session_cookie" = []))
)]
pub async fn checkout(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<Json<CheckoutResponse>, AppError> {
    Ok(Json(SubscriptionService::checkout(&state.pool, auth.user_id).await?))
}

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/subscription", get(get_subscription))
        .route("/subscription/trial", post(activate_trial))
        .route("/subscription/checkout", post(checkout))
}
