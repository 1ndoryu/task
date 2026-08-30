// sentinel-disable-file sqlx-query-sin-macro sqlx-query-as-sin-macro
// [por que] sqlx sin feature "macros" ni DB en compile-time: query! rompe el build.
use axum::routing::get;
use axum::{extract::State, Json, Router};
use serde::Serialize;
use utoipa::ToSchema;

use crate::repositories::HealthRepository;
use crate::AppState;

#[derive(Serialize, ToSchema)]
pub struct HealthResponse {
    pub status: String,
    pub version: String,
}

/// Endpoint de health check — siempre público
#[utoipa::path(
    get,
    tag = "health",
    path = "/api/health",
    responses(
        (status = 200, description = "Servicio funcionando", body = HealthResponse)
    )
)]
pub async fn health_check() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
    })
}

/// Readiness check — confirma que `PostgreSQL` responde antes de recibir tráfico.
#[utoipa::path(
    get,
    tag = "health",
    path = "/api/ready",
    responses(
        (status = 200, description = "Servicio listo", body = HealthResponse),
        (status = 503, description = "Dependencia no disponible", body = ErrorResponse)
    )
)]
pub async fn readiness_check(
    State(state): State<crate::AppState>,
) -> Result<Json<HealthResponse>, crate::errors::AppError> {
    HealthRepository::ping(&state.pool)
        .await
        .map_err(|error| {
            tracing::error!(error = %error, "Readiness check de PostgreSQL falló");
            crate::errors::AppError::ServiceUnavailable("Base de datos no disponible".into())
        })?;
    Ok(Json(HealthResponse {
        status: "ready".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
    }))
}

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/health", get(health_check))
        .route("/ready", get(readiness_check))
}
