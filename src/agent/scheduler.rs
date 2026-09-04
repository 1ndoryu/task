/* [03-09-2026] Fase 2 Glory Harness: el loop del scheduler (heartbeat,
 * toma atómica, reprogramación cron) vive en `glory-harness-core::scheduler`;
 * este archivo conserva lo que es de task: el runner que ejecuta una tarea
 * programada como un turno del runtime concreto del consumidor. Sin SQL
 * aquí — la persistencia entra por `AgentPersistence` (adaptador.rs). */

use std::sync::Arc;

use uuid::Uuid;

use glory_harness_core::ports::TareaProgramadaPendiente;
use glory_harness_core::{HarnessError, HarnessResult};

use crate::agent::adaptador::PersistenciaAgente;
use crate::agent::tools::{BuscadorWeb, DominioAgente, registrar_tools};
use crate::agent::{AgenteEvento, AgentRuntime, AgentToolRegistry, PuertosHarness, TurnoConfig};
use crate::errors::AppError;
use crate::AppState;

/// Traduce un error de task al contrato del núcleo (el scheduler solo habla
/// `HarnessError`). La causa se conserva como detalle, nunca se pierde.
pub fn harness_de(error: &AppError) -> HarnessError {
    HarnessError::Proveedor {
        detalle: error.to_string(),
        causa: None,
    }
}

/// Ejecuta la tarea como un turno de agente (mismo runtime que el chat, sin
/// conversación: `Uuid::nil()`). Los eventos se emiten a un canal descartado;
/// el resultado observable es el estado que el scheduler persiste.
pub async fn ejecutar_tarea(
    state: &AppState,
    tarea: &TareaProgramadaPendiente,
) -> Result<String, AppError> {
    let turno_id = Uuid::new_v4();
    let (tx, _rx) = tokio::sync::mpsc::channel::<AgenteEvento>(8);

    let mut registry = AgentToolRegistry::new();
    registrar_tools(&mut registry);
    let puertos = PuertosHarness {
        persistencia: Arc::new(PersistenciaAgente::nuevo(state.pool.clone())),
        llm: Arc::new(state.ai_provider.clone()),
        web_search: Some(Arc::new(BuscadorWeb(state.web_search.clone()))),
        dominio: Some(Arc::new(DominioAgente { pool: state.pool.clone() })),
        /* [318A-16 F3] task-IA nunca ejecuta comandos (invariante de
         * seguridad): sin runner, el núcleo no registra la tool `comando`. */
        ejecutor_comando: None,
        programador_tareas: None,
    };
    let runtime = AgentRuntime::nuevo(registry, puertos, TurnoConfig::default());

    runtime
        .ejecutar_turno(
            tarea.user_id,
            turno_id,
            Uuid::nil(),
            Vec::new(),
            tarea.prompt.clone(),
            &tx,
        )
        .await?;
    Ok(format!("Tarea '{}' ejecutada", tarea.nombre))
}

/// Cierra la brecha de tipos entre ambos errores para el closure de main.rs.
pub async fn ejecutar_tarea_harness(
    state: &AppState,
    tarea: &TareaProgramadaPendiente,
) -> HarnessResult<String> {
    ejecutar_tarea(state, tarea)
        .await
        .map_err(|error| harness_de(&error))
}