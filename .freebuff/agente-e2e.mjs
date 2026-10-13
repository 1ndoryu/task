/* [29-08-2026] E2E del agente (plan-agente-ia-plugin, Fase 0/1) contra el
 * backend vivo. Verifica:
 * 1. Auth: /api/agente/stream sin sesión → 401.
 * 2. Conversación inexistente → 404 (no confía en el front).
 * 3. POST con sesión válida → SSE con evento `done` (o `error` claro si el
 *    proveedor no tiene clave — nunca falso éxito).
 * 4. Rate limit: tras N turnos → 429.
 *
 * Uso: node .freebuff/agente-e2e.mjs (requiere backend en :3001 y BD local). */

/* Los pasos viven en pasos-base.mjs, pasos-config.mjs y pasos-skills-stream.mjs;
 * helpers y estado compartido en infra.mjs. Aquí solo se encadenan en orden. */

import { estado } from './infra.mjs';
import {
  paso1SinSesion,
  paso2RegistroLogin,
  paso3ConversacionInexistente,
  paso4CrearConversacion,
  paso5TurnoSSE,
  paso6ToolCrearTarea,
  paso7TareasProgramadas,
  paso8SchedulerReal,
  paso9ToolFileSearch,
} from './pasos-base.mjs';
import {
  paso10ConfiguracionAvanzada,
  paso11ConfiguracionAislada,
  paso10bisMemoria,
} from './pasos-config.mjs';
import {
  paso12SkillsCRUD,
  paso13Idempotencia,
  paso14Cancelacion,
} from './pasos-skills-stream.mjs';

async function main() {
  const email = `agente-e2e-${Date.now()}@test.local`;

  await paso1SinSesion();
  await paso2RegistroLogin(email);
  await paso3ConversacionInexistente();
  await paso4CrearConversacion();
  await paso5TurnoSSE();
  await paso6ToolCrearTarea();
  await paso7TareasProgramadas();
  await paso8SchedulerReal();
  await paso9ToolFileSearch();
  await paso10ConfiguracionAvanzada();
  await paso11ConfiguracionAislada();
  await paso10bisMemoria();
  await paso12SkillsCRUD();
  await paso13Idempotencia();
  await paso14Cancelacion();

  console.log(`\n${estado.fallos === 0 ? 'AGENTE-E2E OK' : `${estado.fallos} FALLO(S)`}`);
  process.exit(estado.fallos === 0 ? 0 : 1);
}

await main();
