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
 * Verifica si un hábito fue completado hoy.
 * [024A-35] Revisa tanto ultimoCompletado como historialCompletados.
 * ultimoCompletado puede apuntar a una fecha futura (por cambio de horaFinDia)
 * y actualizarHistorialHabito lo sobreescribe con la última fecha ordenada.
 * Revisar el historial es la red de seguridad para estos casos.
 */
export function fueCompletadoHoy(ultimoCompletado: string | undefined, historialCompletados?: string[]): boolean {
    const hoy = obtenerFechaHoy();
    if (ultimoCompletado === hoy) return true;
    if (historialCompletados && historialCompletados.includes(hoy)) return true;
    return false;
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

/* Re-exportar funciones UI para compatibilidad retroactiva */
export {calcularUrgenciaFechaLimite, formatearFechaCorta, obtenerTextoFechaLimite, obtenerVarianteFechaLimite, formatearFechaRelativa, calcularFechaDesdeKey, calcularFechaDesdeOpcion} from './fechaUI';
export type {InfoUrgenciaFecha, VarianteFechaLimite, ClaveFechaRapida} from './fechaUI';
