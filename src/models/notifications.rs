use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use utoipa::{IntoParams, ToSchema};
use uuid::Uuid;
use validator::Validate;

pub const NOTIFICATION_TYPES: [&str; 9] = [
    "solicitud_equipo",
    "solicitud_aceptada",
    "tarea_vence_hoy",
    "tarea_asignada",
    "tarea_removida",
    "adjunto_agregado",
    "mensaje_chat",
    "habito_companero",
    "elemento_compartido",
];

#[derive(Debug, Deserialize, IntoParams, Validate, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct NotificationListQuery {
    #[serde(default = "default_page")]
    #[validate(range(min = 1))]
    pub page: i64,
    #[serde(default = "default_per_page")]
    #[validate(range(min = 1, max = 50))]
    pub per_page: i64,
    #[serde(default)]
    pub unread_only: bool,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct Notification {
    pub id: Uuid,
    pub notification_type: String,
    pub title: String,
    pub content: Option<String>,
    pub read: bool,
    pub created_at: DateTime<Utc>,
    pub read_at: Option<DateTime<Utc>>,
    pub metadata: Value,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PaginatedNotifications {
    pub items: Vec<Notification>,
    pub page: i64,
    pub per_page: i64,
    pub has_more: bool,
    pub total: i64,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UnreadNotificationCount {
    pub unread: i64,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct MarkAllNotificationsReadResponse {
    pub marked: i64,
}

#[derive(Debug)]
pub struct NotificationCreate {
    pub user_id: Uuid,
    pub notification_type: String,
    pub title: String,
    pub content: Option<String>,
    pub metadata: Value,
    pub dedupe_key: Option<String>,
}

fn default_page() -> i64 {
    1
}

fn default_per_page() -> i64 {
    20
}

#[must_use]
pub fn is_valid_notification_type(value: &str) -> bool {
    NOTIFICATION_TYPES.contains(&value)
}
