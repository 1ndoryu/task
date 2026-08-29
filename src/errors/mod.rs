use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::Serialize;
use utoipa::ToSchema;

/// Tipos de error de la aplicación — cada variante mapea a un HTTP status code
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("No encontrado: {0}")]
    NotFound(String),

    #[error("Solicitud inválida: {0}")]
    BadRequest(String),

    #[error("No autorizado")]
    Unauthorized,

    #[error("Prohibido: {0}")]
    Forbidden(String),

    #[error("Demasiadas solicitudes")]
    TooManyRequests,

    #[error("Servicio no disponible: {0}")]
    ServiceUnavailable(String),

    /// Capacidad no configurada (p. ej. búsqueda web sin clave de proveedor):
    /// 503 con el mensaje legible expuesto (a diferencia de `ServiceUnavailable`,
    /// que oculta el detalle por diseño).
    #[error("Capacidad no configurada: {0}")]
    NotConfigured(String),

    #[error("Conflicto: {0}")]
    Conflict(String),

    #[error("Error interno: {0}")]
    Internal(String),

    #[error("Error de base de datos: {0}")]
    Database(#[from] sqlx::Error),

    #[error("Error de validación: {0}")]
    Validation(String),

    #[error("Error del proveedor externo: {0}")]
    Upstream(String),

    /// El cliente cortó el stream SSE (cancelación del turno): no es un error
    /// del proveedor y no dispara fallback ni se registra como fallo.
    #[error("Turno cancelado por el cliente")]
    Cancelado,
}

/// Estructura de respuesta de error expuesta en la API
#[derive(Serialize, ToSchema)]
pub struct ErrorResponse {
    /// Tipo de error (`not_found`, `unauthorized`, etc.)
    pub error: String,
    /// Mensaje legible para el usuario
    pub message: String,
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, error_type, message) = match &self {
            Self::NotFound(msg) => (StatusCode::NOT_FOUND, "not_found", msg.clone()),
            Self::BadRequest(msg) => (StatusCode::BAD_REQUEST, "bad_request", msg.clone()),
            Self::Unauthorized => (
                StatusCode::UNAUTHORIZED,
                "unauthorized",
                "Credenciales inválidas o ausentes".to_string(),
            ),
            Self::Forbidden(msg) => (StatusCode::FORBIDDEN, "forbidden", msg.clone()),
            Self::TooManyRequests => (
                StatusCode::TOO_MANY_REQUESTS,
                "rate_limited",
                "Demasiadas solicitudes; inténtalo más tarde".to_string(),
            ),
            Self::ServiceUnavailable(_) => (
                StatusCode::SERVICE_UNAVAILABLE,
                "service_unavailable",
                "Base de datos no disponible".to_string(),
            ),
            Self::NotConfigured(msg) => (
                StatusCode::SERVICE_UNAVAILABLE,
                "not_configured",
                msg.clone(),
            ),
            Self::Conflict(msg) => (StatusCode::CONFLICT, "conflict", msg.clone()),
            Self::Internal(msg) => {
                tracing::error!("Error interno: {msg}");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "internal_error",
                    "Ocurrió un error interno".to_string(),
                )
            }
            Self::Database(err) => {
                tracing::error!("Error de base de datos: {err}");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "database_error",
                    "Ocurrió un error de base de datos".to_string(),
                )
            }
            Self::Validation(msg) => (
                StatusCode::UNPROCESSABLE_ENTITY,
                "validation_error",
                msg.clone(),
            ),
            /* [AI] Error del proveedor LLM externo (Cerebras/Groq/DeepSeek): el
             * mensaje SÍ se expone porque es la información que el usuario
             * necesita (key no configurada, 401, 429, modelo no soportado). */
            Self::Upstream(msg) => (
                StatusCode::BAD_GATEWAY,
                "upstream_error",
                msg.clone(),
            ),
            /* Cliente cortó el SSE: el stream ya no recibe nada; status 408. */
            Self::Cancelado => (
                StatusCode::REQUEST_TIMEOUT,
                "cancelado",
                "Turno cancelado".to_string(),
            ),
        };

        let body = ErrorResponse {
            error: error_type.to_string(),
            message,
        };

        (status, Json(body)).into_response()
    }
}

#[cfg(test)]
mod tests {
    use super::AppError;
    use axum::body::to_bytes;
    use axum::response::IntoResponse;

    #[tokio::test]
    async fn service_unavailable_does_not_expose_dependency_detail() {
        let response =
            AppError::ServiceUnavailable("postgres password=secret".into()).into_response();
        assert_eq!(
            response.status(),
            axum::http::StatusCode::SERVICE_UNAVAILABLE
        );
        let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
        let body = String::from_utf8_lossy(&body);
        assert!(!body.contains("password=secret"));
        assert!(body.contains("Base de datos no disponible"));
    }
}
