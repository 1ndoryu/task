/* [02-09-2026] Fase 2 plan Glory Harness (318A-13): el proxy LLM
 * (`LlmProviderService`, mensajes, opciones, resultados y la cadena de
 * fallback/rotación de keys) se portó intacto al núcleo agnóstico
 * `glory-harness-core` (`glory_harness_core::llm`). Este módulo queda como
 * re-export para no tocar a los consumidores (handlers/ai.rs, AppState):
 * mismos nombres, mismo contrato, única fuente en el núcleo. */

pub use glory_harness_core::llm::*;