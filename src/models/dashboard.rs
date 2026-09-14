use chrono::{DateTime, SecondsFormat, Utc};
use serde::{Deserialize, Serialize};
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

/// Guarda el estado de dashboard no tipado (scratchpad de notas + configuración).
/// [188A-1] El front es el unico escritor; se persiste el blob completo.
/// [18-08-2026] `preferencias` es el blob de UI/plugins por usuario (layout,
/// sidebar, tema, ordenes, filtros, plugins activos...) que en WordPress vivia
/// solo en localStorage y se perdia al cambiar de navegador o limpiar cache.
/// Ahora el servidor es la fuente de verdad: se guarda dentro del objeto `config`
/// bajo la clave `preferencias` (JSONB, sin migracion de esquema).
///
/// PUT parcial: los tres campos son opcionales; el repositorio hace merge y
/// conserva lo no enviado (COALESCE). El front puede subir SOLO preferencias
/// sin reenviar notas ni configuracion.
#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UpdateDashboardSettingsRequest {
    #[serde(default)]
    pub notas: Option<String>,
    #[serde(default)]
    pub configuracion: Option<Value>,
    #[serde(default)]
    pub preferencias: Option<Value>,
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

/// Fecha del contrato JSON del dashboard. chrono serializa un `DateTime<Utc>`
/// como RFC 3339 **con `Z`** (`write_rfc3339(..., SecondsFormat::AutoSi,
/// use_z = true)`), que NO es lo mismo que `to_rfc3339()` (`use_z = false` →
/// `+00:00`). Se construye el `Value` directamente para que la proyección no
/// arrastre un `Result` que nunca falla; el test
/// `fecha_iso_coincide_con_serde` fija la equivalencia contra `serde_json`.
#[must_use]
pub fn fecha_iso(fecha: DateTime<Utc>) -> Value {
    Value::String(fecha.to_rfc3339_opts(SecondsFormat::AutoSi, true))
}

#[cfg(test)]
mod tests {
    use super::{fecha_iso, object_with_id};
    use chrono::{DateTime, Utc};
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

    #[test]
    fn fecha_iso_coincide_con_serde() {
        /* El contrato del frontend depende del formato exacto (`Z`, no
         * `+00:00`): se compara contra la serialización real de `serde_json`
         * para que un cambio de formato en chrono rompa aquí y no en el
         * cliente. `unwrap_or` sólo evita un `expect` en el test: si la
         * serialización fallara, el assert fallaría con `Null`. */
        for segundos in [0_i64, 1_787_000_000, -1] {
            for nanos in [0_u32, 123_456_789] {
                if let Some(fecha) = DateTime::<Utc>::from_timestamp(segundos, nanos) {
                    let serializado = serde_json::to_value(fecha).unwrap_or(serde_json::Value::Null);
                    assert_eq!(fecha_iso(fecha), serializado);
                }
            }
        }
    }
}
