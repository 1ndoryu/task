use axum::extract::State;
use axum::http::header::SET_COOKIE;
use axum::http::HeaderMap;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use axum::{Json, Router};
use validator::Validate;

use crate::errors::AppError;
use crate::middleware::auth::{AuthUser, SESSION_COOKIE};
use crate::models::{
    AuthResponse, LoginRequest, RegisterRequest, UpdateProfileRequest, UserResponse,
};
use crate::services::AuthService;
use crate::AppState;

#[utoipa::path(
    post,
    tag = "auth",
    path = "/api/auth/register",
    request_body = RegisterRequest,
    responses((status = 201, description = "Usuario registrado", body = AuthResponse))
)]
pub async fn register(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(req): Json<RegisterRequest>,
) -> Result<Response, AppError> {
    req.validate()
        .map_err(|error| AppError::Validation(error.to_string()))?;
    let client_ip = state
        .trust_proxy_headers
        .then(|| header_value(&headers, "x-forwarded-for"))
        .flatten();
    let session = AuthService::register(
        &state.pool,
        req,
        state.auth_crypto_semaphore.clone(),
        client_ip,
        header_value(&headers, "user-agent"),
    )
    .await?;
    let body = Json(AuthResponse {
        user: session.user.into(),
    });
    Ok(with_session_cookies(
        body.into_response(),
        &state,
        &session.session.raw_token,
        &session.session.csrf_token,
        StatusCode::CREATED,
    ))
}

#[utoipa::path(
    post,
    tag = "auth",
    path = "/api/auth/login",
    request_body = LoginRequest,
    responses((status = 200, description = "Login exitoso", body = AuthResponse))
)]
pub async fn login(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(req): Json<LoginRequest>,
) -> Result<Response, AppError> {
    /* [local-dev] Solo en modo local (loopback -> cookie_secure=false) se
     * resuelve el alias "admin" a admin@nakomi.studio. Fuera de loopback
     * nunca se aceptan identificadores sin email: el login exige email
     * completo y el alias falla con 400 de validación. */
    let req = LoginRequest {
        email: resolver_email_local(req.email, !state.cookie_secure),
        password: req.password,
    };
    req.validate()
        .map_err(|error| AppError::Validation(error.to_string()))?;
    let client_ip = state
        .trust_proxy_headers
        .then(|| header_value(&headers, "x-forwarded-for"))
        .flatten();
    let session = AuthService::login(
        &state.pool,
        req,
        state.auth_crypto_semaphore.clone(),
        client_ip,
        header_value(&headers, "user-agent"),
    )
    .await?;
    let body = Json(AuthResponse {
        user: session.user.into(),
    });
    Ok(with_session_cookies(
        body.into_response(),
        &state,
        &session.session.raw_token,
        &session.session.csrf_token,
        StatusCode::OK,
    ))
}

#[utoipa::path(
    get,
    tag = "auth",
    path = "/api/auth/me",
    responses((status = 200, description = "Usuario autenticado", body = UserResponse)),
    security(("session_cookie" = []))
)]
/// [H-B05-02] Sin re-consulta: AuthUser ya porta el User del JOIN de sesión.
pub async fn me(auth: AuthUser) -> Result<Json<UserResponse>, AppError> {
    Ok(Json(auth.user.into()))
}

#[utoipa::path(
    get,
    tag = "profile",
    path = "/api/profile",
    responses((status = 200, description = "Perfil del usuario", body = UserResponse)),
    security(("session_cookie" = []))
)]
/// [H-B05-02] Sin re-consulta: AuthUser ya porta el User del JOIN de sesión.
pub async fn profile(auth: AuthUser) -> Result<Json<UserResponse>, AppError> {
    Ok(Json(auth.user.into()))
}

#[utoipa::path(
    put,
    tag = "profile",
    path = "/api/profile",
    request_body = UpdateProfileRequest,
    responses(
        (status = 200, description = "Perfil actualizado", body = UserResponse),
        (status = 403, description = "CSRF inválido", body = ErrorResponse)
    ),
    security(("session_cookie" = []))
)]
pub async fn update_profile(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(req): Json<UpdateProfileRequest>,
) -> Result<Json<UserResponse>, AppError> {
    req.validate()
        .map_err(|error| AppError::Validation(error.to_string()))?;
    let user = crate::repositories::UserRepository::update_profile(
        &state.pool,
        auth.user_id,
        &req.display_name,
        req.avatar_url.as_deref(),
    )
    .await?
    .ok_or(AppError::Unauthorized)?;
    Ok(Json(user.into()))
}

#[utoipa::path(
    post,
    tag = "auth",
    path = "/api/auth/logout",
    responses((status = 204, description = "Sesión cerrada")),
    security(("session_cookie" = []))
)]
pub async fn logout(
    State(state): State<AppState>,
    _auth: AuthUser,
    headers: HeaderMap,
) -> Result<Response, AppError> {
    if let Some(token) = cookie_from_header(&headers, SESSION_COOKIE) {
        crate::services::SessionService::revoke_by_token(&state.pool, token).await?;
    }
    let mut response = StatusCode::NO_CONTENT.into_response();
    response.headers_mut().append(
        SET_COOKIE,
        cookie_header(SESSION_COOKIE, "", &state, 0)
            .parse()
            .map_err(|_| AppError::Internal("Cookie de sesión inválida".into()))?,
    );
    response.headers_mut().append(
        SET_COOKIE,
        cookie_header("csrf_token", "", &state, 0)
            .parse()
            .map_err(|_| AppError::Internal("Cookie CSRF inválida".into()))?,
    );
    Ok(response)
}

pub fn public_routes() -> Router<AppState> {
    Router::new()
        .route("/auth/register", post(register))
        .route("/auth/login", post(login))
}

pub fn protected_routes() -> Router<AppState> {
    Router::new()
        .route("/auth/me", get(me))
        .route("/auth/logout", post(logout))
        .route("/profile", get(profile).put(update_profile))
}

fn with_session_cookies(
    mut response: Response,
    state: &AppState,
    session: &str,
    csrf: &str,
    status: StatusCode,
) -> Response {
    *response.status_mut() = status;
    response.headers_mut().append(
        SET_COOKIE,
        cookie_header(SESSION_COOKIE, session, state, 60 * 60 * 24 * 7)
            .parse()
            .expect("session cookie is valid"),
    );
    response.headers_mut().append(
        SET_COOKIE,
        cookie_header("csrf_token", csrf, state, 60 * 60 * 24 * 7)
            .parse()
            .expect("csrf cookie is valid"),
    );
    response
}

fn cookie_header(name: &str, value: &str, state: &AppState, max_age: u64) -> String {
    let mut cookie = format!("{name}={value}; Path=/; Max-Age={max_age}; SameSite=Lax");
    if name == SESSION_COOKIE {
        cookie.push_str("; HttpOnly");
    }
    if state.cookie_secure {
        cookie.push_str("; Secure");
    }
    if let Some(domain) = &state.cookie_domain {
        cookie.push_str("; Domain=");
        cookie.push_str(domain);
    }
    cookie
}

/// [local-dev] Acceso rápido en local: el identificador `admin` se mapea a
/// `admin@nakomi.studio`. Solo aplica en modo local y si el identificador no
/// es un email; cualquier otro valor se devuelve intacto (validará abajo).
fn resolver_email_local(email: String, local: bool) -> String {
    if local && email.trim().eq_ignore_ascii_case("admin") && !email.contains('@') {
        "admin@nakomi.studio".to_string()
    } else {
        email
    }
}

fn header_value<'a>(headers: &'a HeaderMap, name: &str) -> Option<&'a str> {
    headers.get(name).and_then(|value| value.to_str().ok())
}

fn cookie_from_header<'a>(headers: &'a HeaderMap, name: &str) -> Option<&'a str> {
    let value = headers.get("cookie")?.to_str().ok()?;
    value.split(';').map(str::trim).find_map(|pair| {
        let (key, value) = pair.split_once('=')?;
        (key == name).then_some(value)
    })
}

#[cfg(test)]
mod tests {
    use super::resolver_email_local;

    #[test]
    fn alias_admin_solo_en_local() {
        assert_eq!(
            resolver_email_local("admin".to_string(), true),
            "admin@nakomi.studio"
        );
        /* Fuera de local el alias nunca se resuelve. */
        assert_eq!(resolver_email_local("admin".to_string(), false), "admin");
    }

    #[test]
    fn emails_se_devuelven_intactos() {
        assert_eq!(
            resolver_email_local("Admin@Nakomi.Studio".to_string(), true),
            "Admin@Nakomi.Studio"
        );
        assert_eq!(
            resolver_email_local("otro@local.test".to_string(), true),
            "otro@local.test"
        );
    }
}
