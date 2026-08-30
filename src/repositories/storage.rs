// sentinel-disable-file sqlx-query-sin-macro sqlx-query-as-sin-macro
// [por que] sqlx sin feature "macros" ni DB en compile-time: query! rompe el build.
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::storage::AttachmentRow;

pub struct StorageRepository;

impl StorageRepository {
    pub async fn create(
        pool: &PgPool,
        id: Uuid,
        user_id: Uuid,
        entity_type: Option<&str>,
        entity_id: Option<i64>,
        nombre: &str,
        tipo: &str,
        mime: &str,
        tamano: i64,
        ruta: &str,
        thumbnail_ruta: Option<&str>,
    ) -> Result<AttachmentRow, sqlx::Error> {
        sqlx::query_as::<_, AttachmentRow>(
            "INSERT INTO attachments
                (id, user_id, entity_type, entity_id, nombre, tipo, mime, tamano, ruta, thumbnail_ruta)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING id, user_id, entity_type, entity_id, nombre, tipo, mime,
                       tamano, ruta, thumbnail_ruta, creado_en",
        )
        .bind(id)
        .bind(user_id)
        .bind(entity_type)
        .bind(entity_id)
        .bind(nombre)
        .bind(tipo)
        .bind(mime)
        .bind(tamano)
        .bind(ruta)
        .bind(thumbnail_ruta)
        .fetch_one(pool)
        .await
    }

    pub async fn list(
        pool: &PgPool,
        user_id: Uuid,
        entity_type: Option<&str>,
        entity_id: Option<i64>,
    ) -> Result<Vec<AttachmentRow>, sqlx::Error> {
        let mut q = String::from(
            "SELECT id, user_id, entity_type, entity_id, nombre, tipo, mime,
                    tamano, ruta, thumbnail_ruta, creado_en
             FROM attachments WHERE user_id = $1",
        );
        if entity_type.is_some() {
            q.push_str(" AND entity_type = $2 AND entity_id = $3");
        }
        q.push_str(" ORDER BY creado_en DESC");
        let mut query = sqlx::query_as::<_, AttachmentRow>(&q).bind(user_id);
        if let Some(t) = entity_type {
            query = query.bind(t).bind(entity_id);
        }
        query.fetch_all(pool).await
    }

    /// Suma el tamaño de todos los adjuntos del usuario (para el límite de cuota).
    pub async fn sum_size(pool: &PgPool, user_id: Uuid) -> Result<i64, sqlx::Error> {
        sqlx::query_scalar::<_, i64>(
            "SELECT COALESCE(SUM(tamano), 0)::BIGINT FROM attachments WHERE user_id = $1",
        )
        .bind(user_id)
        .fetch_one(pool)
        .await
    }

    pub async fn get(
        pool: &PgPool,
        user_id: Uuid,
        id: Uuid,
    ) -> Result<Option<AttachmentRow>, sqlx::Error> {
        sqlx::query_as::<_, AttachmentRow>(
            "SELECT id, user_id, entity_type, entity_id, nombre, tipo, mime,
                    tamano, ruta, thumbnail_ruta, creado_en
             FROM attachments WHERE id = $1 AND user_id = $2",
        )
        .bind(id)
        .bind(user_id)
        .fetch_optional(pool)
        .await
    }

    pub async fn delete(pool: &PgPool, user_id: Uuid, id: Uuid) -> Result<bool, sqlx::Error> {
        let res = sqlx::query("DELETE FROM attachments WHERE id = $1 AND user_id = $2")
            .bind(id)
            .bind(user_id)
            .execute(pool)
            .await?;
        Ok(res.rows_affected() > 0)
    }
}
