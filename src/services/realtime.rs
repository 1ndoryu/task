/* [18-08-2026] Hub de tiempo real en memoria (WebSocket /api/realtime/ws).
 * Un canal mpsc lock-free por cliente: cada suscriptor recibe solo los eventos
 * de su user_id. En lugar de tokio::sync::broadcast (que usa un mutex interno
 * y bloquea los workers bajo contención), publicamos con try_send y podamos
 * los canales sin lectores cada vez que publicamos. También es in-memory: si
 * el proceso reinicia, los clientes se reconectan y el estado real llega por
 * GET /api/dashboard. */
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tokio::sync::mpsc;
use uuid::Uuid;

pub type RealtimeEvent = serde_json::Value;

static GLOBAL_HUB: std::sync::OnceLock<RealtimeHub> = std::sync::OnceLock::new();

#[derive(Clone, Default)]
pub struct RealtimeHub {
    /// Por user_id, un canal unbounded por socket conectado.
    channels: Arc<Mutex<HashMap<Uuid, Vec<mpsc::UnboundedSender<RealtimeEvent>>>>>,
}

impl RealtimeHub {
    /// Hub único del proceso: los servicios publican sin recibir AppState.
    #[must_use]
    pub fn global() -> &'static RealtimeHub {
        GLOBAL_HUB.get_or_init(RealtimeHub::default)
    }
}

impl RealtimeHub {
    /// Suscribe un socket al usuario; cada llamada crea su propio canal.
    pub fn subscribe(&self, user_id: Uuid) -> mpsc::UnboundedReceiver<RealtimeEvent> {
        let (sender, receiver) = mpsc::unbounded_channel();
        self.channels
            .lock()
            .expect("hub lock")
            .entry(user_id)
            .or_default()
            .push(sender);
        receiver
    }

    /// Publica a los canales vivos del usuario (no bloquea: try_send lock-free)
    /// y poda en el mismo recorrido los canales cuyo socket ya se desconectó.
    pub fn publish(&self, user_id: Uuid, event: RealtimeEvent) {
        let senders = self.channels.lock().expect("hub lock");
        let Some(canales) = senders.get(&user_id) else {
            return;
        };
        let previos = canales.len();
        let vivos: Vec<_> = canales
            .iter()
            .filter(|sender| sender.send(event.clone()).is_ok())
            .cloned()
            .collect();
        drop(senders);
        if vivos.len() != previos {
            let mut senders = self.channels.lock().expect("hub lock");
            senders.insert(user_id, vivos);
        }
    }

    /// Notifica a un conjunto de usuarios (p. ej. participantes de una tarea).
    pub fn publish_to(&self, users: &[Uuid], event: RealtimeEvent) {
        for user in users {
            self.publish(*user, event.clone());
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn event_text(value: &str) -> RealtimeEvent {
        serde_json::json!({ "text": value })
    }

    #[tokio::test]
    async fn varios_suscriptores_reciben_y_no_afectan_al_vecino() {
        let hub = RealtimeHub::default();
        let a = Uuid::new_v4();
        let b = Uuid::new_v4();
        let mut rxa = hub.subscribe(a);
        let mut rxb = hub.subscribe(a); // segundo socket del mismo usuario
        let mut rxc = hub.subscribe(b);

        hub.publish(a, event_text("para-a"));
        assert_eq!(rxa.recv().await, Some(event_text("para-a")));
        assert_eq!(rxb.recv().await, Some(event_text("para-a")));
        // El usuario b no recibe eventos de a.
        assert!(rxc.try_recv().is_err());

        hub.publish(b, event_text("para-b"));
        assert_eq!(rxc.recv().await, Some(event_text("para-b")));
    }

    #[tokio::test]
    async fn suscriptor_desconectado_se_poda_y_el_canal_sigue_vivo() {
        let hub = RealtimeHub::default();
        let u = Uuid::new_v4();
        let mut vivo = hub.subscribe(u);
        {
            let _muerto = hub.subscribe(u);
        } // se cae el segundo socket

        hub.publish(u, event_text("uno"));
        let muerto_contado = hub
            .channels
            .lock()
            .expect("hub lock")
            .get(&u)
            .map_or(0, std::vec::Vec::len);
        // Tras el publish con un socket muerto, hub poda a 1 canal.
        assert_eq!(muerto_contado, 1);
        assert_eq!(vivo.recv().await, Some(event_text("uno")));
    }

    #[test]
    fn publicar_sin_suscriptores_no_crea_canal() {
        let hub = RealtimeHub::default();
        let u = Uuid::new_v4();
        hub.publish(u, event_text("huerfano"));
        assert!(!hub.channels.lock().expect("hub lock").contains_key(&u));
    }
}
