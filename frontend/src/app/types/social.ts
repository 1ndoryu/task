/*
 * types/social.ts
 * [H-F15-01] Tipos de los sistemas sociales: equipos, notificaciones in-app y
 * elementos compartidos (extraídos de types/dashboard.ts).
 */

import type {RolCompartido} from './tarea';

/*
 * Tipos para el Sistema de Equipos (Social)
 */

/*
 * Estados posibles de una solicitud de equipo
 */
export type EstadoSolicitud = 'pendiente' | 'aceptada' | 'rechazada' | 'pendiente_registro';

/*
 * Datos básicos de un usuario en el contexto de equipos
 */
export interface UsuarioEquipo {
    id: number;
    nombre: string;
    email: string;
    avatar: string;
}

/*
 * Solicitud de conexión (recibida o enviada)
 */
export interface SolicitudEquipo {
    id: number;
    estado: EstadoSolicitud;
    fechaSolicitud: string;
    fechaRespuesta: string | null;
    email: string | null;
    usuario: UsuarioEquipo | null;
    esMia: boolean;
}

/*
 * Compañero activo (conexión aceptada)
 */
export interface CompaneroEquipo {
    id: number;
    companeroId: number;
    nombre: string;
    email: string;
    avatar: string;
    fechaConexion: string;
}

/*
 * Contadores del equipo
 */
export interface ContadoresEquipo {
    recibidas: number;
    enviadas: number;
    companeros: number;
}

/*
 * Estructura completa del equipo
 */
export interface EquipoCompleto {
    recibidas: SolicitudEquipo[];
    enviadas: SolicitudEquipo[];
    companeros: CompaneroEquipo[];
    contadores: ContadoresEquipo;
}

/*
 * Tipos para el Sistema de Notificaciones In-App
 */

/*
 * Tipos de notificación disponibles
 */
export type TipoNotificacion = 'solicitud_equipo' | 'solicitud_aceptada' | 'tarea_vence_hoy' | 'tarea_asignada' | 'tarea_removida' | 'adjunto_agregado' | 'mensaje_chat' | 'habito_companero' | 'elemento_compartido';

/*
 * Datos extra específicos por tipo de notificación
 */
export interface DatosExtraSolicitudEquipo {
    solicitudId: number;
    usuarioId: number;
    usuarioNombre: string;
    usuarioEmail: string;
    usuarioAvatar: string;
}

export interface DatosExtraTareaVence {
    tareaId: number;
    tareaTexto: string;
    proyectoId?: number;
}

export interface DatosExtraTareaAsignada {
    tareaId: number;
    tareaTexto: string;
    asignadoPor: number;
    asignadoPorNombre: string;
}

/*
 * Datos extra genéricos (unión de todos los tipos específicos)
 */
export type DatosExtraNotificacion = DatosExtraSolicitudEquipo | DatosExtraTareaVence | DatosExtraTareaAsignada | Record<string, unknown> | null;

/*
 * Notificación individual
 */
export interface Notificacion {
    id: number;
    tipo: TipoNotificacion;
    titulo: string;
    contenido: string | null;
    leida: boolean;
    fechaCreacion: string;
    fechaLectura: string | null;
    datosExtra: DatosExtraNotificacion;
}

/*
 * Paginación de notificaciones
 */
export interface PaginacionNotificaciones {
    pagina: number;
    porPagina: number;
    totalPaginas: number;
}

/*
 * Respuesta de listado de notificaciones
 */
export interface RespuestaNotificaciones {
    notificaciones: Notificacion[];
    total: number;
    paginacion: PaginacionNotificaciones;
}

/*
 * Tipos para el Sistema de Compartidos (Colaboración)
 */

/*
 * Tipos de elemento que pueden compartirse
 */
export type TipoElementoCompartido = 'tarea' | 'proyecto' | 'habito';

/*
 * Elemento compartido conmigo (lo veo en mi dashboard)
 */
export interface ElementoCompartidoConmigo {
    id: number;
    tipo: TipoElementoCompartido;
    elementoId: number;
    propietarioId: number;
    propietarioNombre: string;
    propietarioEmail: string;
    propietarioAvatar: string;
    rol: RolCompartido;
    fechaCompartido: string;
}

/*
 * Elemento que yo he compartido con alguien
 */
export interface ElementoCompartidoPorMi {
    id: number;
    tipo: TipoElementoCompartido;
    elementoId: number;
    usuarioId: number;
    usuarioNombre: string;
    usuarioEmail: string;
    usuarioAvatar: string;
    rol: RolCompartido;
    fechaCompartido: string;
}

/*
 * Participante de un elemento compartido
 */
export interface Participante {
    id: number;
    usuarioId: number;
    nombre: string;
    email: string;
    avatar: string;
    rol: RolCompartido;
    esPropietario: boolean;
}

/*
 * Permisos de acceso a un elemento
 */
export interface PermisosAcceso {
    rol: RolCompartido;
    puedeEditar: boolean;
    puedeEliminar: boolean;
}

/*
 * Contadores de elementos compartidos
 */
export interface ContadoresCompartidos {
    tareas: number;
    proyectos: number;
    habitos: number;
    total: number;
}

/*
 * Datos para compartir un elemento
 */
export interface DatosCompartir {
    tipo: TipoElementoCompartido;
    elementoId: number;
    usuarioId: number;
    rol?: RolCompartido;
}
