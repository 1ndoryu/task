use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::routing::{delete, get, put};
use axum::{Json, Router};
use uuid::Uuid;
use validator::Validate;

use crate::errors::AppError;
use crate::middleware::AuthUser;
use crate::models::{
    MarkAllNotificationsReadResponse, Notification, NotificationListQuery, PaginatedNotifications,
    UnreadNotificationCount,
};
use crate::services::NotificationService;
use crate::AppState;

#[utoipa::path(
    get,
    operation_id = "list_notifications",
    tag = "notifications",
    path = "/api/notifications",
    params(NotificationListQuery),
    responses((status = 200, body = PaginatedNotifications), (status = 422, body = ErrorResponse)),
    security(("session_cookie" = []))
)]
pub async fn list(
    State(state): State<AppState>,
    auth: AuthUser,
    Query(query): Query<NotificationListQuery>,
) -> Result<Json<PaginatedNotifications>, AppError> {
    query
        .validate()
        .map_err(|error| AppError::Validation(error.to_string()))?;
    Ok(Json(
        NotificationService::list(&state.pool, auth.user_id, query).await?,
    ))
}

#[utoipa::path(
    get,
    tag = "notifications",
    path = "/api/notifications/unread-count",
    responses((status = 200, body = UnreadNotificationCount)),
    security(("session_cookie" = []))
)]
pub async fn unread_count(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<Json<UnreadNotificationCount>, AppError> {
    Ok(Json(
        NotificationService::unread_count(&state.pool, auth.user_id).await?,
    ))
}

#[utoipa::path(
    put,
    tag = "notifications",
    path = "/api/notifications/{id}/read",
    params(("id" = Uuid, Path, description = "ID de notificación")),
    responses((status = 200, body = Notification), (status = 404, body = ErrorResponse)),
    security(("session_cookie" = []))
)]
pub async fn mark_read(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<Notification>, AppError> {
    Ok(Json(
        NotificationService::mark_read(&state.pool, auth.user_id, id).await?,
    ))
}

#[utoipa::path(
    put,
    tag = "notifications",
    path = "/api/notifications/read-all",
    responses((status = 200, body = MarkAllNotificationsReadResponse)),
    security(("session_cookie" = []))
)]
pub async fn mark_all_read(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<Json<MarkAllNotificationsReadResponse>, AppError> {
    Ok(Json(
        NotificationService::mark_all_read(&state.pool, auth.user_id).await?,
    ))
}

#[utoipa::path(
    delete,
    tag = "notifications",
    path = "/api/notifications/{id}",
    operation_id = "remove_notification",
    params(("id" = Uuid, Path, description = "ID de notificación")),
    responses((status = 204, description = "Notificación eliminada"), (status = 404, body = ErrorResponse)),
    security(("session_cookie" = []))
)]
pub async fn remove_notification(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, AppError> {
    NotificationService::delete(&state.pool, auth.user_id, id).await?;
    Ok(StatusCode::NO_CONTENT)
}

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/notifications", get(list))
        .route("/notifications/unread-count", get(unread_count))
        .route("/notifications/read-all", put(mark_all_read))
        .route("/notifications/:id/read", put(mark_read))
        .route("/notifications/:id", delete(remove_notification))
}
