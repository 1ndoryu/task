use chrono::{Datelike, Duration, NaiveDate, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use crate::errors::AppError;
use crate::models::habit_history::{
    is_valid_status, HabitHistoryResponse, HabitHistoryStats, HabitHistorySummaryDay,
};
use crate::models::{HabitHistoryEntry, MarkHabitDayRequest};
use crate::repositories::HabitHistoryRepository;

pub struct HabitHistoryService;

impl HabitHistoryService {
    pub async fn get(
        pool: &PgPool,
        user_id: Uuid,
        habit_id: i64,
        days: i64,
    ) -> Result<HabitHistoryResponse, AppError> {
        ensure_habit(pool, user_id, habit_id).await?;
        Self::read_response(pool, user_id, habit_id, days).await
    }

    async fn read_response(
        pool: &PgPool,
        user_id: Uuid,
        habit_id: i64,
        days: i64,
    ) -> Result<HabitHistoryResponse, AppError> {
        let today = Utc::now().date_naive();
        let requested_start = today - Duration::days(days - 1);
        let summary_start = today - Duration::days(days.max(7) - 1);
        let history =
            HabitHistoryRepository::list(pool, user_id, habit_id, summary_start, today).await?;
        Ok(build_response(
            habit_id,
            days,
            requested_start,
            today,
            history,
        ))
    }

    pub async fn mark_day(
        pool: &PgPool,
        user_id: Uuid,
        habit_id: i64,
        request: MarkHabitDayRequest,
    ) -> Result<HabitHistoryResponse, AppError> {
        ensure_habit(pool, user_id, habit_id).await?;
        validate_day(&request)?;
        HabitHistoryRepository::upsert_day(
            pool,
            user_id,
            habit_id,
            request.date,
            &request.status,
            request.notes.as_deref(),
        )
        .await?;
        Self::read_response(pool, user_id, habit_id, 30).await
    }

    pub async fn delete_day(
        pool: &PgPool,
        user_id: Uuid,
        habit_id: i64,
        date: NaiveDate,
    ) -> Result<HabitHistoryResponse, AppError> {
        ensure_habit(pool, user_id, habit_id).await?;
        if date > Utc::now().date_naive() {
            return Err(AppError::Validation(
                "No se pueden desmarcar fechas futuras".into(),
            ));
        }
        HabitHistoryRepository::delete_day(pool, user_id, habit_id, date).await?;
        Self::read_response(pool, user_id, habit_id, 30).await
    }
}

async fn ensure_habit(pool: &PgPool, user_id: Uuid, habit_id: i64) -> Result<(), AppError> {
    if habit_id <= 0
        || !HabitHistoryRepository::habit_belongs_to_user(pool, user_id, habit_id).await?
    {
        return Err(AppError::NotFound("Hábito no encontrado".into()));
    }
    Ok(())
}

fn validate_day(request: &MarkHabitDayRequest) -> Result<(), AppError> {
    if !is_valid_status(&request.status) {
        return Err(AppError::Validation("Estado de hábito no válido".into()));
    }
    if request.date > Utc::now().date_naive() {
        return Err(AppError::Validation(
            "No se pueden marcar fechas futuras".into(),
        ));
    }
    Ok(())
}

fn build_response(
    habit_id: i64,
    days: i64,
    requested_start: NaiveDate,
    today: NaiveDate,
    history: Vec<HabitHistoryEntry>,
) -> HabitHistoryResponse {
    let mut completed = 0;
    let mut postponed = 0;
    let mut skipped = 0;
    let mut status_by_date = std::collections::HashMap::new();
    for entry in &history {
        status_by_date.insert(entry.date, entry.status.clone());
        if entry.date < requested_start || entry.date > today {
            continue;
        }
        match entry.status.as_str() {
            "completado" => completed += 1,
            "pospuesto" => postponed += 1,
            "omitido" => skipped += 1,
            _ => {}
        }
    }
    let history = history
        .into_iter()
        .filter(|entry| entry.date >= requested_start && entry.date <= today)
        .collect();
    let total = completed + postponed + skipped;
    let summary_7_days = (0..7)
        .rev()
        .map(|offset| {
            let date = today - Duration::days(offset);
            HabitHistorySummaryDay {
                date,
                weekday: date.weekday().number_from_monday(),
                status: status_by_date.get(&date).cloned(),
                is_today: date == today,
            }
        })
        .collect();
    HabitHistoryResponse {
        habit_id,
        history,
        summary_7_days,
        stats: HabitHistoryStats {
            completed,
            postponed,
            skipped,
            total,
            completion_rate: if total == 0 {
                0
            } else {
                completed * 100 / total
            },
            days,
        },
    }
}
