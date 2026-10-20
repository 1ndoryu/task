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

/* [por que] Si el handler ya reemitió esa cookie, la del middleware llegaría después y
 * el navegador se queda con la última: en un login seguiría valiendo la sesión vieja
 * (entrar como otro usuario no cambiaba nada) y en un logout la cookie resucitaría.
 * Solo se reemite lo que nadie haya tocado. */
fn ya_emitida(respuesta: &Response, nombre: &str) -> bool {
    let prefijo = format!("{nombre}=");
    respuesta
        .headers()
        .get_all(SET_COOKIE)
        .iter()
        .filter_map(|v| v.to_str().ok())
        .any(|v| v.starts_with(&prefijo))
}

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
    for (nombre, valor) in [
        (
            SESSION_COOKIE,
            cookie_header(SESSION_COOKIE, &sesion, &state, SESSION_MAX_AGE_SEGUNDOS),
        ),
        (
            CSRF_COOKIE,
            cookie_header(
                CSRF_COOKIE,
                csrf.as_deref().unwrap_or(""),
                &state,
                SESSION_MAX_AGE_SEGUNDOS,
            ),
        ),
    ] {
        if ya_emitida(&respuesta, nombre) {
            continue;
        }
        /* [por que] Igual que en los handlers de auth: un valor no convertible a
         * cabecera no puede tumbar la respuesta que ya estaba lista. */
        if let Ok(cabecera) = HeaderValue::from_str(&valor) {
            respuesta.headers_mut().append(SET_COOKIE, cabecera);
        }
    }
    respuesta
}

#[cfg(test)]
mod pruebas {
    /* [20AA-1] Regresión: el middleware reemitía la cookie de la petición aunque el
     * handler ya hubiera fijado la suya, y con dos `Set-Cookie` del mismo nombre gana
     * la última. `cargo test` no necesita BD: se prueba la decisión, no el router. */
    use super::ya_emitida;
    use crate::middleware::auth::{CSRF_COOKIE, SESSION_COOKIE};
    use axum::http::header::SET_COOKIE;
    use axum::http::HeaderValue;
    use axum::response::Response;

    fn respuesta_con(valor: &str) -> Response {
        let mut respuesta = Response::new(axum::body::Body::empty());
        respuesta
            .headers_mut()
            .append(SET_COOKIE, HeaderValue::from_str(valor).unwrap());
        respuesta
    }

    #[test]
    fn la_cookie_que_ya_fijo_el_handler_no_se_reemite() {
        let respuesta = respuesta_con("session_id=nueva; Path=/; HttpOnly");
        assert!(ya_emitida(&respuesta, SESSION_COOKIE));
        assert!(!ya_emitida(&respuesta, CSRF_COOKIE));
    }

    #[test]
    fn una_cookie_de_otro_nombre_no_cuenta_como_emitida() {
        let respuesta = respuesta_con("otra_cosa=1; Path=/");
        assert!(!ya_emitida(&respuesta, SESSION_COOKIE));
        assert!(!ya_emitida(&respuesta, CSRF_COOKIE));
    }

    #[test]
    fn sin_set_cookie_no_hay_nada_emitido() {
        let respuesta = Response::new(axum::body::Body::empty());
        assert!(!ya_emitida(&respuesta, SESSION_COOKIE));
    }
}
