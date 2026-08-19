use axum::extract::{Path, Query, State};
use axum::routing::{get, post};
use axum::{Json, Router};
use serde::Deserialize;
use uuid::Uuid;

use crate::errors::AppError;
use crate::middleware::admin::require_admin;
use crate::middleware::auth::AuthUser;
use crate::models::{
    CreateFeedbackRequest, CreateFeedbackResponse, FeedbackItem, FeedbackState,
    FeedbackStats, PaginatedFeedback,
};
use crate::services::FeedbackService;
use crate::AppState;

#[utoipa::path(
    post,
    tag = "feedback",
    path = "/api/feedback",
    request_body = CreateFeedbackRequest,
    responses((status = 201, description = "Feedback enviado", body = CreateFeedbackResponse)),
    security(("session_cookie" = []))
)]
pub async fn create_feedback(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(req): Json<CreateFeedbackRequest>,
) -> Result<Json<CreateFeedbackResponse>, AppError> {
    Ok(Json(
        FeedbackService::create(&state.pool, auth.user_id, req).await?,
    ))
}

#[utoipa::path(
    get,
    tag = "feedback",
    path = "/api/feedback/state",
    responses((status = 200, description = "Estado del límite", body = FeedbackState)),
    security(("session_cookie" = []))
)]
pub async fn feedback_state(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<Json<FeedbackState>, AppError> {
    Ok(Json(FeedbackService::state(&state.pool, auth.user_id).await?))
}

#[utoipa::path(
    get,
    tag = "feedback",
    path = "/api/feedback/mine",
    responses((status = 200, description = "Mis feedbacks", body = Vec<FeedbackItem>)),
    security(("session_cookie" = []))
)]
pub async fn my_feedback(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<Json<Vec<FeedbackItem>>, AppError> {
    Ok(Json(FeedbackService::list_mine(&state.pool, auth.user_id).await?))
}

#[derive(Debug, Deserialize)]
pub struct AdminFeedbackQuery {
    pub page: Option<i64>,
    pub per_page: Option<i64>,
}

#[utoipa::path(
    get,
    tag = "feedback",
    path = "/api/admin/feedback",
    responses((status = 200, description = "Lista admin de feedback", body = PaginatedFeedback)),
    security(("session_cookie" = []))
)]
pub async fn admin_feedback(
    State(state): State<AppState>,
    auth: AuthUser,
    Query(query): Query<AdminFeedbackQuery>,
) -> Result<Json<PaginatedFeedback>, AppError> {
    require_admin(&state, auth.user_id).await?;
    Ok(Json(
        FeedbackService::admin_list(
            &state.pool,
            query.page.unwrap_or(1),
            query.per_page.unwrap_or(20),
        )
        .await?,
    ))
}

#[utoipa::path(
    get,
    tag = "feedback",
    path = "/api/admin/feedback/stats",
    responses((status = 200, description = "Estadísticas admin", body = FeedbackStats)),
    security(("session_cookie" = []))
)]
pub async fn admin_feedback_stats(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<Json<FeedbackStats>, AppError> {
    require_admin(&state, auth.user_id).await?;
    Ok(Json(FeedbackService::admin_stats(&state.pool).await?))
}

#[utoipa::path(
    post,
    tag = "feedback",
    path = "/api/admin/feedback/:id/read",
    responses((status = 200, description = "Marcado como leído")),
    security(("session_cookie" = []))
)]
pub async fn admin_feedback_read(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<axum::http::StatusCode, AppError> {
    require_admin(&state, auth.user_id).await?;
    FeedbackService::admin_mark_read(&state.pool, id).await?;
    Ok(axum::http::StatusCode::NO_CONTENT)
}

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/feedback", post(create_feedback))
        .route("/feedback/state", get(feedback_state))
        .route("/feedback/mine", get(my_feedback))
        .route("/admin/feedback", get(admin_feedback))
        .route("/admin/feedback/stats", get(admin_feedback_stats))
        .route("/admin/feedback/:id/read", post(admin_feedback_read))
}
