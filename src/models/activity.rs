use chrono::{NaiveDate, NaiveTime};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use utoipa::{IntoParams, ToSchema};
use validator::Validate;

pub const ACTIVITY_TYPES: [&str; 7] = [
    "tarea_completada",
    "habito_cumplido",
    "nota_creada",
    "adjunto_subido",
    "tarea_desmarcada",
    "habito_desmarcado",
    "habito_pospuesto",
];
pub const ACTIVITY_ELEMENT_TYPES: [&str; 4] = ["tarea", "habito", "nota", "proyecto"];
const DEFAULT_PERIOD: &str = "mes";
const DEFAULT_DETAIL_PAGE: i64 = 1;
const DEFAULT_DETAIL_PER_PAGE: i64 = 200;

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct ActivityHeatmapDay {
    pub nivel: i32,
    pub total: i64,
    pub tipos: std::collections::BTreeMap<String, i64>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct ActivityPeriod {
    pub inicio: NaiveDate,
    pub fin: NaiveDate,
    pub tipo: String,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct ActivityHeatmapResponse {
    pub success: bool,
    pub heatmap: std::collections::BTreeMap<NaiveDate, ActivityHeatmapDay>,
    pub periodo: ActivityPeriod,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct ActivityStats {
    pub totales: std::collections::BTreeMap<String, i64>,
    #[serde(rename = "diasActivos")]
    pub active_days: i64,
    pub racha: i64,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct ActivityStatsResponse {
    pub success: bool,
    pub estadisticas: ActivityStats,
    pub periodo: ActivityPeriod,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ActivityDetailItem {
    pub id: i64,
    #[serde(rename = "tipo")]
    pub activity_type: String,
    #[serde(rename = "elementoId")]
    pub element_id: Option<i64>,
    #[serde(rename = "elementoTipo")]
    pub element_type: Option<String>,
    #[serde(rename = "proyectoId")]
    pub project_id: Option<i64>,
    #[serde(rename = "fecha")]
    pub date: NaiveDate,
    #[serde(rename = "hora")]
    pub time: Option<NaiveTime>,
    #[serde(rename = "elementoNombre")]
    pub element_name: Option<String>,
    #[serde(rename = "proyectoNombre")]
    pub project_name: Option<String>,
    #[serde(rename = "detalles")]
    pub details: Value,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct ActivityDayResponse {
    pub success: bool,
    pub fecha: NaiveDate,
    pub detalle: Vec<ActivityDetailItem>,
    pub page: i64,
    #[serde(rename = "perPage")]
    pub per_page: i64,
    pub truncated: bool,
    #[serde(rename = "nextPage")]
    pub next_page: Option<i64>,
}

#[derive(Debug, Deserialize, IntoParams, Validate)]
#[serde(rename_all = "camelCase")]
pub struct ActivityQuery {
    #[serde(default = "default_period")]
    pub periodo: String,
    pub fecha_inicio: Option<NaiveDate>,
    pub fecha_fin: Option<NaiveDate>,
    #[serde(rename = "tipo")]
    pub r#type: Option<String>,
    pub proyecto_id: Option<i64>,
    pub habito_id: Option<i64>,
    pub fecha_hoy_local: Option<NaiveDate>,
}

#[derive(Debug, Deserialize, IntoParams, Validate)]
#[serde(rename_all = "camelCase")]
pub struct ActivityStatsQuery {
    pub fecha_inicio: Option<NaiveDate>,
    pub fecha_fin: Option<NaiveDate>,
    pub fecha_hoy_local: Option<NaiveDate>,
}

#[derive(Debug, Deserialize, IntoParams, Validate)]
#[serde(rename_all = "camelCase")]
pub struct ActivityDayQuery {
    pub fecha: NaiveDate,
    #[serde(rename = "tipo")]
    pub r#type: Option<String>,
    pub proyecto_id: Option<i64>,
    pub habito_id: Option<i64>,
    /// Página del detalle diario (empieza en 1).
    #[serde(default = "default_detail_page")]
    #[validate(range(min = 1, max = 10_000))]
    pub page: i64,
    /// Elementos por página; el máximo evita respuestas sin límite.
    #[serde(default = "default_detail_per_page")]
    #[validate(range(min = 1, max = 200))]
    pub per_page: i64,
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct RecordActivityRequest {
    #[validate(length(min = 1, max = 32))]
    #[serde(rename = "tipo")]
    pub r#type: String,
    #[serde(rename = "elementoId")]
    pub element_id: Option<i64>,
    #[serde(rename = "elementoTipo")]
    pub element_type: Option<String>,
    #[serde(rename = "proyectoId")]
    pub project_id: Option<i64>,
    #[serde(rename = "fecha")]
    pub date: Option<NaiveDate>,
    #[serde(rename = "horaLocal")]
    pub local_time: Option<NaiveTime>,
    #[serde(rename = "detalles")]
    pub details: Option<Value>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct RecordActivityResponse {
    pub success: bool,
    pub accion: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct DeleteActivityResponse {
    pub success: bool,
}

fn default_period() -> String {
    DEFAULT_PERIOD.to_owned()
}

fn default_detail_page() -> i64 {
    DEFAULT_DETAIL_PAGE
}

fn default_detail_per_page() -> i64 {
    DEFAULT_DETAIL_PER_PAGE
}

#[must_use]
pub fn is_valid_activity_type(value: &str) -> bool {
    ACTIVITY_TYPES.contains(&value)
}

#[must_use]
pub fn is_valid_element_type(value: &str) -> bool {
    ACTIVITY_ELEMENT_TYPES.contains(&value)
}
