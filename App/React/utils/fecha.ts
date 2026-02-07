/*
 * Utilidades de Fecha
 * Funciones para manejar fechas sin dependencias externas
 * Responsabilidad unica: operaciones de fecha para el dashboard
 */

/* Configuracion global para el fin del dia (0-23) */
let CONFIG_HORA_FIN_DIA = 0;

export function configurarHoraFinDia(hora: number) {
    CONFIG_HORA_FIN_DIA = hora;
}

/*
 * Obtiene un objeto Date ajustado según la configuración de hora de fin del día.
 * Si la hora actual es menor que CONFIG_HORA_FIN_DIA, retorna la fecha del día anterior.
 * Esta es la función base que deben usar TODAS las demás funciones de fecha.
 */
export function obtenerFechaEfectiva(): Date {
    const ahora = new Date();
    if (ahora.getHours() < CONFIG_HORA_FIN_DIA) {
        ahora.setDate(ahora.getDate() - 1);
    }
    ahora.setHours(0, 0, 0, 0);
    return ahora;
}

/*
 * Convierte una fecha a formato ISO (YYYY-MM-DD) usando la zona horaria local
 * IMPORTANTE: Esta funcion NO usa toISOString() porque convierte a UTC,
 * lo cual causa errores cuando la hora local es diferente al dia UTC.
 * Ejemplo: 23:00 en UTC-4 seria el dia siguiente en UTC.
 */
export function obtenerFechaLocalISO(fecha: Date = new Date()): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
}

/*
 * Obtiene la fecha de hoy en formato ISO (YYYY-MM-DD)
 * Usado para comparaciones y registros de completados.
 * Respeta la configuración de hora de fin del día.
 * Si son las 2 AM y el fin del día es a las 4 AM, retorna la fecha de "ayer".
 */
export function obtenerFechaHoy(): string {
    return obtenerFechaLocalISO(obtenerFechaEfectiva());
}

/*
 * Calcula los dias transcurridos desde una fecha ISO
 * Retorna 999 si no hay fecha (para ordenamiento)
 * Respeta la configuración de hora de fin del día.
 */
export function calcularDiasDesde(fechaIso: string | undefined): number {
    if (!fechaIso) return 999;
    /* Parseo local para evitar desfase UTC en fechas de vencimiento */
    const fecha = new Date(fechaIso + 'T00:00:00');
    fecha.setHours(0, 0, 0, 0);
    const hoy = obtenerFechaEfectiva();
    const diferencia = hoy.getTime() - fecha.getTime();
    return Math.floor(diferencia / (1000 * 60 * 60 * 24));
}

/*
 * Verifica si una fecha corresponde al dia de hoy
 * Usado para determinar si un habito fue completado hoy
 */
export function fueCompletadoHoy(ultimoCompletado: string | undefined): boolean {
    if (!ultimoCompletado) return false;
    return ultimoCompletado === obtenerFechaHoy();
}

/*
 * Calcular fecha real desde opción rápida de fecha
 * Usado en BottomSheets para conversión de shortcuts a fechas ISO
 * Opciones: 'hoy', 'manana', 'semana', 'mes', 'trimestre', 'ano'
 */
export function calcularFechaDesdeOpcion(opcion: string): string {
    const hoy = new Date();
    switch (opcion) {
        case 'hoy':
            return obtenerFechaLocalISO(hoy);
        case 'manana': {
            const manana = new Date(hoy);
            manana.setDate(manana.getDate() + 1);
            return obtenerFechaLocalISO(manana);
        }
        case 'semana': {
            const finSemana = new Date(hoy);
            finSemana.setDate(finSemana.getDate() + (7 - finSemana.getDay()));
            return obtenerFechaLocalISO(finSemana);
        }
        case 'mes': {
            const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
            return obtenerFechaLocalISO(finMes);
        }
        case 'trimestre': {
            const mesActual = hoy.getMonth();
            const finTrimestre = new Date(hoy.getFullYear(), Math.floor(mesActual / 3 + 1) * 3, 0);
            return obtenerFechaLocalISO(finTrimestre);
        }
        case 'ano': {
            const finAno = new Date(hoy.getFullYear(), 11, 31);
            return obtenerFechaLocalISO(finAno);
        }
        default:
            return opcion;
    }
}

/*
 * Crea una fecha ISO de hace N dias
 * Util para datos de demostracion y pruebas
 */
export function crearFechaHaceNDias(dias: number): string {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - dias);
    return obtenerFechaLocalISO(fecha);
}

/*
 * Crea una fecha ISO de dentro de N dias
 * Util para fechas limite futuras
 */
export function crearFechaEnNDias(dias: number): string {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + dias);
    return obtenerFechaLocalISO(fecha);
}

/*
 * Calcula si la racha debe resetearse
 * Retorna true si los dias de inactividad superan el umbral
 */
export function debeResetearRacha(diasInactividad: number, umbral: number): boolean {
    return diasInactividad > umbral;
}

/*
 * Calcula los dias restantes antes de perder la racha
 * Retorna un numero negativo si ya se perdio
 */
export function calcularDiasAntesDePerderRacha(diasInactividad: number, umbral: number): number {
    return umbral - diasInactividad;
}

/*
 * Suma dias a una fecha ISO
 * Retorna la nueva fecha en formato ISO (YYYY-MM-DD)
 */
export function sumarDias(fechaIso: string, dias: number): string {
    /* Parsear fecha agregando hora al mediodia para evitar problemas de zona horaria */
    const fecha = new Date(fechaIso + 'T12:00:00');
    fecha.setDate(fecha.getDate() + dias);
    return obtenerFechaLocalISO(fecha);
}

/*
 * Informacion de urgencia para fechas limite
 */
export interface InfoUrgenciaFecha {
    diasRestantes: number;
    esUrgente: boolean;
    vencida: boolean;
    esHoy: boolean;
    esMañana: boolean;
}

/*
 * Calcula la urgencia de una fecha limite
 * Retorna null si no hay fecha
 * Respeta la configuración de hora de fin del día.
 */
export function calcularUrgenciaFechaLimite(fechaLimite: string | undefined): InfoUrgenciaFecha | null {
    if (!fechaLimite) return null;

    const hoy = obtenerFechaEfectiva();
    const fecha = new Date(fechaLimite + 'T00:00:00');
    fecha.setHours(0, 0, 0, 0);

    const diferencia = fecha.getTime() - hoy.getTime();
    const diasRestantes = Math.ceil(diferencia / (1000 * 60 * 60 * 24));

    return {
        diasRestantes,
        esUrgente: diasRestantes <= 3 && diasRestantes >= 0,
        vencida: diasRestantes < 0,
        esHoy: diasRestantes === 0,
        esMañana: diasRestantes === 1
    };
}

/*
 * Formatea una fecha en formato corto (ej: "20 dic")
 */
export function formatearFechaCorta(fechaIso: string): string {
    const fecha = new Date(fechaIso + 'T12:00:00');
    const dia = fecha.getDate();
    const mes = fecha.toLocaleDateString('es-ES', {month: 'short'});
    return `${dia} ${mes}`;
}

/*
 * Obtiene el texto descriptivo para una fecha limite
 * Incluye indicadores como "Hoy", "Mañana", "Vencida"
 */
export function obtenerTextoFechaLimite(fechaIso: string | undefined): string {
    const info = calcularUrgenciaFechaLimite(fechaIso);
    if (!info || !fechaIso) return '';

    if (info.vencida) {
        const diasVencida = Math.abs(info.diasRestantes);
        return `Vencida (${diasVencida}d)`;
    }
    if (info.esHoy) return 'Hoy';
    if (info.esMañana) return 'Mañana';

    return formatearFechaCorta(fechaIso);
}

/*
 * Determina la variante visual para un badge de fecha
 * Retorna: 'urgente' si vencida, 'advertencia' si es hoy o urgente, 'normal' en otro caso
 */
export type VarianteFechaLimite = 'urgente' | 'advertencia' | 'exito' | 'normal';

export function obtenerVarianteFechaLimite(fechaIso: string | undefined): VarianteFechaLimite {
    const info = calcularUrgenciaFechaLimite(fechaIso);
    if (!info) return 'normal';

    if (info.vencida) return 'urgente';
    if (info.esHoy) return 'advertencia';
    if (info.esUrgente) return 'advertencia';

    return 'normal';
}

/*
 * Formatea una fecha en formato relativo (ej: "hace 2 días", "hace 1 semana")
 * Útil para mostrar cuándo ocurrió algo
 */
export function formatearFechaRelativa(fechaIso: string | null | undefined): string {
    if (!fechaIso) return '';

    const fecha = new Date(fechaIso);
    const ahora = new Date();
    const diferenciaSeg = Math.floor((ahora.getTime() - fecha.getTime()) / 1000);

    if (diferenciaSeg < 60) return 'hace un momento';
    if (diferenciaSeg < 3600) {
        const minutos = Math.floor(diferenciaSeg / 60);
        return `hace ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`;
    }
    if (diferenciaSeg < 86400) {
        const horas = Math.floor(diferenciaSeg / 3600);
        return `hace ${horas} ${horas === 1 ? 'hora' : 'horas'}`;
    }
    if (diferenciaSeg < 604800) {
        const dias = Math.floor(diferenciaSeg / 86400);
        return `hace ${dias} ${dias === 1 ? 'día' : 'días'}`;
    }
    if (diferenciaSeg < 2592000) {
        const semanas = Math.floor(diferenciaSeg / 604800);
        return `hace ${semanas} ${semanas === 1 ? 'semana' : 'semanas'}`;
    }

    const meses = Math.floor(diferenciaSeg / 2592000);
    return `hace ${meses} ${meses === 1 ? 'mes' : 'meses'}`;
}

/*
 * Claves de fecha rápida usadas en modales de creación
 * 'hoy' | 'manana' | 'semana'
 */
export type ClaveFechaRapida = 'hoy' | 'manana' | 'semana';

/*
 * Convierte una clave de fecha rápida a fecha ISO (YYYY-MM-DD)
 * Usado por modales de creación rápida para calcular fechas desde opciones predefinidas
 *
 * @param clave - La clave de fecha rápida ('hoy', 'manana', 'semana')
 * @returns Fecha en formato ISO o undefined si la clave no es válida
 */
export function calcularFechaDesdeKey(clave: string | undefined): string | undefined {
    if (!clave) return undefined;

    const hoy = new Date();

    switch (clave) {
        case 'hoy':
            return obtenerFechaLocalISO(hoy);
        case 'manana': {
            const manana = new Date(hoy);
            manana.setDate(manana.getDate() + 1);
            return obtenerFechaLocalISO(manana);
        }
        case 'semana': {
            const semana = new Date(hoy);
            semana.setDate(semana.getDate() + 7);
            return obtenerFechaLocalISO(semana);
        }
        default:
            return undefined;
    }
}
