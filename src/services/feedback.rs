use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;
use validator::Validate;

use crate::errors::AppError;
use crate::models::{
    CreateFeedbackRequest, CreateFeedbackResponse, FeedbackItem, FeedbackState, PaginatedFeedback,
};
use crate::repositories::{AdminFeedbackRow, FeedbackRepository};
use crate::services::SubscriptionService;

/// Límite diario de envíos de feedback (aplica a todos los que pueden enviar;
/// el envío es un beneficio Premium según el contrato del front).
const LIMITE_DIARIO: i64 = 3;

pub struct FeedbackService;

impl FeedbackService {
    pub async fn create(
        pool: &PgPool,
        user_id: Uuid,
        req: CreateFeedbackRequest,
    ) -> Result<CreateFeedbackResponse, AppError> {
        req.validate()
            .map_err(|error| AppError::Validation(error.to_string()))?;

        // [H-B04-09] El gate premium se aplica en el backend, no solo en la UI:
        // el front lo trata como beneficio Premium (ModalFeedback lo bloquea).
        let es_premium = SubscriptionService::active_row(pool, user_id)
            .await?
            .es_premium();
        if !es_premium {
            return Err(AppError::Forbidden(
                "El envío de comentarios es un beneficio Premium".into(),
            ));
        }

        // Límite diario: evita spam; el count usa el índice de creado_en.
        let hoy = Utc::now().date_naive();
        let enviados = FeedbackRepository::count_since(pool, user_id, hoy).await?;
        if enviados >= LIMITE_DIARIO {
            return Err(AppError::TooManyRequests);
        }

        FeedbackRepository::create(pool, user_id, &req.tipo, &req.mensaje).await?;
        Ok(CreateFeedbackResponse {
            success: true,
            message: "Gracias por tu feedback".into(),
        })
    }

    pub async fn state(pool: &PgPool, user_id: Uuid) -> Result<FeedbackState, AppError> {
        /* [H-B04-09] es_premium real: la UI decide con él si muestra el gate
         * premium o el límite diario. */
        let es_premium = SubscriptionService::active_row(pool, user_id)
            .await?
            .es_premium();
        let restante = if es_premium {
            let hoy = Utc::now().date_naive();
            let enviados = FeedbackRepository::count_since(pool, user_id, hoy).await?;
            (LIMITE_DIARIO - enviados).max(0)
        } else {
            0
        };
        Ok(FeedbackState {
            restante,
            es_premium,
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
        let (rows, total) = FeedbackRepository::admin_list(pool, per_page, offset).await?;
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
