use chrono::{DateTime, Utc};
use serde::Serialize;
use serde_json::{json, Map, Value};
use utoipa::ToSchema;

pub const DASHBOARD_SCHEMA_VERSION: &str = "1.0.0";

/// Respuesta canónica de lectura del dashboard. No habilita escritura ni sincronización.
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct DashboardReadResponse {
    pub data: DashboardData,
    pub meta: DashboardMeta,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct DashboardData {
    pub version: String,
    pub habitos: Vec<Value>,
    pub tareas: Vec<Value>,
    pub proyectos: Vec<Value>,
    pub notas: String,
    pub configuracion: Value,
    pub ultima_actualizacion: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct DashboardMeta {
    pub loaded_at: DateTime<Utc>,
    pub server_timestamp: i64,
    pub shared_items_included: bool,
    pub truncated: bool,
}

#[must_use]
pub fn default_dashboard_config() -> Value {
    json!({
        "notificaciones": {
            "email": false,
            "frecuenciaResumen": "nunca",
            "horaPreferida": "09:00",
            "tareasPorVencer": true,
            "rachaEnPeligro": true
        },
        "cifradoE2E": false,
        "tema": "terminal",
        "ordenHabitos": "inteligente"
    })
}

#[must_use]
pub fn object_with_id(payload: Value, legacy_id: i64) -> Map<String, Value> {
    let mut object = match payload {
        Value::Object(object) => object,
        value => Map::from_iter([(String::from("data"), value)]),
    };
    object.insert(String::from("id"), json!(legacy_id));
    object
}

#[cfg(test)]
mod tests {
    use super::object_with_id;
    use serde_json::json;

    #[test]
    fn legacy_id_overrides_payload_id() {
        let value = object_with_id(json!({"id": 999, "texto": "leer"}), 12);
        assert_eq!(value.get("id"), Some(&json!(12)));
        assert_eq!(value.get("texto"), Some(&json!("leer")));
    }

    #[test]
    fn scalar_payload_is_preserved_under_data() {
        let value = object_with_id(json!("legacy"), 12);
        assert_eq!(value.get("id"), Some(&json!(12)));
        assert_eq!(value.get("data"), Some(&json!("legacy")));
    }
}
