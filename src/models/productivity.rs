use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use utoipa::ToSchema;
use uuid::Uuid;
use validator::Validate;

use super::dashboard::object_with_id;

fn empty_payload() -> Value {
    Value::Object(Map::new())
}

/// [H-B02-02] Tope del payload JSONB: el front es el escritor legítimo, pero
/// un payload arbitrario de megabytes llegaría al almacenamiento sin control.
const PAYLOAD_MAX_BYTES: usize = 1024 * 1024;

fn validar_payload(payload: &Value) -> Result<(), validator::ValidationError> {
    if serde_json::to_vec(payload).map_or(0, |bytes| bytes.len()) > PAYLOAD_MAX_BYTES {
        let mut error = validator::ValidationError::new("payload_too_large");
        error.message = Some("El payload no puede exceder 1 MB".into());
        return Err(error);
    }
    Ok(())
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UpsertProjectRequest {
    #[validate(length(max = 120, message = "El nombre del proyecto no debe exceder 120 caracteres"))]
    pub nombre: String,
    #[serde(default = "default_project_status")]
    pub estado: String,
    #[serde(default)]
    pub prioridad: Option<String>,
    #[serde(default = "default_urgency")]
    pub urgencia: String,
    #[serde(default)]
    pub fecha_limite: Option<DateTime<Utc>>,
    #[serde(default)]
    pub orden: i32,
    #[serde(default = "empty_payload")]
    #[validate(custom(function = "validar_payload"))]
    pub payload: Value,
    #[serde(default)]
    pub expected_updated_at: Option<DateTime<Utc>>,
}

impl UpsertProjectRequest {
    #[must_use]
    pub fn payload_for_storage(&self, legacy_id: i64) -> Value {
        let mut object = object_with_id(self.payload.clone(), legacy_id);
        object.insert("nombre".into(), Value::String(self.nombre.clone()));
        object.insert("estado".into(), Value::String(self.estado.clone()));
        object.insert(
            "prioridad".into(),
            self.prioridad.clone().map_or(Value::Null, Value::String),
        );
        object.insert("urgencia".into(), Value::String(self.urgencia.clone()));
        object.insert(
            "fechaLimite".into(),
            serde_json::to_value(self.fecha_limite).expect("valid datetime serializes"),
        );
        object.insert("orden".into(), Value::from(self.orden));
        Value::Object(object)
    }
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UpsertTaskRequest {
    #[validate(length(max = 1000, message = "El texto de la tarea no debe exceder 1000 caracteres"))]
    pub texto: String,
    #[serde(default)]
    pub completado: bool,
    #[serde(default)]
    pub prioridad: Option<String>,
    #[serde(default = "default_urgency")]
    pub urgencia: String,
    #[serde(default, rename = "proyectoId")]
    pub proyecto_id: Option<i64>,
    #[serde(default, rename = "parentId")]
    pub parent_id: Option<i64>,
    #[serde(default)]
    pub orden: i32,
    #[serde(default = "empty_payload")]
    #[validate(custom(function = "validar_payload"))]
    pub payload: Value,
    #[serde(default)]
    pub expected_updated_at: Option<DateTime<Utc>>,
}

impl UpsertTaskRequest {
    #[must_use]
    pub fn payload_for_storage(&self, legacy_id: i64) -> Value {
        let mut object = object_with_id(self.payload.clone(), legacy_id);
        object.insert("texto".into(), Value::String(self.texto.clone()));
        object.insert("completado".into(), Value::Bool(self.completado));
        object.insert(
            "prioridad".into(),
            self.prioridad.clone().map_or(Value::Null, Value::String),
        );
        object.insert("urgencia".into(), Value::String(self.urgencia.clone()));
        object.insert(
            "proyectoId".into(),
            self.proyecto_id.map_or(Value::Null, Value::from),
        );
        object.insert(
            "parentId".into(),
            self.parent_id.map_or(Value::Null, Value::from),
        );
        object.insert("orden".into(), Value::from(self.orden));
        Value::Object(object)
    }

    /// Extrae la asignación nativa (`asignadoA` como UUID de Rust). El front envía la
    /// clave `asignadoA` (contrato legacy de forma) con el UUID del destinatario como
    /// valor; la columna tipada es la fuente consultable, sin correlación legacy.
    #[must_use]
    pub fn asignado_user_id(&self) -> Option<Uuid> {
        self.payload
            .get("asignadoA")
            .and_then(Value::as_str)
            .and_then(|value| Uuid::parse_str(value).ok())
    }
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UpsertHabitRequest {
    #[validate(length(max = 120, message = "El nombre del hábito no debe exceder 120 caracteres"))]
    pub nombre: String,
    #[serde(default = "default_habit_importance")]
    pub importancia: String,
    #[serde(default = "default_frequency")]
    pub frecuencia: String,
    #[serde(default)]
    pub orden: i32,
    #[serde(default = "empty_payload")]
    #[validate(custom(function = "validar_payload"))]
    pub payload: Value,
    #[serde(default)]
    pub expected_updated_at: Option<DateTime<Utc>>,
}

impl UpsertHabitRequest {
    #[must_use]
    pub fn payload_for_storage(&self, legacy_id: i64) -> Value {
        let mut object = object_with_id(self.payload.clone(), legacy_id);
        object.insert("nombre".into(), Value::String(self.nombre.clone()));
        object.insert("importancia".into(), Value::String(self.importancia.clone()));
        object.insert("frecuencia".into(), Value::String(self.frecuencia.clone()));
        object.insert("orden".into(), Value::from(self.orden));
        Value::Object(object)
    }
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ProductivityWriteResponse {
    pub id: i64,
    pub item: Value,
    pub updated_at: DateTime<Utc>,
}

fn default_project_status() -> String {
    "activo".to_owned()
}

fn default_urgency() -> String {
    "normal".to_owned()
}

fn default_habit_importance() -> String {
    "Media".to_owned()
}

fn default_frequency() -> String {
    "diario".to_owned()
}

#[cfg(test)]
mod tests {
    use super::{UpsertProjectRequest, UpsertTaskRequest};
    use chrono::Utc;
    use serde_json::json;

    #[test]
    fn task_storage_payload_is_canonical_and_uses_legacy_id() {
        let request = UpsertTaskRequest {
            texto: "Nueva tarea".into(),
            completado: true,
            prioridad: Some("alta".into()),
            urgencia: "normal".into(),
            proyecto_id: Some(7),
            parent_id: None,
            orden: 2,
            payload: json!({"id": 99, "texto": "stale"}),
            expected_updated_at: None,
        };

        let value = request.payload_for_storage(11);
        assert_eq!(value["id"], json!(11));
        assert_eq!(value["texto"], json!("Nueva tarea"));
        assert_eq!(value["proyectoId"], json!(7));
    }

    #[test]
    fn task_assignment_reads_native_uuid_from_payload() {
        let uuid = "a1b2c3d4-0000-4000-8000-000000000001";
        let assigned = UpsertTaskRequest {
            texto: "Asignada".into(),
            completado: false,
            prioridad: None,
            urgencia: "normal".into(),
            proyecto_id: None,
            parent_id: None,
            orden: 0,
            payload: json!({ "asignadoA": uuid }),
            expected_updated_at: None,
        };
        assert_eq!(assigned.asignado_user_id(), Some(uuid.parse().unwrap()));

        let invalid = UpsertTaskRequest {
            texto: "Invalida".into(),
            completado: false,
            prioridad: None,
            urgencia: "normal".into(),
            proyecto_id: None,
            parent_id: None,
            orden: 0,
            payload: json!({ "asignadoA": "no-es-un-uuid" }),
            expected_updated_at: None,
        };
        assert_eq!(invalid.asignado_user_id(), None);

        let none = UpsertTaskRequest {
            texto: "Sin asignar".into(),
            completado: false,
            prioridad: None,
            urgencia: "normal".into(),
            proyecto_id: None,
            parent_id: None,
            orden: 0,
            payload: json!({}),
            expected_updated_at: None,
        };
        assert_eq!(none.asignado_user_id(), None);
    }

    #[test]
    fn project_request_preserves_conflict_timestamp() {
        let timestamp = Utc::now();
        let request = UpsertProjectRequest {
            nombre: "Glory".into(),
            estado: "activo".into(),
            prioridad: None,
            urgencia: "normal".into(),
            fecha_limite: None,
            orden: 0,
            payload: json!({}),
            expected_updated_at: Some(timestamp),
        };
        assert_eq!(request.expected_updated_at, Some(timestamp));
    }
}
