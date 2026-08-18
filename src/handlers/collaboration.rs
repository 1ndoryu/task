use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::routing::{delete, get, post, put};
use axum::{Json, Router};
use uuid::Uuid;
use validator::Validate;

use crate::errors::AppError;
use crate::middleware::AuthUser;
use crate::models::{
    PendingTeamCount, TeamConnection, TeamOverview, TeamRequest, TeamResponseRequest,
};
use crate::services::CollaborationService;
use crate::AppState;

#[derive(Debug, serde::Deserialize, utoipa::IntoParams, Validate)]
#[serde(rename_all = "camelCase")]
pub struct TeamListQuery {
    #[serde(default = "default_team_page")]
    #[validate(range(min = 1))]
    pub page: i64,
    #[serde(default = "default_team_per_page")]
    #[validate(range(min = 1, max = 100))]
    pub per_page: i64,
}

fn default_team_page() -> i64 {
    1
}

fn default_team_per_page() -> i64 {
    50
}

#[utoipa::path(
    post,
    tag = "teams",
    path = "/api/teams/requests",
    request_body = TeamRequest,
    responses(
        (status = 201, description = "Solicitud creada", body = TeamConnection),
        (status = 409, body = ErrorResponse),
        (status = 422, body = ErrorResponse)
    ),
    security(("session_cookie" = []))
)]
pub async fn send_request(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(request): Json<TeamRequest>,
) -> Result<(StatusCode, Json<TeamConnection>), AppError> {
    request
        .validate()
        .map_err(|error| AppError::Validation(error.to_string()))?;
    let connection =
        CollaborationService::send_request(&state.pool, auth.user_id, &request.email).await?;
    Ok((StatusCode::CREATED, Json(connection)))
}

#[utoipa::path(
    get,
    tag = "teams",
    path = "/api/teams",
    params(TeamListQuery),
    responses((status = 200, description = "Equipo del usuario", body = TeamOverview)),
    security(("session_cookie" = []))
)]
pub async fn get_team(
    State(state): State<AppState>,
    auth: AuthUser,
    Query(query): Query<TeamListQuery>,
) -> Result<Json<TeamOverview>, AppError> {
    query
        .validate()
        .map_err(|error| AppError::Validation(error.to_string()))?;
    Ok(Json(
        CollaborationService::overview_page(&state.pool, auth.user_id, query.page, query.per_page)
            .await?,
    ))
}

#[utoipa::path(
    get,
    tag = "teams",
    path = "/api/teams/pending-count",
    responses((status = 200, description = "Solicitudes pendientes", body = PendingTeamCount)),
    security(("session_cookie" = []))
)]
pub async fn pending_count(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<Json<PendingTeamCount>, AppError> {
    Ok(Json(PendingTeamCount {
        pending: CollaborationService::pending_count(&state.pool, auth.user_id).await?,
    }))
}

#[utoipa::path(
    put,
    tag = "teams",
    path = "/api/teams/requests/{id}",
    params(("id" = Uuid, Path, description = "ID de la solicitud")),
    request_body = TeamResponseRequest,
    responses((status = 200, description = "Solicitud respondida", body = TeamConnection), (status = 403, body = ErrorResponse), (status = 409, body = ErrorResponse)),
    security(("session_cookie" = []))
)]
pub async fn respond_request(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
    Json(request): Json<TeamResponseRequest>,
) -> Result<Json<TeamConnection>, AppError> {
    request
        .validate_action()
        .map_err(|error| AppError::Validation(error.to_string()))?;
    Ok(Json(
        CollaborationService::respond(&state.pool, auth.user_id, id, &request.action).await?,
    ))
}

#[utoipa::path(
    delete,
    tag = "teams",
    path = "/api/teams/{id}",
    params(("id" = Uuid, Path, description = "ID de la conexión")),
    responses((status = 204, description = "Conexión eliminada"), (status = 404, body = ErrorResponse)),
    security(("session_cookie" = []))
)]
pub async fn remove_connection(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, AppError> {
    CollaborationService::remove(&state.pool, auth.user_id, id).await?;
    Ok(StatusCode::NO_CONTENT)
}

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/teams", get(get_team))
        .route("/teams/pending-count", get(pending_count))
        .route("/teams/requests", post(send_request))
        .route("/teams/requests/:id", put(respond_request))
        .route("/teams/:id", delete(remove_connection))
}
