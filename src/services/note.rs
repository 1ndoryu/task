use sqlx::PgPool;
use uuid::Uuid;

use crate::errors::AppError;
use crate::models::{
    CreateNoteFolderRequest, CreateNoteRequest, Note, NoteFolder, PaginatedNotes,
    UpdateNoteFolderRequest, UpdateNoteRequest,
};
use crate::repositories::NoteRepository;

pub struct NoteService;

impl NoteService {
    pub async fn create(
        pool: &PgPool,
        user_id: Uuid,
        req: CreateNoteRequest,
    ) -> Result<Note, AppError> {
        if let Some(folder_id) = req.folder_id {
            ensure_folder(pool, folder_id, user_id).await?;
        }
        let note = NoteRepository::create(pool, user_id, &req.title, &req.content, req.folder_id)
            .await
            .map_err(map_folder_write_error)?;
        Ok(note)
    }

    pub async fn get(pool: &PgPool, note_id: Uuid, user_id: Uuid) -> Result<Note, AppError> {
        NoteRepository::find_by_id(pool, note_id, user_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Nota no encontrada".into()))
    }

    pub async fn list(
        pool: &PgPool,
        user_id: Uuid,
        page: i64,
        per_page: i64,
        folder_id: Option<Uuid>,
        search: Option<&str>,
    ) -> Result<PaginatedNotes, AppError> {
        if let Some(folder_id) = folder_id {
            ensure_folder(pool, folder_id, user_id).await?;
        }
        let (notes, total) =
            NoteRepository::list(pool, user_id, page, per_page, folder_id, search).await?;
        Ok(PaginatedNotes {
            items: notes,
            total,
            page,
            per_page,
        })
    }

    pub async fn update(
        pool: &PgPool,
        note_id: Uuid,
        user_id: Uuid,
        req: UpdateNoteRequest,
    ) -> Result<Note, AppError> {
        NoteRepository::update(
            pool,
            note_id,
            user_id,
            req.title.as_deref(),
            req.content.as_deref(),
        )
        .await?
        .ok_or_else(|| AppError::NotFound("Nota no encontrada".into()))
    }

    pub async fn delete(pool: &PgPool, note_id: Uuid, user_id: Uuid) -> Result<(), AppError> {
        if !NoteRepository::delete(pool, note_id, user_id).await? {
            return Err(AppError::NotFound("Nota no encontrada".into()));
        }
        Ok(())
    }

    pub async fn list_folders(pool: &PgPool, user_id: Uuid) -> Result<Vec<NoteFolder>, AppError> {
        Ok(NoteRepository::list_folders(pool, user_id).await?)
    }

    pub async fn create_folder(
        pool: &PgPool,
        user_id: Uuid,
        req: CreateNoteFolderRequest,
    ) -> Result<NoteFolder, AppError> {
        NoteRepository::create_folder(pool, user_id, &req.name)
            .await
            .map_err(map_folder_write_error)
    }

    pub async fn rename_folder(
        pool: &PgPool,
        folder_id: Uuid,
        user_id: Uuid,
        req: UpdateNoteFolderRequest,
    ) -> Result<NoteFolder, AppError> {
        NoteRepository::rename_folder(pool, folder_id, user_id, &req.name)
            .await
            .map_err(map_folder_write_error)?
            .ok_or_else(|| AppError::NotFound("Carpeta no encontrada".into()))
    }

    pub async fn delete_folder(
        pool: &PgPool,
        folder_id: Uuid,
        user_id: Uuid,
    ) -> Result<(), AppError> {
        if !NoteRepository::delete_folder(pool, folder_id, user_id).await? {
            return Err(AppError::NotFound("Carpeta no encontrada".into()));
        }
        Ok(())
    }

    pub async fn move_to_folder(
        pool: &PgPool,
        note_id: Uuid,
        user_id: Uuid,
        folder_id: Option<Uuid>,
    ) -> Result<Note, AppError> {
        if let Some(folder_id) = folder_id {
            ensure_folder(pool, folder_id, user_id).await?;
        }
        NoteRepository::move_to_folder(pool, note_id, user_id, folder_id)
            .await
            .map_err(map_folder_write_error)?
            .ok_or_else(|| AppError::NotFound("Nota no encontrada".into()))
    }
}

async fn ensure_folder(pool: &PgPool, folder_id: Uuid, user_id: Uuid) -> Result<(), AppError> {
    if !NoteRepository::folder_belongs_to_user(pool, folder_id, user_id).await? {
        return Err(AppError::NotFound("Carpeta no encontrada".into()));
    }
    Ok(())
}

fn map_folder_write_error(error: sqlx::Error) -> AppError {
    if let sqlx::Error::Database(database) = &error {
        match database.code().as_deref() {
            Some("23505") => {
                return AppError::Conflict("Ya existe una carpeta con ese nombre".into());
            }
            Some("23503") => {
                return AppError::NotFound("Carpeta no encontrada".into());
            }
            _ => {}
        }
    }
    AppError::Database(error)
}
