use sqlx::PgPool;
use std::sync::Arc;
use tokio::sync::Semaphore;

use crate::errors::AppError;
use crate::models::{LoginRequest, RegisterRequest, User};
use crate::repositories::UserRepository;
use crate::services::{crypto, CollaborationService, SessionResult, SessionService};

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
        /* [H-B05-01] Sin pre-check de email: el hash se calcula igual para
         * emails nuevos y existentes (timing uniforme) y la violación de
         * unicidad la resuelve la BD (23505 -> Conflict). El estado 409 vs
         * 201 es inherente al registro; el mensaje no revela más que eso. */
        let password_hash = crypto::hash_password(req.password, crypto_semaphore).await?;

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

        if !crypto::verify_password(req.password, user.password_hash.clone(), crypto_semaphore).await?
        {
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


