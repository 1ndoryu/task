use chrono::{DateTime, Duration, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::subscription::{
    SubscriptionRow, ESTADO_ACTIVA, ESTADO_TRIAL, PLAN_FREE, PLAN_PREMIUM,
};

pub struct SubscriptionRepository;

impl SubscriptionRepository {
    pub async fn get(pool: &PgPool, user_id: Uuid) -> Result<Option<SubscriptionRow>, sqlx::Error> {
        sqlx::query_as::<_, SubscriptionRow>(
            "SELECT user_id, plan, estado, trial_inicio, trial_fin, fecha_inicio,
                    fecha_expiracion, stripe_customer_id, ultimo_pago
             FROM subscriptions WHERE user_id = $1",
        )
        .bind(user_id)
        .fetch_optional(pool)
        .await
    }

    /// Inserta una fila free por defecto si no existe y la devuelve.
    pub async fn ensure(pool: &PgPool, user_id: Uuid) -> Result<SubscriptionRow, sqlx::Error> {
        let existing = Self::get(pool, user_id).await?;
        if let Some(row) = existing {
            return Ok(row);
        }
        sqlx::query_as::<_, SubscriptionRow>(
            "INSERT INTO subscriptions (user_id, plan, estado)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
             RETURNING user_id, plan, estado, trial_inicio, trial_fin, fecha_inicio,
                       fecha_expiracion, stripe_customer_id, ultimo_pago",
        )
        .bind(user_id)
        .bind(PLAN_FREE)
        .bind(ESTADO_ACTIVA)
        .fetch_one(pool)
        .await
    }

    /// Activa el trial (30 días, paridad con WordPress) si no está activo ni se usó antes.
    pub async fn activate_trial(
        pool: &PgPool,
        user_id: Uuid,
    ) -> Result<Option<SubscriptionRow>, sqlx::Error> {
        let now = Utc::now();
        let fin = now + Duration::days(crate::models::subscription::TRIAL_DAYS);
        sqlx::query_as::<_, SubscriptionRow>(
            "UPDATE subscriptions
             SET plan = $6, estado = $2, trial_inicio = $3, trial_fin = $4,
                 fecha_inicio = $3, fecha_expiracion = $4
             WHERE user_id = $1
               AND plan = $5
               AND estado <> $2
               AND (trial_fin IS NULL OR trial_fin < NOW())
             RETURNING user_id, plan, estado, trial_inicio, trial_fin, fecha_inicio,
                       fecha_expiracion, stripe_customer_id, ultimo_pago",
        )
        .bind(user_id)
        .bind(ESTADO_TRIAL)
        .bind(now)
        .bind(fin)
        .bind(PLAN_FREE)
        .bind(PLAN_PREMIUM) // Paridad WP: activarTrial pone plan = premium
        .fetch_optional(pool)
        .await
    }

    /// Paridad con WP verificarExpiracion(): si el trial o premium vencieron,
    /// degrada a FREE con estado 'expirada' (persistido). Mantiene trial_fin
    /// para que el trial siga contando como usado.
    pub async fn expire_if_due(pool: &PgPool, user_id: Uuid) -> Result<(), sqlx::Error> {
        sqlx::query(
            "UPDATE subscriptions
             SET plan = $2, estado = $3, fecha_expiracion = NULL
             WHERE user_id = $1
               AND (
                   (estado = 'trial' AND trial_fin IS NOT NULL AND trial_fin < NOW())
                   OR (estado = 'premium' AND fecha_expiracion IS NOT NULL AND fecha_expiracion < NOW())
               )",
        )
        .bind(user_id)
        .bind(PLAN_FREE)
        .bind("expirada")
        .execute(pool)
        .await?;
        Ok(())
    }

    /// [H-B05-05] Extiende el trial (admin): plan free + estado trial con fecha
    /// de expiración propia (no pasa por activate_trial porque ya pudo usarse).
    pub async fn extend_trial(pool: &PgPool, user_id: Uuid, dias: i64) -> Result<(), sqlx::Error> {
        let ahora = Utc::now();
        let fin = ahora + Duration::days(dias);
        sqlx::query(
            "UPDATE subscriptions
             SET estado = $2, trial_inicio = $3, trial_fin = $4, plan = 'free',
                 fecha_expiracion = NULL
             WHERE user_id = $1",
        )
        .bind(user_id)
        .bind(ESTADO_TRIAL)
        .bind(ahora)
        .bind(fin)
        .execute(pool)
        .await?;
        Ok(())
    }

    /// Actualiza plan/estado (usado por admin y por Stripe webhook en el futuro).
    pub async fn set_plan(
        pool: &PgPool,
        user_id: Uuid,
        plan: &str,
        estado: &str,
        fecha_expiracion: Option<DateTime<Utc>>,
    ) -> Result<SubscriptionRow, sqlx::Error> {
        sqlx::query_as::<_, SubscriptionRow>(
            "UPDATE subscriptions
             SET plan = $2, estado = $3, fecha_expiracion = $4,
                 ultimo_pago = CASE WHEN $3 = 'activa' THEN NOW() ELSE ultimo_pago END
             WHERE user_id = $1
             RETURNING user_id, plan, estado, trial_inicio, trial_fin, fecha_inicio,
                       fecha_expiracion, stripe_customer_id, ultimo_pago",
        )
        .bind(user_id)
        .bind(plan)
        .bind(estado)
        .bind(fecha_expiracion)
        .fetch_one(pool)
        .await
    }
}
