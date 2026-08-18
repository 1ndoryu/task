use chrono::{DateTime, Utc};
use serde_json::Value;
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

use crate::models::productivity::{UpsertProjectRequest, UpsertTaskRequest};

#[derive(Debug, FromRow)]
pub struct ProductivityWriteRow {
    pub legacy_id: i64,
    pub payload: Value,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug)]
pub enum TaskUpsertOutcome {
    Written(ProductivityWriteRow),
    Conflict,
    InvalidParent,
}

pub struct ProductivityRepository;

impl ProductivityRepository {
    pub async fn upsert_project(
        pool: &PgPool,
        user_id: Uuid,
        legacy_id: i64,
        request: &UpsertProjectRequest,
    ) -> Result<Option<ProductivityWriteRow>, sqlx::Error> {
        sqlx::query_as(
            "INSERT INTO dashboard_projects
                (user_id, legacy_id, name, status, priority, urgency, due_at, sort_order, payload)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (user_id, legacy_id) DO UPDATE SET
                name = EXCLUDED.name,
                status = EXCLUDED.status,
                priority = EXCLUDED.priority,
                urgency = EXCLUDED.urgency,
                due_at = EXCLUDED.due_at,
                sort_order = EXCLUDED.sort_order,
                payload = EXCLUDED.payload,
                updated_at = NOW(),
                deleted_at = NULL
             /* [188A-1] El front es el unico escritor: expected_updated_at NULL =
              * escritura incondicional (last-write-wins). Con timestamp se
              * mantiene el lock optimista para clientes concurrentes. */
             WHERE ($10::timestamptz IS NOT NULL AND dashboard_projects.updated_at = $10)
                OR ($10::timestamptz IS NULL)
             RETURNING legacy_id, payload, updated_at",
        )
        .bind(user_id)
        .bind(legacy_id)
        .bind(&request.nombre)
        .bind(&request.estado)
        .bind(&request.prioridad)
        .bind(&request.urgencia)
        .bind(request.fecha_limite)
        .bind(request.orden)
        .bind(request.payload_for_storage(legacy_id))
        .bind(request.expected_updated_at)
        .fetch_optional(pool)
        .await
    }

    pub async fn upsert_task(
        pool: &PgPool,
        user_id: Uuid,
        legacy_id: i64,
        request: &UpsertTaskRequest,
    ) -> Result<TaskUpsertOutcome, sqlx::Error> {
        let mut transaction = pool.begin().await?;
        let mut lock_ids = vec![legacy_id];
        if let Some(parent_id) = request.parent_id {
            lock_ids.push(parent_id);
        }
        lock_ids.sort_unstable();
        lock_ids.dedup();
        for lock_id in lock_ids {
            sqlx::query_scalar::<_, i64>(
                "SELECT legacy_id
                 FROM dashboard_tasks
                 WHERE user_id = $1 AND legacy_id = $2
                 FOR UPDATE",
            )
            .bind(user_id)
            .bind(lock_id)
            .fetch_optional(&mut *transaction)
            .await?;
        }

        if let Some(parent_id) = request.parent_id {
            let parent_is_root = sqlx::query_scalar::<_, i64>(
                "SELECT legacy_id
                 FROM dashboard_tasks
                 WHERE user_id = $1
                   AND legacy_id = $2
                   AND deleted_at IS NULL
                   AND parent_legacy_id IS NULL",
            )
            .bind(user_id)
            .bind(parent_id)
            .fetch_optional(&mut *transaction)
            .await?
            .is_some();
            let target_has_children = sqlx::query_scalar::<_, i64>(
                "SELECT legacy_id
                 FROM dashboard_tasks
                 WHERE user_id = $1
                   AND parent_legacy_id = $2
                   AND deleted_at IS NULL
                 LIMIT 1",
            )
            .bind(user_id)
            .bind(legacy_id)
            .fetch_optional(&mut *transaction)
            .await?
            .is_some();
            if parent_id == legacy_id || !parent_is_root || target_has_children {
                return Ok(TaskUpsertOutcome::InvalidParent);
            }
        }

        let asignado_user_id = request.asignado_user_id();
        let row = sqlx::query_as(
            "INSERT INTO dashboard_tasks
                (user_id, legacy_id, project_legacy_id, parent_legacy_id, text, completed, priority,
                 urgency, sort_order, payload, asignado_user_id, completed_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
                     CASE WHEN $6 THEN NOW() ELSE NULL END)
             ON CONFLICT (user_id, legacy_id) DO UPDATE SET
                project_legacy_id = EXCLUDED.project_legacy_id,
                parent_legacy_id = EXCLUDED.parent_legacy_id,
                text = EXCLUDED.text,
                completed = EXCLUDED.completed,
                priority = EXCLUDED.priority,
                urgency = EXCLUDED.urgency,
                sort_order = EXCLUDED.sort_order,
                payload = EXCLUDED.payload,
                asignado_user_id = EXCLUDED.asignado_user_id,
                completed_at = CASE
                    WHEN EXCLUDED.completed THEN COALESCE(dashboard_tasks.completed_at, NOW())
                    ELSE NULL
                END,
                updated_at = NOW(),
                deleted_at = NULL
             /* [188A-1] El front es el unico escritor: expected_updated_at NULL =
              * escritura incondicional (last-write-wins). Con timestamp se
              * mantiene el lock optimista para clientes concurrentes. */
             WHERE ($12::timestamptz IS NOT NULL AND dashboard_tasks.updated_at = $12)
                OR ($12::timestamptz IS NULL)
             RETURNING legacy_id, payload, updated_at",
        )
        .bind(user_id)
        .bind(legacy_id)
        .bind(request.proyecto_id)
        .bind(request.parent_id)
        .bind(&request.texto)
        .bind(request.completado)
        .bind(&request.prioridad)
        .bind(&request.urgencia)
        .bind(request.orden)
        .bind(request.payload_for_storage(legacy_id))
        .bind(asignado_user_id)
        .bind(request.expected_updated_at)
        .fetch_optional(&mut *transaction)
        .await?;
        transaction.commit().await?;
        Ok(row.map_or(TaskUpsertOutcome::Conflict, TaskUpsertOutcome::Written))
    }
}
