/* Servir el front compilado y las cabeceras que van en toda respuesta.
 * Vive aparte de `mod.rs`: el ensamblado de rutas de la API y el reparto de
 * archivos no comparten nada y juntos no caben en una función legible. */
use axum::body::Body;
use axum::http::{
    header::{CACHE_CONTROL, CONTENT_TYPE},
    HeaderName, HeaderValue, Request, StatusCode,
};
use axum::response::Response;
use axum::Router;
use tower::ServiceExt;
use tower_http::services::ServeDir;
use tower_http::set_header::SetResponseHeaderLayer;

/// Añade el reparto de archivos del front compilado como `fallback`.
/// Lo que no sea un archivo existente devuelve `index.html`, que es lo que
/// espera una SPA con rutas propias.
pub fn servir_front<M>(router: Router<M>, frontend_dist: String) -> Router<M>
where
    M: Clone + Send + Sync + 'static,
{
    let index = std::path::Path::new(&frontend_dist).join("index.html");
    let static_dir = ServeDir::new(frontend_dist).append_index_html_on_directories(true);
    router.fallback_service(tower::service_fn(move |request: Request<Body>| {
        let index = index.clone();
        let static_dir = static_dir.clone();
        async move { responder(request, index, static_dir).await }
    }))
}

/* [por que] El índice no lleva hash en el nombre y su `Last-Modified` casi no
 * cambia entre builds: sin `Cache-Control` el webview lo guardaba y seguía
 * abriendo el front anterior tras instalar uno nuevo. Los assets van con hash
 * en el nombre, así que esos sí se cachean sin revalidar. */
async fn responder(
    request: Request<Body>,
    index: std::path::PathBuf,
    static_dir: ServeDir,
) -> Result<Response, std::convert::Infallible> {
    // Si el archivo existe, se sirve; si no, cae al índice de la SPA.
    let sirve_assets = request.uri().path().starts_with("/assets/");
    /* `ServeDir` declara `Error = Infallible`: la respuesta siempre es `Ok`.
     * Se consume el `Result` con un `match` exhaustivo (`match imposible {}`)
     * en lugar de paniquear. */
    let estatico = match static_dir.oneshot(request).await {
        Ok(respuesta) => respuesta,
        Err(imposible) => match imposible {},
    };
    if estatico.status() == StatusCode::NOT_FOUND {
        return Ok(indice(index).await);
    }
    let (mut parts, body) = estatico.into_parts();
    parts.headers.insert(
        CACHE_CONTROL,
        HeaderValue::from_static(if sirve_assets {
            "public, max-age=31536000, immutable"
        } else {
            "no-cache"
        }),
    );
    Ok(Response::from_parts(parts, Body::new(body)))
}

/// El índice de la SPA, o 404 si no está compilado.
async fn indice(index: std::path::PathBuf) -> Response {
    /* Sin `Response::builder()`: el status y la cabecera son constantes
     * válidas, así que no hay `Result` que gestionar ni motivo para un
     * `expect`. */
    let Ok(contenido) = tokio::fs::read(index).await else {
        let mut respuesta = Response::new(Body::empty());
        *respuesta.status_mut() = StatusCode::NOT_FOUND;
        return respuesta;
    };
    let mut respuesta = Response::new(Body::from(contenido));
    respuesta
        .headers_mut()
        .insert(CONTENT_TYPE, HeaderValue::from_static("text/html; charset=utf-8"));
    respuesta
        .headers_mut()
        .insert(CACHE_CONTROL, HeaderValue::from_static("no-cache"));
    respuesta
}

/// Cabeceras de seguridad comunes a toda respuesta. Van de fuera adentro y
/// nunca sobrescriben una que ya venga puesta.
pub fn cabeceras_seguridad<M>(router: Router<M>) -> Router<M>
where
    M: Clone + Send + Sync + 'static,
{
    router
        .layer(SetResponseHeaderLayer::if_not_present(
            HeaderName::from_static("x-content-type-options"),
            HeaderValue::from_static("nosniff"),
        ))
        .layer(SetResponseHeaderLayer::if_not_present(
            HeaderName::from_static("x-frame-options"),
            HeaderValue::from_static("DENY"),
        ))
        .layer(SetResponseHeaderLayer::if_not_present(
            HeaderName::from_static("referrer-policy"),
            HeaderValue::from_static("strict-origin-when-cross-origin"),
        ))
        .layer(SetResponseHeaderLayer::if_not_present(
            HeaderName::from_static("permissions-policy"),
            HeaderValue::from_static("camera=(), microphone=(), geolocation=()"),
        ))
}
