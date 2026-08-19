use sqlx::PgPool;
use uuid::Uuid;

use crate::models::feedback::{FeedbackItem, FeedbackRow, FeedbackStats};

/// [H-B04-06] Fila del JOIN feedback + users para el panel admin (movida desde
/// el service para que el SQL inline viva en el repositorio).
#[derive(sqlx::FromRow)]
pub struct AdminFeedbackRow {
    pub id: Uuid,
    pub display_name: String,
    pub email: String,
    pub tipo: String,
    pub mensaje: String,
    pub leido: bool,
    pub creado_en: chrono::DateTime<chrono::Utc>,
}

impl AdminFeedbackRow {
    #[must_use]
    pub fn into_item(self) -> FeedbackItem {
        FeedbackItem {
            id: self.id,
            usuario_nombre: self.display_name,
            usuario_email: self.email,
            tipo: self.tipo,
            mensaje: self.mensaje,
            leido: self.leido,
            fecha_creacion: self.creado_en,
        }
    }
}

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

    /// [H-B04-06] Cuenta los envíos del usuario desde una fecha (límite diario).
    pub async fn count_since(
        pool: &PgPool,
        user_id: Uuid,
        desde: chrono::NaiveDate,
    ) -> Result<i64, sqlx::Error> {
        sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM feedback
             WHERE user_id = $1 AND creado_en >= $2",
        )
        .bind(user_id)
        .bind(desde)
        .fetch_one(pool)
        .await
    }

    /// [H-B04-06] Listado admin paginado: devuelve filas y total.
    pub async fn admin_list(
        pool: &PgPool,
        per_page: i64,
        offset: i64,
    ) -> Result<(Vec<AdminFeedbackRow>, i64), sqlx::Error> {
        let rows = sqlx::query_as::<_, AdminFeedbackRow>(
            "SELECT f.id, u.display_name, u.email, f.tipo, f.mensaje, f.leido, f.creado_en
             FROM feedback f JOIN users u ON u.id = f.user_id
             ORDER BY f.creado_en DESC LIMIT $1 OFFSET $2",
        )
        .bind(per_page)
        .bind(offset)
        .fetch_all(pool)
        .await?;
        let total = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM feedback")
            .fetch_one(pool)
            .await?;
        Ok((rows, total))
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
