use axum::body::Body;
use axum::extract::State;
use axum::http::Request;
use axum::middleware::Next;
use axum::response::Response;
use std::net::SocketAddr;
use std::sync::Arc;

use crate::errors::AppError;
use crate::services::FixedWindowLimiter;
use crate::AppState;

/* [249A-1] Clave de cliente: respeta `trust_proxy_headers` igual que hacía
 * `auth_rate_limit` en origen; los cuatro middlewares la reutilizan para no
 * triplicar la lógica de IP. */
fn clave_cliente(proxy: bool, request: &Request<Body>) -> String {
    if proxy {
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
    }
}

async fn aplicar_limite(
    limitador: &Arc<FixedWindowLimiter>,
    proxy: bool,
    request: Request<Body>,
    next: Next,
) -> Result<Response, AppError> {
    let clave = clave_cliente(proxy, &request);
    if !limitador.check(&clave) {
        return Err(AppError::TooManyRequests(limitador.ventana_secs()));
    }
    Ok(next.run(request).await)
}

pub async fn auth_rate_limit(
    State(state): State<AppState>,
    request: Request<Body>,
    next: Next,
) -> Result<Response, AppError> {
    let limitador = state.auth_rate_limiter.clone();
    aplicar_limite(&limitador, state.trust_proxy_headers, request, next).await
}

/* [249A-1] Tres grupos con cuota propia (configurables por env): escritura
 * general de la API, tráfico IA/agente (coste de proveedor) y administración.
 * Reciben `(limitador, trust_proxy)` vía `from_fn_with_state` — el mismo
 * patrón que `auth_rate_limit` — y se montan con `route_layer` en cada
 * `routes()` para que la protección viva junto a la ruta que protege. */
pub async fn limite_escritura_api(
    State((limitador, proxy)): State<(Arc<FixedWindowLimiter>, bool)>,
    request: Request<Body>,
    next: Next,
) -> Result<Response, AppError> {
    aplicar_limite(&limitador, proxy, request, next).await
}

pub async fn limite_ia_api(
    State((limitador, proxy)): State<(Arc<FixedWindowLimiter>, bool)>,
    request: Request<Body>,
    next: Next,
) -> Result<Response, AppError> {
    aplicar_limite(&limitador, proxy, request, next).await
}

pub async fn limite_admin_api(
    State((limitador, proxy)): State<(Arc<FixedWindowLimiter>, bool)>,
    request: Request<Body>,
    next: Next,
) -> Result<Response, AppError> {
    aplicar_limite(&limitador, proxy, request, next).await
}

#[cfg(test)]
mod pruebas {
    /* [249A-1] 429 real a través del middleware: dos POST pasan, el tercero
     * vuelve 429 con `Retry-After`. Sin BD ni red: el estado de la capa es
     * solo `(limitador, proxy)`. */
    use super::limite_escritura_api;
    use crate::services::FixedWindowLimiter;
    use axum::body::Body;
    use axum::http::{Method, Request};
    use axum::routing::post;
    use axum::Router;
    use std::sync::Arc;
    use std::time::Duration;
    use tower::ServiceExt;

    #[tokio::test]
    async fn tercer_post_consecutivo_devuelve_429_con_retry_after() {
        let limitador = Arc::new(FixedWindowLimiter::new(2, Duration::from_mins(1)));
        let app = Router::new()
            .route("/prueba", post(|| async { "ok" }))
            .route_layer(axum::middleware::from_fn_with_state(
                (limitador, false),
                limite_escritura_api,
            ));

        for _ in 0..2 {
            let respuesta = app
                .clone()
                .oneshot(
                    Request::builder()
                        .uri("/prueba")
                        .method(Method::POST)
                        .body(Body::empty())
                        .expect("petición válida"),
                )
                .await
                .expect("respuesta");
            assert_eq!(respuesta.status(), axum::http::StatusCode::OK);
        }

        let respuesta = app
            .oneshot(
                Request::builder()
                    .uri("/prueba")
                    .method(Method::POST)
                    .body(Body::empty())
                    .expect("petición válida"),
            )
            .await
            .expect("respuesta");
        assert_eq!(
            respuesta.status(),
            axum::http::StatusCode::TOO_MANY_REQUESTS
        );
        assert_eq!(
            respuesta
                .headers()
                .get(axum::http::header::RETRY_AFTER)
                .expect("Retry-After presente")
                .to_str()
                .expect("valor legible"),
            "60"
        );
    }
}
