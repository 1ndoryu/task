/* [233A-40] Mapeo centralizado de prioridad, importancia y urgencia.
 * Todo componente que necesite renderizar iconos, colores o etiquetas de estos niveles
 * debe importar desde aquí. Nunca duplicar estos mapeos en componentes individuales.
 *
 * Convenciones:
 * - Prioridad (tareas/proyectos) → Flag icon
 * - Importancia (hábitos) → Star icon
 * - Urgencia → Zap icon
 * - Colores siempre vía CSS variables, nunca hex hardcoded */
import {Flag, Star, Zap, X} from 'lucide-react';
import type {NivelPrioridad, NivelUrgencia, NivelImportancia} from '../types/dashboard';

/* ===== COLORES (CSS variables) ===== */

export const COLORES_PRIORIDAD: Record<NivelPrioridad, string> = {
    muy_alta: 'var(--dashboard-estadoMuyAlta)',
    alta: 'var(--dashboard-estadoAlta)',
    media: 'var(--dashboard-estadoMedia)',
    baja: 'var(--dashboard-estadoBaja)'
};

export const COLORES_IMPORTANCIA: Record<NivelImportancia, string> = {
    'Muy Alta': 'var(--dashboard-estadoMuyAlta)',
    'Alta': 'var(--dashboard-estadoAlta)',
    'Media': 'var(--dashboard-estadoMedia)',
    'Baja': 'var(--dashboard-textoApagado)'
};

export const COLORES_URGENCIA: Record<NivelUrgencia, string> = {
    bloqueante: 'var(--dashboard-estadoAlta)',
    urgente: 'var(--dashboard-estadoMedia)',
    normal: 'var(--dashboard-textoSecundario)',
    chill: 'var(--dashboard-estadoExito)'
};

/* ===== ETIQUETAS ===== */

export const ETIQUETAS_PRIORIDAD: Record<NivelPrioridad, string> = {
    muy_alta: 'Muy Alta',
    alta: 'Alta',
    media: 'Media',
    baja: 'Baja'
};

export const ETIQUETAS_IMPORTANCIA: Record<NivelImportancia, string> = {
    'Muy Alta': 'Muy Alta',
    'Alta': 'Alta',
    'Media': 'Media',
    'Baja': 'Baja'
};

export const ETIQUETAS_URGENCIA: Record<NivelUrgencia, string> = {
    bloqueante: 'Bloqueante',
    urgente: 'Urgente',
    normal: 'Normal',
    chill: 'Chill'
};

/* ===== GENERADORES DE OPCIONES PARA MENÚ CONTEXTUAL ===== */

interface OpcionMenuNivel {
    id: string;
    etiqueta: string;
    icono: JSX.Element;
    separadorDespues?: boolean;
}

export function opcionesMenuPrioridad(size = 12, conSinPrioridad = false): OpcionMenuNivel[] {
    const opciones: OpcionMenuNivel[] = [
        {id: 'muy_alta', etiqueta: 'Muy Alta', icono: <Flag size={size} color={COLORES_PRIORIDAD.muy_alta} />},
        {id: 'alta', etiqueta: 'Alta', icono: <Flag size={size} color={COLORES_PRIORIDAD.alta} />},
        {id: 'media', etiqueta: 'Media', icono: <Flag size={size} color={COLORES_PRIORIDAD.media} />},
        {id: 'baja', etiqueta: 'Baja', icono: <Flag size={size} color={COLORES_PRIORIDAD.baja} />}
    ];
    if (conSinPrioridad) {
        opciones.push({id: 'sin-prioridad', etiqueta: 'Sin prioridad', icono: <X size={size} />});
    }
    return opciones;
}

export function opcionesMenuImportancia(size = 12): OpcionMenuNivel[] {
    return [
        {id: 'Muy Alta', etiqueta: 'Muy Alta', icono: <Star size={size} color={COLORES_IMPORTANCIA['Muy Alta']} fill={COLORES_IMPORTANCIA['Muy Alta']} />},
        {id: 'Alta', etiqueta: 'Alta', icono: <Star size={size} color={COLORES_IMPORTANCIA.Alta} fill={COLORES_IMPORTANCIA.Alta} />},
        {id: 'Media', etiqueta: 'Media', icono: <Star size={size} color={COLORES_IMPORTANCIA.Media} />},
        {id: 'Baja', etiqueta: 'Baja', icono: <Star size={size} color={COLORES_IMPORTANCIA.Baja} />}
    ];
}

export function opcionesMenuUrgencia(size = 12, conSinUrgencia = false): OpcionMenuNivel[] {
    const opciones: OpcionMenuNivel[] = [];
    if (conSinUrgencia) {
        opciones.push({id: 'ninguna', etiqueta: 'Sin urgencia', icono: <Zap size={size} />});
    }
    opciones.push(
        {id: 'bloqueante', etiqueta: 'Bloqueante', icono: <Zap size={size} color={COLORES_URGENCIA.bloqueante} />},
        {id: 'urgente', etiqueta: 'Urgente', icono: <Zap size={size} color={COLORES_URGENCIA.urgente} />},
        {id: 'normal', etiqueta: 'Normal', icono: <Zap size={size} color={COLORES_URGENCIA.normal} />},
        {id: 'chill', etiqueta: 'Chill', icono: <Zap size={size} color={COLORES_URGENCIA.chill} />}
    );
    return opciones;
}
