use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use sqlx::PgPool;
use std::sync::Arc;
use tokio::sync::Semaphore;

use crate::errors::AppError;
use crate::models::{LoginRequest, RegisterRequest, User};
use crate::repositories::UserRepository;
use crate::services::{CollaborationService, SessionResult, SessionService};

pub struct AuthenticatedSession {
    pub user: User,
    pub session: SessionResult,
}

pub struct AuthService;

impl AuthService {
    pub async fn register(
        pool: &PgPool,
        req: RegisterRequest,
        crypto_semaphore: Arc<Semaphore>,
        ip_address: Option<&str>,
        user_agent: Option<&str>,
    ) -> Result<AuthenticatedSession, AppError> {
        let email = req.email.trim().to_lowercase();
        if UserRepository::find_by_email(pool, &email).await?.is_some() {
            return Err(AppError::Conflict("Email ya registrado".into()));
        }

        let password_hash = hash_password(req.password, crypto_semaphore).await?;

        let user = UserRepository::create(pool, &email, &password_hash)
            .await
            .map_err(map_registration_error)?;
        CollaborationService::activate_pending(pool, user.id, &user.email).await?;
        let session = SessionService::create(pool, user.id, ip_address, user_agent).await?;

        Ok(AuthenticatedSession { user, session })
    }

    pub async fn login(
        pool: &PgPool,
        req: LoginRequest,
        crypto_semaphore: Arc<Semaphore>,
        ip_address: Option<&str>,
        user_agent: Option<&str>,
    ) -> Result<AuthenticatedSession, AppError> {
        let user = UserRepository::find_by_email(pool, &req.email)
            .await?
            .ok_or(AppError::Unauthorized)?;

        if !verify_password(req.password, user.password_hash.clone(), crypto_semaphore).await? {
            return Err(AppError::Unauthorized);
        }

        let session = SessionService::create(pool, user.id, ip_address, user_agent).await?;
        Ok(AuthenticatedSession { user, session })
    }
}

fn map_registration_error(error: sqlx::Error) -> AppError {
    if let sqlx::Error::Database(database_error) = &error {
        if database_error.code().as_deref() == Some("23505") {
            return AppError::Conflict("Email ya registrado".into());
        }
    }
    AppError::Database(error)
}

async fn hash_password(
    password: String,
    crypto_semaphore: Arc<Semaphore>,
) -> Result<String, AppError> {
    let permit = crypto_semaphore
        .acquire_owned()
        .await
        .map_err(|_| AppError::Internal("Límite de criptografía cerrado".into()))?;
    tokio::task::spawn_blocking(move || {
        let _permit = permit;
        let salt = SaltString::generate(&mut OsRng);
        Argon2::default()
            .hash_password(password.as_bytes(), &salt)
            .map(|hash| hash.to_string())
            .map_err(|error| format!("Error al hashear contraseña: {error}"))
    })
    .await
    .map_err(|error| AppError::Internal(format!("Tarea criptográfica falló: {error}")))?
    .map_err(AppError::Internal)
}

async fn verify_password(
    password: String,
    stored_hash: String,
    crypto_semaphore: Arc<Semaphore>,
) -> Result<bool, AppError> {
    let permit = crypto_semaphore
        .acquire_owned()
        .await
        .map_err(|_| AppError::Internal("Límite de criptografía cerrado".into()))?;
    tokio::task::spawn_blocking(move || {
        let _permit = permit;
        let parsed_hash = PasswordHash::new(&stored_hash)
            .map_err(|error| format!("Hash almacenado inválido: {error}"))?;
        Ok(Argon2::default()
            .verify_password(password.as_bytes(), &parsed_hash)
            .is_ok())
    })
    .await
    .map_err(|error| AppError::Internal(format!("Tarea criptográfica falló: {error}")))?
    .map_err(AppError::Internal)
}
