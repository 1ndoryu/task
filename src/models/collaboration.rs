use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;
use validator::{Validate, ValidationError};

#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct TeamRequest {
    #[validate(email, length(max = 255))]
    pub email: String,
}

#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct TeamResponseRequest {
    pub action: String,
}

impl TeamResponseRequest {
    pub fn validate_action(&self) -> Result<(), ValidationError> {
        if matches!(self.action.as_str(), "accept" | "reject") {
            Ok(())
        } else {
            Err(ValidationError::new("team_action"))
        }
    }
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct TeamUser {
    pub id: Uuid,
    pub display_name: String,
    pub email: String,
    pub avatar_url: Option<String>,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct TeamConnection {
    pub id: Uuid,
    pub status: String,
    pub requested_at: DateTime<Utc>,
    pub responded_at: Option<DateTime<Utc>>,
    pub email: String,
    pub user: Option<TeamUser>,
    pub is_mine: bool,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct TeamMember {
    pub id: Uuid,
    pub connection_id: Uuid,
    pub user: TeamUser,
    pub connected_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct TeamCounts {
    pub received: i64,
    pub sent: i64,
    pub members: i64,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PendingTeamCount {
    pub pending: i64,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct TeamOverview {
    pub received: Vec<TeamConnection>,
    pub sent: Vec<TeamConnection>,
    pub members: Vec<TeamMember>,
    pub counts: TeamCounts,
    pub page: i64,
    pub per_page: i64,
    pub has_more: bool,
}
