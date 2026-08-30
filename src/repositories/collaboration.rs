// sentinel-disable-file sqlx-query-sin-macro sqlx-query-as-sin-macro
// [por que] sqlx sin feature "macros" ni DB en compile-time: query! rompe el build.
use chrono::{DateTime, Utc};
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

#[derive(Debug, FromRow)]
pub struct TeamConnectionRow {
    pub id: Uuid,
    pub requester_id: Uuid,
    pub addressee_id: Option<Uuid>,
    pub addressee_email: String,
    pub status: String,
    pub requested_at: DateTime<Utc>,
    pub responded_at: Option<DateTime<Utc>>,
}

#[derive(Debug, FromRow)]
struct TeamConnectionCreationRow {
    pub id: Uuid,
    pub requester_id: Uuid,
    pub addressee_id: Option<Uuid>,
    pub addressee_email: String,
    pub status: String,
    pub requested_at: DateTime<Utc>,
    pub responded_at: Option<DateTime<Utc>>,
    pub created: bool,
}

#[derive(Debug, FromRow)]
pub struct TeamConnectionViewRow {
    pub id: Uuid,
    pub requester_id: Uuid,
    pub addressee_id: Option<Uuid>,
    pub addressee_email: String,
    pub status: String,
    pub requested_at: DateTime<Utc>,
    pub responded_at: Option<DateTime<Utc>>,
    pub user_id: Option<Uuid>,
    pub user_display_name: Option<String>,
    pub user_email: Option<String>,
    pub user_avatar_url: Option<String>,
}

#[derive(Debug)]
pub enum TeamResponseOutcome {
    Updated(TeamConnectionRow),
    NotFound,
    Forbidden,
    AlreadyHandled,
}

pub struct CollaborationRepository;

impl CollaborationRepository {
    pub async fn activate_pending(
        pool: &PgPool,
        addressee_id: Uuid,
        addressee_email: &str,
    ) -> Result<u64, sqlx::Error> {
        let result = sqlx::query(
            "UPDATE team_connections AS pending
             SET addressee_id = $1, status = 'pending'
             WHERE lower(pending.addressee_email) = lower($2)
               AND pending.status = 'pending_registration'
               AND NOT EXISTS (
                   SELECT 1 FROM team_connections AS active
                   WHERE active.addressee_id = $1
                     AND active.requester_id = pending.requester_id
                     AND active.status IN ('pending', 'accepted')
               )",
        )
        .bind(addressee_id)
        .bind(addressee_email)
        .execute(pool)
        .await?;
        Ok(result.rows_affected())
    }

    pub async fn create_request(
        pool: &PgPool,
        requester_id: Uuid,
        addressee_id: Option<Uuid>,
        addressee_email: &str,
    ) -> Result<Option<(TeamConnectionRow, bool)>, sqlx::Error> {
        let status = if addressee_id.is_some() {
            "pending"
        } else {
            "pending_registration"
        };
        sqlx::query_as::<_, TeamConnectionCreationRow>(
            "INSERT INTO team_connections
                (requester_id, addressee_id, addressee_email, status)
             VALUES ($1, $2, lower($3), $4)
             ON CONFLICT (requester_id, lower(addressee_email))
                 WHERE status IN ('pending', 'pending_registration', 'accepted') DO UPDATE
             SET addressee_id = CASE
                     WHEN team_connections.status = 'pending_registration'
                          AND EXCLUDED.addressee_id IS NOT NULL
                     THEN EXCLUDED.addressee_id
                     ELSE team_connections.addressee_id
                 END,
                 status = CASE
                     WHEN team_connections.status = 'pending_registration'
                          AND EXCLUDED.addressee_id IS NOT NULL
                     THEN 'pending'
                     ELSE team_connections.status
                 END
             RETURNING id, requester_id, addressee_id, addressee_email, status,
                       requested_at, responded_at, (xmax = 0) AS created",
        )
        .bind(requester_id)
        .bind(addressee_id)
        .bind(addressee_email)
        .bind(status)
        .fetch_optional(pool)
        .await
        .map(|row| {
            row.map(|created| {
                let is_created = created.created;
                (
                    TeamConnectionRow {
                        id: created.id,
                        requester_id: created.requester_id,
                        addressee_id: created.addressee_id,
                        addressee_email: created.addressee_email,
                        status: created.status,
                        requested_at: created.requested_at,
                        responded_at: created.responded_at,
                    },
                    is_created,
                )
            })
        })
    }

    pub async fn list_received(
        pool: &PgPool,
        user_id: Uuid,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<TeamConnectionViewRow>, sqlx::Error> {
        sqlx::query_as::<_, TeamConnectionViewRow>(
            "SELECT t.id, t.requester_id, t.addressee_id, t.addressee_email, t.status,
                    t.requested_at, t.responded_at,
                    u.id AS user_id, u.display_name AS user_display_name,
                    u.email AS user_email, u.avatar_url AS user_avatar_url
             FROM team_connections AS t
             LEFT JOIN users AS u ON u.id = t.requester_id
             WHERE t.addressee_id = $1 AND t.status = 'pending'
             ORDER BY t.requested_at DESC
             LIMIT $2 OFFSET $3",
        )
        .bind(user_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(pool)
        .await
    }

    pub async fn list_sent(
        pool: &PgPool,
        user_id: Uuid,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<TeamConnectionViewRow>, sqlx::Error> {
        sqlx::query_as::<_, TeamConnectionViewRow>(
            "SELECT t.id, t.requester_id, t.addressee_id, t.addressee_email, t.status,
                    t.requested_at, t.responded_at,
                    u.id AS user_id, u.display_name AS user_display_name,
                    u.email AS user_email, u.avatar_url AS user_avatar_url
             FROM team_connections AS t
             LEFT JOIN users AS u ON u.id = t.addressee_id
             WHERE t.requester_id = $1 AND t.status IN ('pending', 'pending_registration')
             ORDER BY t.requested_at DESC
             LIMIT $2 OFFSET $3",
        )
        .bind(user_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(pool)
        .await
    }

    pub async fn list_members(
        pool: &PgPool,
        user_id: Uuid,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<TeamConnectionViewRow>, sqlx::Error> {
        sqlx::query_as::<_, TeamConnectionViewRow>(
            "SELECT t.id, t.requester_id, t.addressee_id, t.addressee_email, t.status,
                    t.requested_at, t.responded_at,
                    u.id AS user_id, u.display_name AS user_display_name,
                    u.email AS user_email, u.avatar_url AS user_avatar_url
             FROM team_connections AS t
             LEFT JOIN users AS u ON u.id = CASE
                 WHEN t.requester_id = $1 THEN t.addressee_id
                 ELSE t.requester_id
             END
             WHERE (t.requester_id = $1 OR t.addressee_id = $1) AND t.status = 'accepted'
             ORDER BY t.responded_at DESC NULLS LAST
             LIMIT $2 OFFSET $3",
        )
        .bind(user_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(pool)
        .await
    }

    pub async fn counts(pool: &PgPool, user_id: Uuid) -> Result<(i64, i64, i64), sqlx::Error> {
        sqlx::query_as::<_, (i64, i64, i64)>(
            "SELECT
                (SELECT COUNT(*)::BIGINT FROM team_connections WHERE addressee_id = $1 AND status = 'pending'),
                (SELECT COUNT(*)::BIGINT FROM team_connections WHERE requester_id = $1 AND status IN ('pending', 'pending_registration')),
                (SELECT COUNT(*)::BIGINT FROM team_connections WHERE (requester_id = $1 OR addressee_id = $1) AND status = 'accepted')",
        )
        .bind(user_id)
        .fetch_one(pool)
        .await
    }

    pub async fn pending_count(pool: &PgPool, user_id: Uuid) -> Result<i64, sqlx::Error> {
        sqlx::query_scalar(
            "SELECT COUNT(*)::BIGINT FROM team_connections
             WHERE addressee_id = $1 AND status = 'pending'",
        )
        .bind(user_id)
        .fetch_one(pool)
        .await
    }

    pub async fn respond(
        pool: &PgPool,
        id: Uuid,
        user_id: Uuid,
        action: &str,
    ) -> Result<TeamResponseOutcome, sqlx::Error> {
        let mut tx = pool.begin().await?;
        let row = sqlx::query_as::<_, TeamConnectionRow>(
            "SELECT id, requester_id, addressee_id, addressee_email, status,
                    requested_at, responded_at
             FROM team_connections WHERE id = $1 FOR UPDATE",
        )
        .bind(id)
        .fetch_optional(&mut *tx)
        .await?;

        let Some(row) = row else {
            return Ok(TeamResponseOutcome::NotFound);
        };
        if row.addressee_id != Some(user_id) {
            return Ok(TeamResponseOutcome::Forbidden);
        }
        if row.status != "pending" {
            return Ok(TeamResponseOutcome::AlreadyHandled);
        }

        let status = if action == "accept" {
            "accepted"
        } else {
            "rejected"
        };
        let updated = sqlx::query_as::<_, TeamConnectionRow>(
            "UPDATE team_connections
             SET status = $2, responded_at = NOW()
             WHERE id = $1
             RETURNING id, requester_id, addressee_id, addressee_email, status,
                       requested_at, responded_at",
        )
        .bind(id)
        .bind(status)
        .fetch_one(&mut *tx)
        .await?;
        tx.commit().await?;
        Ok(TeamResponseOutcome::Updated(updated))
    }

    pub async fn remove(pool: &PgPool, id: Uuid, user_id: Uuid) -> Result<bool, sqlx::Error> {
        let result = sqlx::query(
            "DELETE FROM team_connections
             WHERE id = $1 AND (requester_id = $2 OR addressee_id = $2)",
        )
        .bind(id)
        .bind(user_id)
        .execute(pool)
        .await?;
        Ok(result.rows_affected() == 1)
    }
}
