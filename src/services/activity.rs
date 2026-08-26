use chrono::{Duration, NaiveDate, Utc};
use serde_json::Value;
use uuid::Uuid;

use crate::errors::AppError;
use crate::models::activity::{
    is_valid_activity_type, is_valid_element_type, ActivityDayQuery, ActivityHeatmapDay,
    ActivityHeatmapResponse, ActivityPeriod, ActivityQuery, ActivityStats, ActivityStatsQuery,
    ActivityStatsResponse, RecordActivityRequest, RecordActivityResponse, ACTIVITY_TYPES,
};
use crate::repositories::{
    ActivityDetailParams, ActivityInsert, ActivityRepository, DerivedActivityRow,
};

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
        /* [26-08-2026] El panel de Actividad refleja el HISTORIAL REAL de
         * cumplimiento, no eventos registrados. Fusionamos las filas de
         * activity_events con las derivadas del historial (payload de hábitos +
         * tabla detallada + completed_at de tareas), deduplicando por
         * (fecha, tipo, elemento). activity_events solo complementa con lo no
         * derivable (notas/adjuntos) y la hora exacta del día. */
        let derived = ActivityRepository::derived_history_rows(
            pool,
            user_id,
            period.start,
            period.end,
        )
        .await?;
        let derived = apply_derived_filters(derived, query.r#type.as_deref(), query.proyecto_id, query.habito_id);
        Ok(ActivityHeatmapResponse {
            success: true,
            heatmap: build_heatmap(rows, derived),
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
        let recent_dates = ActivityRepository::recent_dates(pool, user_id, period.end).await?;
        /* [26-08-2026] Las estadísticas también deben reflejar el historial real
         * de cumplimiento (mismo merge que el heatmap): sin esto, un usuario
         * con todo su historial en el payload vería 0 totales y racha 0. */
        let derived =
            ActivityRepository::derived_history_rows(pool, user_id, period.start, period.end)
                .await?;
        let mut total_map: std::collections::BTreeMap<String, i64> = totals
            .into_iter()
            .collect();
        let mut fechas_historial: std::collections::HashSet<NaiveDate> =
            std::collections::HashSet::new();
        let mut claves_derivadas = std::collections::HashSet::new();
        for fila in derived {
            fechas_historial.insert(fila.date);
            if claves_derivadas.insert((fila.date, fila.activity_type.clone(), fila.element_id)) {
                *total_map.entry(fila.activity_type).or_default() += 1;
            }
        }
        let active_days = {
            let mut fechas_eventos = std::collections::HashSet::new();
            for (fecha,) in ActivityRepository::distinct_dates(
                pool,
                user_id,
                period.start,
                period.end,
            )
            .await?
            {
                fechas_eventos.insert(fecha);
            }
            fechas_eventos.union(&fechas_historial).count() as i64
        };
        /* Racha: días con actividad, unión de eventos y historial */
        let mut fechas_recientes: std::collections::HashSet<NaiveDate> =
            recent_dates.into_iter().collect();
        fechas_recientes.extend(fechas_historial);
        let mut fechas_ordenadas: Vec<NaiveDate> = fechas_recientes.into_iter().collect();
        fechas_ordenadas.sort_unstable_by(|a, b| b.cmp(a));
        Ok(ActivityStatsResponse {
            success: true,
            estadisticas: ActivityStats {
                totales: total_map,
                active_days,
                racha: current_streak(&fechas_ordenadas, period.end),
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
                activity_type: query.r#type.clone(),
                project_id: query.proyecto_id,
                habit_id: query.habito_id,
                page: query.page,
                per_page: query.per_page,
            },
        )
        .await?;
        let mut items = detail.items;
        /* [26-08-2026] Fusionar el historial real del día: si el usuario marcó
         * días (o los importó) sin que exista un evento registrado, el detalle
         * debe mostrarlos igualmente (mismo merge que el heatmap). Se deduplica
         * por (tipo, elemento): el evento real gana (tiene hora e id). Los
         * derivados usan id sintético negativo y hora null. */
        let derived = ActivityRepository::derived_history_rows(pool, user_id, query.fecha, query.fecha)
            .await?;
        let mut claves_presentes: std::collections::HashSet<(String, Option<i64>)> = items
            .iter()
            .map(|item| (item.activity_type.clone(), item.element_id))
            .collect();
        let mut id_sintetico: i64 = -1;
        for fila in apply_derived_filters(
            derived,
            query.r#type.as_deref(),
            query.proyecto_id,
            query.habito_id,
        ) {
            let clave = (fila.activity_type.clone(), fila.element_id);
            if claves_presentes.insert(clave) {
                items.push(crate::models::activity::ActivityDetailItem {
                    id: id_sintetico,
                    activity_type: fila.activity_type,
                    element_id: fila.element_id,
                    element_type: fila.element_type,
                    project_id: fila.project_id,
                    date: query.fecha,
                    time: None,
                    element_name: fila.element_name,
                    project_name: None,
                    details: serde_json::Value::Object(serde_json::Map::default()),
                });
                id_sintetico -= 1;
            }
        }
        /* Los derivados sin hora van al final (el SQL ya ordenó los eventos). */
        let truncated = detail.truncated;
        Ok(crate::models::activity::ActivityDayResponse {
            success: true,
            fecha: query.fecha,
            detalle: items,
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
    derived: Vec<DerivedActivityRow>,
) -> std::collections::BTreeMap<NaiveDate, ActivityHeatmapDay> {
    /* Filas de events agrupadas por (fecha, tipo, elemento). */
    let mut eventos: std::collections::HashMap<(NaiveDate, String, Option<i64>), i64> =
        std::collections::HashMap::new();
    for row in rows {
        *eventos
            .entry((row.date, row.activity_type.clone(), row.element_id))
            .or_default() += row.count;
    }
    /* Historial real: una unidad por (fecha, tipo, elemento); si ya existe un
     * evento para el mismo elemento no se duplica (el evento solo aporta la
     * hora y el conteo de filas). */
    let mut claves_derivadas = std::collections::HashSet::new();
    for fila in &derived {
        let clave = (fila.date, fila.activity_type.clone(), fila.element_id);
        if claves_derivadas.insert(clave.clone()) && !eventos.contains_key(&clave) {
            eventos.insert(clave, 1);
        }
    }
    /* Agregar por día */
    let mut por_dia: std::collections::BTreeMap<NaiveDate, i64> =
        std::collections::BTreeMap::new();
    for (clave, count) in &eventos {
        *por_dia.entry(clave.0).or_default() += count;
    }
    let max_total = por_dia.values().copied().max().unwrap_or(0);
    let mut heatmap = std::collections::BTreeMap::new();
    for (clave, count) in &eventos {
        let day = heatmap
            .entry(clave.0)
            .or_insert_with(|| ActivityHeatmapDay {
                nivel: 0,
                total: 0,
                tipos: std::collections::BTreeMap::new(),
            });
        day.total += count;
        *day.tipos.entry(clave.1.clone()).or_default() += count;
    }
    for day in heatmap.values_mut() {
        day.nivel = activity_level(day.total, max_total);
    }
    heatmap
}

/// Filtra las filas derivadas del historial real con los mismos filtros que
/// activity_events (tipo / proyecto / hábito).
fn apply_derived_filters(
    derived: Vec<DerivedActivityRow>,
    activity_type: Option<&str>,
    project_id: Option<i64>,
    habit_id: Option<i64>,
) -> Vec<DerivedActivityRow> {
    derived
        .into_iter()
        .filter(|fila| {
            if let Some(activity_type) = activity_type {
                if fila.activity_type != activity_type {
                    return false;
                }
            }
            if let Some(project_id) = project_id {
                if fila.project_id != Some(project_id) {
                    return false;
                }
            }
            if let Some(habit_id) = habit_id {
                if fila.element_id != Some(habit_id) || fila.element_type.as_deref() != Some("habito") {
                    return false;
                }
            }
            true
        })
        .collect()
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
