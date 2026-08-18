use chrono::{DateTime, NaiveDate, Utc};
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

use crate::models::HabitHistoryEntry;

#[derive(Debug, FromRow)]
pub struct HabitHistoryRow {
    pub date: NaiveDate,
    pub status: String,
    pub notes: Option<String>,
    pub recorded_at: DateTime<Utc>,
}

pub struct HabitHistoryRepository;

impl HabitHistoryRepository {
    pub async fn habit_belongs_to_user(
        pool: &PgPool,
        user_id: Uuid,
        habit_id: i64,
    ) -> Result<bool, sqlx::Error> {
        let (exists,): (bool,) = sqlx::query_as(
            "SELECT EXISTS(
                 SELECT 1 FROM dashboard_habits
                 WHERE user_id = $1 AND legacy_id = $2 AND deleted_at IS NULL
             )",
        )
        .bind(user_id)
        .bind(habit_id)
        .fetch_one(pool)
        .await?;
        Ok(exists)
    }

    pub async fn list(
        pool: &PgPool,
        user_id: Uuid,
        habit_id: i64,
        start_date: NaiveDate,
        end_date: NaiveDate,
    ) -> Result<Vec<HabitHistoryEntry>, sqlx::Error> {
        let rows = sqlx::query_as::<_, HabitHistoryRow>(
            "SELECT date, status, notes, recorded_at
             FROM dashboard_habit_history
             WHERE user_id = $1 AND habit_legacy_id = $2
               AND date BETWEEN $3 AND $4
             ORDER BY date DESC",
        )
        .bind(user_id)
        .bind(habit_id)
        .bind(start_date)
        .bind(end_date)
        .fetch_all(pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|row| HabitHistoryEntry {
                date: row.date,
                status: row.status,
                notes: row.notes,
                recorded_at: row.recorded_at,
            })
            .collect())
    }

    pub async fn upsert_day(
        pool: &PgPool,
        user_id: Uuid,
        habit_id: i64,
        date: NaiveDate,
        status: &str,
        notes: Option<&str>,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            "INSERT INTO dashboard_habit_history
                (user_id, habit_legacy_id, date, status, notes)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (user_id, habit_legacy_id, date) DO UPDATE SET
                status = EXCLUDED.status,
                notes = EXCLUDED.notes,
                recorded_at = NOW()",
        )
        .bind(user_id)
        .bind(habit_id)
        .bind(date)
        .bind(status)
        .bind(notes)
        .execute(pool)
        .await?;
        Ok(())
    }

    pub async fn delete_day(
        pool: &PgPool,
        user_id: Uuid,
        habit_id: i64,
        date: NaiveDate,
    ) -> Result<bool, sqlx::Error> {
        let result = sqlx::query(
            "DELETE FROM dashboard_habit_history
             WHERE user_id = $1 AND habit_legacy_id = $2 AND date = $3",
        )
        .bind(user_id)
        .bind(habit_id)
        .bind(date)
        .execute(pool)
        .await?;
        Ok(result.rows_affected() > 0)
    }
}
