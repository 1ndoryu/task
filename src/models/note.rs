use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::{IntoParams, ToSchema};
use uuid::Uuid;
use validator::Validate;

/// Nota almacenada en base de datos
#[derive(Debug, Clone, FromRow, Serialize, ToSchema)]
pub struct Note {
    pub id: Uuid,
    pub user_id: Uuid,
    pub folder_id: Option<Uuid>,
    pub title: String,
    pub content: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Request para crear una nota
#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct CreateNoteRequest {
    #[validate(length(
        min = 1,
        max = 255,
        message = "El título debe tener entre 1 y 255 caracteres"
    ))]
    pub title: String,
    #[validate(length(max = 10000, message = "El contenido no debe exceder 10000 caracteres"))]
    pub content: String,
    pub folder_id: Option<Uuid>,
}

/// Request para actualizar una nota
#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct UpdateNoteRequest {
    #[validate(length(min = 1, max = 255))]
    pub title: Option<String>,
    #[validate(length(max = 10000))]
    pub content: Option<String>,
}

/// Carpeta de notas propiedad del usuario.
#[derive(Debug, Clone, FromRow, Serialize, ToSchema)]
pub struct NoteFolder {
    pub id: Uuid,
    pub user_id: Uuid,
    pub name: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Request para crear una carpeta.
#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct CreateNoteFolderRequest {
    #[validate(length(min = 1, max = 255))]
    pub name: String,
}

/// Request para renombrar una carpeta.
#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct UpdateNoteFolderRequest {
    #[validate(length(min = 1, max = 255))]
    pub name: String,
}

/// Response paginada de notas
#[derive(Debug, Serialize, ToSchema)]
pub struct PaginatedNotes {
    pub items: Vec<Note>,
    pub total: i64,
    pub page: i64,
    pub per_page: i64,
}

/// Query params para paginación
#[derive(Debug, Deserialize, IntoParams, Validate)]
pub struct PaginationParams {
    /// Página (empezando en 1)
    #[serde(default = "default_page")]
    #[validate(range(min = 1))]
    pub page: i64,
    /// Resultados por página
    #[serde(default = "default_per_page")]
    #[validate(range(min = 1, max = 100))]
    pub per_page: i64,
}

fn default_page() -> i64 {
    1
}
fn default_per_page() -> i64 {
    20
}
