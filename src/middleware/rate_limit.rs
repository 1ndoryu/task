use axum::body::Body;
use axum::extract::State;
use axum::http::Request;
use axum::middleware::Next;
use axum::response::Response;
use std::net::SocketAddr;

use crate::errors::AppError;
use crate::AppState;

pub async fn auth_rate_limit(
    State(state): State<AppState>,
    request: Request<Body>,
    next: Next,
) -> Result<Response, AppError> {
    let key = if state.trust_proxy_headers {
        request
            .headers()
            .get("x-forwarded-for")
            .or_else(|| request.headers().get("x-real-ip"))
            .and_then(|value| value.to_str().ok())
            .and_then(|value| value.split(',').next())
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map_or_else(|| "unknown".to_string(), ToOwned::to_owned)
    } else {
        request
            .extensions()
            .get::<axum::extract::ConnectInfo<SocketAddr>>()
            .map_or_else(
                || "unknown".to_string(),
                |connect_info| connect_info.0.ip().to_string(),
            )
    };

    if !state.auth_rate_limiter.check(&key) {
        return Err(AppError::TooManyRequests);
    }

    Ok(next.run(request).await)
}
