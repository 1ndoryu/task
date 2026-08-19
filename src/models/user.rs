use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;
use validator::Validate;

/// Modelo de usuario almacenado en base de datos
#[derive(Debug, Clone, FromRow)]
pub struct User {
    pub id: Uuid,
    pub email: String,
    pub password_hash: String,
    pub display_name: String,
    pub avatar_url: Option<String>,
    pub es_admin: bool,
    pub created_at: DateTime<Utc>,
}

/// Response público de usuario — sin datos sensibles
#[derive(Debug, Serialize, ToSchema)]
pub struct UserResponse {
    pub id: Uuid,
    pub email: String,
    pub display_name: String,
    pub avatar_url: Option<String>,
    pub es_admin: bool,
    pub created_at: DateTime<Utc>,
}

impl From<User> for UserResponse {
    fn from(user: User) -> Self {
        Self {
            id: user.id,
            email: user.email,
            display_name: user.display_name,
            avatar_url: user.avatar_url,
            es_admin: user.es_admin,
            created_at: user.created_at,
        }
    }
}

/// [H-B02-01] El límite de 72 bytes evita DoS por hashing de contraseñas
/// kilométricas y respeta el límite recomendado por argon2 (PHC string format).
/// [H-B02-01] Reutilizada por ChangePasswordRequest (models/security.rs).
pub(crate) fn validar_contrasena(password: &str) -> Result<(), validator::ValidationError> {
    if password.len() > 72 {
        let mut error = validator::ValidationError::new("password_too_long");
        error.message = Some("La contraseña no puede exceder 72 bytes".into());
        return Err(error);
    }
    Ok(())
}

/// Request body para registrar un nuevo usuario
#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct RegisterRequest {
    #[validate(email(message = "Formato de email inválido"), length(max = 255))]
    pub email: String,
    #[validate(
        length(min = 8, message = "La contraseña debe tener al menos 8 caracteres"),
        custom(function = "validar_contrasena")
    )]
    pub password: String,
}

/// Request body para iniciar sesión
#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct LoginRequest {
    #[validate(email)]
    pub email: String,
    #[validate(custom(function = "validar_contrasena"))]
    pub password: String,
}

/// Response pública después de autenticarse. La sesión viaja únicamente en cookies.
#[derive(Debug, Serialize, ToSchema)]
pub struct AuthResponse {
    pub user: UserResponse,
}

/// Cambios permitidos sobre el perfil público del usuario.
#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct UpdateProfileRequest {
    #[validate(length(max = 120, message = "El nombre no debe exceder 120 caracteres"))]
    pub display_name: String,
    #[validate(url(message = "La URL del avatar no es válida"))]
    pub avatar_url: Option<String>,
}
