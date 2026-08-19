use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;
use validator::Validate;

/// Request para guardar el estado E2E del usuario.
#[derive(Debug, Deserialize, Validate, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct SaveE2ERequest {
    pub habilitado: bool,
    #[validate(length(min = 1, max = 16_384, message = "La clave cifrada no puede estar vacía"))]
    pub clave_cifrada: String,
    #[validate(length(max = 64))]
    pub algoritmo: Option<String>,
    #[validate(length(max = 64))]
    pub derivacion: Option<String>,
}

/// Respuesta de estado E2E.
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct E2EState {
    pub habilitado: bool,
    pub algoritmo: String,
    pub tipo_clave_derivacion: String,
}

/// Respuesta al guardar estado E2E.
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct SaveE2EResponse {
    pub success: bool,
    pub estado: E2EState,
}

/// Request de cambio de contraseña.
/// [H-B04-01] `contrasena_actual` es obligatoria: una sesión robada no basta
/// para tomar la cuenta sin conocer la contraseña vigente.
#[derive(Debug, Deserialize, Validate, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ChangePasswordRequest {
    #[validate(
        length(min = 1, message = "Debes ingresar tu contraseña actual"),
        custom(function = "crate::models::user::validar_contrasena")
    )]
    pub contrasena_actual: String,
    #[validate(
        length(min = 8, message = "La nueva contraseña debe tener al menos 8 caracteres"),
        custom(function = "crate::models::user::validar_contrasena")
    )]
    pub nueva_contrasena: String,
}

/// Respuesta de cambio de contraseña.
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ChangePasswordResponse {
    pub success: bool,
    pub message: String,
}

/// Estado del token MCP/API del usuario.
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct McpTokenState {
    pub existe: bool,
    pub id: Option<Uuid>,
    pub fecha_creacion: Option<DateTime<Utc>>,
}

/// Respuesta al generar un token MCP (el token plano se muestra una sola vez).
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct McpTokenGenerated {
    pub success: bool,
    pub id: Uuid,
    pub token: String,
    pub fecha_creacion: DateTime<Utc>,
}

/// Respuesta de revocación.
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct McpTokenRevoked {
    pub success: bool,
}

/// Fila de la tabla e2e_keys.
#[derive(Debug, Clone, sqlx::FromRow)]
pub struct E2eKeyRow {
    pub user_id: Uuid,
    pub clave_cifrada: String,
    pub algoritmo: String,
    pub derivacion: String,
    pub actualizado_en: DateTime<Utc>,
}

/// Fila de api_tokens.
#[derive(Debug, Clone, sqlx::FromRow)]
pub struct ApiTokenRow {
    pub id: Uuid,
    pub user_id: Uuid,
    pub token_hash: String,
    pub nombre: String,
    pub creado_en: DateTime<Utc>,
    pub revocado_en: Option<DateTime<Utc>>,
}
