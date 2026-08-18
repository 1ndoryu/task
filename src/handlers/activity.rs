use axum::extract::{Path, Query, State};
use axum::{Json, Router};
use validator::Validate;

use crate::errors::AppError;
use crate::middleware::AuthUser;
use crate::models::activity::{
    ActivityDayQuery, ActivityDayResponse, ActivityHeatmapResponse, ActivityQuery,
    ActivityStatsQuery, ActivityStatsResponse, DeleteActivityResponse, RecordActivityRequest,
    RecordActivityResponse,
};
use crate::services::ActivityService;
use crate::AppState;

#[utoipa::path(
    get,
    tag = "activity",
    path = "/api/activity",
    params(ActivityQuery),
    responses(
        (status = 200, body = ActivityHeatmapResponse),
        (status = 401, body = ErrorResponse),
        (status = 422, body = ErrorResponse)
    ),
    security(("session_cookie" = []))
)]
pub async fn heatmap(
    State(state): State<AppState>,
    auth: AuthUser,
    Query(query): Query<ActivityQuery>,
) -> Result<Json<ActivityHeatmapResponse>, AppError> {
    query
        .validate()
        .map_err(|error| AppError::Validation(error.to_string()))?;
    Ok(Json(
        ActivityService::heatmap(&state.pool, auth.user_id, query).await?,
    ))
}

#[utoipa::path(
    get,
    tag = "activity",
    path = "/api/activity/estadisticas",
    params(ActivityStatsQuery),
    responses(
        (status = 200, body = ActivityStatsResponse),
        (status = 401, body = ErrorResponse),
        (status = 422, body = ErrorResponse)
    ),
    security(("session_cookie" = []))
)]
pub async fn stats(
    State(state): State<AppState>,
    auth: AuthUser,
    Query(query): Query<ActivityStatsQuery>,
) -> Result<Json<ActivityStatsResponse>, AppError> {
    query
        .validate()
        .map_err(|error| AppError::Validation(error.to_string()))?;
    Ok(Json(
        ActivityService::stats(&state.pool, auth.user_id, query).await?,
    ))
}

#[utoipa::path(
    get,
    tag = "activity",
    path = "/api/activity/day",
    params(ActivityDayQuery),
    responses(
        (status = 200, body = ActivityDayResponse),
        (status = 401, body = ErrorResponse),
        (status = 422, body = ErrorResponse)
    ),
    security(("session_cookie" = []))
)]
pub async fn day(
    State(state): State<AppState>,
    auth: AuthUser,
    Query(query): Query<ActivityDayQuery>,
) -> Result<Json<ActivityDayResponse>, AppError> {
    query
        .validate()
        .map_err(|error| AppError::Validation(error.to_string()))?;
    Ok(Json(
        ActivityService::day(&state.pool, auth.user_id, query).await?,
    ))
}

#[utoipa::path(
    post,
    tag = "activity",
    path = "/api/activity",
    request_body = RecordActivityRequest,
    responses(
        (status = 200, body = RecordActivityResponse),
        (status = 401, body = ErrorResponse),
        (status = 403, body = ErrorResponse),
        (status = 422, body = ErrorResponse)
    ),
    security(("session_cookie" = []))
)]
pub async fn record(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(request): Json<RecordActivityRequest>,
) -> Result<Json<RecordActivityResponse>, AppError> {
    request
        .validate()
        .map_err(|error| AppError::Validation(error.to_string()))?;
    Ok(Json(
        ActivityService::record(&state.pool, auth.user_id, request).await?,
    ))
}

#[utoipa::path(
    delete,
    tag = "activity",
    path = "/api/activity/{id}",
    params(("id" = i64, Path, description = "ID de actividad")),
    responses(
        (status = 200, body = DeleteActivityResponse),
        (status = 401, body = ErrorResponse),
        (status = 403, body = ErrorResponse),
        (status = 404, body = ErrorResponse),
        (status = 422, body = ErrorResponse)
    ),
    security(("session_cookie" = []))
)]
pub async fn delete(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<i64>,
) -> Result<Json<DeleteActivityResponse>, AppError> {
    ActivityService::delete(&state.pool, auth.user_id, id).await?;
    Ok(Json(DeleteActivityResponse { success: true }))
}

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/activity", axum::routing::get(heatmap).post(record))
        .route("/activity/estadisticas", axum::routing::get(stats))
        .route("/activity/day", axum::routing::get(day))
        .route("/activity/:id", axum::routing::delete(delete))
}
