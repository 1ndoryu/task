use argon2::{
    password_hash::{rand_core::OsRng, PasswordHasher, SaltString},
    Argon2,
};
use sqlx::PgPool;
use uuid::Uuid;
use validator::Validate;

use crate::errors::AppError;
use crate::models::{
    ChangePasswordRequest, ChangePasswordResponse, E2EState, McpTokenGenerated, McpTokenRevoked,
    McpTokenState, SaveE2ERequest, SaveE2EResponse,
};
use crate::repositories::{SecurityRepository, UserRepository};

pub struct SecurityService;

impl SecurityService {
    pub async fn e2e_state(pool: &PgPool, user_id: Uuid) -> Result<E2EState, AppError> {
        let Some(key) = SecurityRepository::get_key(pool, user_id).await? else {
            return Ok(E2EState {
                habilitado: false,
                algoritmo: "AES-GCM".into(),
                tipo_clave_derivacion: "PBKDF2".into(),
            });
        };
        Ok(E2EState {
            habilitado: true,
            algoritmo: key.algoritmo,
            tipo_clave_derivacion: key.derivacion,
        })
    }

    pub async fn save_e2e(
        pool: &PgPool,
        user_id: Uuid,
        req: SaveE2ERequest,
    ) -> Result<SaveE2EResponse, AppError> {
        if !req.habilitado {
            return Ok(SaveE2EResponse {
                success: true,
                estado: E2EState {
                    habilitado: false,
                    algoritmo: "AES-GCM".into(),
                    tipo_clave_derivacion: "PBKDF2".into(),
                },
            });
        }
        req.validate()
            .map_err(|error| AppError::Validation(error.to_string()))?;
        SecurityRepository::upsert_key(pool, user_id, &req.clave_cifrada).await?;
        Ok(SaveE2EResponse {
            success: true,
            estado: E2EState {
                habilitado: true,
                algoritmo: req.algoritmo.unwrap_or_else(|| "AES-GCM".into()),
                tipo_clave_derivacion: req.derivacion.unwrap_or_else(|| "PBKDF2".into()),
            },
        })
    }

    /// Cambio de contraseña: invalida las sesiones activas del usuario para
    /// forzar re-login en todos los dispositivos.
    pub async fn change_password(
        pool: &PgPool,
        user_id: Uuid,
        req: ChangePasswordRequest,
    ) -> Result<ChangePasswordResponse, AppError> {
        req.validate()
            .map_err(|error| AppError::Validation(error.to_string()))?;

        let salt = SaltString::generate(&mut OsRng);
        let hash = Argon2::default()
            .hash_password(req.nueva_contrasena.as_bytes(), &salt)
            .map_err(|error| AppError::Internal(format!("No se pudo cifrar la contraseña: {error}")))?
            .to_string();

        UserRepository::update_password(pool, user_id, &hash)
            .await?
            .ok_or(AppError::Unauthorized)?;

        // Invalida todas las sesiones previas (cambio de credenciales).
        sqlx::query("DELETE FROM auth_sessions WHERE user_id = $1")
            .bind(user_id)
            .execute(pool)
            .await?;

        Ok(ChangePasswordResponse {
            success: true,
            message: "Contraseña actualizada; vuelve a iniciar sesión".into(),
        })
    }

    // ---- Tokens MCP / API ----

    pub async fn mcp_state(pool: &PgPool, user_id: Uuid) -> Result<McpTokenState, AppError> {
        let tokens = SecurityRepository::list_tokens(pool, user_id).await?;
        Ok(McpTokenState {
            existe: !tokens.is_empty(),
            id: tokens.first().map(|token| token.id),
            fecha_creacion: tokens.first().map(|token| token.creado_en),
        })
    }

    pub async fn mcp_generate(pool: &PgPool, user_id: Uuid) -> Result<McpTokenGenerated, AppError> {
        let raw = format!("mcp_{}", Uuid::new_v4().simple());
        let salt = SaltString::generate(&mut OsRng);
        let hash = Argon2::default()
            .hash_password(raw.as_bytes(), &salt)
            .map_err(|error| AppError::Internal(format!("No se pudo cifrar el token: {error}")))?
            .to_string();
        let row = SecurityRepository::create_token(pool, user_id, &hash, "mcp").await?;
        Ok(McpTokenGenerated {
            success: true,
            id: row.id,
            token: raw,
            fecha_creacion: row.creado_en,
        })
    }

    pub async fn mcp_revoke(pool: &PgPool, user_id: Uuid, id: Uuid) -> Result<McpTokenRevoked, AppError> {
        let ok = SecurityRepository::revoke_token(pool, user_id, id).await?;
        if !ok {
            return Err(AppError::NotFound("Token no encontrado".into()));
        }
        Ok(McpTokenRevoked { success: true })
    }
}
