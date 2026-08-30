// sentinel-disable-file sqlx-query-sin-macro sqlx-query-as-sin-macro
// [por que] sqlx sin feature "macros" ni DB en compile-time: query! rompe el build.
use chrono::{DateTime, Utc};
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

#[derive(Debug, FromRow)]
pub struct SharedItemRow {
    pub id: Uuid,
    pub item_type: String,
    pub item_legacy_id: i64,
    pub owner_id: Uuid,
    pub owner_display_name: String,
    pub owner_email: String,
    pub owner_avatar_url: Option<String>,
    pub recipient_id: Uuid,
    pub recipient_display_name: String,
    pub recipient_email: String,
    pub recipient_avatar_url: Option<String>,
    pub role: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, FromRow)]
pub struct SharedParticipantRow {
    pub id: Uuid,
    pub user_id: Uuid,
    pub display_name: String,
    pub email: String,
    pub avatar_url: Option<String>,
    pub role: String,
}

#[derive(Debug)]
pub enum SharedCreateOutcome {
    Created(Box<SharedItemRow>),
    ItemNotFound,
    NotTeammates,
}

pub struct SharedRepository;

impl SharedRepository {
    pub async fn create(
        pool: &PgPool,
        owner_id: Uuid,
        recipient_id: Uuid,
        item_type: &str,
        item_id: i64,
        role: &str,
    ) -> Result<SharedCreateOutcome, sqlx::Error> {
        let mut transaction = pool.begin().await?;
        /* [H-B03-07] La tabla proviene de un `match` cerrado (whitelist de 3
         * valores fijos del dev), nunca de input del request: seguro por
         * construcción. Si se añade una rama que interpole input del usuario,
         * introduce inyección SQL — revisar al tocar esta función. */
        let table = match item_type {
            "tarea" => "dashboard_tasks",
            "proyecto" => "dashboard_projects",
            "habito" => "dashboard_habits",
            _ => return Ok(SharedCreateOutcome::ItemNotFound),
        };
        let entity_sql = format!(
            "SELECT id FROM {table} WHERE user_id = $1 AND legacy_id = $2 AND deleted_at IS NULL FOR SHARE"
        );
        if sqlx::query_scalar::<_, Uuid>(&entity_sql)
            .bind(owner_id)
            .bind(item_id)
            .fetch_optional(&mut *transaction)
            .await?
            .is_none()
        {
            transaction.commit().await?;
            return Ok(SharedCreateOutcome::ItemNotFound);
        }
        let teammate = sqlx::query_scalar::<_, Uuid>(
            "SELECT id FROM team_connections
             WHERE status = 'accepted'
               AND ((requester_id = $1 AND addressee_id = $2)
                 OR (requester_id = $2 AND addressee_id = $1))
             LIMIT 1 FOR SHARE",
        )
        .bind(owner_id)
        .bind(recipient_id)
        .fetch_optional(&mut *transaction)
        .await?;
        if teammate.is_none() {
            transaction.commit().await?;
            return Ok(SharedCreateOutcome::NotTeammates);
        }
        let id = sqlx::query_scalar::<_, Uuid>(
            "INSERT INTO shared_items (owner_id, recipient_id, item_type, item_legacy_id, role) VALUES ($1, $2, $3, $4, $5) RETURNING id",
        )
        .bind(owner_id).bind(recipient_id).bind(item_type).bind(item_id).bind(role)
        .fetch_one(&mut *transaction).await?;
        transaction.commit().await?;
        Ok(SharedCreateOutcome::Created(Box::new(
            Self::get(pool, id).await?.expect("inserted share exists"),
        )))
    }

    pub async fn list_received(
        pool: &PgPool,
        user_id: Uuid,
        item_type: Option<&str>,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<SharedItemRow>, sqlx::Error> {
        Self::list(
            pool,
            "s.recipient_id = $1",
            user_id,
            item_type,
            limit,
            offset,
        )
        .await
    }

    pub async fn list_owned(
        pool: &PgPool,
        user_id: Uuid,
        item_type: Option<&str>,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<SharedItemRow>, sqlx::Error> {
        Self::list(pool, "s.owner_id = $1", user_id, item_type, limit, offset).await
    }

    async fn list(
        pool: &PgPool,
        filter: &str,
        user_id: Uuid,
        item_type: Option<&str>,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<SharedItemRow>, sqlx::Error> {
        let sql = format!("SELECT s.id, s.item_type, s.item_legacy_id, o.id AS owner_id, o.display_name AS owner_display_name, o.email AS owner_email, o.avatar_url AS owner_avatar_url, r.id AS recipient_id, r.display_name AS recipient_display_name, r.email AS recipient_email, r.avatar_url AS recipient_avatar_url, s.role, s.created_at, s.updated_at FROM shared_items AS s JOIN users AS o ON o.id = s.owner_id JOIN users AS r ON r.id = s.recipient_id WHERE {filter} AND ($2::varchar IS NULL OR s.item_type = $2) ORDER BY s.created_at DESC, s.id DESC LIMIT $3 OFFSET $4");
        sqlx::query_as::<_, SharedItemRow>(&sql)
            .bind(user_id)
            .bind(item_type)
            .bind(limit)
            .bind(offset)
            .fetch_all(pool)
            .await
    }

    pub async fn count_received(
        pool: &PgPool,
        user_id: Uuid,
        item_type: Option<&str>,
    ) -> Result<i64, sqlx::Error> {
        Self::count(pool, "recipient_id", user_id, item_type).await
    }
    pub async fn count_owned(
        pool: &PgPool,
        user_id: Uuid,
        item_type: Option<&str>,
    ) -> Result<i64, sqlx::Error> {
        Self::count(pool, "owner_id", user_id, item_type).await
    }

    async fn count(
        pool: &PgPool,
        column: &str,
        user_id: Uuid,
        item_type: Option<&str>,
    ) -> Result<i64, sqlx::Error> {
        let sql = format!("SELECT COUNT(*)::BIGINT FROM shared_items WHERE {column} = $1 AND ($2::varchar IS NULL OR item_type = $2)");
        sqlx::query_scalar(&sql)
            .bind(user_id)
            .bind(item_type)
            .fetch_one(pool)
            .await
    }

    pub async fn counts_received(
        pool: &PgPool,
        user_id: Uuid,
    ) -> Result<(i64, i64, i64), sqlx::Error> {
        sqlx::query_as("SELECT COUNT(*) FILTER (WHERE item_type = 'tarea')::BIGINT, COUNT(*) FILTER (WHERE item_type = 'proyecto')::BIGINT, COUNT(*) FILTER (WHERE item_type = 'habito')::BIGINT FROM shared_items WHERE recipient_id = $1").bind(user_id).fetch_one(pool).await
    }

    pub async fn get(pool: &PgPool, id: Uuid) -> Result<Option<SharedItemRow>, sqlx::Error> {
        sqlx::query_as::<_, SharedItemRow>("SELECT s.id, s.item_type, s.item_legacy_id, o.id AS owner_id, o.display_name AS owner_display_name, o.email AS owner_email, o.avatar_url AS owner_avatar_url, r.id AS recipient_id, r.display_name AS recipient_display_name, r.email AS recipient_email, r.avatar_url AS recipient_avatar_url, s.role, s.created_at, s.updated_at FROM shared_items AS s JOIN users AS o ON o.id = s.owner_id JOIN users AS r ON r.id = s.recipient_id WHERE s.id = $1").bind(id).fetch_optional(pool).await
    }

    pub async fn participants(
        pool: &PgPool,
        owner_id: Uuid,
        item_type: &str,
        item_id: i64,
    ) -> Result<Vec<SharedParticipantRow>, sqlx::Error> {
        sqlx::query_as::<_, SharedParticipantRow>("SELECT s.id, u.id AS user_id, u.display_name, u.email, u.avatar_url, s.role FROM shared_items AS s JOIN users AS u ON u.id = s.recipient_id WHERE s.owner_id = $1 AND s.item_type = $2 AND s.item_legacy_id = $3 ORDER BY s.created_at ASC, s.id ASC").bind(owner_id).bind(item_type).bind(item_id).fetch_all(pool).await
    }

    pub async fn update_role(
        pool: &PgPool,
        id: Uuid,
        owner_id: Uuid,
        role: &str,
    ) -> Result<bool, sqlx::Error> {
        let result = sqlx::query(
            "UPDATE shared_items SET role = $3, updated_at = NOW() WHERE id = $1 AND owner_id = $2",
        )
        .bind(id)
        .bind(owner_id)
        .bind(role)
        .execute(pool)
        .await?;
        Ok(result.rows_affected() == 1)
    }

    pub async fn remove(pool: &PgPool, id: Uuid, user_id: Uuid) -> Result<bool, sqlx::Error> {
        let result = sqlx::query(
            "DELETE FROM shared_items WHERE id = $1 AND (owner_id = $2 OR recipient_id = $2)",
        )
        .bind(id)
        .bind(user_id)
        .execute(pool)
        .await?;
        Ok(result.rows_affected() == 1)
    }

    pub async fn access(
        pool: &PgPool,
        user_id: Uuid,
        item_type: &str,
        item_id: i64,
        owner_id: Uuid,
    ) -> Result<Option<String>, sqlx::Error> {
        if !Self::item_exists(pool, owner_id, item_type, item_id).await? {
            return Ok(None);
        }
        if user_id == owner_id {
            return Ok(Some("propietario".to_owned()));
        }
        sqlx::query_scalar("SELECT role FROM shared_items WHERE owner_id = $1 AND recipient_id = $2 AND item_type = $3 AND item_legacy_id = $4").bind(owner_id).bind(user_id).bind(item_type).bind(item_id).fetch_optional(pool).await
    }

    pub async fn item_exists(
        pool: &PgPool,
        owner_id: Uuid,
        item_type: &str,
        item_id: i64,
    ) -> Result<bool, sqlx::Error> {
        /* [H-B03-07] Ídem create(): `table` viene de whitelist cerrada, no input. */
        let table = match item_type {
            "tarea" => "dashboard_tasks",
            "proyecto" => "dashboard_projects",
            "habito" => "dashboard_habits",
            _ => return Ok(false),
        };
        let sql = format!("SELECT EXISTS(SELECT 1 FROM {table} WHERE user_id = $1 AND legacy_id = $2 AND deleted_at IS NULL)");
        sqlx::query_scalar(&sql)
            .bind(owner_id)
            .bind(item_id)
            .fetch_one(pool)
            .await
    }
}
