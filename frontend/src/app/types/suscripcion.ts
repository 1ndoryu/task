/*
 * types/suscripcion.ts
 * [H-F15-01] Tipos del sistema de suscripción (freemium), panel de
 * administración y almacenamiento (extraídos de types/dashboard.ts).
 */

/*
 * Tipos para el sistema de suscripción (Freemium)
 */

export type PlanSuscripcion = 'free' | 'premium';
export type EstadoSuscripcion = 'activa' | 'trial' | 'expirada';

/*
 * Límites por plan
 */
export interface LimitesPlan {
    habitos: number /* -1 = ilimitado */;
    tareasActivas: number /* -1 = ilimitado */;
    proyectos: number /* -1 = ilimitado */;
    adjuntosPorTarea: number /* 0 = no disponible */;
    sincronizacion: boolean;
    estadisticasAvanzadas: boolean;
    temas: boolean;
    cifradoE2E: boolean;
}

/*
 * Información completa de suscripción
 */
export interface InfoSuscripcion {
    plan: PlanSuscripcion;
    estado: EstadoSuscripcion;
    esPremium: boolean;
    diasRestantes: number | null;
    trialDisponible: boolean;
    limites: LimitesPlan;
    fechaInicio: string;
    fechaExpiracion: string | null;
}

/*
 * Error de límite excedido
 */
export interface ErrorLimite {
    tipo: 'habitos' | 'tareas' | 'proyectos' | 'adjuntos';
    limite: number;
    actual: number;
    mensaje: string;
}

/*
 * Tipos para el Panel de Administración
 */

/*
 * Información de suscripción para administración
 */
export interface SuscripcionAdmin {
    plan: PlanSuscripcion;
    estado: EstadoSuscripcion;
    fechaInicio: string | null;
    fechaExpiracion: string | null;
    diasRestantes: number | null;
    stripeCustomerId: string | null;
    ultimoPago: string | null;
}

/*
 * Estadísticas de uso de un usuario
 */
export interface EstadisticasUsuario {
    habitos: number;
    tareas: number;
    proyectos: number;
    tareasCompletadas: number;
}

/*
 * Usuario con información de administración
 */
export interface UsuarioAdmin {
    id: string;
    nombre: string;
    email: string;
    avatar: string;
    fechaRegistro: string;
    suscripcion: SuscripcionAdmin;
    estadisticas?: EstadisticasUsuario;
    cifradoActivo: boolean;
}

/*
 * Filtros para listar usuarios
 */
export interface FiltrosAdmin {
    plan: 'todos' | 'premium' | 'free' | 'trial';
    busqueda: string;
    ordenarPor: 'nombre' | 'fechaRegistro' | 'ultimoPago' | 'estado';
    orden: 'asc' | 'desc';
    pagina: number;
    porPagina: number;
}

/*
 * Información de paginación
 */
export interface PaginacionAdmin {
    pagina: number;
    porPagina: number;
    totalPaginas: number;
}

/*
 * Respuesta de listado de usuarios
 */
export interface RespuestaListaUsuarios {
    usuarios: UsuarioAdmin[];
    total: number;
    paginacion: PaginacionAdmin;
}

/*
 * Resumen global de estadísticas
 */
export interface ResumenAdmin {
    totalUsuarios: number;
    premium: number;
    trial: number;
    free: number;
}

/*
 * Información de almacenamiento del usuario
 * Usado para mostrar uso de espacio y límites
 */
export interface InfoAlmacenamiento {
    usado: number;
    usadoFormateado: string;
    limite: number;
    limiteFormateado: string;
    disponible: number;
    disponibleFormateado: string;
    porcentaje: number;
    cercaDelLimite: boolean;
    limiteExcedido: boolean;
    esPremium: boolean;
}
