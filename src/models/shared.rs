use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};
use uuid::Uuid;
use validator::{Validate, ValidationError};

#[derive(Debug, Deserialize, Validate, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct SharedCreateRequest {
    #[validate(custom(function = "validate_item_type"))]
    pub item_type: String,
    #[validate(range(min = 1))]
    pub item_id: i64,
    pub user_id: Uuid,
    #[serde(default = "default_role")]
    #[validate(custom(function = "validate_role"))]
    pub role: String,
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct SharedRoleRequest {
    #[validate(custom(function = "validate_role"))]
    pub role: String,
}

#[derive(Debug, Deserialize, Validate, IntoParams, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct SharedListQuery {
    #[serde(default = "default_page")]
    #[validate(range(min = 1))]
    pub page: i64,
    #[serde(default = "default_per_page")]
    #[validate(range(min = 1, max = 100))]
    pub per_page: i64,
    #[serde(default)]
    #[validate(custom(function = "validate_item_type"))]
    pub item_type: Option<String>,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct SharedUser {
    pub id: Uuid,
    pub display_name: String,
    pub email: String,
    pub avatar_url: Option<String>,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct SharedItem {
    pub id: Uuid,
    pub item_type: String,
    pub item_id: i64,
    pub owner: SharedUser,
    pub recipient: SharedUser,
    pub role: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct SharedParticipant {
    pub id: Option<Uuid>,
    pub user: SharedUser,
    pub role: String,
    pub is_owner: bool,
    pub can_edit: bool,
    pub can_delete: bool,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct SharedAccess {
    pub role: String,
    pub can_edit: bool,
    pub can_delete: bool,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct SharedAccessResponse {
    pub has_access: bool,
    pub access: Option<SharedAccess>,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct SharedCounts {
    pub tasks: i64,
    pub projects: i64,
    pub habits: i64,
    pub total: i64,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PaginatedSharedItems {
    pub items: Vec<SharedItem>,
    pub page: i64,
    pub per_page: i64,
    pub has_more: bool,
    pub total: i64,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct SharedParticipantsResponse {
    pub item_type: String,
    pub item_id: i64,
    pub owner_id: Uuid,
    pub participants: Vec<SharedParticipant>,
}

fn default_role() -> String {
    "colaborador".to_owned()
}
fn default_page() -> i64 {
    1
}
fn default_per_page() -> i64 {
    50
}

fn validate_item_type(value: &str) -> Result<(), ValidationError> {
    if matches!(value, "tarea" | "proyecto" | "habito") {
        Ok(())
    } else {
        Err(ValidationError::new("item_type"))
    }
}

fn validate_role(value: &str) -> Result<(), ValidationError> {
    if matches!(value, "colaborador" | "observador") {
        Ok(())
    } else {
        Err(ValidationError::new("role"))
    }
}
