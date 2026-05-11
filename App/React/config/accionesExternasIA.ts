import type {AccionLLM, ResultadoAccion} from './accionesIA';
import {buscarResearchLocal, proponerGithub, proponerRecordatorio, proponerWhatsapp} from '../services/agentActionsService';

export async function ejecutarAccionExternaIA(accion: AccionLLM): Promise<ResultadoAccion | null> {
    switch (accion.tipo) {
        case 'proponer_whatsapp': {
            const mensaje = String(accion.parametros.mensaje || accion.parametros.message || '').trim();
            const to = accion.parametros.to ? String(accion.parametros.to) : undefined;
            if (!mensaje) {
                return {tipo: accion.tipo, exito: false, descripcion: 'Mensaje WhatsApp vacío'};
            }
            const propuesta = await proponerWhatsapp(mensaje, to);
            const destino = String(propuesta.payload?.toMasked || 'destinatario configurado');
            return {
                tipo: accion.tipo,
                exito: false,
                descripcion: `WhatsApp a ${destino} — pendiente de aprobación`,
                pendienteConfirmacion: true,
                accionExternaId: propuesta.id
            };
        }
        case 'research_local': {
            const query = String(accion.parametros.query || accion.parametros.consulta || '').trim();
            const limit = Number(accion.parametros.limit || 10);
            if (!query) {
                return {tipo: accion.tipo, exito: false, descripcion: 'Consulta research vacía'};
            }
            const research = await buscarResearchLocal(query, Number.isFinite(limit) ? limit : 10);
            const resumen = research.results.length > 0
                ? research.results.slice(0, 3).map(item => `${item.tipo}: ${item.titulo}`).join(' · ')
                : 'sin resultados locales';
            return {tipo: accion.tipo, exito: true, descripcion: `Research local: ${resumen}`};
        }
        case 'proponer_github': {
            const titulo = String(accion.parametros.titulo || accion.parametros.title || '').trim();
            const descripcion = String(accion.parametros.descripcion || accion.parametros.description || '').trim();
            const tipo = String(accion.parametros.tipo || accion.parametros.kind || 'issue');
            const repo = accion.parametros.repo ? String(accion.parametros.repo) : undefined;
            if (!titulo || !descripcion) {
                return {tipo: accion.tipo, exito: false, descripcion: 'GitHub requiere título y descripción'};
            }
            const propuesta = await proponerGithub(titulo, descripcion, tipo, repo);
            return {
                tipo: accion.tipo,
                exito: false,
                descripcion: `GitHub ${tipo} — borrador pendiente de aprobación`,
                pendienteConfirmacion: true,
                accionExternaId: propuesta.id
            };
        }
        case 'programar_recordatorio': {
            const titulo = String(accion.parametros.titulo || accion.parametros.title || 'Recordatorio del agente').trim();
            const mensaje = String(accion.parametros.mensaje || accion.parametros.message || '').trim();
            const fecha = String(accion.parametros.fecha || accion.parametros.scheduledAt || '').trim();
            if (!mensaje || !fecha) {
                return {tipo: accion.tipo, exito: false, descripcion: 'Recordatorio requiere mensaje y fecha'};
            }
            const propuesta = await proponerRecordatorio(titulo, mensaje, fecha);
            return {
                tipo: accion.tipo,
                exito: false,
                descripcion: 'Recordatorio — pendiente de aprobación',
                pendienteConfirmacion: true,
                accionExternaId: propuesta.id
            };
        }
        default:
            return null;
    }
}
