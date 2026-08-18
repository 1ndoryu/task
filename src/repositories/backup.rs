use sqlx::PgPool;
use uuid::Uuid;

use crate::models::backup::BackupRow;

pub struct BackupRepository;

impl BackupRepository {
    pub async fn create(
        pool: &PgPool,
        user_id: Uuid,
        trigger_origen: &str,
        tamano: i64,
        hash: &str,
        datos: &serde_json::Value,
    ) -> Result<BackupRow, sqlx::Error> {
        sqlx::query_as::<_, BackupRow>(
            "INSERT INTO backups (user_id, trigger_origen, tamano, hash, datos)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, user_id, trigger_origen, tamano, hash, datos, creado_en",
        )
        .bind(user_id)
        .bind(trigger_origen)
        .bind(tamano)
        .bind(hash)
        .bind(datos)
        .fetch_one(pool)
        .await
    }

    pub async fn list(pool: &PgPool, user_id: Uuid) -> Result<Vec<BackupRow>, sqlx::Error> {
        sqlx::query_as::<_, BackupRow>(
            "SELECT id, user_id, trigger_origen, tamano, hash, datos, creado_en
             FROM backups WHERE user_id = $1 ORDER BY creado_en DESC",
        )
        .bind(user_id)
        .fetch_all(pool)
        .await
    }

    pub async fn get(
        pool: &PgPool,
        user_id: Uuid,
        id: Uuid,
    ) -> Result<Option<BackupRow>, sqlx::Error> {
        sqlx::query_as::<_, BackupRow>(
            "SELECT id, user_id, trigger_origen, tamano, hash, datos, creado_en
             FROM backups WHERE id = $1 AND user_id = $2",
        )
        .bind(id)
        .bind(user_id)
        .fetch_optional(pool)
        .await
    }

    pub async fn delete(pool: &PgPool, user_id: Uuid, id: Uuid) -> Result<bool, sqlx::Error> {
        let res = sqlx::query("DELETE FROM backups WHERE id = $1 AND user_id = $2")
            .bind(id)
            .bind(user_id)
            .execute(pool)
            .await?;
        Ok(res.rows_affected() > 0)
    }
}
