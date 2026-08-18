use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::routing::{get, post};
use axum::{Json, Router};
use uuid::Uuid;
use validator::Validate;

use crate::errors::AppError;
use crate::middleware::AuthUser;
use crate::models::{
    CreateNoteFolderRequest, CreateNoteRequest, Note, NoteFolder, PaginatedNotes,
    UpdateNoteFolderRequest, UpdateNoteRequest,
};
use crate::services::NoteService;
use crate::AppState;

/// Crear una nota
#[utoipa::path(
    post,
    tag = "notes",
    path = "/api/notes",
    request_body = CreateNoteRequest,
    responses(
        (status = 201, description = "Nota creada", body = Note),
        (status = 401, description = "No autorizado", body = ErrorResponse),
        (status = 422, description = "Error de validación", body = ErrorResponse)
    ),
    security(("session_cookie" = []))
)]
pub async fn create_note(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(req): Json<CreateNoteRequest>,
) -> Result<(StatusCode, Json<Note>), AppError> {
    req.validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;

    let note = NoteService::create(&state.pool, auth.user_id, req).await?;
    Ok((StatusCode::CREATED, Json(note)))
}

#[derive(Debug, serde::Deserialize, utoipa::IntoParams, Validate)]
pub struct NoteListQuery {
    #[serde(default = "default_page")]
    #[validate(range(min = 1))]
    pub page: i64,
    #[serde(default = "default_per_page")]
    #[validate(range(min = 1, max = 100))]
    pub per_page: i64,
    #[serde(default)]
    pub folder_id: Option<Uuid>,
    #[serde(default)]
    #[validate(length(max = 100))]
    pub search: Option<String>,
}

fn default_page() -> i64 {
    1
}

fn default_per_page() -> i64 {
    20
}

#[utoipa::path(
    get,
    tag = "notes",
    path = "/api/notes/folders",
    responses((status = 200, description = "Carpetas de notas", body = [NoteFolder]), (status = 401, body = ErrorResponse)),
    security(("session_cookie" = []))
)]
pub async fn list_folders(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<Json<Vec<NoteFolder>>, AppError> {
    Ok(Json(
        NoteService::list_folders(&state.pool, auth.user_id).await?,
    ))
}

#[utoipa::path(
    post,
    tag = "notes",
    path = "/api/notes/folders",
    request_body = CreateNoteFolderRequest,
    responses((status = 201, body = NoteFolder), (status = 401, body = ErrorResponse), (status = 409, body = ErrorResponse), (status = 422, body = ErrorResponse)),
    security(("session_cookie" = []))
)]
pub async fn create_folder(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(request): Json<CreateNoteFolderRequest>,
) -> Result<(StatusCode, Json<NoteFolder>), AppError> {
    request
        .validate()
        .map_err(|error| AppError::Validation(error.to_string()))?;
    Ok((
        StatusCode::CREATED,
        Json(NoteService::create_folder(&state.pool, auth.user_id, request).await?),
    ))
}

#[utoipa::path(
    put,
    tag = "notes",
    path = "/api/notes/folders/{id}",
    params(("id" = Uuid, Path, description = "ID de la carpeta")),
    request_body = UpdateNoteFolderRequest,
    responses((status = 200, body = NoteFolder), (status = 404, body = ErrorResponse), (status = 409, body = ErrorResponse), (status = 422, body = ErrorResponse)),
    security(("session_cookie" = []))
)]
pub async fn rename_folder(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
    Json(request): Json<UpdateNoteFolderRequest>,
) -> Result<Json<NoteFolder>, AppError> {
    request
        .validate()
        .map_err(|error| AppError::Validation(error.to_string()))?;
    Ok(Json(
        NoteService::rename_folder(&state.pool, id, auth.user_id, request).await?,
    ))
}

#[utoipa::path(
    delete,
    tag = "notes",
    path = "/api/notes/folders/{id}",
    params(("id" = Uuid, Path, description = "ID de la carpeta")),
    responses((status = 204, description = "Carpeta eliminada"), (status = 404, body = ErrorResponse)),
    security(("session_cookie" = []))
)]
pub async fn delete_folder(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, AppError> {
    NoteService::delete_folder(&state.pool, id, auth.user_id).await?;
    Ok(StatusCode::NO_CONTENT)
}

#[derive(Debug, serde::Deserialize, utoipa::ToSchema)]
pub struct MoveNoteRequest {
    pub folder_id: Option<Uuid>,
}

#[utoipa::path(
    put,
    tag = "notes",
    path = "/api/notes/{id}/folder",
    params(("id" = Uuid, Path, description = "ID de la nota")),
    request_body = MoveNoteRequest,
    responses((status = 200, body = Note), (status = 404, body = ErrorResponse)),
    security(("session_cookie" = []))
)]
pub async fn move_note(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
    Json(request): Json<MoveNoteRequest>,
) -> Result<Json<Note>, AppError> {
    Ok(Json(
        NoteService::move_to_folder(&state.pool, id, auth.user_id, request.folder_id).await?,
    ))
}

/// Obtener una nota por ID
#[utoipa::path(
    get,
    tag = "notes",
    path = "/api/notes/{id}",
    params(("id" = Uuid, Path, description = "ID de la nota")),
    responses(
        (status = 200, description = "Nota encontrada", body = Note),
        (status = 404, description = "Nota no encontrada", body = ErrorResponse),
        (status = 401, description = "No autorizado", body = ErrorResponse)
    ),
    security(("session_cookie" = []))
)]
pub async fn get_note(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<Note>, AppError> {
    let note = NoteService::get(&state.pool, id, auth.user_id).await?;
    Ok(Json(note))
}

/// Listar notas con paginación
#[utoipa::path(
    get,
    tag = "notes",
    path = "/api/notes",
    params(NoteListQuery),
    responses(
        (status = 200, description = "Lista de notas", body = PaginatedNotes),
        (status = 401, description = "No autorizado", body = ErrorResponse),
        (status = 404, description = "Carpeta no encontrada", body = ErrorResponse),
        (status = 422, description = "Error de validación", body = ErrorResponse)
    ),
    security(("session_cookie" = []))
)]
pub async fn list_notes(
    State(state): State<AppState>,
    auth: AuthUser,
    Query(params): Query<NoteListQuery>,
) -> Result<Json<PaginatedNotes>, AppError> {
    params
        .validate()
        .map_err(|error| AppError::Validation(error.to_string()))?;
    let notes = NoteService::list(
        &state.pool,
        auth.user_id,
        params.page,
        params.per_page,
        params.folder_id,
        params.search.as_deref(),
    )
    .await?;
    Ok(Json(notes))
}

/// Actualizar una nota
#[utoipa::path(
    put,
    tag = "notes",
    path = "/api/notes/{id}",
    params(("id" = Uuid, Path, description = "ID de la nota")),
    request_body = UpdateNoteRequest,
    responses(
        (status = 200, description = "Nota actualizada", body = Note),
        (status = 404, description = "No encontrada", body = ErrorResponse),
        (status = 401, description = "No autorizado", body = ErrorResponse)
    ),
    security(("session_cookie" = []))
)]
pub async fn update_note(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateNoteRequest>,
) -> Result<Json<Note>, AppError> {
    req.validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;

    let note = NoteService::update(&state.pool, id, auth.user_id, req).await?;
    Ok(Json(note))
}

/// Eliminar una nota
#[utoipa::path(
    delete,
    tag = "notes",
    path = "/api/notes/{id}",
    params(("id" = Uuid, Path, description = "ID de la nota")),
    responses(
        (status = 204, description = "Nota eliminada"),
        (status = 404, description = "No encontrada", body = ErrorResponse),
        (status = 401, description = "No autorizado", body = ErrorResponse)
    ),
    security(("session_cookie" = []))
)]
pub async fn delete_note(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, AppError> {
    NoteService::delete(&state.pool, id, auth.user_id).await?;
    Ok(StatusCode::NO_CONTENT)
}

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/notes", post(create_note).get(list_notes))
        .route("/notes/folders", post(create_folder).get(list_folders))
        .route(
            "/notes/folders/:id",
            axum::routing::put(rename_folder).delete(delete_folder),
        )
        .route(
            "/notes/:id",
            get(get_note).put(update_note).delete(delete_note),
        )
        .route("/notes/:id/folder", axum::routing::put(move_note))
}
