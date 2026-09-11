// sentinel-disable-file sqlx-query-sin-macro sqlx-query-as-sin-macro
// [por que] Igual que adaptador.rs: sqlx sin feature "macros" ni DB en
// compile-time, query! rompe el build. Solo SELECTs verbatim del runtime.
// [039A-1/FASE-FINAL] Lecturas del adaptador de persistencia del agente,
// extraídas de `adaptador.rs` para respetar el límite de líneas.

use uuid::Uuid;

use glory_harness_core::llm::AiMessage;

use super::adaptador::PersistenciaAgente;
use super::adaptador_base::construir_mensaje_skills;
use crate::errors::AppError;

impl PersistenciaAgente {
    /// Historial de una conversación (mensajes no compactados), ordenado por
    /// id ascendente — mismo SQL que el `cargar_historial` original.
    pub async fn cargar_historial(
        &self,
        conversacion_id: Uuid,
        user_id: Uuid,
    ) -> Result<Vec<AiMessage>, AppError> {
        let filas: Vec<(String, String)> = sqlx::query_as(
            "SELECT rol, contenido FROM agente_mensajes
             WHERE conversacion_id = $1 AND user_id = $2 AND NOT compactado
             ORDER BY id ASC",
        )
        .bind(conversacion_id)
        .bind(user_id)
        .fetch_all(&self.pool)
        .await?;
        Ok(filas
            .into_iter()
            .map(|(rol, contenido)| AiMessage::texto(&rol, contenido))
            .collect())
    }

    /// Memoria persistente del usuario (Fase 3 v1): las 50 entradas más
    /// recientes como un mensaje `system` (el agente "recuerda" preferencias
    /// dichas en sesiones anteriores).
    pub async fn cargar_memoria_agente(
        &self,
        user_id: Uuid,
        limite: i64,
    ) -> Result<Vec<AiMessage>, AppError> {
        let filas: Vec<String> = sqlx::query_scalar(
            "SELECT clave || ': ' || contenido FROM agente_memoria
             WHERE user_id = $1 ORDER BY actualizado_en DESC LIMIT $2",
        )
        .bind(user_id)
        .bind(limite)
        .fetch_all(&self.pool)
        .await?;
        if filas.is_empty() {
            return Ok(Vec::new());
        }
        let bloque = format!(
            "Memoria persistente del usuario (preferencias/lecciones de sesiones anteriores):\n{}",
            filas.join("\n")
        );
        Ok(vec![AiMessage::texto("system", bloque)])
    }

    /// Skills activas del usuario como contexto `system` (mismo patrón que la
    /// memoria). `incluir_skills` las inyecta en el handler antes del loop.
    pub async fn cargar_skills_agente(
        &self,
        user_id: Uuid,
        limite: i64,
    ) -> Result<Vec<AiMessage>, AppError> {
        let filas: Vec<(String, String)> = sqlx::query_as(
            "SELECT nombre, descripcion FROM agente_skills
             WHERE user_id = $1 AND activa ORDER BY nombre LIMIT $2",
        )
        .bind(user_id)
        .bind(limite)
        .fetch_all(&self.pool)
        .await?;
        Ok(construir_mensaje_skills(filas))
    }
}
