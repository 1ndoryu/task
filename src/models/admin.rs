use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

/// Suscripción visible en el panel admin.
#[derive(Debug, Clone, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct AdminSubscription {
    pub plan: String,
    pub estado: String,
    pub fecha_inicio: Option<DateTime<Utc>>,
    pub fecha_expiracion: Option<DateTime<Utc>>,
    pub dias_restantes: Option<i64>,
    pub stripe_customer_id: Option<String>,
    pub ultimo_pago: Option<DateTime<Utc>>,
}

/// Contadores por usuario para el panel admin.
#[derive(Debug, Clone, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct AdminUserStats {
    pub habitos: i64,
    pub tareas: i64,
    pub proyectos: i64,
    pub tareas_completadas: i64,
}

/// Fila del JOIN users + subscriptions + e2e_keys + contadores.
#[derive(Debug, Clone, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct AdminUser {
    pub id: Uuid,
    pub nombre: String,
    pub email: String,
    pub avatar: Option<String>,
    pub fecha_registro: DateTime<Utc>,
    pub suscripcion: AdminSubscription,
    pub estadisticas: AdminUserStats,
    pub cifrado_activo: bool,
}

/// Paginación del listado.
#[derive(Debug, Clone, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct AdminPagination {
    pub pagina: i64,
    pub por_pagina: i64,
    pub total_paginas: i64,
}

/// Respuesta de listado de usuarios.
#[derive(Debug, Clone, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct AdminUsersResponse {
    pub usuarios: Vec<AdminUser>,
    pub total: i64,
    pub paginacion: AdminPagination,
}

/// Resumen global del panel.
#[derive(Debug, Clone, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct AdminStatsResponse {
    pub total_usuarios: i64,
    pub premium: i64,
    pub trial: i64,
    pub free: i64,
}

/// Body para activar premium (días de duración; None = sin expiración).
#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct AdminPremiumRequest {
    pub duracion: Option<i64>,
}

/// Body para extender el trial (días adicionales).
#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct AdminTrialRequest {
    pub dias: i64,
}

/// Respuesta genérica de acciones admin.
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct AdminActionResponse {
    pub success: bool,
    pub message: String,
}
