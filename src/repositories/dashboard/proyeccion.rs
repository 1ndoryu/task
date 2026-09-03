//! Proyección de filas del dashboard a objetos JSON con semántica legacy.
//! Extraído de `repositories/dashboard.rs` ([H-B03-01]).

use chrono::{DateTime, Utc};
use serde_json::{Map, Value};
use uuid::Uuid;

use crate::models::dashboard::object_with_id;
use super::lectura::{HabitRow, ProjectRow, SharedProjectRow, SharedTaskRow, TaskRow};

/// Límite de ítems devueltos por categoría (proyectos, tareas, hábitos).
const MAX_DASHBOARD_ITEMS: usize = 500;

/// Campos base de un proyecto para su proyección a JSON. Agrupa los 8
/// escalares que recibía `project_object` en un único parámetro
/// ([029A-1] parametros-excesivos-rs); se construye desde `ProjectRow` o
/// `SharedProjectRow` (los campos propios del compartido no entran aquí).
struct DatosProyecto {
    legacy_id: i64,
    nombre: String,
    estado: String,
    prioridad: Option<String>,
    urgencia: String,
    fecha_limite: Option<DateTime<Utc>>,
    orden: i32,
    payload: Value,
}

impl From<ProjectRow> for DatosProyecto {
    fn from(row: ProjectRow) -> Self {
        Self {
            legacy_id: row.legacy_id,
            nombre: row.name,
            estado: row.status,
            prioridad: row.priority,
            urgencia: row.urgency,
            fecha_limite: row.due_at,
            orden: row.sort_order,
            payload: row.payload,
        }
    }
}

impl From<SharedProjectRow> for DatosProyecto {
    fn from(row: SharedProjectRow) -> Self {
        Self {
            legacy_id: row.legacy_id,
            nombre: row.name,
            estado: row.status,
            prioridad: row.priority,
            urgencia: row.urgency,
            fecha_limite: row.due_at,
            orden: row.sort_order,
            payload: row.payload,
        }
    }
}

/// Campos base de una tarea para su proyección a JSON. Agrupa los 9
/// escalares que recibía `task_object` en un único parámetro
/// ([029A-1] parametros-excesivos-rs); se construye desde `TaskRow` o
/// `SharedTaskRow`.
struct DatosTarea {
    legacy_id: i64,
    proyecto_id: Option<i64>,
    padre_id: Option<i64>,
    texto: String,
    completada: bool,
    prioridad: Option<String>,
    urgencia: String,
    orden: i32,
    payload: Value,
}

impl From<TaskRow> for DatosTarea {
    fn from(row: TaskRow) -> Self {
        Self {
            legacy_id: row.legacy_id,
            proyecto_id: row.project_legacy_id,
            padre_id: row.parent_legacy_id,
            texto: row.text,
            completada: row.completed,
            prioridad: row.priority,
            urgencia: row.urgency,
            orden: row.sort_order,
            payload: row.payload,
        }
    }
}

impl From<SharedTaskRow> for DatosTarea {
    fn from(row: SharedTaskRow) -> Self {
        Self {
            legacy_id: row.legacy_id,
            proyecto_id: row.project_legacy_id,
            padre_id: row.parent_legacy_id,
            texto: row.text,
            completada: row.completed,
            prioridad: row.priority,
            urgencia: row.urgency,
            orden: row.sort_order,
            payload: row.payload,
        }
    }
}

pub(super) fn project_value(row: ProjectRow) -> Value {
    let updated_at = row.updated_at;
    let mut object = project_object(DatosProyecto::from(row));
    object.insert(String::from("updatedAt"), updated_at_value(updated_at));
    Value::Object(object)
}

pub(super) fn task_value(row: TaskRow) -> Value {
    let updated_at = row.updated_at;
    let mut object = task_object(DatosTarea::from(row));
    object.insert(String::from("updatedAt"), updated_at_value(updated_at));
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
    let SharedProjectRow {
        legacy_id,
        name,
        status,
        priority,
        urgency,
        due_at,
        sort_order,
        payload,
        updated_at,
        owner_id,
        owner_display_name,
        owner_avatar_url,
        role,
    } = row;
    let mut object = project_object(DatosProyecto {
        legacy_id,
        nombre: name,
        estado: status,
        prioridad: priority,
        urgencia: urgency,
        fecha_limite: due_at,
        orden: sort_order,
        payload,
    });
    object.insert(String::from("updatedAt"), updated_at_value(updated_at));
    insert_shared_metadata(
        &mut object,
        owner_id,
        &owner_display_name,
        owner_avatar_url.as_deref(),
        &role,
    );
    Value::Object(object)
}

pub(super) fn shared_task_value(row: SharedTaskRow) -> Value {
    let SharedTaskRow {
        legacy_id,
        project_legacy_id,
        parent_legacy_id,
        text,
        completed,
        priority,
        urgency,
        sort_order,
        payload,
        updated_at,
        owner_id,
        owner_display_name,
        owner_avatar_url,
        role,
    } = row;
    let mut object = task_object(DatosTarea {
        legacy_id,
        proyecto_id: project_legacy_id,
        padre_id: parent_legacy_id,
        texto: text,
        completada: completed,
        prioridad: priority,
        urgencia: urgency,
        orden: sort_order,
        payload,
    });
    object.insert(String::from("updatedAt"), updated_at_value(updated_at));
    insert_shared_metadata(
        &mut object,
        owner_id,
        &owner_display_name,
        owner_avatar_url.as_deref(),
        role.as_deref().unwrap_or("colaborador"),
    );
    Value::Object(object)
}

// Proyección cohesiva de una fila a objeto JSON; recibe la fila ya agrupada
// en `DatosProyecto` (un solo parámetro en vez de 8 escalares).
fn project_object(datos: DatosProyecto) -> Map<String, Value> {
    let mut object = object_with_id(datos.payload, datos.legacy_id);
    insert_if_missing(&mut object, "nombre", datos.nombre);
    insert_if_missing(&mut object, "estado", datos.estado);
    insert_if_missing(&mut object, "prioridad", datos.prioridad);
    insert_if_missing(&mut object, "urgencia", datos.urgencia);
    insert_if_missing(&mut object, "fechaLimite", datos.fecha_limite);
    insert_if_missing(&mut object, "orden", datos.orden);
    object
}

// Proyección cohesiva de una fila a objeto JSON; recibe la fila ya agrupada
// en `DatosTarea` (un solo parámetro en vez de 9 escalares).
fn task_object(datos: DatosTarea) -> Map<String, Value> {
    let mut object = object_with_id(datos.payload, datos.legacy_id);
    insert_if_missing(&mut object, "texto", datos.texto);
    insert_if_missing(&mut object, "completado", datos.completada);
    insert_if_missing(&mut object, "prioridad", datos.prioridad);
    insert_if_missing(&mut object, "urgencia", datos.urgencia);
    insert_if_missing(&mut object, "proyectoId", datos.proyecto_id);
    insert_if_missing(&mut object, "parentId", datos.padre_id);
    insert_if_missing(&mut object, "orden", datos.orden);
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
