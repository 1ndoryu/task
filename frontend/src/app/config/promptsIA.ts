/*
 * config/promptsIA.ts
 * [H-F15-01] Generación de contexto y system prompt del asistente IA
 * (extraído de accionesIA.ts).
 */

import type {Habito, Tarea} from '../types/dashboard';
import {useHabitosStore} from '../stores/habitosStore';

/* Obtener hábitos directamente del store Zustand (accesible globalmente) */
function obtenerHabitos(): Habito[] {
    return useHabitosStore.getState().habitos;
}

/* [28-08-2026] Flags de contexto (plan IA, Fase 4): los toggles de la
 * configuración deben reflejarse en el prompt, no ser UI muerta. */
export interface OpcionesContexto {
    incluirTareasCompletadas?: boolean;
    incluirHabitosPausados?: boolean;
}

/*
 * Generar contexto compacto de tareas y hábitos actuales
 * Se inyecta en el system prompt para que el LLM conozca el estado
 */
export function generarContexto(tareas: Tarea[], opciones: OpcionesContexto = {}): string {
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

    if (opciones.incluirTareasCompletadas !== false && tareasCompletadasHoy.length > 0) {
        ctx += `\n## Tareas completadas hoy (${tareasCompletadasHoy.length})\n`;
        for (const t of tareasCompletadasHoy.slice(0, 10)) {
            ctx += `- [id:${t.id}] ${t.texto}\n`;
        }
    }

    const habitosVisibles = opciones.incluirHabitosPausados
        ? habitos
        : habitos.filter(h => !h.pausado);
    ctx += '\n## Hábitos' + (opciones.incluirHabitosPausados ? ' (incluye pausados)' : ' activos') + '\n';
    if (habitosVisibles.length === 0) {
        ctx += 'No hay hábitos activos.\n';
    } else {
        const hoy = new Date().toISOString().split('T')[0];
        for (const h of habitosVisibles) {
            const completadoHoy = h.historialCompletados?.includes(hoy);
            const estado = completadoHoy ? '✓' : h.pausado ? '⏸' : '○';
            ctx += `- [id:${h.id}] ${estado} ${h.nombre} (racha:${h.racha}, importancia:${h.importancia}${h.pausado ? ', pausado' : ''})\n`;
        }
    }

    return ctx;
}

/*
 * System prompt completo con esquema de acciones y contexto.
 * [27-08-2026] Parámetro de configuración (plan IA, Fase 4): idioma, estilo y
 * permisos de herramientas; las acciones no permitidas se omiten del esquema
 * para que el modelo no las proponga. WhatsApp/GitHub siempre quedan fuera. */
export interface ConfigPromptIA {
    idioma?: string;
    estilo?: string;
    permitirRecordatorios?: boolean;
    permitirBusquedaWeb?: boolean;
}

export function generarSystemPrompt(contexto: string, preferencias: string, promptSistema = '', config: ConfigPromptIA = {}): string {
    const idioma = config.idioma === 'en' ? 'English' : 'español';
    const estiloGuia =
        config.estilo === 'detallado'
            ? 'Da respuestas detalladas y explica tu razonamiento.'
            : config.estilo === 'amable'
                ? 'Usa un tono cercano y motivador.'
                : 'Sé conciso y directo.';

    const accionesHerramientas = [
        '{"tipo": "leer_nota", "parametros": {"id": "uuid"}} — lee el contenido COMPLETO de una nota por su UUID',
        ...(config.permitirBusquedaWeb !== false
            ? ['{"tipo": "research_web", "parametros": {"query": "consulta", "limit": 5}} — busca en internet y devuelve resultados; úsalo cuando el usuario pida información actual, noticias o datos que no están en su contexto']
            : []),
        ...(config.permitirRecordatorios !== false
            ? ['{"tipo": "programar_recordatorio", "parametros": {"titulo": "nombre", "mensaje": "texto", "fecha": "2026-08-28T09:00:00"}} — propone un recordatorio; SOLO se crea cuando el usuario confirma en la interfaz. La fecha SIEMPRE en hora LOCAL del usuario, sin sufijo de zona horaria (sin Z ni +hh:mm). Pide la fecha si no la dio']
            : [])
    ].join('\n');

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
${accionesHerramientas}

REGLAS:
- Si no necesitas ejecutar acciones, envía "acciones": [].
- No inventes IDs. Solo usa IDs que aparezcan en el contexto.
- Sé conciso. Confirma las acciones que ejecutas.
- Responde siempre en español.
- NUNCA uses eliminar_tarea o eliminar_habito a menos que el usuario haya pedido EXPLÍCITAMENTE borrar o eliminar algo. Si el usuario dice "limpiar", "organizar" o "arreglar", NO elimines — pregunta primero qué quiere hacer con cada elemento.
- Las eliminaciones requieren confirmación del usuario en la interfaz, así que inclúyelas solo cuando estés seguro de la intención.
- Proponer acciones externas no implementadas no está permitido; informa que esa capacidad está pendiente.
- Los recordatorios requieren confirmación del usuario en la interfaz; la propuesta NUNCA los crea por sí sola.
- WhatsApp y GitHub están pendientes de implementación; no los propongas.
- Responde en ${idioma}. ${estiloGuia}
${promptSistema ? `\nINSTRUCCIONES PERSONALIZADAS DEL SISTEMA:\n${promptSistema}` : ''}
${preferencias ? `\nPREFERENCIAS DEL USUARIO:\n${preferencias}` : ''}
${contexto}`;
}
