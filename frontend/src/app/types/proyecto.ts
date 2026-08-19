/*
 * types/proyecto.ts
 * [H-F15-01] Tipos del dominio de proyectos (extraídos de types/dashboard.ts).
 */

import type {Adjunto, NivelPrioridad, NivelUrgencia, RolCompartido} from './tarea';

/*
 * Entidad Proyecto
 * Contenedor de alto nivel para agrupar tareas relacionadas
 */
export interface Proyecto {
    id: number;
    nombre: string;
    descripcion?: string;
    /* Icono del proyecto (id del icono de lucide) */
    icono?: string;
    /* Color del icono (hex) */
    colorIcono?: string;
    prioridad: NivelPrioridad;
    /* Urgencia: temporalidad (bloqueante, urgente, normal, chill) */
    urgencia?: NivelUrgencia;
    fechaLimite?: string;
    estado: 'activo' | 'completado' | 'pausado';
    /* Progreso calculado (0-100) */
    progreso?: number;
    fechaCreacion: string;
    fechaCompletado?: string;
    /* Metadata para proyectos compartidos conmigo */
    esCompartido?: boolean;
    propietarioId?: number;
    propietarioNombre?: string;
    propietarioAvatar?: string;
    miRol?: RolCompartido;
    /* Adjuntos del proyecto (Fase 9) */
    adjuntos?: Adjunto[];
    /* Hitos del proyecto (Fase 9) */
    hitos?: Hito[];
    /* [014A-19] Timestamp de última modificación local (ms) para resolución de conflictos. */
    updatedAt?: number;
}

export interface Hito {
    id: number;
    titulo: string;
    completado: boolean;
    prioridad: NivelPrioridad;
    fechaLimite?: string;
}
