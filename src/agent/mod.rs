/* [03-09-2026] Fase 2 Glory Harness: `agent/` en task solo conserva lo que
 * pertenece al dominio — el adaptador de persistencia (`adaptador.rs`) y las
 * tools de dominio (`tools.rs`). El runtime, scheduler, contexto y tools
 * agnósticas viven en `glory-harness-core`; aquí se re-exportan los tipos
 * que el handler y main usan, para que los consumidores no importen el crate
 * a pelo. */

pub mod adaptador;
pub mod scheduler;
pub mod tools;

pub use glory_harness_core::context::ContextoConfig;
pub use glory_harness_core::evento::AgenteEvento;
pub use glory_harness_core::runtime::{AgentRuntime, PuertosHarness, TurnoConfig};
pub use glory_harness_core::scheduler::correr_scheduler;
pub use glory_harness_core::tool::AgentToolRegistry;