/*
 * config/accionesIA.ts
 * Definiciones de acciones del asistente IA, system prompt y parsing
 *
 * [233A-69] Fase 2+3: Acciones estructuradas.
 * El LLM responde JSON con texto + acciones a ejecutar.
 * El panel ejecuta las acciones via funciones del dashboard.
 */

import type {DatosEdicionTarea, Tarea, Habito} from '../types/dashboard';
import {useHabitosStore} from '../stores/habitosStore';
import {ejecutarAccionExternaIA} from './accionesExternasIA';

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
}

/*
 * Generar contexto compacto de tareas y hábitos actuales
 * Se inyecta en el system prompt para que el LLM conozca el estado
 */
/* Obtener hábitos directamente del store Zustand (accesible globalmente) */
function obtenerHabitos(): Habito[] {
    return useHabitosStore.getState().habitos;
}

export function generarContexto(tareas: Tarea[]): string {
    const habitos = obtenerHabitos();
    const tareasPendientes = tareas.filter(t => !t.completado).slice(0, 30);
    const tareasCompletadasHoy = tareas.filter(t => {
        if (!t.completado || !t.fechaCompletado) return false;
        const hoy = new Date().toISOString().split('T')[0];
        return t.fechaCompletado.startsWith(hoy);
    });

    let ctx = '## Tareas pendientes\n';
    if (tareasPendientes.length === 0) {
        ctx += 'No hay tareas pendientes.\n';
    } else {
        for (const t of tareasPendientes) {
            const detalles = [
                t.prioridad && `prioridad:${t.prioridad}`,
                t.urgencia && t.urgencia !== 'normal' && `urgencia:${t.urgencia}`,
                t.pospuestoHasta && `pospuesto:${t.pospuestoHasta}`
            ].filter(Boolean).join(', ');
            ctx += `- [id:${t.id}] ${t.texto}${detalles ? ` (${detalles})` : ''}\n`;
        }
    }

    if (tareasCompletadasHoy.length > 0) {
        ctx += `\n## Tareas completadas hoy (${tareasCompletadasHoy.length})\n`;
        for (const t of tareasCompletadasHoy.slice(0, 10)) {
            ctx += `- [id:${t.id}] ${t.texto}\n`;
        }
    }

    const habitosActivos = habitos.filter(h => !h.pausado);
    ctx += '\n## Hábitos activos\n';
    if (habitosActivos.length === 0) {
        ctx += 'No hay hábitos activos.\n';
    } else {
        const hoy = new Date().toISOString().split('T')[0];
        for (const h of habitosActivos) {
            const completadoHoy = h.historialCompletados?.includes(hoy);
            const estado = completadoHoy ? '✓' : '○';
            ctx += `- [id:${h.id}] ${estado} ${h.nombre} (racha:${h.racha}, importancia:${h.importancia})\n`;
        }
    }

    return ctx;
}

/*
 * System prompt completo con esquema de acciones y contexto
 */
export function generarSystemPrompt(contexto: string, preferencias: string, promptSistema = ''): string {
    return `Eres un asistente de productividad integrado en un dashboard personal. Ayudas al usuario a planificar su día, crear tareas/hábitos y gestionar su productividad.

RESPONDE SIEMPRE en formato JSON con esta estructura exacta:
{
  "respuesta": "tu mensaje al usuario en español",
  "acciones": []
}

ACCIONES DISPONIBLES (incluir en el array "acciones" cuando corresponda):
- {"tipo": "crear_tarea", "parametros": {"texto": "nombre", "prioridad": "muy_alta|alta|media|baja", "urgencia": "bloqueante|urgente|normal|chill"}}
- {"tipo": "completar_tarea", "parametros": {"id": 123}}
- {"tipo": "editar_tarea", "parametros": {"id": 123, "texto": "nuevo nombre", "prioridad": "muy_alta|alta|media|baja"}}
- {"tipo": "eliminar_tarea", "parametros": {"id": 123}}
- {"tipo": "crear_habito", "parametros": {"nombre": "nombre", "importancia": "Muy Alta|Alta|Media|Baja", "tags": ["tag"]}}
- {"tipo": "completar_habito", "parametros": {"id": 456}}
- {"tipo": "eliminar_habito", "parametros": {"id": 456}}
- {"tipo": "proponer_whatsapp", "parametros": {"mensaje": "texto", "to": "opcional número/JID"}}
- {"tipo": "research_local", "parametros": {"query": "texto a buscar", "limit": 10}}
- {"tipo": "proponer_github", "parametros": {"titulo": "título", "descripcion": "detalle", "tipo": "issue|pull_request|comment|assign", "repo": "owner/repo opcional"}}
- {"tipo": "programar_recordatorio", "parametros": {"titulo": "título", "mensaje": "texto", "fecha": "ISO 8601 o fecha parseable"}}

REGLAS:
- Si no necesitas ejecutar acciones, envía "acciones": [].
- No inventes IDs. Solo usa IDs que aparezcan en el contexto.
- Sé conciso. Confirma las acciones que ejecutas.
- Responde siempre en español.
- NUNCA uses eliminar_tarea o eliminar_habito a menos que el usuario haya pedido EXPLÍCITAMENTE borrar o eliminar algo. Si el usuario dice "limpiar", "organizar" o "arreglar", NO elimines — pregunta primero qué quiere hacer con cada elemento.
- Las eliminaciones requieren confirmación del usuario en la interfaz, así que inclúyelas solo cuando estés seguro de la intención.
- proponer_whatsapp NO envía el mensaje: crea una acción externa pendiente para que el usuario la apruebe en la interfaz.
- Solo usa proponer_whatsapp cuando el usuario pida enviar o programar un mensaje de WhatsApp.
- research_local busca en notas, tareas y hábitos del usuario; no busca internet, no usa OpenClaw/OpenCraw y no debe presentarse como búsqueda web.
- Si el usuario pregunta por internet/OpenClaw, explica que en local solo está activo research_local y que el provider web externo aún requiere configurar un gateway.
- proponer_github prepara un borrador aprobable; no abre issues/PR reales sin confirmación.
- programar_recordatorio crea un recordatorio local aprobable y luego WP-Cron lo ejecuta cuando venza.
${promptSistema ? `\nINSTRUCCIONES PERSONALIZADAS DEL SISTEMA:\n${promptSistema}` : ''}
${preferencias ? `\nPREFERENCIAS DEL USUARIO:\n${preferencias}` : ''}
${contexto}`;
}

/*
 * Parsear la respuesta del LLM a formato estructurado
 * Intenta JSON puro primero, luego JSON dentro de code block
 */
export function parsearRespuestaLLM(contenido: string): RespuestaIA {
    /* Limpiar posible think block de modelos como DeepSeek */
    let limpio = contenido.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

    /* Intentar parsear JSON directo */
    try {
        const parsed = JSON.parse(limpio);
        if (typeof parsed.respuesta === 'string') {
            return {
                respuesta: parsed.respuesta,
                acciones: Array.isArray(parsed.acciones) ? parsed.acciones : []
            };
        }
    } catch { /* No es JSON directo, intentar extraer */ }

    /* Buscar JSON dentro de bloques de código ```json ... ``` */
    const matchBloque = limpio.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (matchBloque) {
        try {
            const parsed = JSON.parse(matchBloque[1]);
            if (typeof parsed.respuesta === 'string') {
                return {
                    respuesta: parsed.respuesta,
                    acciones: Array.isArray(parsed.acciones) ? parsed.acciones : []
                };
            }
        } catch { /* JSON inválido dentro del bloque */ }
    }

    /* Fallback: tratar todo como texto sin acciones */
    return {respuesta: limpio, acciones: []};
}

/*
 * Ejecutar acciones recibidas del LLM
 * Valida cada acción antes de ejecutarla y retorna resultados
 */
export async function ejecutarAcciones(acciones: AccionLLM[], ejecutoresTareas: EjecutoresTareasIA): Promise<ResultadoAccion[]> {
    const resultados: ResultadoAccion[] = [];
    const storeHabitos = useHabitosStore.getState();

    for (const accion of acciones) {
        try {
            switch (accion.tipo) {
                case 'crear_tarea': {
                    const texto = String(accion.parametros.texto || '').trim();
                    if (!texto) {
                        resultados.push({tipo: accion.tipo, exito: false, descripcion: 'Texto vacío'});
                        break;
                    }
                    ejecutoresTareas.crearTarea({
                        texto,
                        prioridad: validarPrioridad(accion.parametros.prioridad),
                        urgencia: validarUrgencia(accion.parametros.urgencia)
                    });
                    resultados.push({tipo: accion.tipo, exito: true, descripcion: `Tarea: "${texto}"`});
                    break;
                }
                case 'completar_tarea': {
                    const id = Number(accion.parametros.id);
                    if (!id || !ejecutoresTareas.tareas.some(t => t.id === id)) {
                        resultados.push({tipo: accion.tipo, exito: false, descripcion: `Tarea #${id} no encontrada`});
                        break;
                    }
                    ejecutoresTareas.toggleTarea(id);
                    resultados.push({tipo: accion.tipo, exito: true, descripcion: `Tarea #${id} toggleada`});
                    break;
                }
                case 'editar_tarea': {
                    const id = Number(accion.parametros.id);
                    if (!id || !ejecutoresTareas.tareas.some(t => t.id === id)) {
                        resultados.push({tipo: accion.tipo, exito: false, descripcion: `Tarea #${id} no encontrada`});
                        break;
                    }
                    const datos: DatosEdicionTarea = {};
                    if (accion.parametros.texto) datos.texto = String(accion.parametros.texto);
                    if (accion.parametros.prioridad !== undefined) datos.prioridad = validarPrioridad(accion.parametros.prioridad);
                    if (accion.parametros.urgencia !== undefined) datos.urgencia = validarUrgencia(accion.parametros.urgencia);
                    ejecutoresTareas.editarTarea(id, datos);
                    resultados.push({tipo: accion.tipo, exito: true, descripcion: `Tarea #${id} editada`});
                    break;
                }
                case 'eliminar_tarea': {
                    const id = Number(accion.parametros.id);
                    if (!id || !ejecutoresTareas.tareas.some(t => t.id === id)) {
                        resultados.push({tipo: accion.tipo, exito: false, descripcion: `Tarea #${id} no encontrada`});
                        break;
                    }
                    /* [303A-11] Las eliminaciones requieren confirmación explícita del usuario.
                     * No se ejecutan inmediatamente — se marcan como pendientes. */
                    const tarea = ejecutoresTareas.tareas.find(t => t.id === id);
                    resultados.push({tipo: accion.tipo, exito: false, descripcion: `Eliminar "${tarea?.texto || `#${id}`}" — pendiente de confirmación`, pendienteConfirmacion: true});
                    break;
                }
                case 'crear_habito': {
                    const nombre = String(accion.parametros.nombre || '').trim();
                    if (!nombre) {
                        resultados.push({tipo: accion.tipo, exito: false, descripcion: 'Nombre vacío'});
                        break;
                    }
                    storeHabitos.crearHabito({
                        nombre,
                        importancia: validarImportancia(accion.parametros.importancia),
                        tags: Array.isArray(accion.parametros.tags) ? accion.parametros.tags.map(String) : []
                    });
                    resultados.push({tipo: accion.tipo, exito: true, descripcion: `Hábito: "${nombre}"`});
                    break;
                }
                case 'completar_habito': {
                    const id = Number(accion.parametros.id);
                    if (!id || !storeHabitos.habitos.some(h => h.id === id)) {
                        resultados.push({tipo: accion.tipo, exito: false, descripcion: `Hábito #${id} no encontrado`});
                        break;
                    }
                    storeHabitos.toggleHabito(id);
                    resultados.push({tipo: accion.tipo, exito: true, descripcion: `Hábito #${id} toggleado`});
                    break;
                }
                case 'eliminar_habito': {
                    const id = Number(accion.parametros.id);
                    if (!id || !storeHabitos.habitos.some(h => h.id === id)) {
                        resultados.push({tipo: accion.tipo, exito: false, descripcion: `Hábito #${id} no encontrado`});
                        break;
                    }
                    /* [303A-11] Las eliminaciones requieren confirmación — no se ejecutan directamente */
                    const habito = storeHabitos.habitos.find(h => h.id === id);
                    resultados.push({tipo: accion.tipo, exito: false, descripcion: `Eliminar "${habito?.nombre || `#${id}`}" — pendiente de confirmación`, pendienteConfirmacion: true});
                    break;
                }
                default: {
                    const externa = await ejecutarAccionExternaIA(accion);
                    resultados.push(externa ?? {tipo: accion.tipo, exito: false, descripcion: 'Acción no reconocida'});
                    break;
                }
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Error desconocido';
            resultados.push({tipo: accion.tipo, exito: false, descripcion: msg});
        }
    }

    return resultados;
}

/* Validadores de enums */

/* [303A-11] Ejecutar una acción destructiva previamente pendiente de confirmación.
 * Se usa cuando el usuario hace click en "Confirmar" en el UI del chat. */
export function ejecutarAccionDestructiva(accion: AccionLLM, ejecutoresTareas: EjecutoresTareasIA): ResultadoAccion {
    const storeHabitos = useHabitosStore.getState();
    try {
        if (accion.tipo === 'eliminar_tarea') {
            const id = Number(accion.parametros.id);
            if (!id || !ejecutoresTareas.tareas.some(t => t.id === id)) {
                return {tipo: accion.tipo, exito: false, descripcion: `Tarea #${id} no encontrada`};
            }
            ejecutoresTareas.eliminarTarea(id);
            return {tipo: accion.tipo, exito: true, descripcion: `Tarea #${id} eliminada`};
        }
        if (accion.tipo === 'eliminar_habito') {
            const id = Number(accion.parametros.id);
            if (!id || !storeHabitos.habitos.some(h => h.id === id)) {
                return {tipo: accion.tipo, exito: false, descripcion: `Hábito #${id} no encontrado`};
            }
            storeHabitos.eliminarHabito(id);
            return {tipo: accion.tipo, exito: true, descripcion: `Hábito #${id} eliminado`};
        }
        return {tipo: accion.tipo, exito: false, descripcion: 'Acción no es destructiva'};
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        return {tipo: accion.tipo, exito: false, descripcion: msg};
    }
}

function validarPrioridad(val: unknown): 'muy_alta' | 'alta' | 'media' | 'baja' | 'muy_baja' | undefined {
    if (val === 'muy_alta' || val === 'alta' || val === 'media' || val === 'baja' || val === 'muy_baja') return val;
    return undefined;
}

function validarUrgencia(val: unknown): 'bloqueante' | 'urgente' | 'normal' | 'chill' | undefined {
    if (val === 'bloqueante' || val === 'urgente' || val === 'normal' || val === 'chill') return val;
    return undefined;
}

function validarImportancia(val: unknown): 'Muy Alta' | 'Alta' | 'Media' | 'Baja' | 'Muy Baja' {
    if (val === 'Muy Alta' || val === 'Alta' || val === 'Media' || val === 'Baja' || val === 'Muy Baja') return val;
    return 'Media';
}
