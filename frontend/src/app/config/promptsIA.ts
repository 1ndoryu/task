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

/*
 * Generar contexto compacto de tareas y hábitos actuales
 * Se inyecta en el system prompt para que el LLM conozca el estado
 */
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
- {"tipo": "leer_nota", "parametros": {"id": 38}} — lee el contenido COMPLETO de una nota por su ID
- {"tipo": "research_local", "parametros": {"query": "texto a buscar", "limit": 10}}
- {"tipo": "research_web", "parametros": {"query": "texto a buscar en internet", "limit": 5}}
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
- research_local busca en notas, tareas y hábitos del usuario (sin internet).
- research_web busca en internet vía Tavily/Serper; úsalo cuando el usuario pida información de la web, noticias, precios, docs externas o cualquier cosa que no esté en sus datos locales.
- proponer_github prepara un borrador aprobable; no abre issues/PR reales sin confirmación.
- programar_recordatorio crea un recordatorio local aprobable y luego WP-Cron lo ejecuta cuando venza.
${promptSistema ? `\nINSTRUCCIONES PERSONALIZADAS DEL SISTEMA:\n${promptSistema}` : ''}
${preferencias ? `\nPREFERENCIAS DEL USUARIO:\n${preferencias}` : ''}
${contexto}`;
}
