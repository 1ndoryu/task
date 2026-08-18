use sqlx::PgPool;
use uuid::Uuid;

use crate::models::feedback::{FeedbackRow, FeedbackStats};

pub struct FeedbackRepository;

impl FeedbackRepository {
    pub async fn create(
        pool: &PgPool,
        user_id: Uuid,
        tipo: &str,
        mensaje: &str,
    ) -> Result<FeedbackRow, sqlx::Error> {
        sqlx::query_as::<_, FeedbackRow>(
            "INSERT INTO feedback (user_id, tipo, mensaje)
             VALUES ($1, $2, $3)
             RETURNING id, user_id, tipo, mensaje, leido, creado_en",
        )
        .bind(user_id)
        .bind(tipo)
        .bind(mensaje)
        .fetch_one(pool)
        .await
    }

    pub async fn list_mine(
        pool: &PgPool,
        user_id: Uuid,
    ) -> Result<Vec<FeedbackRow>, sqlx::Error> {
        sqlx::query_as::<_, FeedbackRow>(
            "SELECT id, user_id, tipo, mensaje, leido, creado_en
             FROM feedback WHERE user_id = $1 ORDER BY creado_en DESC",
        )
        .bind(user_id)
        .fetch_all(pool)
        .await
    }

    pub async fn list_all(pool: &PgPool) -> Result<Vec<FeedbackRow>, sqlx::Error> {
        sqlx::query_as::<_, FeedbackRow>(
            "SELECT id, user_id, tipo, mensaje, leido, creado_en
             FROM feedback ORDER BY creado_en DESC",
        )
        .fetch_all(pool)
        .await
    }

    pub async fn stats(pool: &PgPool) -> Result<FeedbackStats, sqlx::Error> {
        sqlx::query_as::<_, FeedbackStats>(
            "SELECT COUNT(*) AS total,
                    COUNT(*) FILTER (WHERE leido = FALSE) AS no_leidos,
                    COUNT(*) FILTER (WHERE tipo = 'sugerencia') AS sugerencias,
                    COUNT(*) FILTER (WHERE tipo = 'bug') AS bugs
             FROM feedback",
        )
        .fetch_one(pool)
        .await
    }

    pub async fn mark_read(pool: &PgPool, id: Uuid) -> Result<bool, sqlx::Error> {
        let res = sqlx::query("UPDATE feedback SET leido = TRUE WHERE id = $1")
            .bind(id)
            .execute(pool)
            .await?;
        Ok(res.rows_affected() > 0)
    }
}
