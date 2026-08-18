use chrono::{DateTime, Utc};
use serde_json::{Map, Value};
use sqlx::{FromRow, PgPool};
use std::collections::HashSet;
use uuid::Uuid;

use crate::models::dashboard::{
    default_dashboard_config, object_with_id, DashboardData, DashboardMeta, DashboardReadResponse,
    DASHBOARD_SCHEMA_VERSION,
};

const MAX_DASHBOARD_ITEMS: usize = 500;
const SQL_DASHBOARD_LIMIT: i64 = 501;

#[derive(Debug, FromRow)]
struct SettingsRow {
    notes: String,
    config: Value,
    updated_at: DateTime<Utc>,
}

#[derive(Debug, FromRow)]
struct ProjectRow {
    legacy_id: i64,
    name: String,
    status: String,
    priority: Option<String>,
    urgency: String,
    due_at: Option<DateTime<Utc>>,
    sort_order: i32,
    payload: Value,
    updated_at: DateTime<Utc>,
}

#[derive(Debug, FromRow)]
struct TaskRow {
    legacy_id: i64,
    project_legacy_id: Option<i64>,
    parent_legacy_id: Option<i64>,
    text: String,
    completed: bool,
    priority: Option<String>,
    urgency: String,
    sort_order: i32,
    payload: Value,
    updated_at: DateTime<Utc>,
}

#[derive(Debug, FromRow)]
struct HabitRow {
    legacy_id: i64,
    name: String,
    importance: String,
    frequency_type: String,
    sort_order: i32,
    payload: Value,
    updated_at: DateTime<Utc>,
}

/// Proyecto compartido conmigo (join con el propietario para la metadata del compartido).
#[derive(Debug, FromRow)]
struct SharedProjectRow {
    legacy_id: i64,
    name: String,
    status: String,
    priority: Option<String>,
    urgency: String,
    due_at: Option<DateTime<Utc>>,
    sort_order: i32,
    payload: Value,
    updated_at: DateTime<Utc>,
    owner_id: Uuid,
    owner_display_name: String,
    owner_avatar_url: Option<String>,
    role: String,
}

/// Tarea que llega al dashboard por proyecto compartido o asignación directa.
#[derive(Debug, FromRow)]
struct SharedTaskRow {
    legacy_id: i64,
    project_legacy_id: Option<i64>,
    parent_legacy_id: Option<i64>,
    text: String,
    completed: bool,
    priority: Option<String>,
    urgency: String,
    sort_order: i32,
    payload: Value,
    updated_at: DateTime<Utc>,
    owner_id: Uuid,
    owner_display_name: String,
    owner_avatar_url: Option<String>,
    role: Option<String>,
}

pub struct DashboardRepository;

impl DashboardRepository {
    pub async fn read(pool: &PgPool, user_id: Uuid) -> Result<DashboardReadResponse, sqlx::Error> {
        let (settings, own_projects, own_tasks, own_habits, shared_projects, shared_tasks) = tokio::try_join!(
            Self::settings(pool, user_id),
            Self::projects(pool, user_id),
            Self::tasks(pool, user_id),
            Self::habits(pool, user_id),
            Self::shared_projects(pool, user_id),
            Self::shared_tasks(pool, user_id),
        )?;

        let mut projects: Vec<Value> = own_projects.into_iter().map(project_value).collect();
        let mut tasks: Vec<Value> = own_tasks.into_iter().map(task_value).collect();
        let mut habits: Vec<Value> = own_habits.into_iter().map(habit_value).collect();

        // Proyección own + shared (semántica legacy verificada): tareas y proyectos fusionan
        // lo propio con (proyectos compartidos + tareas de esos proyectos + tareas asignadas
        // a mí); los hábitos no se comparten y una tarea compartida directa no entra al
        // dashboard. Se deduplica por (propietario, legacy_id): una tarea asignada que además
        // pertenece a un proyecto compartido no debe aparecer dos veces.
        let mut seen_projects = HashSet::new();
        for row in shared_projects {
            if seen_projects.insert((row.owner_id, row.legacy_id)) {
                projects.push(shared_project_value(row));
            }
        }
        let mut seen_tasks = HashSet::new();
        for row in shared_tasks {
            if seen_tasks.insert((row.owner_id, row.legacy_id)) {
                tasks.push(shared_task_value(row));
            }
        }

        // `|` y no `||`: los tres arrays deben truncarse aunque el primero ya supere el límite.
        let truncated = truncate_at_limit(&mut projects)
            | truncate_at_limit(&mut tasks)
            | truncate_at_limit(&mut habits);

        let mut latest_update = settings.as_ref().map(|row| row.updated_at);
        for value in projects.iter().chain(tasks.iter()).chain(habits.iter()) {
            if let Some(updated_at) = value.get("updatedAt").and_then(Value::as_str) {
                if let Ok(parsed) = DateTime::parse_from_rfc3339(updated_at) {
                    let parsed = parsed.with_timezone(&Utc);
                    if latest_update.is_none_or(|current| parsed > current) {
                        latest_update = Some(parsed);
                    }
                }
            }
        }

        let (notes, config) = settings.map_or_else(
            || (String::new(), default_dashboard_config()),
            |row| (row.notes, row.config),
        );
        let loaded_at = Utc::now();

        Ok(DashboardReadResponse {
            data: DashboardData {
                version: DASHBOARD_SCHEMA_VERSION.to_owned(),
                habitos: habits,
                tareas: tasks,
                proyectos: projects,
                notas: notes,
                configuracion: config,
                ultima_actualizacion: latest_update,
            },
            meta: DashboardMeta {
                loaded_at,
                server_timestamp: loaded_at.timestamp_millis(),
                shared_items_included: true,
                truncated,
            },
        })
    }

    async fn settings(pool: &PgPool, user_id: Uuid) -> Result<Option<SettingsRow>, sqlx::Error> {
        sqlx::query_as(
            "SELECT notes, config, updated_at FROM dashboard_settings WHERE user_id = $1",
        )
        .bind(user_id)
        .fetch_optional(pool)
        .await
    }

    async fn projects(pool: &PgPool, user_id: Uuid) -> Result<Vec<ProjectRow>, sqlx::Error> {
        sqlx::query_as(
            "SELECT legacy_id, name, status, priority, urgency, due_at, sort_order, payload, updated_at
             FROM dashboard_projects
             WHERE user_id = $1 AND deleted_at IS NULL
             ORDER BY sort_order ASC, legacy_id ASC
             LIMIT $2",
        )
        .bind(user_id)
        .bind(SQL_DASHBOARD_LIMIT)
        .fetch_all(pool)
        .await
    }

    async fn tasks(pool: &PgPool, user_id: Uuid) -> Result<Vec<TaskRow>, sqlx::Error> {
        sqlx::query_as(
            "SELECT legacy_id, project_legacy_id, parent_legacy_id, text, completed, priority,
                    urgency, sort_order, payload, updated_at
             FROM dashboard_tasks
             WHERE user_id = $1 AND deleted_at IS NULL
             ORDER BY sort_order ASC, legacy_id ASC
             LIMIT $2",
        )
        .bind(user_id)
        .bind(SQL_DASHBOARD_LIMIT)
        .fetch_all(pool)
        .await
    }

    async fn habits(pool: &PgPool, user_id: Uuid) -> Result<Vec<HabitRow>, sqlx::Error> {
        sqlx::query_as(
            "SELECT legacy_id, name, importance, frequency_type, sort_order, payload, updated_at
             FROM dashboard_habits
             WHERE user_id = $1 AND deleted_at IS NULL
             ORDER BY sort_order ASC, legacy_id ASC
             LIMIT $2",
        )
        .bind(user_id)
        .bind(SQL_DASHBOARD_LIMIT)
        .fetch_all(pool)
        .await
    }

    /// Proyectos compartidos conmigo (join con el propietario para la metadata).
    async fn shared_projects(
        pool: &PgPool,
        user_id: Uuid,
    ) -> Result<Vec<SharedProjectRow>, sqlx::Error> {
        sqlx::query_as(
            "SELECT p.legacy_id, p.name, p.status, p.priority, p.urgency, p.due_at,
                    p.sort_order, p.payload, p.updated_at,
                    o.id AS owner_id, o.display_name AS owner_display_name,
                    o.avatar_url AS owner_avatar_url, s.role
             FROM shared_items s
             JOIN dashboard_projects p
               ON p.user_id = s.owner_id AND p.legacy_id = s.item_legacy_id AND p.deleted_at IS NULL
             JOIN users o ON o.id = s.owner_id
             WHERE s.recipient_id = $1 AND s.item_type = 'proyecto'
             ORDER BY p.sort_order ASC, p.legacy_id ASC
             LIMIT $2",
        )
        .bind(user_id)
        .bind(SQL_DASHBOARD_LIMIT)
        .fetch_all(pool)
        .await
    }

    /// Tareas que llegan al dashboard por las dos vías legacy: tareas de proyectos compartidos
    /// (rol del compartido) y tareas asignadas directamente a mí (`asignado_user_id` = yo,
    /// rol fijo `colaborador`). Una tarea compartida directa (tipo `tarea`) no entra.
    async fn shared_tasks(pool: &PgPool, user_id: Uuid) -> Result<Vec<SharedTaskRow>, sqlx::Error> {
        let project_tasks = sqlx::query_as(
            "SELECT t.legacy_id, t.project_legacy_id, t.parent_legacy_id, t.text, t.completed,
                    t.priority, t.urgency, t.sort_order, t.payload, t.updated_at,
                    o.id AS owner_id, o.display_name AS owner_display_name,
                    o.avatar_url AS owner_avatar_url, s.role
             FROM shared_items s
             JOIN dashboard_tasks t
               ON t.user_id = s.owner_id AND t.project_legacy_id = s.item_legacy_id
              AND t.deleted_at IS NULL
             JOIN users o ON o.id = s.owner_id
             WHERE s.recipient_id = $1 AND s.item_type = 'proyecto'
             ORDER BY t.sort_order ASC, t.legacy_id ASC
             LIMIT $2",
        )
        .bind(user_id)
        .bind(SQL_DASHBOARD_LIMIT)
        .fetch_all(pool)
        .await?;

        let assigned_tasks = sqlx::query_as(
            "SELECT t.legacy_id, t.project_legacy_id, t.parent_legacy_id, t.text, t.completed,
                    t.priority, t.urgency, t.sort_order, t.payload, t.updated_at,
                    o.id AS owner_id, o.display_name AS owner_display_name,
                    o.avatar_url AS owner_avatar_url, NULL AS role
             FROM dashboard_tasks t
             JOIN users o ON o.id = t.user_id
             WHERE t.asignado_user_id = $1
               AND t.user_id <> $1
               AND t.deleted_at IS NULL
             ORDER BY t.sort_order ASC, t.legacy_id ASC
             LIMIT $2",
        )
        .bind(user_id)
        .bind(SQL_DASHBOARD_LIMIT)
        .fetch_all(pool)
        .await?;

        let mut tasks = project_tasks;
        tasks.extend(assigned_tasks);
        Ok(tasks)
    }
}

fn project_value(row: ProjectRow) -> Value {
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

fn task_value(row: TaskRow) -> Value {
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

fn habit_value(row: HabitRow) -> Value {
    let mut object = object_with_id(row.payload, row.legacy_id);
    insert_if_missing(&mut object, "nombre", row.name.as_str());
    insert_if_missing(&mut object, "importancia", row.importance.as_str());
    insert_if_missing(&mut object, "frecuencia", row.frequency_type.as_str());
    insert_if_missing(&mut object, "orden", row.sort_order);
    object.insert(String::from("updatedAt"), updated_at_value(row.updated_at));
    Value::Object(object)
}

fn shared_project_value(row: SharedProjectRow) -> Value {
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

fn shared_task_value(row: SharedTaskRow) -> Value {
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

fn updated_at_value(updated_at: DateTime<Utc>) -> Value {
    serde_json::to_value(updated_at).expect("valid datetime serializes")
}

fn truncate_at_limit<T>(items: &mut Vec<T>) -> bool {
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
