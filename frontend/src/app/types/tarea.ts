/*
 * types/tarea.ts
 * [H-F15-01] Tipos del dominio de tareas + proyectos (extraídos de
 * types/dashboard.ts). Incluye los type guards esTareaHabito/esTareaSubHabito
 * y el rol compartido usado también por el dominio social.
 */

import type {DiaSemana, NivelImportancia, ReferenciaDependencia} from './habito';

/*
 * Niveles de prioridad para tareas (importancia)
 * Usado para ordenar y destacar tareas importantes
 * muy_alta: tareas críticas e innegociables (máxima prioridad)
 */
export type NivelPrioridad = 'muy_alta' | 'alta' | 'media' | 'baja' | 'muy_baja';

/*
 * Niveles de urgencia para tareas y proyectos (temporalidad)
 * Diferencia entre importancia y temporalidad:
 * - Prioridad: cuán importante es la tarea
 * - Urgencia: cuándo debe hacerse
 *
 * bloqueante: Debe hacerse SÍ o SÍ, no se puede evitar (200% urgente)
 * urgente: Debe hacerse pronto, no puede esperar mucho
 * normal: Default. No muestra badge (valor asumido si no se especifica)
 * chill: Puede hacerse en cualquier momento sin presión temporal
 */
export type NivelUrgencia = 'bloqueante' | 'urgente' | 'normal' | 'chill';

/*
 * Roles de usuario en un elemento compartido
 * propietario: Control total (solo el creador original)
 * colaborador: Puede editar pero no eliminar
 * observador: Solo lectura
 */
export type RolCompartido = 'propietario' | 'colaborador' | 'observador';

/*
 * Tipos de repeticion para tareas
 * despuesCompletar: La tarea reaparece X dias despues de completarla
 * intervaloFijo: La tarea reaparece en fechas fijas (cada X dias o dias especificos)
 */
export type TipoRepeticion = 'despuesCompletar' | 'intervaloFijo';

/*
 * Configuracion de repeticion para una tarea
 */
export interface RepeticionTarea {
    tipo: TipoRepeticion;
    /* Dias de intervalo (para ambos tipos) */
    intervalo: number;
    /* Para intervalo fijo semanal: dias de la semana */
    diasSemana?: DiaSemana[];
    /* Fecha de la ultima repeticion generada */
    ultimaRepeticion?: string;
}

/*
 * Archivo adjunto a una tarea
 */
export interface Adjunto {
    /* [21-08-2026] UUID del backend Rust (antes eran ids numéricos de WP) */
    id: string;
    tipo: 'imagen' | 'audio' | 'archivo';
    url: string;
    nombre: string;
    tamano: number /* en bytes */;
    fechaSubida: string;
    /* URL del thumbnail (sin cifrar, solo para imágenes) */
    thumbnailUrl?: string;
}

/*
 * Configuracion avanzada de una tarea
 */
export interface TareaConfiguracion {
    fechaMaxima?: string /* Fecha limite ISO */;
    descripcion?: string /* Notas detalladas */;
    repeticion?: RepeticionTarea;
    adjuntos?: Adjunto[];
    /* [28-08-2026] Badges de la tarea que el usuario ocultó en la configuración.
     * true = ocultar ese indicador en la fila de la tarea. La dificultad solo
     * tiene efecto cuando el plugin EXP está activo. */
    badgesOcultos?: {
        urgencia?: boolean;
        importancia?: boolean;
        dificultad?: boolean;
    };
}

export interface Tarea {
    id: number;
    texto: string;
    completado: boolean;
    fechaCreacion?: string /* Fecha ISO de cuando se creo la tarea */;
    fechaCompletado?: string /* Fecha ISO de cuando se completo la tarea */;
    /* Orden manual para drag & drop (menor = primero) */
    orden?: number;
    /* ID de tarea padre para subtareas (solo un nivel de anidacion) */
    parentId?: number;
    /* ID del proyecto al que pertenece la tarea (opcional) */
    proyectoId?: number;
    /* ID del habito al que pertenece la tarea - Fase 14.8 (opcional) */
    habitoId?: number;
    /* ID del grupo/seccion al que pertenece la tarea (TAREA 3) */
    grupoId?: number;
    /* Campos opcionales */
    prioridad?: NivelPrioridad;
    /* Urgencia: temporalidad (bloqueante, urgente, normal, chill) */
    urgencia?: NivelUrgencia;
    /* Configuracion avanzada (fecha limite, descripcion, repeticion, adjuntos) */
    configuracion?: TareaConfiguracion;
    /* Asignacion de tarea a un participante */
    asignadoA?: number /* ID del usuario asignado */;
    asignadoANombre?: string /* Nombre del usuario para evitar lookups */;
    asignadoAAvatar?: string /* Avatar del usuario asignado */;
    /* Metadata para tareas compartidas/asignadas a mi */
    esCompartido?: boolean;
    propietarioId?: number;
    propietarioNombre?: string;
    propietarioAvatar?: string;
    miRol?: RolCompartido;
    /* Tags (Fase 9.7.3) */
    tags?: string[];
    /* [2303A-41] Fecha ISO hasta la que la tarea está pospuesta. Si es futuro, se oculta del panel. */
    pospuestoHasta?: string;
    /* [014A-19] Timestamp de última modificación local (ms) para resolución de conflictos. */
    updatedAt?: number;
    /* Dependencias condicionales: elementos que deben cumplirse antes de marcar esta tarea */
    dependencias?: ReferenciaDependencia[];
    /* Grupo de ejecución para organizar paneles de ejecución múltiples */
    grupoEjecucion?: string | null;
}

/*
 * GrupoTareas: Seccion/agrupacion de tareas (TAREA 3)
 * Permite organizar tareas en grupos colapsables con titulo editable
 */
export interface GrupoTareas {
    id: number;
    nombre: string;
    /* Orden del grupo en la lista (menor = primero) */
    orden: number;
    /* Estado de colapso (true = colapsado) */
    colapsado: boolean;
    /* Proyecto al que pertenece (opcional - si no, es grupo global) */
    proyectoId?: number;
    /* Fecha de creacion */
    fechaCreacion: string;
    /* Grupo del sistema (no editable/eliminable, ej: Libres) */
    esSistema?: boolean;
}

/*
 * Tarea virtual derivada de un hábito
 * Aparece en Ejecución cuando "toca hoy" y está habilitada la opción
 * La urgencia se calcula automáticamente basada en días de inactividad
 */
export interface TareaHabito extends Tarea {
    /* Indica que es una tarea virtual de hábito */
    esHabito: true;
    /* ID del hábito origen */
    habitoId: number;
    /* Nombre del hábito (para mostrar badge) */
    habitoNombre: string;
    /* Racha actual del hábito */
    habitoRacha: number;
    /* Importancia del hábito */
    habitoImportancia: NivelImportancia;
    /* Si el hábito está en su ventana de oportunidad */
    enVentanaOportunidad?: boolean;
}

/*
 * [207A-3] Tarea virtual derivada de un subhábito
 * Similar a TareaHabito pero para subhábitos individuales.
 * Permite routing correcto en menú contextual y registro de actividad.
 */
export interface TareaSubHabito extends Tarea {
    esSubHabito: true;
    habitoPadreId: number;
    subHabitoId: number;
}

/*
 * Tipo unión para tareas regulares y tareas-hábito
 */
export type TareaOHabito = Tarea | TareaHabito | TareaSubHabito;

/*
 * Type guard para verificar si una tarea es un hábito virtual
 */
export function esTareaHabito(tarea: TareaOHabito): tarea is TareaHabito {
    return 'esHabito' in tarea && tarea.esHabito === true;
}

/*
 * Type guard para verificar si una tarea es un subhábito virtual
 */
export function esTareaSubHabito(tarea: TareaOHabito): tarea is TareaSubHabito {
    return 'esSubHabito' in tarea && tarea.esSubHabito === true;
}

/*
 * Datos para crear una nueva tarea
 */
export interface DatosNuevaTarea {
    texto: string;
    prioridad?: NivelPrioridad;
    configuracion?: TareaConfiguracion;
    proyectoId?: number;
}

/*
 * Datos para editar una tarea existente
 * prioridad puede ser null para eliminar la prioridad de la tarea
 * urgencia puede ser null para eliminar la urgencia (vuelve a 'normal')
 */
export interface DatosEdicionTarea {
    texto?: string;
    prioridad?: NivelPrioridad | null;
    /* Urgencia: temporalidad (bloqueante, urgente, normal, chill) */
    urgencia?: NivelUrgencia | null;
    completado?: boolean;
    parentId?: number;
    /* ID de la tarea después de la cual insertar (solo para creación) */
    insertarDespuesDe?: number;
    /* Configuración avanzada de la tarea */
    configuracion?: TareaConfiguracion;
    proyectoId?: number;
    /* ID del habito al que pertenece la tarea - Fase 14.8 */
    habitoId?: number;
    /* ID del grupo/seccion al que pertenece la tarea (TAREA 3) */
    grupoId?: number;
    /* Asignación de tarea */
    asignadoA?: number | null;
    asignadoANombre?: string;
    asignadoAAvatar?: string;

    tags?: string[];
    /* [2303A-41] Posponer tarea hasta fecha ISO. null = quitar posposición. */
    pospuestoHasta?: string | null;
    /* Dependencias condicionales para completar la tarea */
    dependencias?: ReferenciaDependencia[];
    /* Grupo de ejecución para organizar paneles de ejecución múltiples */
    grupoEjecucion?: string | null;
}
