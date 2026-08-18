/* [18-08-2026] Hub de tiempo real en memoria (WebSocket /api/realtime/ws).
 * Broadcast por usuario: cada cliente recibe solo los eventos de su user_id.
 * Es in-memory (sin persistencia): si el proceso reinicia, los clientes
 * simplemente se reconectan y el estado real llega por GET /api/dashboard. */
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tokio::sync::broadcast;
use uuid::Uuid;

pub type RealtimeEvent = serde_json::Value;

static GLOBAL_HUB: std::sync::OnceLock<RealtimeHub> = std::sync::OnceLock::new();

#[derive(Clone, Default)]
pub struct RealtimeHub {
    channels: Arc<Mutex<HashMap<Uuid, broadcast::Sender<RealtimeEvent>>>>,
}

impl RealtimeHub {
    /// Hub único del proceso: los servicios publican sin recibir AppState.
    #[must_use]
    pub fn global() -> &'static RealtimeHub {
        GLOBAL_HUB.get_or_init(RealtimeHub::default)
    }
}

impl RealtimeHub {
    /// Suscribe al canal del usuario; crea el canal si no existe.
    pub fn subscribe(&self, user_id: Uuid) -> broadcast::Receiver<RealtimeEvent> {
        let mut channels = self.channels.lock().expect("hub lock");
        let sender = channels
            .entry(user_id)
            .or_insert_with(|| broadcast::channel(64).0);
        sender.subscribe()
    }

    /// Publica un evento al usuario si tiene el canal abierto (no bloquea).
    pub fn publish(&self, user_id: Uuid, event: RealtimeEvent) {
        let channels = self.channels.lock().expect("hub lock");
        let Some(sender) = channels.get(&user_id) else {
            return;
        };
        // receiver_count() == 0 -> nadie conectado; descartar y limpiar.
        if sender.receiver_count() == 0 {
            drop(channels);
            let mut channels = self.channels.lock().expect("hub lock");
            channels.remove(&user_id);
            return;
        }
        let _ = sender.send(event);
    }

    /// Notifica a un conjunto de usuarios (p. ej. participantes de una tarea).
    pub fn publish_to(&self, users: &[Uuid], event: RealtimeEvent) {
        for user in users {
            self.publish(*user, event.clone());
        }
    }
}
