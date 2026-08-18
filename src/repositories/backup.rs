use sqlx::PgPool;
use uuid::Uuid;

use crate::models::backup::BackupRow;

pub struct BackupRepository;

impl BackupRepository {
    /// Paridad con BackupsRepository (WP): retención de 30 días y máximo 50 copias.
    pub const RETENCION_DIAS: i64 = 30;
    pub const MAX_BACKUPS: i64 = 50;
    /// Intervalo mínimo entre copias (WP: INTERVALO_MINUTOS = 30).
    pub const INTERVALO_MINUTOS: i64 = 30;
    /// Devuelve la fecha del último backup si existe (para el intervalo).
    pub async fn last_created_at(
        pool: &PgPool,
        user_id: Uuid,
    ) -> Result<Option<chrono::DateTime<chrono::Utc>>, sqlx::Error> {
        sqlx::query_scalar::<_, chrono::DateTime<chrono::Utc>>(
            "SELECT creado_en FROM backups WHERE user_id = $1 ORDER BY creado_en DESC LIMIT 1",
        )
        .bind(user_id)
        .fetch_optional(pool)
        .await
    }

    /// Paridad con BackupsRepository::cleanupOldBackups (WP): elimina copias
    /// fuera de la ventana de retención y deja solo las últimas MAX_BACKUPS.
    pub async fn cleanup(pool: &PgPool, user_id: Uuid) -> Result<(), sqlx::Error> {
        sqlx::query(
            "DELETE FROM backups
             WHERE user_id = $1 AND (creado_en < NOW() - ($2 || ' days')::interval
                 OR id IN (
                     SELECT id FROM (
                         SELECT id, ROW_NUMBER() OVER (ORDER BY creado_en DESC, id DESC) AS rn
                         FROM backups WHERE user_id = $1
                     ) t WHERE t.rn > $3
                 ))",
        )
        .bind(user_id)
        .bind(Self::RETENCION_DIAS)
        .bind(Self::MAX_BACKUPS)
        .execute(pool)
        .await?;
        Ok(())
    }

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
