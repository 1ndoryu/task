use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};
use validator::Validate;

pub const HABIT_HISTORY_STATUSES: [&str; 3] = ["completado", "pospuesto", "omitido"];

#[derive(Debug, Clone, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct HabitHistoryEntry {
    pub date: NaiveDate,
    pub status: String,
    pub notes: Option<String>,
    pub recorded_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct HabitHistorySummaryDay {
    pub date: NaiveDate,
    pub weekday: u32,
    pub status: Option<String>,
    pub is_today: bool,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct HabitHistoryStats {
    pub completed: i64,
    pub postponed: i64,
    pub skipped: i64,
    pub total: i64,
    pub completion_rate: i64,
    pub days: i64,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct HabitHistoryResponse {
    pub habit_id: i64,
    pub history: Vec<HabitHistoryEntry>,
    pub summary_7_days: Vec<HabitHistorySummaryDay>,
    pub stats: HabitHistoryStats,
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct MarkHabitDayRequest {
    pub date: NaiveDate,
    #[validate(length(min = 1, max = 16))]
    pub status: String,
    #[validate(length(max = 5000))]
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize, IntoParams, Validate)]
pub struct HabitHistoryQuery {
    #[serde(default = "default_days")]
    #[validate(range(min = 1, max = 365))]
    pub days: i64,
}

fn default_days() -> i64 {
    30
}

#[must_use]
pub fn is_valid_status(status: &str) -> bool {
    HABIT_HISTORY_STATUSES.contains(&status)
}
