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

/* Colores (CSS variables) */

export const COLORES_PRIORIDAD = {
    muy_alta: 'var(--dashboard-estadoMuyAlta)',
    alta: 'var(--dashboard-estadoAlta)',
    media: 'var(--dashboard-estadoMedia)',
    baja: 'var(--dashboard-estadoBaja)'
} as const satisfies Record<NivelPrioridad, string>;

export const COLORES_IMPORTANCIA: Record<NivelImportancia, string> = {
    'Muy Alta': 'var(--dashboard-estadoMuyAlta)',
    'Alta': 'var(--dashboard-estadoAlta)',
    'Media': 'var(--dashboard-estadoMedia)',
    'Baja': 'var(--dashboard-textoApagado)'
} as const satisfies Record<NivelImportancia, string>;

export const COLORES_URGENCIA = {
    bloqueante: 'var(--dashboard-estadoAlta)',
    urgente: 'var(--dashboard-estadoMedia)',
    normal: 'var(--dashboard-textoSecundario)',
    chill: 'var(--dashboard-estadoExito)'
} as const satisfies Record<NivelUrgencia, string>;

/* Etiquetas */

export const ETIQUETAS_PRIORIDAD = {
    muy_alta: 'Muy Alta',
    alta: 'Alta',
    media: 'Media',
    baja: 'Baja'
} as const satisfies Record<NivelPrioridad, string>;

export const ETIQUETAS_IMPORTANCIA = {
    'Muy Alta': 'Muy Alta',
    'Alta': 'Alta',
    'Media': 'Media',
    'Baja': 'Baja'
} as const satisfies Record<NivelImportancia, string>;

export const ETIQUETAS_URGENCIA = {
    bloqueante: 'Bloqueante',
    urgente: 'Urgente',
    normal: 'Normal',
    chill: 'Chill'
} as const satisfies Record<NivelUrgencia, string>;

/* Generadores de opciones para menú contextual */

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

/* Arrays ordenados (para SelectorNivel y formularios) */

export const NIVELES_PRIORIDAD: readonly NivelPrioridad[] = ['muy_alta', 'alta', 'media', 'baja'] as const;
export const NIVELES_IMPORTANCIA: readonly NivelImportancia[] = ['Muy Alta', 'Alta', 'Media', 'Baja'] as const;

/* [233A-45] Centraliza iconos y colores para que SelectorNivel
 * muestre los mismos que el menu contextual */

interface DecoracionNivelItem {
    icono: JSX.Element;
    color: string;
}

export function decoracionSelectorPrioridad(size = 14): Record<string, DecoracionNivelItem> {
    return {
        muy_alta: {icono: <Flag size={size} />, color: COLORES_PRIORIDAD.muy_alta},
        alta: {icono: <Flag size={size} />, color: COLORES_PRIORIDAD.alta},
        media: {icono: <Flag size={size} />, color: COLORES_PRIORIDAD.media},
        baja: {icono: <Flag size={size} />, color: COLORES_PRIORIDAD.baja}
    };
}

export function decoracionSelectorImportancia(size = 14): Record<string, DecoracionNivelItem> {
    return {
        'Muy Alta': {icono: <Star size={size} fill="currentColor" />, color: COLORES_IMPORTANCIA['Muy Alta']},
        'Alta': {icono: <Star size={size} fill="currentColor" />, color: COLORES_IMPORTANCIA.Alta},
        'Media': {icono: <Star size={size} />, color: COLORES_IMPORTANCIA.Media},
        'Baja': {icono: <Star size={size} />, color: COLORES_IMPORTANCIA.Baja}
    };
}
