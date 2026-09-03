// sentinel-disable-file sqlx-query-sin-macro sqlx-query-as-sin-macro
// [por que] sqlx sin feature "macros" ni DB en compile-time: query! rompe el build.
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::storage::AttachmentRow;

pub struct StorageRepository;

/// Datos para crear un adjunto. Agrupa los 10 campos de
/// `StorageRepository::create` en un único parámetro
/// ([029A-1] parametros-excesivos-rs) sin cambiar la SQL.
pub struct NuevoAdjunto<'a> {
    pub id: Uuid,
    pub user_id: Uuid,
    pub entity_type: Option<&'a str>,
    pub entity_id: Option<i64>,
    pub nombre: &'a str,
    pub tipo: &'a str,
    pub mime: &'a str,
    pub tamano: i64,
    pub ruta: &'a str,
    pub thumbnail_ruta: Option<&'a str>,
}

impl StorageRepository {
    pub async fn create(pool: &PgPool, nuevo: NuevoAdjunto<'_>) -> Result<AttachmentRow, sqlx::Error> {
        sqlx::query_as::<_, AttachmentRow>(
            "INSERT INTO attachments
                (id, user_id, entity_type, entity_id, nombre, tipo, mime, tamano, ruta, thumbnail_ruta)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING id, user_id, entity_type, entity_id, nombre, tipo, mime,
                       tamano, ruta, thumbnail_ruta, creado_en",
        )
        .bind(nuevo.id)
        .bind(nuevo.user_id)
        .bind(nuevo.entity_type)
        .bind(nuevo.entity_id)
        .bind(nuevo.nombre)
        .bind(nuevo.tipo)
        .bind(nuevo.mime)
        .bind(nuevo.tamano)
        .bind(nuevo.ruta)
        .bind(nuevo.thumbnail_ruta)
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
