use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::routing::{delete, get, post, put};
use axum::{Json, Router};
use uuid::Uuid;
use validator::Validate;

use crate::errors::AppError;
use crate::middleware::AuthUser;
use crate::models::{
    PaginatedSharedItems, SharedAccessResponse, SharedCounts, SharedCreateRequest, SharedItem,
    SharedListQuery, SharedParticipantsResponse, SharedRoleRequest,
};
use crate::services::SharedService;
use crate::AppState;

fn validate_request<T: Validate>(request: &T) -> Result<(), AppError> {
    request
        .validate()
        .map_err(|error| AppError::Validation(error.to_string()))
}

#[utoipa::path(
    post,
    tag = "shared",
    path = "/api/shared",
    request_body = SharedCreateRequest,
    responses((status = 201, body = SharedItem), (status = 403, body = ErrorResponse), (status = 404, body = ErrorResponse), (status = 409, body = ErrorResponse), (status = 422, body = ErrorResponse)),
    security(("session_cookie" = []))
)]
pub async fn create(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(request): Json<SharedCreateRequest>,
) -> Result<(StatusCode, Json<SharedItem>), AppError> {
    validate_request(&request)?;
    Ok((
        StatusCode::CREATED,
        Json(SharedService::create(&state.pool, auth.user_id, request).await?),
    ))
}

#[utoipa::path(
    get,
    tag = "shared",
    path = "/api/shared",
    params(SharedListQuery),
    responses((status = 200, body = PaginatedSharedItems), (status = 422, body = ErrorResponse)),
    security(("session_cookie" = []))
)]
pub async fn received(
    State(state): State<AppState>,
    auth: AuthUser,
    Query(query): Query<SharedListQuery>,
) -> Result<Json<PaginatedSharedItems>, AppError> {
    validate_request(&query)?;
    Ok(Json(
        SharedService::received(
            &state.pool,
            auth.user_id,
            query.page,
            query.per_page,
            query.item_type.as_deref(),
        )
        .await?,
    ))
}

#[utoipa::path(
    get,
    tag = "shared",
    path = "/api/shared/mine",
    params(SharedListQuery),
    responses((status = 200, body = PaginatedSharedItems), (status = 422, body = ErrorResponse)),
    security(("session_cookie" = []))
)]
pub async fn owned(
    State(state): State<AppState>,
    auth: AuthUser,
    Query(query): Query<SharedListQuery>,
) -> Result<Json<PaginatedSharedItems>, AppError> {
    validate_request(&query)?;
    Ok(Json(
        SharedService::owned(
            &state.pool,
            auth.user_id,
            query.page,
            query.per_page,
            query.item_type.as_deref(),
        )
        .await?,
    ))
}

#[utoipa::path(
    get,
    tag = "shared",
    path = "/api/shared/participants/{item_type}/{item_id}/{owner_id}",
    params(
        ("item_type" = String, Path, description = "Tipo de elemento"),
        ("item_id" = i64, Path, description = "ID legacy del elemento"),
        ("owner_id" = Uuid, Path, description = "Propietario Rust")
    ),
    responses((status = 200, body = SharedParticipantsResponse), (status = 403, body = ErrorResponse), (status = 404, body = ErrorResponse)),
    security(("session_cookie" = []))
)]
pub async fn participants(
    State(state): State<AppState>,
    auth: AuthUser,
    Path((item_type, item_id, owner_id)): Path<(String, i64, Uuid)>,
) -> Result<Json<SharedParticipantsResponse>, AppError> {
    Ok(Json(
        SharedService::participants(&state.pool, auth.user_id, &item_type, item_id, owner_id)
            .await?,
    ))
}

#[utoipa::path(
    put,
    tag = "shared",
    path = "/api/shared/{id}/role",
    params(("id" = Uuid, Path, description = "ID del compartido")),
    request_body = SharedRoleRequest,
    responses((status = 200, body = SharedItem), (status = 403, body = ErrorResponse), (status = 404, body = ErrorResponse), (status = 422, body = ErrorResponse)),
    security(("session_cookie" = []))
)]
pub async fn update_role(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
    Json(request): Json<SharedRoleRequest>,
) -> Result<Json<SharedItem>, AppError> {
    validate_request(&request)?;
    Ok(Json(
        SharedService::update_role(&state.pool, auth.user_id, id, request).await?,
    ))
}

#[utoipa::path(
    delete,
    tag = "shared",
    path = "/api/shared/{id}",
    params(("id" = Uuid, Path, description = "ID del compartido")),
    responses((status = 204, description = "Compartido eliminado"), (status = 404, body = ErrorResponse)),
    security(("session_cookie" = []))
)]
pub async fn remove(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, AppError> {
    SharedService::remove(&state.pool, auth.user_id, id).await?;
    Ok(StatusCode::NO_CONTENT)
}

#[utoipa::path(
    get,
    tag = "shared",
    path = "/api/shared/counts",
    responses((status = 200, body = SharedCounts)),
    security(("session_cookie" = []))
)]
pub async fn counts(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<Json<SharedCounts>, AppError> {
    Ok(Json(
        SharedService::counts(&state.pool, auth.user_id).await?,
    ))
}

#[utoipa::path(
    get,
    tag = "shared",
    path = "/api/shared/access/{item_type}/{item_id}/{owner_id}",
    params(
        ("item_type" = String, Path, description = "Tipo de elemento"),
        ("item_id" = i64, Path, description = "ID legacy del elemento"),
        ("owner_id" = Uuid, Path, description = "Propietario Rust")
    ),
    responses((status = 200, body = SharedAccessResponse)),
    security(("session_cookie" = []))
)]
pub async fn access(
    State(state): State<AppState>,
    auth: AuthUser,
    Path((item_type, item_id, owner_id)): Path<(String, i64, Uuid)>,
) -> Result<Json<SharedAccessResponse>, AppError> {
    Ok(Json(
        SharedService::access(&state.pool, auth.user_id, &item_type, item_id, owner_id).await?,
    ))
}

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/shared", post(create).get(received))
        .route("/shared/mine", get(owned))
        .route(
            "/shared/participants/:item_type/:item_id/:owner_id",
            get(participants),
        )
        .route("/shared/:id/role", put(update_role))
        .route("/shared/:id", delete(remove))
        .route("/shared/counts", get(counts))
        .route("/shared/access/:item_type/:item_id/:owner_id", get(access))
}
