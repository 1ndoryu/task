/* [29-08-2026] Plugin de agente de IA (plan-agente-ia-plugin-2026-08-27.md).
 * Módulo `agent/`: framework de tools (tool.rs), manejo de contexto con
 * autocompactación (context.rs), runtime del loop (runtime.rs) y tools de
 * dominio (tools.rs). Frontera limpia: lo agnóstico (trait, registry,
 * contexto) puede extraerse a glory-rs cuando exista un segundo consumidor. */

pub mod context;
pub mod runtime;
pub mod scheduler;
pub mod tool;
pub mod tools;
