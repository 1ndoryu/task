use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::routing::{get, post, put};
use axum::{Json, Router};
use uuid::Uuid;
use validator::Validate;

use crate::errors::AppError;
use crate::middleware::AuthUser;
use crate::services::ReminderService;
use crate::models::{
    CreateReminderRequest, Reminder, ReminderListQuery, ReminderListResponse,
    UpdateReminderRequest,
};
use crate::AppState;

#[utoipa::path(
    get,
    tag = "reminders",
    path = "/api/reminders",
    params(ReminderListQuery),
    responses((status = 200, body = ReminderListResponse), (status = 401, body = ErrorResponse), (status = 422, body = ErrorResponse)),
    security(("session_cookie" = []))
)]
pub async fn list(
    State(state): State<AppState>,
    auth: AuthUser,
    Query(query): Query<ReminderListQuery>,
) -> Result<Json<ReminderListResponse>, AppError> {
    Ok(Json(
        ReminderService::list(&state.pool, auth.user_id, query.estado).await?,
    ))
}

#[utoipa::path(
    post,
    tag = "reminders",
    path = "/api/reminders",
    request_body = CreateReminderRequest,
    responses((status = 201, body = Reminder), (status = 401, body = ErrorResponse), (status = 422, body = ErrorResponse)),
    security(("session_cookie" = []))
)]
pub async fn create(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(req): Json<CreateReminderRequest>,
) -> Result<(StatusCode, Json<Reminder>), AppError> {
    req.validate()
        .map_err(|error| AppError::Validation(error.to_string()))?;
    let reminder = ReminderService::create(&state.pool, auth.user_id, req).await?;
    Ok((StatusCode::CREATED, Json(reminder)))
}

#[utoipa::path(
    put,
    tag = "reminders",
    path = "/api/reminders/{id}",
    params(("id" = Uuid, Path, description = "ID del recordatorio")),
    request_body = UpdateReminderRequest,
    responses((status = 200, body = Reminder), (status = 404, body = ErrorResponse), (status = 422, body = ErrorResponse)),
    security(("session_cookie" = []))
)]
pub async fn update(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateReminderRequest>,
) -> Result<Json<Reminder>, AppError> {
    req.validate()
        .map_err(|error| AppError::Validation(error.to_string()))?;
    Ok(Json(
        ReminderService::update(&state.pool, id, auth.user_id, req).await?,
    ))
}

#[utoipa::path(
    post,
    tag = "reminders",
    path = "/api/reminders/{id}/complete",
    params(("id" = Uuid, Path, description = "ID del recordatorio")),
    responses((status = 200, body = Reminder), (status = 404, body = ErrorResponse)),
    security(("session_cookie" = []))
)]
pub async fn complete(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<Reminder>, AppError> {
    Ok(Json(
        ReminderService::complete(&state.pool, id, auth.user_id).await?,
    ))
}

#[utoipa::path(
    post,
    tag = "reminders",
    path = "/api/reminders/{id}/cancel",
    params(("id" = Uuid, Path, description = "ID del recordatorio")),
    responses((status = 200, body = Reminder), (status = 404, body = ErrorResponse)),
    security(("session_cookie" = []))
)]
pub async fn cancel(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<Reminder>, AppError> {
    Ok(Json(
        ReminderService::cancel(&state.pool, id, auth.user_id).await?,
    ))
}

#[utoipa::path(
    delete,
    tag = "reminders",
    path = "/api/reminders/{id}",
    params(("id" = Uuid, Path, description = "ID del recordatorio")),
    responses((status = 204, description = "Recordatorio eliminado"), (status = 404, body = ErrorResponse)),
    security(("session_cookie" = []))
)]
pub async fn remove(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, AppError> {
    ReminderService::delete(&state.pool, id, auth.user_id).await?;
    Ok(StatusCode::NO_CONTENT)
}

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/reminders", get(list).post(create))
        .route("/reminders/:id", put(update).delete(remove))
        .route("/reminders/:id/complete", post(complete))
        .route("/reminders/:id/cancel", post(cancel))
}
