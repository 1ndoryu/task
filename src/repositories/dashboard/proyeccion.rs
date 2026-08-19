//! Proyección de filas del dashboard a objetos JSON con semántica legacy.
//! Extraído de `repositories/dashboard.rs` ([H-B03-01]).

use chrono::{DateTime, Utc};
use serde_json::{Map, Value};
use uuid::Uuid;

use crate::models::dashboard::object_with_id;
use super::lectura::{HabitRow, ProjectRow, SharedProjectRow, SharedTaskRow, TaskRow};

/// Límite de ítems devueltos por categoría (proyectos, tareas, hábitos).
const MAX_DASHBOARD_ITEMS: usize = 500;

pub(super) fn project_value(row: ProjectRow) -> Value {
    let mut object = project_object(
        row.legacy_id,
        &row.name,
        &row.status,
        row.priority.as_deref(),
        &row.urgency,
        row.due_at,
        row.sort_order,
        row.payload,
    );
    object.insert(String::from("updatedAt"), updated_at_value(row.updated_at));
    Value::Object(object)
}

pub(super) fn task_value(row: TaskRow) -> Value {
    let mut object = task_object(
        row.legacy_id,
        row.project_legacy_id,
        row.parent_legacy_id,
        &row.text,
        row.completed,
        row.priority.as_deref(),
        &row.urgency,
        row.sort_order,
        row.payload,
    );
    object.insert(String::from("updatedAt"), updated_at_value(row.updated_at));
    Value::Object(object)
}

pub(super) fn habit_value(row: HabitRow) -> Value {
    let mut object = object_with_id(row.payload, row.legacy_id);
    insert_if_missing(&mut object, "nombre", row.name.as_str());
    insert_if_missing(&mut object, "importancia", row.importance.as_str());
    insert_if_missing(&mut object, "frecuencia", row.frequency_type.as_str());
    insert_if_missing(&mut object, "orden", row.sort_order);
    object.insert(String::from("updatedAt"), updated_at_value(row.updated_at));
    Value::Object(object)
}

pub(super) fn shared_project_value(row: SharedProjectRow) -> Value {
    let mut object = project_object(
        row.legacy_id,
        &row.name,
        &row.status,
        row.priority.as_deref(),
        &row.urgency,
        row.due_at,
        row.sort_order,
        row.payload,
    );
    object.insert(String::from("updatedAt"), updated_at_value(row.updated_at));
    insert_shared_metadata(
        &mut object,
        row.owner_id,
        &row.owner_display_name,
        row.owner_avatar_url.as_deref(),
        &row.role,
    );
    Value::Object(object)
}

pub(super) fn shared_task_value(row: SharedTaskRow) -> Value {
    let mut object = task_object(
        row.legacy_id,
        row.project_legacy_id,
        row.parent_legacy_id,
        &row.text,
        row.completed,
        row.priority.as_deref(),
        &row.urgency,
        row.sort_order,
        row.payload,
    );
    object.insert(String::from("updatedAt"), updated_at_value(row.updated_at));
    insert_shared_metadata(
        &mut object,
        row.owner_id,
        &row.owner_display_name,
        row.owner_avatar_url.as_deref(),
        row.role.as_deref().unwrap_or("colaborador"),
    );
    Value::Object(object)
}

// Proyección cohesiva de una fila a objeto JSON; los argumentos son los campos de la fila,
// no un contrato público, por lo que el límite de aridad de clippy no aplica aquí.
#[allow(clippy::too_many_arguments)]
fn project_object(
    legacy_id: i64,
    name: &str,
    status: &str,
    priority: Option<&str>,
    urgency: &str,
    due_at: Option<DateTime<Utc>>,
    sort_order: i32,
    payload: Value,
) -> Map<String, Value> {
    let mut object = object_with_id(payload, legacy_id);
    insert_if_missing(&mut object, "nombre", name);
    insert_if_missing(&mut object, "estado", status);
    insert_if_missing(&mut object, "prioridad", priority);
    insert_if_missing(&mut object, "urgencia", urgency);
    insert_if_missing(&mut object, "fechaLimite", due_at);
    insert_if_missing(&mut object, "orden", sort_order);
    object
}

// Proyección cohesiva de una fila a objeto JSON; los argumentos son los campos de la fila,
// no un contrato público, por lo que el límite de aridad de clippy no aplica aquí.
#[allow(clippy::too_many_arguments)]
fn task_object(
    legacy_id: i64,
    project_legacy_id: Option<i64>,
    parent_legacy_id: Option<i64>,
    text: &str,
    completed: bool,
    priority: Option<&str>,
    urgency: &str,
    sort_order: i32,
    payload: Value,
) -> Map<String, Value> {
    let mut object = object_with_id(payload, legacy_id);
    insert_if_missing(&mut object, "texto", text);
    insert_if_missing(&mut object, "completado", completed);
    insert_if_missing(&mut object, "prioridad", priority);
    insert_if_missing(&mut object, "urgencia", urgency);
    insert_if_missing(&mut object, "proyectoId", project_legacy_id);
    insert_if_missing(&mut object, "parentId", parent_legacy_id);
    insert_if_missing(&mut object, "orden", sort_order);
    object
}

/// Metadata de compartido (misma semántica que `agregarMetadataCompartido` del legacy):
/// `esCompartido`, `propietarioId` (UUID canónico de Rust), `propietarioNombre`,
/// `propietarioAvatar` y `miRol`. Las tareas asignadas directamente usan rol
/// `colaborador`, igual que el legacy.
fn insert_shared_metadata(
    object: &mut Map<String, Value>,
    owner_id: Uuid,
    owner_display_name: &str,
    owner_avatar_url: Option<&str>,
    role: &str,
) {
    object.insert(String::from("esCompartido"), Value::Bool(true));
    object.insert(
        String::from("propietarioId"),
        Value::String(owner_id.to_string()),
    );
    object.insert(
        String::from("propietarioNombre"),
        Value::String(owner_display_name.to_owned()),
    );
    object.insert(
        String::from("propietarioAvatar"),
        owner_avatar_url.map_or(Value::Null, |url| Value::String(url.to_owned())),
    );
    object.insert(String::from("miRol"), Value::String(role.to_owned()));
}

pub(super) fn updated_at_value(updated_at: DateTime<Utc>) -> Value {
    serde_json::to_value(updated_at).expect("valid datetime serializes")
}

pub(super) fn truncate_at_limit<T>(items: &mut Vec<T>) -> bool {
    let truncated = items.len() > MAX_DASHBOARD_ITEMS;
    if truncated {
        items.truncate(MAX_DASHBOARD_ITEMS);
    }
    truncated
}

fn insert_if_missing<T: serde::Serialize>(object: &mut Map<String, Value>, key: &str, value: T) {
    object.entry(key.to_owned()).or_insert_with(|| {
        serde_json::to_value(value).expect("serializable dashboard projection value")
    });
}
