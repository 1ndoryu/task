use chrono::{DateTime, Utc};
use serde::Serialize;
use utoipa::ToSchema;
use uuid::Uuid;

pub const PLAN_FREE: &str = "free";
pub const PLAN_PREMIUM: &str = "premium";
pub const ESTADO_ACTIVA: &str = "activa";
pub const ESTADO_TRIAL: &str = "trial";
pub const ESTADO_EXPIRADA: &str = "expirada";
pub const TRIAL_DAYS: i64 = 14;

/// Límites por plan, tal como los consume el front original (camelCase).
#[derive(Debug, Clone, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PlanLimits {
    pub habitos: i64,
    pub tareas_activas: i64,
    pub proyectos: i64,
    pub adjuntos_por_tarea: i64,
    pub sincronizacion: bool,
    pub estadisticas_avanzadas: bool,
    pub temas: bool,
    pub cifrado_e2e: bool,
}

impl PlanLimits {
    pub fn free() -> Self {
        Self {
            habitos: 10,
            tareas_activas: 50,
            proyectos: 3,
            adjuntos_por_tarea: 0,
            sincronizacion: false,
            estadisticas_avanzadas: false,
            temas: false,
            cifrado_e2e: true,
        }
    }

    pub fn premium() -> Self {
        Self {
            habitos: -1,
            tareas_activas: -1,
            proyectos: -1,
            adjuntos_por_tarea: 10,
            sincronizacion: true,
            estadisticas_avanzadas: true,
            temas: true,
            cifrado_e2e: true,
        }
    }
}

/// Respuesta pública de suscripción del usuario autenticado.
#[derive(Debug, Clone, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct SubscriptionInfo {
    pub plan: String,
    pub estado: String,
    pub es_premium: bool,
    pub dias_restantes: Option<i64>,
    pub trial_disponible: bool,
    pub limites: PlanLimits,
    pub fecha_inicio: DateTime<Utc>,
    pub fecha_expiracion: Option<DateTime<Utc>>,
}

/// Respuesta al activar el trial.
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct TrialResponse {
    pub success: bool,
    pub data: SubscriptionInfo,
}

/// Respuesta de checkout Stripe (degradada si no hay credenciales).
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CheckoutResponse {
    pub success: bool,
    pub url: Option<String>,
    pub message: Option<String>,
}

/// Fila de la tabla subscriptions.
#[derive(Debug, Clone, sqlx::FromRow)]
pub struct SubscriptionRow {
    pub user_id: Uuid,
    pub plan: String,
    pub estado: String,
    pub trial_inicio: Option<DateTime<Utc>>,
    pub trial_fin: Option<DateTime<Utc>>,
    pub fecha_inicio: DateTime<Utc>,
    pub fecha_expiracion: Option<DateTime<Utc>>,
    pub stripe_customer_id: Option<String>,
    pub ultimo_pago: Option<DateTime<Utc>>,
}

impl SubscriptionRow {
    #[must_use]
    pub fn es_premium(&self) -> bool {
        self.plan == PLAN_PREMIUM && self.estado == ESTADO_ACTIVA
    }

    #[must_use]
    pub fn trial_disponible(&self) -> bool {
        self.estado != ESTADO_TRIAL
            && self.plan != PLAN_PREMIUM
            && self.trial_fin.is_none_or(|fin| fin < Utc::now())
    }

    #[must_use]
    pub fn dias_restantes(&self) -> Option<i64> {
        match (self.plan.as_str(), &self.trial_fin, &self.fecha_expiracion) {
            (PLAN_PREMIUM, _, Some(exp)) => Some((*exp - Utc::now()).num_days()),
            (PLAN_PREMIUM, _, None) => None,
            (_, Some(fin), _) => Some((*fin - Utc::now()).num_days().max(0)),
            _ => None,
        }
    }

    #[must_use]
    pub fn into_info(self) -> SubscriptionInfo {
        let es_premium = self.es_premium();
        let plan = self.plan.clone();
        let limites = if es_premium {
            PlanLimits::premium()
        } else {
            PlanLimits::free()
        };
        SubscriptionInfo {
            plan,
            estado: self.estado.clone(),
            es_premium,
            dias_restantes: self.dias_restantes(),
            trial_disponible: self.trial_disponible(),
            limites,
            fecha_inicio: self.fecha_inicio,
            fecha_expiracion: self.fecha_expiracion.or(self.trial_fin),
        }
    }
}
