use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;
use validator::Validate;

use crate::errors::AppError;
use crate::models::{
    CreateFeedbackRequest, CreateFeedbackResponse, FeedbackItem, FeedbackState, PaginatedFeedback,
};
use crate::repositories::FeedbackRepository;

/// Fila del JOIN feedback + users para el panel admin.
#[derive(sqlx::FromRow)]
struct AdminFeedbackRow {
    id: uuid::Uuid,
    display_name: String,
    email: String,
    tipo: String,
    mensaje: String,
    leido: bool,
    creado_en: chrono::DateTime<Utc>,
}

impl AdminFeedbackRow {
    fn into_item(self) -> FeedbackItem {
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

/// Límite diario de envíos de feedback para usuarios free.
const LIMITE_DIARIO_FREE: i64 = 3;

pub struct FeedbackService;

impl FeedbackService {
    pub async fn create(
        pool: &PgPool,
        user_id: Uuid,
        req: CreateFeedbackRequest,
    ) -> Result<CreateFeedbackResponse, AppError> {
        req.validate()
            .map_err(|error| AppError::Validation(error.to_string()))?;

        // Límite diario: evita spam; el count usa el índice de creado_en.
        let hoy = Utc::now().date_naive();
        let enviados = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM feedback
             WHERE user_id = $1 AND creado_en >= $2",
        )
        .bind(user_id)
        .bind(hoy)
        .fetch_one(pool)
        .await?;
        if enviados >= LIMITE_DIARIO_FREE {
            return Err(AppError::TooManyRequests);
        }

        FeedbackRepository::create(pool, user_id, &req.tipo, &req.mensaje).await?;
        Ok(CreateFeedbackResponse {
            success: true,
            message: "Gracias por tu feedback".into(),
        })
    }

    pub async fn state(pool: &PgPool, user_id: Uuid) -> Result<FeedbackState, AppError> {
        let hoy = Utc::now().date_naive();
        let enviados = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM feedback WHERE user_id = $1 AND creado_en >= $2",
        )
        .bind(user_id)
        .bind(hoy)
        .fetch_one(pool)
        .await?;
        Ok(FeedbackState {
            restante: (LIMITE_DIARIO_FREE - enviados).max(0),
            es_premium: false,
        })
    }

    pub async fn list_mine(pool: &PgPool, user_id: Uuid) -> Result<Vec<FeedbackItem>, AppError> {
        let rows = FeedbackRepository::list_mine(pool, user_id).await?;
        Ok(rows
            .into_iter()
            .map(|row| FeedbackItem {
                id: row.id,
                usuario_nombre: "tú".into(),
                usuario_email: String::new(),
                tipo: row.tipo,
                mensaje: row.mensaje,
                leido: row.leido,
                fecha_creacion: row.creado_en,
            })
            .collect())
    }

    // ---- Admin (requiere es_admin) ----

    pub async fn admin_list(
        pool: &PgPool,
        page: i64,
        per_page: i64,
    ) -> Result<PaginatedFeedback, AppError> {
        if page < 1 || !(1..=50).contains(&per_page) {
            return Err(AppError::Validation("paginación inválida".into()));
        }
        let offset = (page - 1).checked_mul(per_page).ok_or_else(|| {
            AppError::Validation("página demasiado grande".into())
        })?;
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
        let items: Vec<FeedbackItem> = rows
            .into_iter()
            .map(AdminFeedbackRow::into_item)
            .collect();
        let item_count = i64::try_from(items.len()).unwrap_or(i64::MAX);
        Ok(PaginatedFeedback {
            items,
            page,
            per_page,
            has_more: total > offset.saturating_add(item_count),
            total,
        })
    }

    pub async fn admin_stats(pool: &PgPool) -> Result<crate::models::FeedbackStats, AppError> {
        Ok(FeedbackRepository::stats(pool).await?)
    }

    pub async fn admin_mark_read(pool: &PgPool, id: Uuid) -> Result<bool, AppError> {
        Ok(FeedbackRepository::mark_read(pool, id).await?)
    }
}
