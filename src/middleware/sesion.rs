/* Sesión rodante: re-emite las cookies de sesión en cada petición autenticada.
 * [por que] El `Max-Age` de la cookie se fija al entrar y no se volvía a emitir,
 * así que el navegador la tiraba a los 7 días del login aunque la sesión siguiera
 * viva en la BD: el deslizamiento de `expires_at` (services/session.rs) alargaba
 * la fila pero no llegaba a la cookie, y la app se deslogueaba sola con la sesión
 * intacta en el servidor. Re-emitir el mismo valor con el `Max-Age` completo deja
 * cookie y fila en el mismo reloj: mientras se use, no caduca.
 * [por que] Solo cuando la petición traía sesión y la respuesta no es 401/403:
 * prorrogar la cookie de una sesión ya rechazada sería mantener viva una muerta.
 * No toca la BD (el valor no cambia), así que no añade un viaje por petición. */
use axum::extract::{Request, State};
use axum::http::header::SET_COOKIE;
use axum::http::HeaderValue;
use axum::middleware::Next;
use axum::response::Response;

use crate::handlers::auth::cookie_header;
use crate::middleware::auth::{extract_cookie, CSRF_COOKIE, SESSION_COOKIE};
use crate::services::session::SESSION_MAX_AGE_SEGUNDOS;
use crate::AppState;

pub async fn rodar_cookie(
    State(state): State<AppState>,
    peticion: Request,
    siguiente: Next,
) -> Response {
    let sesion = extract_cookie(peticion.headers(), SESSION_COOKIE).map(str::to_owned);
    let csrf = extract_cookie(peticion.headers(), CSRF_COOKIE).map(str::to_owned);
    let mut respuesta = siguiente.run(peticion).await;

    let Some(sesion) = sesion else {
        return respuesta;
    };
    if matches!(
        respuesta.status(),
        axum::http::StatusCode::UNAUTHORIZED | axum::http::StatusCode::FORBIDDEN
    ) {
        return respuesta;
    }
    for valor in [
        cookie_header(SESSION_COOKIE, &sesion, &state, SESSION_MAX_AGE_SEGUNDOS),
        cookie_header(
            CSRF_COOKIE,
            csrf.as_deref().unwrap_or(""),
            &state,
            SESSION_MAX_AGE_SEGUNDOS,
        ),
    ] {
        /* [por que] Igual que en los handlers de auth: un valor no convertible a
         * cabecera no puede tumbar la respuesta que ya estaba lista. */
        if let Ok(cabecera) = HeaderValue::from_str(&valor) {
            respuesta.headers_mut().append(SET_COOKIE, cabecera);
        }
    }
    respuesta
}
