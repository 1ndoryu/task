use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::{IntoParams, ToSchema};
use uuid::Uuid;
use validator::Validate;

/// Recordatorio con fecha/hora programada, propiedad del usuario.
#[derive(Debug, Clone, FromRow, Serialize, ToSchema)]
pub struct Reminder {
    pub id: Uuid,
    pub user_id: Uuid,
    pub titulo: String,
    pub mensaje: String,
    pub programado_para: DateTime<Utc>,
    pub estado: String,
    pub creado_en: DateTime<Utc>,
    pub actualizado_en: DateTime<Utc>,
}

/// Request para crear un recordatorio. La `idempotency_key` la genera el
/// frontend en la propuesta y se reenvía al confirmar: repetir la misma
/// confirmación (reintento de red, doble clic) no duplica el recordatorio.
#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct CreateReminderRequest {
    #[validate(length(
        min = 1,
        max = 255,
        message = "El título debe tener entre 1 y 255 caracteres"
    ))]
    pub titulo: String,
    #[validate(length(max = 2000, message = "El mensaje no debe exceder 2000 caracteres"))]
    #[serde(default)]
    pub mensaje: String,
    pub programado_para: DateTime<Utc>,
    #[validate(length(max = 64, message = "La clave de idempotencia no debe exceder 64 caracteres"))]
    #[serde(default)]
    pub idempotency_key: Option<String>,
}

/// Request para actualizar un recordatorio pendiente.
#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct UpdateReminderRequest {
    #[validate(length(min = 1, max = 255))]
    pub titulo: Option<String>,
    #[validate(length(max = 2000))]
    pub mensaje: Option<String>,
    pub programado_para: Option<DateTime<Utc>>,
}

/// Query params para listar recordatorios.
#[derive(Debug, Deserialize, IntoParams, Validate, ToSchema)]
pub struct ReminderListQuery {
    #[serde(default)]
    pub estado: Option<String>,
}

/// Respuesta paginada de recordatorios.
#[derive(Debug, Serialize, ToSchema)]
pub struct ReminderListResponse {
    pub items: Vec<Reminder>,
    pub total: i64,
}

#[must_use]
pub fn es_estado_valido(estado: &str) -> bool {
    matches!(estado, "pendiente" | "completado" | "cancelado")
}
