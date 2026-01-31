/*
 * Constantes de Propiedades
 * Responsabilidad única: definir opciones y textos de prioridad/urgencia/frecuencia/importancia
 * Evita duplicación en BottomSheets y otros componentes
 */

import type {ReactNode} from 'react';

/* Interfaz común para opciones */
export interface OpcionPropiedad {
    id: string;
    etiqueta: string;
    descripcion?: string;
    icono?: ReactNode;
}

/* Opciones de prioridad */
export const OPCIONES_PRIORIDAD: OpcionPropiedad[] = [
    {id: 'baja', etiqueta: 'Baja'},
    {id: 'media', etiqueta: 'Media'},
    {id: 'alta', etiqueta: 'Alta'},
    {id: 'muy_alta', etiqueta: 'Muy Alta'}
];

/* Opciones de urgencia */
export const OPCIONES_URGENCIA: OpcionPropiedad[] = [
    {id: 'chill', etiqueta: 'Chill', descripcion: 'Sin prisa'},
    {id: 'normal', etiqueta: 'Normal'},
    {id: 'urgente', etiqueta: 'Urgente'},
    {id: 'bloqueante', etiqueta: 'Bloqueante', descripcion: 'ASAP'}
];

/* Opciones de fecha rápida para tareas */
export const OPCIONES_FECHA_TAREA: OpcionPropiedad[] = [
    {id: 'hoy', etiqueta: 'Hoy'},
    {id: 'manana', etiqueta: 'Mañana'},
    {id: 'semana', etiqueta: 'Esta semana'},
    {id: 'mes', etiqueta: 'Este mes'}
];

/* Opciones de fecha rápida para proyectos */
export const OPCIONES_FECHA_PROYECTO: OpcionPropiedad[] = [
    {id: 'semana', etiqueta: 'Esta semana'},
    {id: 'mes', etiqueta: 'Este mes'},
    {id: 'trimestre', etiqueta: 'Este trimestre'},
    {id: 'ano', etiqueta: 'Este año'}
];

/* Opciones de frecuencia para hábitos */
export const OPCIONES_FRECUENCIA: OpcionPropiedad[] = [
    {id: 'diaria', etiqueta: 'Diaria', descripcion: 'Todos los días'},
    {id: 'semanal', etiqueta: 'Semanal', descripcion: '1 vez/semana'},
    {id: 'diasEspecificos', etiqueta: 'Días específicos', descripcion: 'Lun, Mar...'},
    {id: 'personalizada', etiqueta: 'Personalizada', descripcion: 'Cada X días'}
];

/* Opciones de importancia para hábitos */
export const OPCIONES_IMPORTANCIA: OpcionPropiedad[] = [
    {id: 'Baja', etiqueta: 'Baja'},
    {id: 'Media', etiqueta: 'Media'},
    {id: 'Alta', etiqueta: 'Alta'},
    {id: 'Muy Alta', etiqueta: 'Muy Alta'}
];

/* Mapas para obtener texto legible desde ID */

const MAPA_PRIORIDAD: Record<string, string> = {
    baja: 'Baja',
    media: 'Media',
    alta: 'Alta',
    muy_alta: 'Muy Alta'
};

const MAPA_URGENCIA: Record<string, string> = {
    bloqueante: 'Bloqueante',
    urgente: 'Urgente',
    normal: 'Normal',
    chill: 'Chill'
};

const MAPA_FRECUENCIA: Record<string, string> = {
    diaria: 'Diaria',
    semanal: 'Semanal',
    diasEspecificos: 'Días específicos',
    personalizada: 'Personalizada'
};

const MAPA_IMPORTANCIA: Record<string, string> = {
    Baja: 'Baja',
    Media: 'Media',
    Alta: 'Alta',
    'Muy Alta': 'Muy Alta'
};

/* Funciones de mapeo */

export function obtenerTextoPrioridad(prioridad: string | undefined): string | null {
    if (!prioridad) return null;
    return MAPA_PRIORIDAD[prioridad] || null;
}

export function obtenerTextoUrgencia(urgencia: string | undefined): string | null {
    if (!urgencia) return null;
    return MAPA_URGENCIA[urgencia] || null;
}

export function obtenerTextoFrecuencia(frecuencia: string | undefined): string | null {
    if (!frecuencia) return null;
    return MAPA_FRECUENCIA[frecuencia] || null;
}

export function obtenerTextoImportancia(importancia: string | undefined): string | null {
    if (!importancia) return null;
    return MAPA_IMPORTANCIA[importancia] || null;
}
