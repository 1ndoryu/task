//! Repositorio del dashboard.
//! [H-B03-01] `DashboardRepository` quedó como orquestación + API pública:
//! las consultas SQL viven en `dashboard/lectura.rs` y la proyección a JSON en
//! `dashboard/proyeccion.rs`. `read` y `upsert_settings` conservan su firma.

mod lectura;
mod proyeccion;

use chrono::{DateTime, Utc};
use serde_json::Value;
use sqlx::{Executor, PgPool, Postgres};
use std::collections::HashSet;
use uuid::Uuid;

use crate::models::dashboard::{
    default_dashboard_config, DashboardData, DashboardMeta, DashboardReadResponse,
    DASHBOARD_SCHEMA_VERSION,
};
use lectura::{habits, projects, settings, shared_projects, shared_tasks, tasks};
use proyeccion::{
    habit_value, project_value, shared_project_value, shared_task_value, task_value,
    truncate_at_limit,
};

pub struct DashboardRepository;

impl DashboardRepository {
    /// Guarda el scratchpad de notas, configuración y preferencias ([188A-1]).
    /// [18-08-2026] PUT parcial con merge atómico en SQL (H-B03-02): el merge
    /// completo ocurre en un único UPDATE (bajo el lock de fila del ON CONFLICT)
    /// en vez de read-modify-write en Rust, que perdía datos con dos PUT
    /// parciales concurrentes. Cada campo opcional conserva el valor actual si
    /// no viene: `notas` por COALESCE, `config` por `||` (la entrante gana por
    /// clave) y `preferencias` (blob UI/plugins) se preserva si no se envía.
    /* [H-B04-03] Acepta cualquier ejecutor sqlx (`&PgPool` en el camino HTTP,
     * `&mut Transaction` en orquestaciones atómicas como el restore de backups). */
    pub async fn upsert_settings<'e, E>(
        executor: E,
        user_id: Uuid,
        notas: Option<&str>,
        config: Option<Value>,
        preferencias: Option<Value>,
    ) -> Result<(), sqlx::Error>
    where
        E: Executor<'e, Database = Postgres>,
    {
        /* $5 = config por defecto: se usa como base para filas nuevas (paridad
         * con el DEFAULT de la columna) y como fallback si la fila no existe. */
        sqlx::query(
            "INSERT INTO dashboard_settings (user_id, notes, config, updated_at)
             VALUES ($1, COALESCE($2, ''),
                     $5 || COALESCE($3, '{}'::jsonb)
                       || jsonb_build_object('preferencias', COALESCE($4, '{}'::jsonb)),
                     NOW())
             ON CONFLICT (user_id) DO UPDATE SET
                notes = COALESCE($2, dashboard_settings.notes),
                config = COALESCE(dashboard_settings.config, $5)
                         || COALESCE($3, '{}'::jsonb)
                         || jsonb_build_object('preferencias', (
                             /* [25-08-2026] Merge LWW por clave: cada entrada del
                              * blob es {valor, ts}. Se fusiona lo existente con lo
                              * entrante y, por clave, gana la de mayor ts (legacy sin
                              * ts -> NULLS LAST -> pierde contra cualquier ts real).
                              * Un PUT parcial/vacío ya NO borra claves ajenas: el
                              * blob del servidor es fuente de verdad por clave. */
                             SELECT COALESCE(jsonb_object_agg(m.key, m.value), '{}'::jsonb)
                             FROM (
                                 SELECT DISTINCT ON (k.key) k.key AS key, k.value AS value
                                 FROM (
                                     SELECT key, value FROM jsonb_each(COALESCE(dashboard_settings.config->'preferencias', '{}'::jsonb))
                                     UNION ALL
                                     SELECT key, value FROM jsonb_each(COALESCE($4, '{}'::jsonb))
                                 ) k
                                 ORDER BY k.key, (k.value->>'ts')::bigint DESC NULLS LAST
                             ) m
                         )),
                updated_at = NOW()",
        )
        .bind(user_id)
        .bind(notas)
        .bind(config)
        .bind(preferencias)
        .bind(default_dashboard_config())
        .execute(executor)
        .await?;
        Ok(())
    }

    pub async fn read(pool: &PgPool, user_id: Uuid) -> Result<DashboardReadResponse, sqlx::Error> {
        let (settings, own_projects, own_tasks, own_habits, shared_projects, shared_tasks) = tokio::try_join!(
            settings(pool, user_id),
            projects(pool, user_id),
            tasks(pool, user_id),
            habits(pool, user_id),
            shared_projects(pool, user_id),
            shared_tasks(pool, user_id),
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
}
