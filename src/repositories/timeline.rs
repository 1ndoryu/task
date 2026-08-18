use chrono::{DateTime, Utc};
use serde_json::Value;
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

#[derive(Debug, FromRow)]
pub struct TimelineRow {
    pub id: Uuid,
    pub item_type: String,
    pub item_id: i64,
    pub user_id: Uuid,
    pub user_name: String,
    pub avatar_url: Option<String>,
    pub message_type: String,
    pub content: String,
    pub system_action: Option<String>,
    pub metadata: Value,
    pub created_at: DateTime<Utc>,
}

pub struct TimelineRepository;

pub struct TimelineSystemInsert<'a> {
    pub owner_id: Uuid,
    pub item_type: &'a str,
    pub item_id: i64,
    pub user_id: Uuid,
    pub action: &'a str,
    pub content: &'a str,
    pub metadata: &'a Value,
}

impl TimelineRepository {
    pub async fn owner_id(
        pool: &PgPool,
        viewer_id: Uuid,
        item_type: &str,
        item_id: i64,
    ) -> Result<Option<Uuid>, sqlx::Error> {
        let Some(table) = table_for(item_type) else {
            return Ok(None);
        };
        let sql = format!(
            "SELECT user_id FROM {table}
             WHERE legacy_id = $1 AND deleted_at IS NULL
               AND (user_id = $2 OR EXISTS (
                   SELECT 1 FROM shared_items s
                   WHERE s.owner_id = {table}.user_id
                     AND s.recipient_id = $2
                     AND s.item_type = $3
                     AND s.item_legacy_id = $1
               ))
             ORDER BY (user_id = $2) DESC LIMIT 1"
        );
        sqlx::query_scalar::<_, Uuid>(&sql)
            .bind(item_id)
            .bind(viewer_id)
            .bind(item_type)
            .fetch_optional(pool)
            .await
    }

    pub async fn list(
        pool: &PgPool,
        owner_id: Uuid,
        item_type: &str,
        item_id: i64,
        limit: i64,
        offset: i64,
        _viewer_id: Uuid,
    ) -> Result<Vec<TimelineRow>, sqlx::Error> {
        sqlx::query_as::<_, TimelineRow>(
            "SELECT m.id, m.item_type, m.item_legacy_id AS item_id, m.user_id,
                    u.display_name AS user_name, u.avatar_url,
                    m.message_type, m.content, m.system_action, m.metadata, m.created_at
             FROM timeline_messages m JOIN users u ON u.id = m.user_id
             WHERE m.owner_id = $1 AND m.item_type = $2 AND m.item_legacy_id = $3
             ORDER BY m.created_at ASC, m.id ASC LIMIT $4 OFFSET $5",
        )
        .bind(owner_id)
        .bind(item_type)
        .bind(item_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(pool)
        .await
    }

    pub async fn count(
        pool: &PgPool,
        owner_id: Uuid,
        item_type: &str,
        item_id: i64,
    ) -> Result<i64, sqlx::Error> {
        sqlx::query_scalar("SELECT COUNT(*)::BIGINT FROM timeline_messages WHERE owner_id = $1 AND item_type = $2 AND item_legacy_id = $3")
            .bind(owner_id).bind(item_type).bind(item_id).fetch_one(pool).await
    }

    pub async fn insert_user(
        pool: &PgPool,
        owner_id: Uuid,
        item_type: &str,
        item_id: i64,
        user_id: Uuid,
        content: &str,
    ) -> Result<TimelineRow, sqlx::Error> {
        sqlx::query_as::<_, TimelineRow>(
            "WITH inserted AS (
                 INSERT INTO timeline_messages (owner_id, item_type, item_legacy_id, user_id, message_type, content)
                 VALUES ($1, $2, $3, $4, 'usuario', $5)
                 RETURNING id, item_type, item_legacy_id, user_id, message_type, content, system_action, metadata, created_at
             )
             SELECT i.id, i.item_type, i.item_legacy_id AS item_id, i.user_id,
                    u.display_name AS user_name, u.avatar_url,
                    i.message_type, i.content, i.system_action, i.metadata, i.created_at
             FROM inserted i JOIN users u ON u.id = i.user_id",
        ).bind(owner_id).bind(item_type).bind(item_id).bind(user_id).bind(content).fetch_one(pool).await
    }

    pub async fn insert_system(
        pool: &PgPool,
        input: TimelineSystemInsert<'_>,
    ) -> Result<TimelineRow, sqlx::Error> {
        sqlx::query_as::<_, TimelineRow>(
            "WITH inserted AS (
                 INSERT INTO timeline_messages (owner_id, item_type, item_legacy_id, user_id, message_type, content, system_action, metadata)
                 VALUES ($1, $2, $3, $4, 'sistema', $5, $6, $7)
                 RETURNING id, item_type, item_legacy_id, user_id, message_type, content, system_action, metadata, created_at
             )
             SELECT i.id, i.item_type, i.item_legacy_id AS item_id, i.user_id,
                    u.display_name AS user_name, u.avatar_url,
                    i.message_type, i.content, i.system_action, i.metadata, i.created_at
             FROM inserted i JOIN users u ON u.id = i.user_id",
        ).bind(input.owner_id).bind(input.item_type).bind(input.item_id).bind(input.user_id).bind(input.content).bind(input.action).bind(input.metadata).fetch_one(pool).await
    }

    pub async fn mark_read(
        pool: &PgPool,
        user_id: Uuid,
        owner_id: Uuid,
        item_type: &str,
        item_id: i64,
    ) -> Result<bool, sqlx::Error> {
        let latest = sqlx::query_as::<_, (Uuid, DateTime<Utc>)>(
            "SELECT id, created_at FROM timeline_messages WHERE owner_id = $1 AND item_type = $2 AND item_legacy_id = $3 ORDER BY created_at DESC, id DESC LIMIT 1",
        ).bind(owner_id).bind(item_type).bind(item_id).fetch_optional(pool).await?;
        let Some((message_id, created_at)) = latest else {
            return Ok(false);
        };
        sqlx::query(
            "INSERT INTO timeline_reads (user_id, owner_id, item_type, item_legacy_id, last_message_created_at, last_message_id)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (user_id, owner_id, item_type, item_legacy_id) DO UPDATE
             SET last_message_created_at = EXCLUDED.last_message_created_at,
                 last_message_id = EXCLUDED.last_message_id, read_at = NOW()",
        ).bind(user_id).bind(owner_id).bind(item_type).bind(item_id).bind(created_at).bind(message_id).execute(pool).await?;
        Ok(true)
    }

    pub async fn unread(
        pool: &PgPool,
        user_id: Uuid,
        owner_id: Uuid,
        item_type: &str,
        item_id: i64,
    ) -> Result<i64, sqlx::Error> {
        sqlx::query_scalar(
            "SELECT COUNT(*)::BIGINT FROM timeline_messages m
             LEFT JOIN timeline_reads r ON r.user_id = $1 AND r.owner_id = m.owner_id AND r.item_type = m.item_type AND r.item_legacy_id = m.item_legacy_id
             WHERE m.owner_id = $2 AND m.item_type = $3 AND m.item_legacy_id = $4 AND m.user_id <> $1
               AND (r.last_message_created_at IS NULL OR (m.created_at, m.id) > (r.last_message_created_at, r.last_message_id))",
        ).bind(user_id).bind(owner_id).bind(item_type).bind(item_id).fetch_one(pool).await
    }

    pub async fn participant_ids(
        pool: &PgPool,
        owner_id: Uuid,
        item_type: &str,
        item_id: i64,
    ) -> Result<Vec<Uuid>, sqlx::Error> {
        sqlx::query_scalar("SELECT recipient_id FROM shared_items WHERE owner_id = $1 AND item_type = $2 AND item_legacy_id = $3")
            .bind(owner_id).bind(item_type).bind(item_id).fetch_all(pool).await
            .map(|mut ids: Vec<Uuid>| { ids.push(owner_id); ids.sort_unstable(); ids.dedup(); ids })
    }
}

fn table_for(item_type: &str) -> Option<&'static str> {
    match item_type {
        "tarea" => Some("dashboard_tasks"),
        "proyecto" => Some("dashboard_projects"),
        "habito" => Some("dashboard_habits"),
        _ => None,
    }
}
