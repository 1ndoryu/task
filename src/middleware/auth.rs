use axum::async_trait;
use axum::extract::FromRequestParts;
use axum::http::request::Parts;
use axum::http::Method;
use uuid::Uuid;

use crate::errors::AppError;
use crate::models::User;
use crate::services::SessionService;
use crate::AppState;

pub const SESSION_COOKIE: &str = "session_id";
pub const CSRF_COOKIE: &str = "csrf_token";

/// [H-B01-01/H-B05-02] Porta el `User` completo: la query de sesión ya hace el
/// JOIN con users, así que me/profile no re-consultan la BD.
pub struct AuthUser {
    pub user_id: Uuid,
    pub user: User,
}

#[async_trait]
impl FromRequestParts<AppState> for AuthUser {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let raw_token = extract_cookie(parts, SESSION_COOKIE).ok_or(AppError::Unauthorized)?;
        let (_session, user) = SessionService::validate_with_user(&state.pool, raw_token)
            .await?
            .ok_or(AppError::Unauthorized)?;

        if is_mutation(&parts.method) {
            verify_csrf(parts, state, raw_token).await?;
        }

        Ok(Self {
            user_id: user.id,
            user,
        })
    }
}

pub fn extract_cookie<'a>(parts: &'a Parts, name: &str) -> Option<&'a str> {
    let header = parts.headers.get("cookie")?.to_str().ok()?;
    header.split(';').map(str::trim).find_map(|pair| {
        let (key, value) = pair.split_once('=')?;
        (key == name).then_some(value)
    })
}

async fn verify_csrf(parts: &Parts, state: &AppState, raw_token: &str) -> Result<(), AppError> {
    let csrf_cookie = extract_cookie(parts, CSRF_COOKIE)
        .ok_or_else(|| AppError::Forbidden("CSRF token missing from cookie".into()))?;
    let csrf_header = parts
        .headers
        .get("X-CSRF-Token")
        .and_then(|value| value.to_str().ok())
        .ok_or_else(|| AppError::Forbidden("CSRF token missing from header".into()))?;

    if csrf_cookie != csrf_header
        || !SessionService::validate_csrf(&state.pool, raw_token, csrf_header).await?
    {
        return Err(AppError::Forbidden("CSRF token mismatch".into()));
    }
    Ok(())
}

fn is_mutation(method: &Method) -> bool {
    matches!(
        *method,
        Method::POST | Method::PUT | Method::PATCH | Method::DELETE
    )
}
