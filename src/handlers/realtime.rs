use axum::extract::ws::{Message, WebSocket, WebSocketUpgrade};
use axum::extract::State;
use axum::http::HeaderMap;
use axum::response::Response;
use axum::routing::get;
use axum::Router;
use futures_util::{SinkExt, StreamExt};
use uuid::Uuid;

use crate::errors::AppError;
use crate::middleware::auth::SESSION_COOKIE;
use crate::services::{RealtimeHub, SessionService};
use crate::AppState;

/// Endpoint WebSocket: autentica por cookie de sesión (mismo origen) y
/// entrega los eventos en tiempo real del usuario (broadcast por user_id).
pub async fn ws_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
    ws: WebSocketUpgrade,
) -> Result<Response, AppError> {
    let raw_token = headers
        .get("cookie")
        .and_then(|value| value.to_str().ok())
        .and_then(|cookie| {
            cookie
                .split(';')
                .map(str::trim)
                .find_map(|pair| {
                    let (key, value) = pair.split_once('=')?;
                    (key == SESSION_COOKIE).then_some(value)
                })
        })
        .ok_or(AppError::Unauthorized)?;

    let session = SessionService::validate(&state.pool, raw_token)
        .await?
        .ok_or(AppError::Unauthorized)?;
    let user_id = session.user_id;

    /* [H-B05-09] Hardening CSWSH: si el navegador envía Origin, debe estar en
     * los orígenes CORS configurados. Sin header (clientes no-navegador) se
     * permite; SameSite=Lax ya mitiga el resto. */
    if let Some(origin) = headers.get(axum::http::header::ORIGIN) {
        let permitido = state
            .cors_origins
            .iter()
            .any(|configurado| configurado == origin);
        if !permitido {
            return Err(AppError::Forbidden(
                "Origen no permitido para la conexión WebSocket".into(),
            ));
        }
    }

    Ok(ws.on_upgrade(move |socket| handle_socket(socket, user_id)))
}

async fn handle_socket(socket: WebSocket, user_id: Uuid) {
    let hub = RealtimeHub::global();
    let mut rx = hub.subscribe(user_id);
    let (mut sender, mut receiver) = socket.split();

    // Saludo inicial + tareas de heartbeat del canal.
    let greeting = serde_json::json!({ "type": "connected", "userId": user_id });
    if sender.send(Message::Text(greeting.to_string())).await.is_err() {
        return;
    }

    loop {
        tokio::select! {
            incoming = receiver.next() => {
                match incoming {
                    Some(Ok(Message::Text(text))) => {
                        // Ping/pong para mantener la conexión viva.
                        if text.trim() == "ping" {
                            if sender.send(Message::Text("pong".into())).await.is_err() {
                                break;
                            }
                        }
                    }
                    Some(Ok(Message::Close(_))) | None => break,
                    Some(Err(_)) => break,
                    _ => {}
                }
            }
            event = rx.recv() => {
                // mpsc: None significa que el canal se cerró (socket ya no publica
                // o el hub podó el canal); se termina la conexión.
                match event {
                    Some(payload) => {
                        if sender.send(Message::Text(payload.to_string())).await.is_err() {
                            break;
                        }
                    }
                    None => break,
                }
            }
        }
    }
}

pub fn routes() -> Router<AppState> {
    Router::new().route("/realtime/ws", get(ws_handler))
}
