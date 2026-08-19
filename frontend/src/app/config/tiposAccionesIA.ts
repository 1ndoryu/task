/*
 * config/tiposAccionesIA.ts
 * [H-F15-01] Tipos del asistente IA: ejecutores, respuesta parseada, acción
 * LLM y resultado (extraídos de accionesIA.ts).
 */

import type {DatosEdicionTarea, Tarea} from '../types/dashboard';

/* Ejecutores de tareas — proveídos por el dashboard (React hooks, no Zustand) */
export interface EjecutoresTareasIA {
    crearTarea: (datos: DatosEdicionTarea) => void;
    toggleTarea: (id: number, opciones?: {detallesActividad?: Record<string, unknown>}) => void;
    editarTarea: (id: number, datos: DatosEdicionTarea) => void;
    eliminarTarea: (id: number) => void;
    tareas: Tarea[];
}

/* Respuesta parseada del LLM */
export interface RespuestaIA {
    respuesta: string;
    acciones: AccionLLM[];
}

/* Acción individual del LLM */
export interface AccionLLM {
    tipo: string;
    parametros: Record<string, unknown>;
}

/* Resultado de ejecutar una acción */
export interface ResultadoAccion {
    tipo: string;
    exito: boolean;
    descripcion: string;
    pendienteConfirmacion?: boolean;
    accionExternaId?: number;
    datos?: unknown; /* [115A-1] Datos completos devueltos por acciones de consulta (leer_nota, research)
                      * para alimentar la segunda llamada al LLM y que responda con información real. */
}
