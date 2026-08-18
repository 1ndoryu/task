use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::routing::{get, post};
use axum::{Json, Router};
use validator::Validate;

use crate::errors::AppError;
use crate::middleware::AuthUser;
use crate::models::{
    CreateTimelineEventRequest, CreateTimelineMessageRequest, MarkTimelineReadRequest,
    TimelineCountResponse, TimelineItem, TimelineMutationResponse, TimelineQuery, TimelineResponse,
    TimelineUnreadResponse,
};
use crate::services::TimelineService;
use crate::AppState;

#[utoipa::path(
    get,
    operation_id = "list_timeline",
    tag = "timeline",
    path = "/api/timeline/{item_type}/{item_id}",
    params(
        ("item_type" = String, Path, description = "Tipo de elemento"),
        ("item_id" = i64, Path, description = "ID legacy del elemento"),
        TimelineQuery
    ),
    responses((status = 200, body = TimelineResponse), (status = 403, body = ErrorResponse), (status = 404, body = ErrorResponse), (status = 422, body = ErrorResponse)),
    security(("session_cookie" = []))
)]
pub async fn list(
    State(state): State<AppState>,
    auth: AuthUser,
    Path((item_type, item_id)): Path<(String, i64)>,
    Query(query): Query<TimelineQuery>,
) -> Result<Json<TimelineResponse>, AppError> {
    query
        .validate()
        .map_err(|error| AppError::Validation(error.to_string()))?;
    Ok(Json(
        TimelineService::list(&state.pool, auth.user_id, &item_type, item_id, query).await?,
    ))
}

#[utoipa::path(post, operation_id = "send_timeline_message", tag = "timeline", path = "/api/timeline", request_body = CreateTimelineMessageRequest, responses((status = 201, body = TimelineItem), (status = 403, body = ErrorResponse), (status = 404, body = ErrorResponse), (status = 422, body = ErrorResponse)), security(("session_cookie" = [])))]
pub async fn send(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(request): Json<CreateTimelineMessageRequest>,
) -> Result<(StatusCode, Json<TimelineItem>), AppError> {
    request
        .validate()
        .map_err(|error| AppError::Validation(error.to_string()))?;
    Ok((
        StatusCode::CREATED,
        Json(TimelineService::send(&state.pool, auth.user_id, request).await?),
    ))
}

#[utoipa::path(post, operation_id = "create_timeline_event", tag = "timeline", path = "/api/timeline/events", request_body = CreateTimelineEventRequest, responses((status = 200, body = TimelineMutationResponse), (status = 422, body = ErrorResponse)), security(("session_cookie" = [])))]
pub async fn event(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(request): Json<CreateTimelineEventRequest>,
) -> Result<Json<TimelineMutationResponse>, AppError> {
    request
        .validate()
        .map_err(|error| AppError::Validation(error.to_string()))?;
    Ok(Json(
        TimelineService::event(&state.pool, auth.user_id, request).await?,
    ))
}

#[utoipa::path(
    get,
    operation_id = "count_timeline",
    tag = "timeline",
    path = "/api/timeline/count/{item_type}/{item_id}",
    params(
        ("item_type" = String, Path, description = "Tipo de elemento"),
        ("item_id" = i64, Path, description = "ID legacy del elemento")
    ),
    responses((status = 200, body = TimelineCountResponse), (status = 403, body = ErrorResponse), (status = 404, body = ErrorResponse)),
    security(("session_cookie" = []))
)]
pub async fn count(
    State(state): State<AppState>,
    auth: AuthUser,
    Path((item_type, item_id)): Path<(String, i64)>,
) -> Result<Json<TimelineCountResponse>, AppError> {
    Ok(Json(
        TimelineService::count(&state.pool, auth.user_id, &item_type, item_id).await?,
    ))
}

#[utoipa::path(
    get,
    operation_id = "unread_timeline",
    tag = "timeline",
    path = "/api/timeline/unread/{item_type}/{item_id}",
    params(
        ("item_type" = String, Path, description = "Tipo de elemento"),
        ("item_id" = i64, Path, description = "ID legacy del elemento")
    ),
    responses((status = 200, body = TimelineUnreadResponse), (status = 403, body = ErrorResponse), (status = 404, body = ErrorResponse)),
    security(("session_cookie" = []))
)]
pub async fn unread(
    State(state): State<AppState>,
    auth: AuthUser,
    Path((item_type, item_id)): Path<(String, i64)>,
) -> Result<Json<TimelineUnreadResponse>, AppError> {
    Ok(Json(
        TimelineService::unread(&state.pool, auth.user_id, &item_type, item_id).await?,
    ))
}

#[utoipa::path(post, operation_id = "mark_timeline_read", tag = "timeline", path = "/api/timeline/read", request_body = MarkTimelineReadRequest, responses((status = 200, body = TimelineMutationResponse), (status = 403, body = ErrorResponse), (status = 404, body = ErrorResponse), (status = 422, body = ErrorResponse)), security(("session_cookie" = [])))]
pub async fn mark_read(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(request): Json<MarkTimelineReadRequest>,
) -> Result<Json<TimelineMutationResponse>, AppError> {
    request
        .validate()
        .map_err(|error| AppError::Validation(error.to_string()))?;
    Ok(Json(
        TimelineService::mark_read(&state.pool, auth.user_id, request).await?,
    ))
}

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/timeline", post(send))
        .route("/timeline/events", post(event))
        .route("/timeline/read", post(mark_read))
        .route("/timeline/:item_type/:item_id", get(list))
        .route("/timeline/count/:item_type/:item_id", get(count))
        .route("/timeline/unread/:item_type/:item_id", get(unread))
}
