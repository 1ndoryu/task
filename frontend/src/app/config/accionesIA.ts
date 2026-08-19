/*
 * config/accionesIA.ts
 * [H-F15-01] Facade del asistente IA: re-exporta los módulos por dominio
 * (tipos, prompts, parser, ejecución y validadores). Todos los importadores
 * existentes siguen usando esta ruta.
 *
 * [233A-69] Fase 2+3: Acciones estructuradas.
 * El LLM responde JSON con texto + acciones a ejecutar.
 * El panel ejecuta las acciones via funciones del dashboard.
 */

export type {EjecutoresTareasIA, RespuestaIA, AccionLLM, ResultadoAccion} from './tiposAccionesIA';
export {generarContexto, generarSystemPrompt} from './promptsIA';
export {parsearRespuestaLLM} from './parserIA';
export {ejecutarAcciones, ejecutarAccionDestructiva} from './ejecucionIA';
