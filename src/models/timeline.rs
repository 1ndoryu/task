use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use utoipa::{IntoParams, ToSchema};
use uuid::Uuid;
use validator::Validate;

pub const TIMELINE_ITEM_TYPES: [&str; 3] = ["tarea", "proyecto", "habito"];
pub const TIMELINE_MESSAGE_TYPES: [&str; 2] = ["usuario", "sistema"];
pub const TIMELINE_ACTIONS: [&str; 17] = [
    "creado",
    "editado",
    "completado",
    "reabierto",
    "asignado",
    "desasignado",
    "adjunto_agregado",
    "adjunto_eliminado",
    "prioridad",
    "urgencia",
    "fecha_limite",
    "participante_agregado",
    "participante_removido",
    "compartido",
    "descripcion",
    "nombre",
    "repeticion",
];

#[derive(Debug, Deserialize, IntoParams, Validate, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct TimelineQuery {
    #[serde(default = "default_limit")]
    #[validate(range(min = 1, max = 100))]
    pub limit: i64,
    #[serde(default)]
    #[validate(range(min = 0, max = 100_000))]
    pub offset: i64,
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CreateTimelineMessageRequest {
    #[validate(custom(function = "validate_item_type"))]
    pub item_type: String,
    #[validate(range(min = 1))]
    pub item_id: i64,
    #[validate(length(min = 1, max = 2000))]
    pub content: String,
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CreateTimelineEventRequest {
    #[validate(custom(function = "validate_item_type"))]
    pub item_type: String,
    #[validate(range(min = 1))]
    pub item_id: i64,
    #[validate(custom(function = "validate_action"))]
    pub action: String,
    #[validate(length(max = 500))]
    pub detail: Option<String>,
    pub metadata: Option<Value>,
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct MarkTimelineReadRequest {
    #[validate(custom(function = "validate_item_type"))]
    pub item_type: String,
    #[validate(range(min = 1))]
    pub item_id: i64,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct TimelineItem {
    pub id: Uuid,
    pub item_type: String,
    pub item_id: i64,
    pub user_id: Uuid,
    pub user_name: String,
    pub avatar_url: Option<String>,
    pub message_type: String,
    pub content: String,
    pub system_action: Option<String>,
    pub metadata: Value,
    pub created_at: DateTime<Utc>,
    pub is_own: bool,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct TimelineResponse {
    pub items: Vec<TimelineItem>,
    pub total: i64,
    pub limit: i64,
    pub offset: i64,
    pub has_more: bool,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct TimelineCountResponse {
    pub total: i64,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct TimelineUnreadResponse {
    pub unread: i64,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct TimelineMutationResponse {
    pub success: bool,
    pub created: bool,
}

fn default_limit() -> i64 {
    50
}

fn validate_item_type(value: &str) -> Result<(), validator::ValidationError> {
    if TIMELINE_ITEM_TYPES.contains(&value) {
        Ok(())
    } else {
        Err(validator::ValidationError::new("item_type"))
    }
}

fn validate_action(value: &str) -> Result<(), validator::ValidationError> {
    if TIMELINE_ACTIONS.contains(&value) {
        Ok(())
    } else {
        Err(validator::ValidationError::new("action"))
    }
}
