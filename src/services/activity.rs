use chrono::{Duration, NaiveDate, Utc};
use serde_json::Value;
use uuid::Uuid;

use crate::errors::AppError;
use crate::models::activity::{
    is_valid_activity_type, is_valid_element_type, ActivityDayQuery, ActivityHeatmapDay,
    ActivityHeatmapResponse, ActivityPeriod, ActivityQuery, ActivityStats, ActivityStatsQuery,
    ActivityStatsResponse, RecordActivityRequest, RecordActivityResponse, ACTIVITY_TYPES,
};
use crate::repositories::{ActivityDetailParams, ActivityInsert, ActivityRepository};

const MAX_ACTIVITY_DAYS: i64 = 365;
const MAX_DETAILS_BYTES: usize = 16 * 1024;

pub struct ActivityService;

impl ActivityService {
    pub async fn heatmap(
        pool: &sqlx::PgPool,
        user_id: Uuid,
        query: ActivityQuery,
    ) -> Result<ActivityHeatmapResponse, AppError> {
        validate_filters(query.r#type.as_deref(), query.proyecto_id, query.habito_id)?;
        let period = resolve_period(
            query.periodo.as_str(),
            query.fecha_inicio,
            query.fecha_fin,
            query.fecha_hoy_local,
        )?;
        let rows = ActivityRepository::heatmap_rows(
            pool,
            user_id,
            period.start,
            period.end,
            query.r#type.as_deref(),
            query.proyecto_id,
            query.habito_id,
        )
        .await?;
        Ok(ActivityHeatmapResponse {
            success: true,
            heatmap: build_heatmap(rows),
            periodo: period.into_response(),
        })
    }

    pub async fn stats(
        pool: &sqlx::PgPool,
        user_id: Uuid,
        query: ActivityStatsQuery,
    ) -> Result<ActivityStatsResponse, AppError> {
        let period = resolve_period(
            "mes",
            query.fecha_inicio,
            query.fecha_fin,
            query.fecha_hoy_local,
        )?;
        let totals =
            ActivityRepository::stats_by_type(pool, user_id, period.start, period.end).await?;
        let active_days =
            ActivityRepository::active_days(pool, user_id, period.start, period.end).await?;
        let recent_dates = ActivityRepository::recent_dates(pool, user_id, period.end).await?;
        let mut total_map = std::collections::BTreeMap::new();
        for (activity_type, count) in totals {
            total_map.insert(activity_type, count);
        }
        Ok(ActivityStatsResponse {
            success: true,
            estadisticas: ActivityStats {
                totales: total_map,
                active_days,
                racha: current_streak(&recent_dates, period.end),
            },
            periodo: period.into_response(),
        })
    }

    pub async fn day(
        pool: &sqlx::PgPool,
        user_id: Uuid,
        query: ActivityDayQuery,
    ) -> Result<crate::models::activity::ActivityDayResponse, AppError> {
        validate_filters(query.r#type.as_deref(), query.proyecto_id, query.habito_id)?;
        let detail = ActivityRepository::detail_rows(
            pool,
            user_id,
            ActivityDetailParams {
                date: query.fecha,
                activity_type: query.r#type,
                project_id: query.proyecto_id,
                habit_id: query.habito_id,
                page: query.page,
                per_page: query.per_page,
            },
        )
        .await?;
        let truncated = detail.truncated;
        Ok(crate::models::activity::ActivityDayResponse {
            success: true,
            fecha: query.fecha,
            detalle: detail.items,
            page: query.page,
            per_page: query.per_page,
            truncated,
            next_page: truncated.then_some(query.page + 1),
        })
    }

    pub async fn record(
        pool: &sqlx::PgPool,
        user_id: Uuid,
        request: RecordActivityRequest,
    ) -> Result<RecordActivityResponse, AppError> {
        validate_record(&request)?;
        let date = request.date.unwrap_or_else(|| Utc::now().date_naive());
        let today = Utc::now().date_naive();
        if date > today {
            return Err(AppError::Validation(
                "No se pueden registrar actividades futuras".into(),
            ));
        }
        let local_time = request.local_time.unwrap_or_else(|| Utc::now().time());
        let details = request
            .details
            .unwrap_or_else(|| Value::Object(serde_json::Map::default()));

        let delete_type = match request.r#type.as_str() {
            "tarea_desmarcada" => Some("tarea_completada"),
            "habito_desmarcado" => Some("habito_cumplido"),
            _ => None,
        };
        if let Some(delete_type) = delete_type {
            let element_type = request.element_type.as_deref().ok_or_else(|| {
                AppError::Validation("elementType es obligatorio para desmarcar".into())
            })?;
            let element_id = request.element_id.ok_or_else(|| {
                AppError::Validation("elementId es obligatorio para desmarcar".into())
            })?;
            ActivityRepository::delete_for_element(
                pool,
                user_id,
                delete_type,
                element_type,
                element_id,
                date,
            )
            .await?;
            return Ok(RecordActivityResponse {
                success: true,
                accion: "eliminado".into(),
            });
        }

        let inserted = ActivityRepository::insert(
            pool,
            user_id,
            ActivityInsert {
                activity_type: &request.r#type,
                element_id: request.element_id,
                element_type: request.element_type.as_deref(),
                project_id: request.project_id,
                date,
                local_time,
                details: &details,
            },
        )
        .await?;
        Ok(RecordActivityResponse {
            success: true,
            accion: if inserted.is_some() {
                "registrado"
            } else {
                "duplicado_ignorado"
            }
            .into(),
        })
    }

    pub async fn delete(pool: &sqlx::PgPool, user_id: Uuid, id: i64) -> Result<(), AppError> {
        if id <= 0 || !ActivityRepository::delete(pool, user_id, id).await? {
            return Err(AppError::NotFound("Actividad no encontrada".into()));
        }
        Ok(())
    }
}

struct ResolvedPeriod {
    start: NaiveDate,
    end: NaiveDate,
    kind: String,
}

impl ResolvedPeriod {
    fn into_response(self) -> ActivityPeriod {
        ActivityPeriod {
            inicio: self.start,
            fin: self.end,
            tipo: self.kind,
        }
    }
}

fn resolve_period(
    period: &str,
    requested_start: Option<NaiveDate>,
    requested_end: Option<NaiveDate>,
    today_local: Option<NaiveDate>,
) -> Result<ResolvedPeriod, AppError> {
    let today = today_local.unwrap_or_else(|| Utc::now().date_naive());
    let days = match period {
        "semana" => 7,
        "mes" => 30,
        "trimestre" => 90,
        "anio" | "auto" => 365,
        _ => {
            return Err(AppError::Validation(
                "Periodo de actividad no válido".into(),
            ))
        }
    };
    let start = requested_start.unwrap_or(today - Duration::days(days - 1));
    let end = requested_end.unwrap_or(today);
    if start > end {
        return Err(AppError::Validation(
            "El inicio del periodo no puede superar el fin".into(),
        ));
    }
    if end > today {
        return Err(AppError::Validation(
            "El fin del periodo no puede ser futuro".into(),
        ));
    }
    if (end - start).num_days() + 1 > MAX_ACTIVITY_DAYS {
        return Err(AppError::Validation(
            "El periodo de actividad no puede superar 365 días".into(),
        ));
    }
    Ok(ResolvedPeriod {
        start,
        end,
        kind: period.to_owned(),
    })
}

fn validate_filters(
    activity_type: Option<&str>,
    project_id: Option<i64>,
    habit_id: Option<i64>,
) -> Result<(), AppError> {
    if let Some(activity_type) = activity_type {
        if !is_valid_activity_type(activity_type) {
            return Err(AppError::Validation(format!(
                "Tipo de actividad no válido; usa uno de: {}",
                ACTIVITY_TYPES.join(", ")
            )));
        }
    }
    if project_id.is_some_and(|id| id <= 0) || habit_id.is_some_and(|id| id <= 0) {
        return Err(AppError::Validation(
            "Los IDs de filtro deben ser positivos".into(),
        ));
    }
    Ok(())
}

fn validate_record(request: &RecordActivityRequest) -> Result<(), AppError> {
    if !is_valid_activity_type(&request.r#type) {
        return Err(AppError::Validation("Tipo de actividad no válido".into()));
    }
    if let Some(element_type) = request.element_type.as_deref() {
        if !is_valid_element_type(element_type) {
            return Err(AppError::Validation("Tipo de elemento no válido".into()));
        }
    }
    if request.element_id.is_some_and(|id| id <= 0) || request.project_id.is_some_and(|id| id <= 0)
    {
        return Err(AppError::Validation(
            "Los IDs de actividad deben ser positivos".into(),
        ));
    }
    if let Some(details) = &request.details {
        let bytes = serde_json::to_vec(details)
            .map_err(|_| AppError::Validation("Detalles de actividad inválidos".into()))?;
        if bytes.len() > MAX_DETAILS_BYTES {
            return Err(AppError::Validation(
                "Los detalles de actividad superan el límite permitido".into(),
            ));
        }
    }
    Ok(())
}

fn build_heatmap(
    rows: Vec<crate::repositories::ActivityCountRow>,
) -> std::collections::BTreeMap<NaiveDate, ActivityHeatmapDay> {
    let max_total = rows
        .iter()
        .fold(
            std::collections::BTreeMap::<NaiveDate, i64>::new(),
            |mut totals, row| {
                *totals.entry(row.date).or_default() += row.count;
                totals
            },
        )
        .values()
        .copied()
        .max()
        .unwrap_or(0);
    let mut heatmap = std::collections::BTreeMap::new();
    for row in rows {
        let day = heatmap
            .entry(row.date)
            .or_insert_with(|| ActivityHeatmapDay {
                nivel: 0,
                total: 0,
                tipos: std::collections::BTreeMap::new(),
            });
        day.total += row.count;
        day.tipos.insert(row.activity_type, row.count);
    }
    for day in heatmap.values_mut() {
        day.nivel = activity_level(day.total, max_total);
    }
    heatmap
}

fn activity_level(total: i64, max_total: i64) -> i32 {
    if total == 0 || max_total == 0 {
        return 0;
    }
    let percentage = total * 100 / max_total;
    match percentage {
        0..=25 => 1,
        26..=50 => 2,
        51..=75 => 3,
        _ => 4,
    }
}

fn current_streak(dates: &[NaiveDate], through: NaiveDate) -> i64 {
    let Some(first) = dates.first() else {
        return 0;
    };
    let mut expected = if *first == through {
        through
    } else if *first == through - Duration::days(1) {
        through - Duration::days(1)
    } else {
        return 0;
    };
    let mut streak = 0;
    for date in dates {
        if *date != expected {
            break;
        }
        streak += 1;
        expected -= Duration::days(1);
    }
    streak
}
