/*
 * Indice de Utilidades
 * Exportaciones centralizadas del modulo utils
 */

export {obtenerFechaHoy, calcularDiasDesde, fueCompletadoHoy, crearFechaHaceNDias, debeResetearRacha, calcularDiasAntesDePerderRacha} from './fecha';

export {calcularUrgenciaFechaLimite, formatearFechaCorta, obtenerTextoFechaLimite, obtenerVarianteFechaLimite, formatearFechaRelativa, calcularFechaDesdeKey, calcularFechaDesdeOpcion} from './fechaUI';
export type {InfoUrgenciaFecha, VarianteFechaLimite, ClaveFechaRapida} from './fechaUI';

export {registrarEventoSistema, obtenerTipoVisual, obtenerIconoAccion} from './mensajes';
export type {MensajeTimeline, TipoMensaje, AccionSistema} from './mensajes';

export {validarHabitos, validarTareas, validarNotas} from './validadores';

export {migrarYActualizarHabitos} from './migracionHabitos';

export {tocaHoy, diasHastaProximaRepeticion, calcularUmbralInactividad, describirFrecuencia, obtenerIntervaloFrecuencia} from './frecuenciaHabitos';
export {esFechaRelevante, generarFechasRelevantes} from './frecuenciaRelevancia';

export {obtenerSubtareas, obtenerPadre, tieneSubtareas, contarSubtareas, esDescendiente, esTareaPadre, esSubtarea, obtenerTareasPrincipales, obtenerIndiceTarea, obtenerTareaAnterior, puedeSerSubtareaDe, moverConHijos, calcularNuevoParent, ordenarConJerarquia, asignarOrden, detectarContextoDrop} from './jerarquiaTareas';
export type {CalculoParentResult, ContextoDropResult} from './jerarquiaTareas';

export {obtenerOpcionesMenuUsuario, obtenerOpcionCerrarSesion, obtenerOpcionesSecundariasMenúMovil} from './opcionesMenuUsuario';
export type {OpcionMenuUsuario} from './opcionesMenuUsuario';
