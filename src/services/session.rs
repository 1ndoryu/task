use chrono::{DateTime, Duration, Utc};
use serde::Serialize;
use sha2::{Digest, Sha256};
use sqlx::PgPool;
use uuid::Uuid;

use crate::errors::AppError;
use crate::models::User;

const SESSION_DURATION_HOURS: i64 = 168;

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct Session {
    pub id: Uuid,
    pub user_id: Uuid,
    pub expires_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub last_used_at: DateTime<Utc>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
}

pub struct SessionResult {
    pub raw_token: String,
    pub csrf_token: String,
    pub session: Session,
}

pub struct SessionService;

impl SessionService {
    pub async fn create(
        pool: &PgPool,
        user_id: Uuid,
        ip_address: Option<&str>,
        user_agent: Option<&str>,
    ) -> Result<SessionResult, AppError> {
        let raw_token = Uuid::new_v4().to_string();
        let csrf_token = Uuid::new_v4().to_string();
        let expires_at = Utc::now() + Duration::hours(SESSION_DURATION_HOURS);
        let session = sqlx::query_as::<_, Session>(
            "INSERT INTO auth_sessions
             (id, user_id, token_hash, csrf_hash, expires_at, ip_address, user_agent)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, user_id, expires_at, created_at, last_used_at, ip_address, user_agent",
        )
        .bind(Uuid::new_v4())
        .bind(user_id)
        .bind(hash_token(&raw_token))
        .bind(hash_token(&csrf_token))
        .bind(expires_at)
        .bind(ip_address)
        .bind(user_agent)
        .fetch_one(pool)
        .await
        .map_err(|error| AppError::Internal(format!("Error creando sesión: {error}")))?;

        Ok(SessionResult {
            raw_token,
            csrf_token,
            session,
        })
    }

    pub async fn validate(pool: &PgPool, raw_token: &str) -> Result<Option<Session>, AppError> {
        let token_hash = hash_token(raw_token);
        let session = sqlx::query_as::<_, Session>(
            "SELECT id, user_id, expires_at, created_at, last_used_at, ip_address, user_agent
             FROM auth_sessions WHERE token_hash = $1",
        )
        .bind(token_hash)
        .fetch_optional(pool)
        .await
        .map_err(|error| AppError::Internal(format!("Error validando sesión: {error}")))?;

        let Some(session) = session else {
            return Ok(None);
        };
        if session.expires_at <= Utc::now() {
            Self::revoke_by_id(pool, session.id).await?;
            return Ok(None);
        }
        Self::maybe_slide(pool, &session).await?;
        Ok(Some(session))
    }

    /// [H-B01-01] Valida la sesión y carga el usuario en la **misma** query
    /// (JOIN): elimina el segundo roundtrip por request autenticado.
    pub async fn validate_with_user(
        pool: &PgPool,
        raw_token: &str,
    ) -> Result<Option<(Session, User)>, AppError> {
        /* Fila plana con alias para evitar columnas homónimas (id, created_at)
         * entre Session y User; se reconstruyen las dos structs después. */
        #[derive(Debug, Clone, sqlx::FromRow)]
        struct SessionUserRow {
            session_id: Uuid,
            session_user_id: Uuid,
            session_expires_at: DateTime<Utc>,
            session_created_at: DateTime<Utc>,
            last_used_at: DateTime<Utc>,
            ip_address: Option<String>,
            user_agent: Option<String>,
            user_id: Uuid,
            email: String,
            password_hash: String,
            display_name: String,
            avatar_url: Option<String>,
            es_admin: bool,
            user_created_at: DateTime<Utc>,
        }

        let token_hash = hash_token(raw_token);
        let row = sqlx::query_as::<_, SessionUserRow>(
            "SELECT s.id AS session_id, s.user_id AS session_user_id,
                    s.expires_at AS session_expires_at, s.created_at AS session_created_at,
                    s.last_used_at, s.ip_address, s.user_agent,
                    u.id AS user_id, u.email, u.password_hash, u.display_name,
                    u.avatar_url, u.es_admin, u.created_at AS user_created_at
             FROM auth_sessions s
             JOIN users u ON u.id = s.user_id
             WHERE s.token_hash = $1",
        )
        .bind(token_hash)
        .fetch_optional(pool)
        .await
        .map_err(|error| AppError::Internal(format!("Error validando sesión: {error}")))?;

        let Some(row) = row else {
            return Ok(None);
        };
        let session = Session {
            id: row.session_id,
            user_id: row.session_user_id,
            expires_at: row.session_expires_at,
            created_at: row.session_created_at,
            last_used_at: row.last_used_at,
            ip_address: row.ip_address,
            user_agent: row.user_agent,
        };
        if session.expires_at <= Utc::now() {
            Self::revoke_by_id(pool, session.id).await?;
            return Ok(None);
        }
        Self::maybe_slide(pool, &session).await?;
        let user = User {
            id: row.user_id,
            email: row.email,
            password_hash: row.password_hash,
            display_name: row.display_name,
            avatar_url: row.avatar_url,
            es_admin: row.es_admin,
            created_at: row.user_created_at,
        };
        Ok(Some((session, user)))
    }

    /// [H-B04-07] Sliding de expiración solo si la sesión no se usó en el
    /// umbral: evita un UPDATE por cada request autenticado (write por read).
    async fn maybe_slide(pool: &PgPool, session: &Session) -> Result<(), AppError> {
        const SLIDING_UMBRAL_MINUTOS: i64 = 5;
        if Utc::now().signed_duration_since(session.last_used_at)
            >= Duration::minutes(SLIDING_UMBRAL_MINUTOS)
        {
            sqlx::query(
                "UPDATE auth_sessions SET last_used_at = NOW(), expires_at = $1 WHERE id = $2",
            )
            .bind(Utc::now() + Duration::hours(SESSION_DURATION_HOURS))
            .bind(session.id)
            .execute(pool)
            .await
            .map_err(|error| AppError::Internal(format!("Error actualizando sesión: {error}")))?;
        }
        Ok(())
    }

    pub async fn validate_csrf(
        pool: &PgPool,
        raw_token: &str,
        csrf_token: &str,
    ) -> Result<bool, AppError> {
        let stored: Option<(String,)> = sqlx::query_as(
            "SELECT csrf_hash FROM auth_sessions
             WHERE token_hash = $1 AND expires_at > NOW()",
        )
        .bind(hash_token(raw_token))
        .fetch_optional(pool)
        .await
        .map_err(|error| AppError::Internal(format!("Error validando CSRF: {error}")))?;
        Ok(stored.is_some_and(|(hash,)| hash == hash_token(csrf_token)))
    }

    pub async fn revoke_by_id(pool: &PgPool, session_id: Uuid) -> Result<(), AppError> {
        sqlx::query("DELETE FROM auth_sessions WHERE id = $1")
            .bind(session_id)
            .execute(pool)
            .await
            .map_err(|error| AppError::Internal(format!("Error revocando sesión: {error}")))?;
        Ok(())
    }

    pub async fn revoke_by_token(pool: &PgPool, raw_token: &str) -> Result<(), AppError> {
        sqlx::query("DELETE FROM auth_sessions WHERE token_hash = $1")
            .bind(hash_token(raw_token))
            .execute(pool)
            .await
            .map_err(|error| AppError::Internal(format!("Error revocando sesión: {error}")))?;
        Ok(())
    }

    pub async fn cleanup_expired(pool: &PgPool) -> Result<u64, sqlx::Error> {
        let result = sqlx::query("DELETE FROM auth_sessions WHERE expires_at <= NOW()")
            .execute(pool)
            .await?;
        Ok(result.rows_affected())
    }
}

fn hash_token(token: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(token.as_bytes());
    hex::encode(hasher.finalize())
}
