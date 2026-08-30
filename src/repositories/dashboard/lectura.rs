// sentinel-disable-file sqlx-query-sin-macro sqlx-query-as-sin-macro
// [por que] sqlx sin feature "macros" ni DB en compile-time: query! rompe el build.
//! Consultas SQL de lectura del dashboard (propias + compartidas).
//! Extraído de `repositories/dashboard.rs` ([H-B03-01]): cada fila se devuelve
//! cruda y la proyección a JSON vive en `proyeccion.rs`.

use chrono::{DateTime, Utc};
use serde_json::Value;
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

/// Tope de filas por query: 500 se devuelven, la fila 501.ª marca truncamiento.
const SQL_DASHBOARD_LIMIT: i64 = 501;

#[derive(Debug, FromRow)]
pub(super) struct SettingsRow {
    pub(super) notes: String,
    pub(super) config: Value,
    pub(super) updated_at: DateTime<Utc>,
}

#[derive(Debug, FromRow)]
pub(super) struct ProjectRow {
    pub(super) legacy_id: i64,
    pub(super) name: String,
    pub(super) status: String,
    pub(super) priority: Option<String>,
    pub(super) urgency: String,
    pub(super) due_at: Option<DateTime<Utc>>,
    pub(super) sort_order: i32,
    pub(super) payload: Value,
    pub(super) updated_at: DateTime<Utc>,
}

#[derive(Debug, FromRow)]
pub(super) struct TaskRow {
    pub(super) legacy_id: i64,
    pub(super) project_legacy_id: Option<i64>,
    pub(super) parent_legacy_id: Option<i64>,
    pub(super) text: String,
    pub(super) completed: bool,
    pub(super) priority: Option<String>,
    pub(super) urgency: String,
    pub(super) sort_order: i32,
    pub(super) payload: Value,
    pub(super) updated_at: DateTime<Utc>,
}

#[derive(Debug, FromRow)]
pub(super) struct HabitRow {
    pub(super) legacy_id: i64,
    pub(super) name: String,
    pub(super) importance: String,
    pub(super) frequency_type: String,
    pub(super) sort_order: i32,
    pub(super) payload: Value,
    pub(super) updated_at: DateTime<Utc>,
}

/// Proyecto compartido conmigo (join con el propietario para la metadata del compartido).
#[derive(Debug, FromRow)]
pub(super) struct SharedProjectRow {
    pub(super) legacy_id: i64,
    pub(super) name: String,
    pub(super) status: String,
    pub(super) priority: Option<String>,
    pub(super) urgency: String,
    pub(super) due_at: Option<DateTime<Utc>>,
    pub(super) sort_order: i32,
    pub(super) payload: Value,
    pub(super) updated_at: DateTime<Utc>,
    pub(super) owner_id: Uuid,
    pub(super) owner_display_name: String,
    pub(super) owner_avatar_url: Option<String>,
    pub(super) role: String,
}

/// Tarea que llega al dashboard por proyecto compartido o asignación directa.
#[derive(Debug, FromRow)]
pub(super) struct SharedTaskRow {
    pub(super) legacy_id: i64,
    pub(super) project_legacy_id: Option<i64>,
    pub(super) parent_legacy_id: Option<i64>,
    pub(super) text: String,
    pub(super) completed: bool,
    pub(super) priority: Option<String>,
    pub(super) urgency: String,
    pub(super) sort_order: i32,
    pub(super) payload: Value,
    pub(super) updated_at: DateTime<Utc>,
    pub(super) owner_id: Uuid,
    pub(super) owner_display_name: String,
    pub(super) owner_avatar_url: Option<String>,
    pub(super) role: Option<String>,
}

pub(super) async fn settings(pool: &PgPool, user_id: Uuid) -> Result<Option<SettingsRow>, sqlx::Error> {
    sqlx::query_as(
        "SELECT notes, config, updated_at FROM dashboard_settings WHERE user_id = $1",
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await
}

pub(super) async fn projects(pool: &PgPool, user_id: Uuid) -> Result<Vec<ProjectRow>, sqlx::Error> {
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

pub(super) async fn tasks(pool: &PgPool, user_id: Uuid) -> Result<Vec<TaskRow>, sqlx::Error> {
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

pub(super) async fn habits(pool: &PgPool, user_id: Uuid) -> Result<Vec<HabitRow>, sqlx::Error> {
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
pub(super) async fn shared_projects(
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
pub(super) async fn shared_tasks(pool: &PgPool, user_id: Uuid) -> Result<Vec<SharedTaskRow>, sqlx::Error> {
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
