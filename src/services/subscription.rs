use sqlx::PgPool;
use uuid::Uuid;

use crate::errors::AppError;
use crate::models::{
    CheckoutResponse, SubscriptionInfo, SubscriptionRow, TrialResponse,
};
use crate::repositories::SubscriptionRepository;

pub struct SubscriptionService;

impl SubscriptionService {
    /// [H-B04-08] Devuelve la fila de suscripción ya expirada/actualizada en un
    /// solo lugar: sustituye el patrón ensure → expire_if_due → get (3 queries)
    /// que se repetía en info/backup/storage.
    pub async fn active_row(pool: &PgPool, user_id: Uuid) -> Result<SubscriptionRow, AppError> {
        let row = SubscriptionRepository::ensure(pool, user_id).await?;
        // Paridad con WP verificarExpiracion(): degradar a FREE/expirada al vencer.
        SubscriptionRepository::expire_if_due(pool, user_id).await?;
        Ok(SubscriptionRepository::get(pool, user_id)
            .await?
            .unwrap_or(row))
    }

    pub async fn info(pool: &PgPool, user_id: Uuid) -> Result<SubscriptionInfo, AppError> {
        Ok(Self::active_row(pool, user_id).await?.into_info())
    }

    pub async fn activate_trial(pool: &PgPool, user_id: Uuid) -> Result<TrialResponse, AppError> {
        let row = SubscriptionRepository::ensure(pool, user_id).await?;
        let row = if row.trial_disponible() {
            SubscriptionRepository::activate_trial(pool, user_id)
                .await?
                .ok_or_else(|| AppError::Conflict("El trial ya se usó o no está disponible".into()))?
        } else {
            row
        };
        Ok(TrialResponse {
            success: true,
            data: row.into_info(),
        })
    }

    /// Checkout Stripe: sin credenciales configuradas devuelve un estado
    /// explícito en vez de romper la UI (paridad con WordPress sin llaves).
    pub async fn checkout(_pool: &PgPool, user_id: Uuid) -> Result<CheckoutResponse, AppError> {
        let info = Self::info(_pool, user_id).await?;
        if info.es_premium {
            return Ok(CheckoutResponse {
                success: true,
                url: None,
                message: Some("Ya tienes el plan premium activo".into()),
            });
        }
        Ok(CheckoutResponse {
            success: false,
            url: None,
            message: Some(
                "Los pagos con Stripe aún no están configurados; usa el trial gratuito".into(),
            ),
        })
    }
}
