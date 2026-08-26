use chrono::{NaiveDate, NaiveTime};
use serde_json::Value;
use sqlx::{FromRow, PgPool, Postgres, QueryBuilder};
use uuid::Uuid;

use crate::models::activity::ActivityDetailItem;

#[derive(Debug, FromRow)]
pub struct ActivityCountRow {
    pub date: NaiveDate,
    pub activity_type: String,
    pub element_id: Option<i64>,
    pub count: i64,
}

#[derive(Debug, FromRow)]
pub struct ActivityDetailRow {
    pub id: i64,
    pub activity_type: String,
    pub element_id: Option<i64>,
    pub element_type: Option<String>,
    pub project_id: Option<i64>,
    pub date: NaiveDate,
    pub local_time: Option<NaiveTime>,
    pub details: Value,
    pub element_name: Option<String>,
    pub project_name: Option<String>,
}

pub struct ActivityDetailPage {
    pub items: Vec<ActivityDetailItem>,
    pub truncated: bool,
}

pub struct ActivityDetailParams {
    pub date: NaiveDate,
    pub activity_type: Option<String>,
    pub project_id: Option<i64>,
    pub habit_id: Option<i64>,
    pub page: i64,
    pub per_page: i64,
}

pub struct ActivityInsert<'a> {
    pub activity_type: &'a str,
    pub element_id: Option<i64>,
    pub element_type: Option<&'a str>,
    pub project_id: Option<i64>,
    pub date: NaiveDate,
    pub local_time: NaiveTime,
    pub details: &'a Value,
}

/// [26-08-2026] Fila derivada del historial REAL de cumplimiento (no de un
/// evento registrado): hábitos cumplidos/pospuestos (payload + tabla detallada)
/// y tareas completadas (`completed_at`). Es la fuente de verdad del panel de
/// Actividad; `activity_events` solo complementa lo no derivable (notas,
/// adjuntos) y aporta la hora exacta cuando existe.
pub struct DerivedActivityRow {
    pub date: NaiveDate,
    pub activity_type: String,
    pub element_id: Option<i64>,
    pub element_type: Option<String>,
    pub project_id: Option<i64>,
    pub element_name: Option<String>,
}

pub struct ActivityRepository;

impl ActivityRepository {
    pub async fn heatmap_rows(
        pool: &PgPool,
        user_id: Uuid,
        start: NaiveDate,
        end: NaiveDate,
        activity_type: Option<&str>,
        project_id: Option<i64>,
        habit_id: Option<i64>,
    ) -> Result<Vec<ActivityCountRow>, sqlx::Error> {
        let mut query = QueryBuilder::<Postgres>::new(
            "SELECT date, type AS activity_type, element_legacy_id AS element_id,
                    COUNT(*)::bigint AS count
             FROM activity_events
             WHERE user_id = ",
        );
        query
            .push_bind(user_id)
            .push(" AND date BETWEEN ")
            .push_bind(start)
            .push(" AND ")
            .push_bind(end);
        add_filters(&mut query, activity_type, project_id, habit_id);
        query.push(
            " GROUP BY date, type, element_legacy_id ORDER BY date ASC, type ASC",
        );
        query.build_query_as().fetch_all(pool).await
    }

    /// [26-08-2026] Deriva las filas de cumplimiento del HISTORIAL REAL (fuente
    /// de verdad del panel de Actividad), no de eventos registrados:
    /// - Hábitos: `payload.historialCompletados`/`historialPospuestos` + la
    ///   tabla detallada `dashboard_habit_history` (estados precisos con notas).
    /// - Tareas: `payload.fechaCompletado` (zona local del cliente) con
    ///   fallback a `completed_at::date`.
    pub async fn derived_history_rows(
        pool: &PgPool,
        user_id: Uuid,
        start: NaiveDate,
        end: NaiveDate,
    ) -> Result<Vec<DerivedActivityRow>, sqlx::Error> {
        let mut rows = Vec::new();

        /* Hábitos: historial del payload + nombre para el detalle.
         * [26-08-2026] NO se filtra por deleted_at: la actividad es un hecho
         * durable. El soft-delete conserva el payload (con historialCompletados)
         * y dashboard_habit_history/activity_events no se limpian al borrar la
         * entidad, así que la actividad de hábitos eliminados debe persistir. */
        let habits: Vec<(i64, Value)> = sqlx::query_as(
            "SELECT legacy_id, payload FROM dashboard_habits
             WHERE user_id = $1",
        )
        .bind(user_id)
        .fetch_all(pool)
        .await?;
        for (legacy_id, payload) in habits {
            let nombre = payload.get("nombre").and_then(Value::as_str).map(str::to_owned);
            for (clave, tipo) in [
                ("historialCompletados", "habito_cumplido"),
                ("historialPospuestos", "habito_pospuesto"),
            ] {
                if let Some(fechas) = payload.get(clave).and_then(Value::as_array) {
                    for valor in fechas {
                        let Some(fecha_str) = valor.as_str() else { continue };
                        let Ok(fecha) = NaiveDate::parse_from_str(fecha_str, "%Y-%m-%d") else {
                            continue;
                        };
                        if fecha >= start && fecha <= end {
                            rows.push(DerivedActivityRow {
                                date: fecha,
                                activity_type: tipo.to_string(),
                                element_id: Some(legacy_id),
                                element_type: Some("habito".into()),
                                project_id: None,
                                element_name: nombre.clone(),
                            });
                        }
                    }
                }
            }
        }

        /* Tabla detallada: estados precisos (puede tener días que el payload
         * ya no lista tras purga de 365; ambos se deduplican en el servicio). */
        let detailed: Vec<(i64, NaiveDate, String)> = sqlx::query_as(
            "SELECT habit_legacy_id, date, status FROM dashboard_habit_history
             WHERE user_id = $1 AND date BETWEEN $2 AND $3",
        )
        .bind(user_id)
        .bind(start)
        .bind(end)
        .fetch_all(pool)
        .await?;
        for (legacy_id, fecha, status) in detailed {
            let activity_type = match status.as_str() {
                "completado" => "habito_cumplido",
                "pospuesto" => "habito_pospuesto",
                /* "omitido" no es un tipo de actividad: no es cumplimiento */
                _ => continue,
            };
            rows.push(DerivedActivityRow {
                date: fecha,
                activity_type: activity_type.to_string(),
                element_id: Some(legacy_id),
                element_type: Some("habito".into()),
                project_id: None,
                element_name: None,
            });
        }

        /* Tareas completadas: fecha local del cliente si está en el payload,
         * con fallback a completed_at (huso del servidor). Igual que hábitos:
         * sin filtro deleted_at para conservar la actividad de tareas borradas. */
        let tasks: Vec<(i64, Option<i64>, Value, Option<NaiveDate>)> = sqlx::query_as(
            "SELECT legacy_id, project_legacy_id, payload, completed_at::date
             FROM dashboard_tasks
             WHERE user_id = $1
               AND (payload ? 'fechaCompletado' OR completed_at IS NOT NULL)",
        )
        .bind(user_id)
        .fetch_all(pool)
        .await?;
        for (legacy_id, project_id, payload, completed_date) in tasks {
            let texto = payload.get("texto").and_then(Value::as_str).map(str::to_owned);
            let fecha = payload
                .get("fechaCompletado")
                .and_then(Value::as_str)
                .and_then(|s| NaiveDate::parse_from_str(s, "%Y-%m-%d").ok())
                .or(completed_date);
            if let Some(fecha) = fecha {
                if fecha >= start && fecha <= end {
                    rows.push(DerivedActivityRow {
                        date: fecha,
                        activity_type: "tarea_completada".to_string(),
                        element_id: Some(legacy_id),
                        element_type: Some("tarea".into()),
                        project_id,
                        element_name: texto,
                    });
                }
            }
        }

        Ok(rows)
    }

    pub async fn detail_rows(
        pool: &PgPool,
        user_id: Uuid,
        params: ActivityDetailParams,
    ) -> Result<ActivityDetailPage, sqlx::Error> {
        let mut query = QueryBuilder::<Postgres>::new(
            "SELECT a.id,
                    a.type AS activity_type,
                    a.element_legacy_id AS element_id,
                    a.element_type,
                    a.project_legacy_id AS project_id,
                    a.date,
                    a.local_time,
                    a.details,
                    COALESCE(NULLIF(t.text, ''), NULLIF(h.name, ''), a.details ->> 'elementoNombre') AS element_name,
                    COALESCE(NULLIF(p.name, ''), a.details ->> 'proyectoNombre') AS project_name
             FROM activity_events a
             LEFT JOIN dashboard_tasks t
               ON t.user_id = a.user_id
              AND t.legacy_id = a.element_legacy_id
              AND a.element_type = 'tarea'
              AND t.deleted_at IS NULL
             LEFT JOIN dashboard_habits h
               ON h.user_id = a.user_id
              AND h.legacy_id = a.element_legacy_id
              AND a.element_type = 'habito'
              AND h.deleted_at IS NULL
             LEFT JOIN dashboard_projects p
               ON p.user_id = a.user_id
              AND p.legacy_id = a.project_legacy_id
              AND p.deleted_at IS NULL
             WHERE a.user_id = ",
        );
        query
            .push_bind(user_id)
            .push(" AND a.date = ")
            .push_bind(params.date);
        add_filters_qualified(
            &mut query,
            params.activity_type.as_deref(),
            params.project_id,
            params.habit_id,
        );
        let limit = params.per_page + 1;
        let offset = (params.page - 1) * params.per_page;
        query
            .push(" ORDER BY a.local_time DESC NULLS LAST, a.id DESC LIMIT ")
            .push_bind(limit)
            .push(" OFFSET ")
            .push_bind(offset);
        let mut rows: Vec<ActivityDetailRow> = query.build_query_as().fetch_all(pool).await?;
        let page_size = usize::try_from(params.per_page)
            .map_err(|error| sqlx::Error::Protocol(error.to_string()))?;
        let truncated = rows.len() > page_size;
        if truncated {
            rows.truncate(page_size);
        }
        Ok(ActivityDetailPage {
            items: rows
                .into_iter()
                .map(|row| ActivityDetailItem {
                    id: row.id,
                    activity_type: row.activity_type,
                    element_id: row.element_id,
                    element_type: row.element_type,
                    project_id: row.project_id,
                    date: row.date,
                    time: row.local_time,
                    element_name: row.element_name,
                    project_name: row.project_name,
                    details: row.details,
                })
                .collect(),
            truncated,
        })
    }

    pub async fn stats_by_type(
        pool: &PgPool,
        user_id: Uuid,
        start: NaiveDate,
        end: NaiveDate,
    ) -> Result<Vec<(String, i64)>, sqlx::Error> {
        let rows: Vec<(String, i64)> = sqlx::query_as(
            "SELECT type, COUNT(*)::bigint
             FROM activity_events
             WHERE user_id = $1 AND date BETWEEN $2 AND $3
             GROUP BY type ORDER BY type",
        )
        .bind(user_id)
        .bind(start)
        .bind(end)
        .fetch_all(pool)
        .await?;
        Ok(rows)
    }

    pub async fn active_days(
        pool: &PgPool,
        user_id: Uuid,
        start: NaiveDate,
        end: NaiveDate,
    ) -> Result<i64, sqlx::Error> {
        let (count,): (i64,) = sqlx::query_as(
            "SELECT COUNT(DISTINCT date)::bigint
             FROM activity_events
             WHERE user_id = $1 AND date BETWEEN $2 AND $3",
        )
        .bind(user_id)
        .bind(start)
        .bind(end)
        .fetch_one(pool)
        .await?;
        Ok(count)
    }

    /// Fechas distintas con actividad registrada en el rango (para unir con el
    /// historial real al calcular días activos / racha).
    pub async fn distinct_dates(
        pool: &PgPool,
        user_id: Uuid,
        start: NaiveDate,
        end: NaiveDate,
    ) -> Result<Vec<(NaiveDate,)>, sqlx::Error> {
        sqlx::query_as(
            "SELECT DISTINCT date FROM activity_events
             WHERE user_id = $1 AND date BETWEEN $2 AND $3",
        )
        .bind(user_id)
        .bind(start)
        .bind(end)
        .fetch_all(pool)
        .await
    }

    pub async fn recent_dates(
        pool: &PgPool,
        user_id: Uuid,
        through: NaiveDate,
    ) -> Result<Vec<NaiveDate>, sqlx::Error> {
        let rows: Vec<(NaiveDate,)> = sqlx::query_as(
            "SELECT DISTINCT date
             FROM activity_events
             WHERE user_id = $1 AND date <= $2
             ORDER BY date DESC LIMIT 365",
        )
        .bind(user_id)
        .bind(through)
        .fetch_all(pool)
        .await?;
        Ok(rows.into_iter().map(|(date,)| date).collect())
    }

    pub async fn insert(
        pool: &PgPool,
        user_id: Uuid,
        input: ActivityInsert<'_>,
    ) -> Result<Option<i64>, sqlx::Error> {
        let row: Option<(i64,)> = sqlx::query_as(
            "INSERT INTO activity_events
                (user_id, type, element_legacy_id, element_type, project_legacy_id, date, local_time, details)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT DO NOTHING
             RETURNING id",
        )
        .bind(user_id)
        .bind(input.activity_type)
        .bind(input.element_id)
        .bind(input.element_type)
        .bind(input.project_id)
        .bind(input.date)
        .bind(input.local_time)
        .bind(input.details)
        .fetch_optional(pool)
        .await?;
        Ok(row.map(|(id,)| id))
    }

    pub async fn delete(pool: &PgPool, user_id: Uuid, id: i64) -> Result<bool, sqlx::Error> {
        let result = sqlx::query("DELETE FROM activity_events WHERE id = $1 AND user_id = $2")
            .bind(id)
            .bind(user_id)
            .execute(pool)
            .await?;
        Ok(result.rows_affected() > 0)
    }

    pub async fn delete_for_element(
        pool: &PgPool,
        user_id: Uuid,
        activity_type: &str,
        element_type: &str,
        element_id: i64,
        date: NaiveDate,
    ) -> Result<u64, sqlx::Error> {
        let result = sqlx::query(
            "DELETE FROM activity_events
             WHERE user_id = $1 AND type = $2 AND element_type = $3
               AND element_legacy_id = $4 AND date = $5",
        )
        .bind(user_id)
        .bind(activity_type)
        .bind(element_type)
        .bind(element_id)
        .bind(date)
        .execute(pool)
        .await?;
        Ok(result.rows_affected())
    }
}

fn add_filters(
    query: &mut QueryBuilder<'_, Postgres>,
    activity_type: Option<&str>,
    project_id: Option<i64>,
    habit_id: Option<i64>,
) {
    if let Some(activity_type) = activity_type {
        query
            .push(" AND type = ")
            .push_bind(activity_type.to_owned());
    }
    if let Some(project_id) = project_id {
        query
            .push(" AND project_legacy_id = ")
            .push_bind(project_id);
    }
    if let Some(habit_id) = habit_id {
        query
            .push(" AND element_type = 'habito' AND element_legacy_id = ")
            .push_bind(habit_id);
    }
}

fn add_filters_qualified(
    query: &mut QueryBuilder<'_, Postgres>,
    activity_type: Option<&str>,
    project_id: Option<i64>,
    habit_id: Option<i64>,
) {
    if let Some(activity_type) = activity_type {
        query
            .push(" AND a.type = ")
            .push_bind(activity_type.to_owned());
    }
    if let Some(project_id) = project_id {
        query
            .push(" AND a.project_legacy_id = ")
            .push_bind(project_id);
    }
    if let Some(habit_id) = habit_id {
        query
            .push(" AND a.element_type = 'habito' AND a.element_legacy_id = ")
            .push_bind(habit_id);
    }
}
