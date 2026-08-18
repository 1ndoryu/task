use axum::extract::{Path, Query, State};
use axum::{Json, Router};
use chrono::NaiveDate;
use validator::Validate;

use crate::errors::AppError;
use crate::middleware::AuthUser;
use crate::models::{HabitHistoryQuery, HabitHistoryResponse, MarkHabitDayRequest};
use crate::services::HabitHistoryService;
use crate::AppState;

#[utoipa::path(
    get,
    tag = "habits",
    path = "/api/habits/{legacy_id}/history",
    params(
        ("legacy_id" = i64, Path, description = "ID legacy del hábito"),
        HabitHistoryQuery
    ),
    responses(
        (status = 200, body = HabitHistoryResponse),
        (status = 401, body = ErrorResponse),
        (status = 404, body = ErrorResponse),
        (status = 422, body = ErrorResponse)
    ),
    security(("session_cookie" = []))
)]
pub async fn get_history(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(legacy_id): Path<i64>,
    Query(query): Query<HabitHistoryQuery>,
) -> Result<Json<HabitHistoryResponse>, AppError> {
    query
        .validate()
        .map_err(|error| AppError::Validation(error.to_string()))?;
    Ok(Json(
        HabitHistoryService::get(&state.pool, auth.user_id, legacy_id, query.days).await?,
    ))
}

#[utoipa::path(
    put,
    tag = "habits",
    path = "/api/habits/{legacy_id}/history",
    params(("legacy_id" = i64, Path, description = "ID legacy del hábito")),
    request_body = MarkHabitDayRequest,
    responses(
        (status = 200, body = HabitHistoryResponse),
        (status = 401, body = ErrorResponse),
        (status = 403, body = ErrorResponse),
        (status = 404, body = ErrorResponse),
        (status = 422, body = ErrorResponse)
    ),
    security(("session_cookie" = []))
)]
pub async fn mark_day(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(legacy_id): Path<i64>,
    Json(request): Json<MarkHabitDayRequest>,
) -> Result<Json<HabitHistoryResponse>, AppError> {
    request
        .validate()
        .map_err(|error| AppError::Validation(error.to_string()))?;
    Ok(Json(
        HabitHistoryService::mark_day(&state.pool, auth.user_id, legacy_id, request).await?,
    ))
}

#[utoipa::path(
    delete,
    tag = "habits",
    path = "/api/habits/{legacy_id}/history/{date}",
    params(
        ("legacy_id" = i64, Path, description = "ID legacy del hábito"),
        ("date" = NaiveDate, Path, description = "Fecha ISO del registro")
    ),
    responses(
        (status = 200, body = HabitHistoryResponse),
        (status = 401, body = ErrorResponse),
        (status = 403, body = ErrorResponse),
        (status = 404, body = ErrorResponse),
        (status = 422, body = ErrorResponse)
    ),
    security(("session_cookie" = []))
)]
pub async fn delete_day(
    State(state): State<AppState>,
    auth: AuthUser,
    Path((legacy_id, date)): Path<(i64, NaiveDate)>,
) -> Result<Json<HabitHistoryResponse>, AppError> {
    Ok(Json(
        HabitHistoryService::delete_day(&state.pool, auth.user_id, legacy_id, date).await?,
    ))
}

pub fn routes() -> Router<AppState> {
    Router::new()
        .route(
            "/habits/:legacy_id/history",
            axum::routing::get(get_history).put(mark_day),
        )
        .route(
            "/habits/:legacy_id/history/:date",
            axum::routing::delete(delete_day),
        )
}
