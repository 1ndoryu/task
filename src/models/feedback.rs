use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;
use validator::Validate;

/// Request de envío de feedback desde la UI.
#[derive(Debug, Deserialize, Validate, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CreateFeedbackRequest {
    #[validate(custom(function = "validate_tipo"))]
    pub tipo: String,
    #[validate(length(min = 10, max = 2000, message = "El mensaje debe tener entre 10 y 2000 caracteres"))]
    pub mensaje: String,
}

/// Fila de la tabla feedback.
#[derive(Debug, Clone, sqlx::FromRow)]
pub struct FeedbackRow {
    pub id: Uuid,
    pub user_id: Uuid,
    pub tipo: String,
    pub mensaje: String,
    pub leido: bool,
    pub creado_en: DateTime<Utc>,
}

/// Item de feedback para el panel admin.
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct FeedbackItem {
    pub id: Uuid,
    pub usuario_nombre: String,
    pub usuario_email: String,
    pub tipo: String,
    pub mensaje: String,
    pub leido: bool,
    pub fecha_creacion: DateTime<Utc>,
}

/// Respuesta paginada de feedback admin.
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PaginatedFeedback {
    pub items: Vec<FeedbackItem>,
    pub page: i64,
    pub per_page: i64,
    pub has_more: bool,
    pub total: i64,
}

/// Estado de feedback disponible para el usuario (límite diario).
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct FeedbackState {
    pub restante: i64,
    pub es_premium: bool,
}

/// Respuesta de envío de feedback.
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CreateFeedbackResponse {
    pub success: bool,
    pub message: String,
}

/// Estadísticas globales de feedback para el panel admin.
#[derive(Debug, Clone, Serialize, ToSchema, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct FeedbackStats {
    pub total: i64,
    pub no_leidos: i64,
    pub sugerencias: i64,
    pub bugs: i64,
}

fn validate_tipo(value: &str) -> Result<(), validator::ValidationError> {
    if ["sugerencia", "bug", "otro"].contains(&value) {
        Ok(())
    } else {
        Err(validator::ValidationError::new("tipo"))
    }
}
