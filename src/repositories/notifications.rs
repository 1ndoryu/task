// sentinel-disable-file sqlx-query-sin-macro sqlx-query-as-sin-macro
// [por que] sqlx sin feature "macros" ni DB en compile-time: query! rompe el build.
use chrono::{DateTime, Utc};
use serde_json::Value;
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

use crate::models::NotificationCreate;

#[derive(Debug, Clone, FromRow)]
pub struct NotificationRow {
    pub id: Uuid,
    pub user_id: Uuid,
    pub notification_type: String,
    pub title: String,
    pub content: Option<String>,
    pub metadata: Value,
    pub read_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

pub struct NotificationRepository;

impl NotificationRepository {
    pub async fn create(
        pool: &PgPool,
        input: NotificationCreate,
    ) -> Result<Option<NotificationRow>, sqlx::Error> {
        let columns = "user_id, notification_type, title, content, metadata, dedupe_key";
        let values = "($1, $2, $3, $4, $5, $6)";
        let returning =
            "id, user_id, notification_type, title, content, metadata, read_at, created_at";
        if let Some(dedupe_key) = input.dedupe_key {
            sqlx::query_as::<_, NotificationRow>(&format!(
                "INSERT INTO notifications ({columns}) VALUES {values}
                 ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING
                 RETURNING {returning}"
            ))
            .bind(input.user_id)
            .bind(input.notification_type)
            .bind(input.title)
            .bind(input.content)
            .bind(input.metadata)
            .bind(dedupe_key)
            .fetch_optional(pool)
            .await
        } else {
            sqlx::query_as::<_, NotificationRow>(&format!(
                "INSERT INTO notifications ({columns}) VALUES {values}
                 RETURNING {returning}"
            ))
            .bind(input.user_id)
            .bind(input.notification_type)
            .bind(input.title)
            .bind(input.content)
            .bind(input.metadata)
            .bind(None::<String>)
            .fetch_one(pool)
            .await
            .map(Some)
        }
    }

    pub async fn list(
        pool: &PgPool,
        user_id: Uuid,
        unread_only: bool,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<NotificationRow>, sqlx::Error> {
        let filter = if unread_only {
            " AND read_at IS NULL"
        } else {
            ""
        };
        let sql = format!(
            "SELECT id, user_id, notification_type, title, content, metadata, read_at, created_at
             FROM notifications
             WHERE user_id = $1{filter}
             ORDER BY created_at DESC, id DESC
             LIMIT $2 OFFSET $3"
        );
        sqlx::query_as::<_, NotificationRow>(&sql)
            .bind(user_id)
            .bind(limit)
            .bind(offset)
            .fetch_all(pool)
            .await
    }

    pub async fn count(
        pool: &PgPool,
        user_id: Uuid,
        unread_only: bool,
    ) -> Result<i64, sqlx::Error> {
        let filter = if unread_only {
            " AND read_at IS NULL"
        } else {
            ""
        };
        let sql = format!("SELECT COUNT(*)::BIGINT FROM notifications WHERE user_id = $1{filter}");
        sqlx::query_scalar::<_, i64>(&sql)
            .bind(user_id)
            .fetch_one(pool)
            .await
    }

    pub async fn mark_read(
        pool: &PgPool,
        user_id: Uuid,
        id: Uuid,
    ) -> Result<Option<NotificationRow>, sqlx::Error> {
        sqlx::query_as::<_, NotificationRow>(
            "UPDATE notifications
             SET read_at = COALESCE(read_at, NOW())
             WHERE id = $1 AND user_id = $2
             RETURNING id, user_id, notification_type, title, content, metadata, read_at, created_at",
        )
        .bind(id)
        .bind(user_id)
        .fetch_optional(pool)
        .await
    }

    pub async fn mark_all_read(pool: &PgPool, user_id: Uuid) -> Result<i64, sqlx::Error> {
        let result = sqlx::query(
            "UPDATE notifications SET read_at = NOW()
             WHERE user_id = $1 AND read_at IS NULL",
        )
        .bind(user_id)
        .execute(pool)
        .await?;
        Ok(i64::try_from(result.rows_affected()).unwrap_or(i64::MAX))
    }

    pub async fn delete(pool: &PgPool, user_id: Uuid, id: Uuid) -> Result<bool, sqlx::Error> {
        let result = sqlx::query("DELETE FROM notifications WHERE id = $1 AND user_id = $2")
            .bind(id)
            .bind(user_id)
            .execute(pool)
            .await?;
        Ok(result.rows_affected() == 1)
    }
}
