import type {AccionLLM, ResultadoAccion} from './accionesIA';
import {apiFetch, ErrorApi} from '../utils/apiClient';

interface NotaCompleta {
    id: string;
    title: string;
    content: string;
}

interface ReminderBackend {
    id: string;
    titulo: string;
    mensaje: string;
    programado_para: string;
    estado: string;
}

interface WebSearchItem {
    title: string;
    url: string;
    summary: string;
}

interface WebSearchBackend {
    provider: string;
    query: string;
    results: WebSearchItem[];
}

function normalizarLimite(valor: unknown): number {
    const n = Number(valor);
    if (!Number.isFinite(n)) return 5;
    return Math.min(10, Math.max(1, Math.floor(n)));
}

/**
 * [27-08-2026] Propuesta de recordatorio: NO escribe nada. La creación real
 * ocurre SOLO en la confirmación del usuario (POST /api/reminders con la
 * idempotency_key generada aquí), vía confirmarAccion en usePanelIA. La
 * propuesta devuelve pendienteConfirmacion=true y la key embebida en los
 * parámetros para que la confirmación la reenvíe sin duplicar.
 */
function proponerRecordatorio(accion: AccionLLM): ResultadoAccion {
    const titulo = String(accion.parametros.titulo || accion.parametros.texto || '').trim();
    const mensaje = String(accion.parametros.mensaje || accion.parametros.nota || '').trim();
    const fecha = String(accion.parametros.fecha || accion.parametros.cuando || '').trim();
    if (!titulo) {
        return {tipo: accion.tipo, exito: false, descripcion: 'Falta el título del recordatorio'};
    }
    if (!fecha) {
        return {tipo: accion.tipo, exito: false, descripcion: 'Falta la fecha/hora del recordatorio'};
    }
    /* [28-08-2026] Un string date-only ("2026-08-28") lo parsea Date.parse
     * como UTC medianoche, lo que desvía la hora por el offset del usuario.
     * Se normaliza a medianoche LOCAL para que el round-trip sea coherente:
     * hora local → ISO UTC (backend) → toLocaleString (display). */
    const fechaNormalizada = /^\d{4}-\d{2}-\d{2}$/.test(fecha.trim())
        ? `${fecha.trim()}T00:00:00`
        : fecha;
    const fechaMs = Date.parse(fechaNormalizada);
    if (!Number.isFinite(fechaMs)) {
        return {tipo: accion.tipo, exito: false, descripcion: `Fecha inválida: ${fecha}`};
    }
    if (fechaMs <= Date.now()) {
        return {tipo: accion.tipo, exito: false, descripcion: 'La fecha debe estar en el futuro'};
    }
    const key = `ia-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    return {
        tipo: accion.tipo,
        exito: false,
        descripcion: `Crear recordatorio "${titulo}" para ${new Date(fechaMs).toLocaleString()} — pendiente de confirmación`,
        pendienteConfirmacion: true,
        datos: {titulo, mensaje, programado_para: new Date(fechaMs).toISOString(), idempotency_key: key}
    };
}

/** Ejecuta la confirmación del recordatorio contra el backend real. */
export async function confirmarRecordatorio(datos: Record<string, unknown>): Promise<ReminderBackend> {
    const titulo = String(datos.titulo || '').trim();
    const programadoPara = String(datos.programado_para || '').trim();
    if (!titulo || !programadoPara) {
        throw new Error('Datos de recordatorio incompletos');
    }
    const mensaje = String(datos.mensaje || '').trim();
    const idempotencyKey = String(datos.idempotency_key || '').trim() || undefined;
    return apiFetch<ReminderBackend>('/reminders', {
        method: 'POST',
        body: {titulo, mensaje, programado_para: programadoPara, idempotency_key: idempotencyKey}
    });
}

/** Búsqueda web real vía /api/ai/tools/web-search. Error claro si no configurada. */
async function buscarEnInternet(accion: AccionLLM): Promise<ResultadoAccion> {
    const query = String(accion.parametros.query || accion.parametros.consulta || '').trim();
    if (!query) {
        return {tipo: accion.tipo, exito: false, descripcion: 'Falta la consulta de búsqueda'};
    }
    try {
        const resultado = await apiFetch<WebSearchBackend>('/ai/tools/web-search', {
            method: 'POST',
            body: {query, limit: normalizarLimite(accion.parametros.limit)}
        });
        if (!resultado.results || resultado.results.length === 0) {
            return {tipo: accion.tipo, exito: true, descripcion: `Sin resultados para "${query}"`, datos: {query, results: []}};
        }
        return {
            tipo: accion.tipo,
            exito: true,
            descripcion: `${resultado.results.length} resultados (${resultado.provider})`,
            datos: resultado
        };
    } catch (error) {
        if (error instanceof ErrorApi) {
            return {tipo: accion.tipo, exito: false, descripcion: error.message};
        }
        return {tipo: accion.tipo, exito: false, descripcion: 'Error buscando en internet'};
    }
}

export async function ejecutarAccionExternaIA(accion: AccionLLM): Promise<ResultadoAccion | null> {
    switch (accion.tipo) {
        case 'proponer_whatsapp':
        case 'proponer_github':
            return {tipo: accion.tipo, exito: false, descripcion: `${accion.tipo === 'proponer_whatsapp' ? 'WhatsApp' : 'GitHub'} está pendiente de implementación`};
        case 'research_web':
            return buscarEnInternet(accion);
        case 'research_local':
            return {tipo: accion.tipo, exito: false, descripcion: 'La búsqueda local avanzada no está disponible'};
        case 'leer_nota': {
            const noteId = String(accion.parametros.id || '').trim();
            if (!/^[0-9a-f-]{36}$/i.test(noteId)) return {tipo: accion.tipo, exito: false, descripcion: 'ID de nota inválido'};
            const nota = await apiFetch<NotaCompleta>(`/notes/${noteId}`);
            return {tipo: accion.tipo, exito: true, descripcion: `**${nota.title}**\n\n${nota.content}`, datos: nota};
        }
        case 'programar_recordatorio':
            return proponerRecordatorio(accion);
        default:
            return null;
    }
}
