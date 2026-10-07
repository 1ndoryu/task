// sentinel-disable-file sqlx-query-sin-macro sqlx-query-as-sin-macro
// [por que] sqlx sin feature "macros" ni DB en compile-time: query! rompe el build.
use chrono::{DateTime, Utc};
use serde_json::Value;
use sqlx::{Executor, FromRow, PgPool, PgTransaction, Postgres};
use uuid::Uuid;

use crate::models::productivity::{UpsertHabitRequest, UpsertProjectRequest, UpsertTaskRequest};

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
    /* [H-B04-03] Los upserts aceptan cualquier ejecutor sqlx (`&PgPool` para el
     * camino HTTP o `&mut Transaction` para orquestaciones atómicas como el
     * restore de backups): la firma pública no cambia y los call sites con pool
     * compilan igual porque `&PgPool` implementa `Executor`. */
    pub async fn upsert_project<'e, E>(
        executor: E,
        user_id: Uuid,
        legacy_id: i64,
        request: &UpsertProjectRequest,
    ) -> Result<Option<ProductivityWriteRow>, sqlx::Error>
    where
        E: Executor<'e, Database = Postgres>,
    {
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
        .fetch_optional(executor)
        .await
    }

    pub async fn upsert_task(
        pool: &PgPool,
        user_id: Uuid,
        legacy_id: i64,
        request: &UpsertTaskRequest,
    ) -> Result<TaskUpsertOutcome, sqlx::Error> {
        let mut transaction = pool.begin().await?;
        let outcome = Self::upsert_task_in(&mut transaction, user_id, legacy_id, request).await?;
        transaction.commit().await?;
        Ok(outcome)
    }

    /// Variante tx-aware de `upsert_task` para orquestaciones atómicas (p. ej.
    /// restore de backups): corre locks + validación + upsert dentro de una
    /// transacción ajena sin commit propio; quien abrió la transacción decide
    /// el commit/rollback. [H-B04-03]
    /* [H-B04-03] Recibe `&mut PgTransaction` y ejecuta sobre su conexión
     * interna (`&mut **transaction`): en sqlx 0.8 `&mut Transaction` ya no
     * implementa `Executor`, solo `&mut PgConnection` (doc de sqlx-core). */
    pub async fn upsert_task_in(
        transaction: &mut PgTransaction<'_>,
        user_id: Uuid,
        legacy_id: i64,
        request: &UpsertTaskRequest,
    ) -> Result<TaskUpsertOutcome, sqlx::Error> {
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
            .fetch_optional(&mut **transaction)
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
            .fetch_optional(&mut **transaction)
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
            .fetch_optional(&mut **transaction)
            .await?
            .is_some();
            if parent_id == legacy_id || !parent_is_root || target_has_children {
                return Ok(TaskUpsertOutcome::InvalidParent);
            }
        }

        let asignado_user_id = request.asignado_user_id();
        /* [27-08-2026] `completed_at` refleja SOLO la fecha real de completado
         * que el cliente conoce: el payload `fechaCompletado` (fecha local de
         * cuando se completó la tarea). Si el payload no la trae (p. ej. tareas
         * importadas desde WordPress, que nunca guardó la fecha), NO inventamos
         * NOW(): eso hacía que tareas viejas importadas aparecieran como
         * completadas HOY en el panel de Actividad (derivado del historial real).
         * Al desmarcar se limpia. Ver plan-paridad-sync-export. */
        let row = sqlx::query_as(
            "INSERT INTO dashboard_tasks
                (user_id, legacy_id, project_legacy_id, parent_legacy_id, text, completed, priority,
                 urgency, sort_order, payload, asignado_user_id, completed_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
                     CASE WHEN $6 THEN NULLIF($10 ->> 'fechaCompletado', '')::date ELSE NULL END)
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
                    WHEN EXCLUDED.completed
                        THEN COALESCE(
                            NULLIF(EXCLUDED.payload ->> 'fechaCompletado', '')::date,
                            /* [27-08-2026] Conservar el completed_at legítimo
                             * existente (tareas completadas en la app antes de
                             * que el front escribiera fechaCompletado); las
                             * importadas sin fecha ya fueron limpiadas. */
                            dashboard_tasks.completed_at
                        )
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
        .fetch_optional(&mut **transaction)
        .await?;
        Ok(row.map_or(TaskUpsertOutcome::Conflict, TaskUpsertOutcome::Written))
    }

    /// Upsert de hábito con la misma semántica LWW que tareas/proyectos
    /// ([188A-1]): expected_updated_at NULL = escritura incondicional.
    /// Soft-delete de proyecto: marca `deleted_at` y lo excluye del dashboard.
    /// Idempotente: si no existe (o ya estaba borrado) no es error; las lecturas
    /// ya filtran `deleted_at IS NULL`, así que el upsert posterior lo revive.
    /// [18-08-2026] El front syncroniza borrados por entidad (tombsones) porque
    /// el guardado por upsert nunca informa al servidor de lo que desapareció.
    pub async fn delete_project(
        pool: &PgPool,
        user_id: Uuid,
        legacy_id: i64,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            "UPDATE dashboard_projects
             SET deleted_at = NOW(), updated_at = NOW()
             WHERE user_id = $1 AND legacy_id = $2 AND deleted_at IS NULL",
        )
        .bind(user_id)
        .bind(legacy_id)
        .execute(pool)
        .await?;
        Ok(())
    }

    /// Soft-delete de tarea con la misma semántica que delete_project.
    pub async fn delete_task(
        pool: &PgPool,
        user_id: Uuid,
        legacy_id: i64,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            "UPDATE dashboard_tasks
             SET deleted_at = NOW(), updated_at = NOW()
             WHERE user_id = $1 AND legacy_id = $2 AND deleted_at IS NULL",
        )
        .bind(user_id)
        .bind(legacy_id)
        .execute(pool)
        .await?;
        Ok(())
    }

    /// Soft-delete de hábito con la misma semántica que delete_project.
    pub async fn delete_habit(
        pool: &PgPool,
        user_id: Uuid,
        legacy_id: i64,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            "UPDATE dashboard_habits
             SET deleted_at = NOW(), updated_at = NOW()
             WHERE user_id = $1 AND legacy_id = $2 AND deleted_at IS NULL",
        )
        .bind(user_id)
        .bind(legacy_id)
        .execute(pool)
        .await?;
        Ok(())
    }

    pub async fn upsert_habit<'e, E>(
        executor: E,
        user_id: Uuid,
        legacy_id: i64,
        request: &UpsertHabitRequest,
    ) -> Result<Option<ProductivityWriteRow>, sqlx::Error>
    where
        E: Executor<'e, Database = Postgres>,
    {
        sqlx::query_as(
            "INSERT INTO dashboard_habits
                (user_id, legacy_id, name, importance, frequency_type, sort_order, payload)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (user_id, legacy_id) DO UPDATE SET
                name = EXCLUDED.name,
                importance = EXCLUDED.importance,
                frequency_type = EXCLUDED.frequency_type,
                sort_order = EXCLUDED.sort_order,
                payload = EXCLUDED.payload,
                updated_at = NOW(),
                deleted_at = NULL
             /* [188A-1] El front es el unico escritor: expected_updated_at NULL =
              * escritura incondicional (last-write-wins). Con timestamp se
              * mantiene el lock optimista para clientes concurrentes. */
             WHERE ($8::timestamptz IS NOT NULL AND dashboard_habits.updated_at = $8)
                OR ($8::timestamptz IS NULL)
             RETURNING legacy_id, payload, updated_at",
        )
        .bind(user_id)
        .bind(legacy_id)
        .bind(&request.nombre)
        .bind(&request.importancia)
        .bind(&request.frecuencia)
        .bind(request.orden)
        .bind(request.payload_for_storage(legacy_id))
        .bind(request.expected_updated_at)
        .fetch_optional(executor)
        .await
    }

    /// [07AA-1] Tareas propias no borradas de una columna, ordenadas por
    /// `sort_order` (criterio del kanban; desempate por `legacy_id` como en
    /// la lectura del dashboard).
    pub async fn list_tasks_by_project(
        pool: &PgPool,
        user_id: Uuid,
        project_legacy_id: i64,
    ) -> Result<Vec<ProductivityWriteRow>, sqlx::Error> {
        sqlx::query_as(
            "SELECT legacy_id, payload, updated_at
             FROM dashboard_tasks
             WHERE user_id = $1 AND project_legacy_id = $2 AND deleted_at IS NULL
             ORDER BY sort_order ASC, legacy_id ASC",
        )
        .bind(user_id)
        .bind(project_legacy_id)
        .fetch_all(pool)
        .await
    }

    /// [07AA-1] El proyecto existe, es propio y no está borrado (clave estable
    /// de columna para el kanban).
    pub async fn project_exists(
        pool: &PgPool,
        user_id: Uuid,
        project_legacy_id: i64,
    ) -> Result<bool, sqlx::Error> {
        let found = sqlx::query_scalar::<_, i64>(
            "SELECT legacy_id
             FROM dashboard_projects
             WHERE user_id = $1 AND legacy_id = $2 AND deleted_at IS NULL",
        )
        .bind(user_id)
        .bind(project_legacy_id)
        .fetch_optional(pool)
        .await?;
        Ok(found.is_some())
    }
}

/// [07AA-1] Resultado del reordenado bulk sin acoplar al HTTP.
#[derive(Debug)]
pub enum BulkReorderOutcome {
    Applied(Vec<ProductivityWriteRow>),
    /// Alguna tarea no existe, es ajena o está borrada: nada se aplicó.
    UnknownTask(i64),
    /// Algún proyecto destino no existe, es ajeno o está borrado.
    UnknownProject(i64),
    /// El mismo `legacy_id` aparece dos veces en el lote.
    DuplicateTask(i64),
}

impl ProductivityRepository {
    /// [07AA-1] Reordenado/movido atómico: valida TODO el lote (existencia y
    /// propiedad de tareas y proyectos destino, sin duplicados) y lo aplica en
    /// una sola transacción; cualquier fallo revierte sin escribir nada.
    /// El payload canónico se mantiene coherente (`orden` y `proyectoId`
    /// viajan dentro del JSON que lee el dashboard).
    pub async fn bulk_reorder(
        pool: &PgPool,
        user_id: Uuid,
        movimientos: &[(i64, i32, Option<i64>)],
    ) -> Result<BulkReorderOutcome, sqlx::Error> {
        let mut vistos = std::collections::HashSet::with_capacity(movimientos.len());
        for (legacy_id, _, _) in movimientos {
            if !vistos.insert(*legacy_id) {
                return Ok(BulkReorderOutcome::DuplicateTask(*legacy_id));
            }
        }
        let mut transaction = pool.begin().await?;
        let ids: Vec<i64> = movimientos.iter().map(|(id, _, _)| *id).collect();
        let existentes = sqlx::query_scalar::<_, i64>(
            "SELECT legacy_id
             FROM dashboard_tasks
             WHERE user_id = $1 AND legacy_id = ANY($2) AND deleted_at IS NULL
             FOR UPDATE",
        )
        .bind(user_id)
        .bind(&ids)
        .fetch_all(&mut *transaction)
        .await?;
        let set: std::collections::HashSet<i64> = existentes.into_iter().collect();
        for (legacy_id, _, _) in movimientos {
            if !set.contains(legacy_id) {
                transaction.rollback().await?;
                return Ok(BulkReorderOutcome::UnknownTask(*legacy_id));
            }
        }
        let mut destinos: Vec<i64> = movimientos
            .iter()
            .filter_map(|(_, _, proyecto_id)| *proyecto_id)
            .collect();
        destinos.sort_unstable();
        destinos.dedup();
        for destino in &destinos {
            let existe = sqlx::query_scalar::<_, i64>(
                "SELECT legacy_id
                 FROM dashboard_projects
                 WHERE user_id = $1 AND legacy_id = $2 AND deleted_at IS NULL",
            )
            .bind(user_id)
            .bind(*destino)
            .fetch_optional(&mut *transaction)
            .await?;
            if existe.is_none() {
                transaction.rollback().await?;
                return Ok(BulkReorderOutcome::UnknownProject(*destino));
            }
        }
        let mut filas = Vec::with_capacity(movimientos.len());
        for (legacy_id, orden, proyecto_id) in movimientos {
            let fila = sqlx::query_as(
                "UPDATE dashboard_tasks
                 SET project_legacy_id = COALESCE($3, project_legacy_id),
                     sort_order = $4,
                     payload = COALESCE(payload, '{}'::jsonb)
                         || jsonb_build_object('orden', $4)
                         || jsonb_build_object('proyectoId', COALESCE($3, project_legacy_id)),
                     updated_at = NOW()
                 WHERE user_id = $1 AND legacy_id = $2 AND deleted_at IS NULL
                 RETURNING legacy_id, payload, updated_at",
            )
            .bind(user_id)
            .bind(*legacy_id)
            .bind(*proyecto_id)
            .bind(*orden)
            .fetch_one(&mut *transaction)
            .await?;
            filas.push(fila);
        }
        transaction.commit().await?;
        Ok(BulkReorderOutcome::Applied(filas))
    }
}
