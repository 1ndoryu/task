/*
 * stores/habitos/sliceSubHabitos.ts
 * [H-F11-01] Slice de subhábitos: CRUD anidado, toggle del día, posponer por
 * tiempo e historial retroactivo (mapa de calor). Los subhábitos viven dentro
 * del array `subhabitos` de cada hábito padre.
 */

import type {SubHabito} from '../../types/dashboard';
import {obtenerFechaHoy} from '../../utils/fecha';
import {registrarTareaCompletada, registrarTareaDesmarcada} from '../../services/actividadService';
import {invalidarCache} from '../../services/actividadStore';
import type {HabitosSliceSubHabitos, CrearSliceHabitos} from './tipos';

export const crearSliceSubHabitos: CrearSliceHabitos<HabitosSliceSubHabitos> = (set, get) => ({
        /* Crear subhábito heredando propiedades del padre */
        crearSubHabito: (habitoId, datos) => {
            /* [253A-1] Validar nombre no vacío para evitar subhábitos fantasma */
            if (!datos.nombre || !datos.nombre.trim()) return null;
            const habito = get().habitos.find(h => h.id === habitoId);
            if (!habito) return null;

            /* [044A-22] Límite de subhábitos por hábito para prevenir crecimiento descontrolado */
            if ((habito.subhabitos || []).length >= 50) return null;

            /* [044A-25] No permitir dos subhábitos con el mismo nombre en el mismo hábito */
            const nombreNorm = datos.nombre.trim().toLowerCase();
            if ((habito.subhabitos || []).some(sh => sh.nombre.trim().toLowerCase() === nombreNorm)) return null;

            const hoy = obtenerFechaHoy();
            /* [044A-22] Sufijo aleatorio para evitar colisión de Date.now() en llamadas rápidas */
            const nuevoSubHabito: SubHabito = {
                id: Date.now() * 1000 + Math.floor(Math.random() * 1000),
                nombre: datos.nombre,
                importancia: datos.importancia,
                frecuencia: datos.frecuencia || habito.frecuencia,
                historialCompletados: [],
                historialPospuestos: [],
                ultimoCompletado: undefined,
                fechaCreacion: hoy,
                diasInactividad: 0,
                racha: 0,
                pausado: false
            };

            set(
                state => ({
                    habitos: state.habitos.map(h => {
                        if (h.id !== habitoId) return h;
                        return {
                            ...h,
                            subhabitos: [...(h.subhabitos || []), nuevoSubHabito]
                        };
                    })
                }),
                false,
                'crearSubHabito'
            );

            return nuevoSubHabito;
        },

        /* Editar subhábito. Los campos opcionales usan fallback al valor existente
         * para que llamadas parciales (ej: solo importancia) no borren nombre/frecuencia. */
        editarSubHabito: (habitoId, subHabitoId, datos) => {
            set(
                state => ({
                    habitos: state.habitos.map(h => {
                        if (h.id !== habitoId) return h;
                        return {
                            ...h,
                            subhabitos: (h.subhabitos || []).map(sh => {
                                if (sh.id !== subHabitoId) return sh;
                                return {
                                    ...sh,
                                    nombre: datos.nombre ?? sh.nombre,
                                    importancia: datos.importancia ?? sh.importancia,
                                    frecuencia: datos.frecuencia ?? sh.frecuencia,
                                    ventanaOportunidad: datos.ventanaOportunidad ?? sh.ventanaOportunidad,
                                    dependencias: datos.dependencias ?? sh.dependencias
                                };
                            })
                        };
                    })
                }),
                false,
                'editarSubHabito'
            );
        },

        eliminarSubHabito: (habitoId, subHabitoId) => {
            const habito = get().habitos.find(h => h.id === habitoId);
            if (!habito) return null;

            const subHabito = habito.subhabitos?.find(sh => sh.id === subHabitoId);
            if (!subHabito) return null;

            set(
                state => ({
                    habitos: state.habitos.map(h => {
                        if (h.id !== habitoId) return h;
                        return {
                            ...h,
                            subhabitos: (h.subhabitos || []).filter(sh => sh.id !== subHabitoId)
                        };
                    })
                }),
                false,
                'eliminarSubHabito'
            );

            return subHabito;
        },

        /* Toggle completado para hoy */
        toggleSubHabito: (habitoId, subHabitoId) => {
            const hoy = obtenerFechaHoy();
            const habito = get().habitos.find(h => h.id === habitoId);
            if (!habito) return null;

            const subHabito = habito.subhabitos?.find(sh => sh.id === subHabitoId);
            if (!subHabito) return null;

            const estabaCompletadoHoy = subHabito.ultimoCompletado === hoy;
            const accion = estabaCompletadoHoy ? 'desmarcado' : 'completado';

            set(
                state => ({
                    habitos: state.habitos.map(h => {
                        if (h.id !== habitoId) return h;
                        return {
                            ...h,
                            subhabitos: (h.subhabitos || []).map(sh => {
                                if (sh.id !== subHabitoId) return sh;

                                let nuevoHistorial = [...(sh.historialCompletados || [])];
                                let nuevoUltimoCompletado = sh.ultimoCompletado;
                                let nuevaRacha = sh.racha;
                                let nuevosDiasInactividad = sh.diasInactividad;

                                if (estabaCompletadoHoy) {
                                    /* Desmarcar: quitar hoy del historial */
                                    nuevoHistorial = nuevoHistorial.filter(f => f !== hoy);
                                    /* Recalcular ultimo completado */
                                    nuevoHistorial.sort();
                                    nuevoUltimoCompletado = nuevoHistorial.length > 0 ? nuevoHistorial[nuevoHistorial.length - 1] : undefined;
                                    nuevaRacha = Math.max(0, nuevaRacha - 1);
                                } else {
                                    /* Marcar completado hoy */
                                    if (!nuevoHistorial.includes(hoy)) {
                                        nuevoHistorial = [...nuevoHistorial, hoy].slice(-365);
                                    }
                                    nuevoUltimoCompletado = hoy;
                                    nuevaRacha = nuevaRacha + 1;
                                    nuevosDiasInactividad = 0;
                                }

                                return {
                                    ...sh,
                                    historialCompletados: nuevoHistorial,
                                    ultimoCompletado: nuevoUltimoCompletado,
                                    racha: nuevaRacha,
                                    diasInactividad: nuevosDiasInactividad
                                };
                            })
                        };
                    })
                }),
                false,
                `toggleSubHabito/${accion}`
            );

            /* [207A-3] Registrar actividad al completar/desmarcar subhábito.
             * Antes no se registraba, lo que causaba que el dashboard no contabilizara
             * subhábitos completados en las estadísticas de actividad. */
            const idVirtualSub = -(habitoId * 1000 + subHabitoId) - 100000;
            if (accion === 'completado') {
                registrarTareaCompletada(idVirtualSub, undefined, subHabito.nombre);
            } else {
                registrarTareaDesmarcada(idVirtualSub, undefined, subHabito.nombre);
            }

            return {accion};
        },

        /* [217A-2] Posponer subhábito por tiempo (independiente del padre).
         * Similar a posponerHabitoConTiempo pero para subhábitos individuales.
         * null = quitar posposición temporal. */
        posponerSubHabitoConTiempo: (habitoId, subHabitoId, hasta) => {
            const hoy = obtenerFechaHoy();
            set(
                state => ({
                    habitos: state.habitos.map(h => {
                        if (h.id !== habitoId) return h;
                        return {
                            ...h,
                            subhabitos: (h.subhabitos || []).map(sh => {
                                if (sh.id !== subHabitoId) return sh;
                                if (hasta === null) {
                                    /* Quitar posposición temporal y remover hoy de historialPospuestos */
                                    const {pospuestoHasta: _, ...sinPospuesto} = sh;
                                    return {
                                        ...sinPospuesto,
                                        historialPospuestos: (sh.historialPospuestos || []).filter(f => f !== hoy)
                                    } as SubHabito;
                                }
                                /* Establecer posposición temporal y marcar hoy en historialPospuestos */
                                const historialHoy = (sh.historialPospuestos || []).includes(hoy)
                                    ? sh.historialPospuestos
                                    : [...(sh.historialPospuestos || []), hoy];
                                return {...sh, pospuestoHasta: hasta, historialPospuestos: historialHoy};
                            })
                        };
                    })
                }),
                false,
                `posponerSubHabitoConTiempo/${hasta ? 'establecer' : 'quitar'}`
            );
        },

        /* [217A-3] Historial retroactivo de subhábitos (mapa de calor). Sincrónico:
         * el backend persiste vía la sincronización normal del store. */
        marcarDiaSubHabito: (habitoId, subHabitoId, fecha, estado) => {
            const habito = get().habitos.find(h => h.id === habitoId);
            if (!habito) return false;
            const subHabito = habito.subhabitos?.find(sh => sh.id === subHabitoId);
            if (!subHabito) return false;

            const estadoNormalizado = estado === 'omitido' ? null : estado;

            set(
                state => ({
                    habitos: state.habitos.map(h => {
                        if (h.id !== habitoId) return h;
                        return {
                            ...h,
                            subhabitos: (h.subhabitos || []).map(sh => {
                                if (sh.id !== subHabitoId) return sh;

                                let completados = [...(sh.historialCompletados || [])];
                                let pospuestos = [...(sh.historialPospuestos || [])];

                                if (estadoNormalizado === null) {
                                    completados = completados.filter(f => f !== fecha);
                                    pospuestos = pospuestos.filter(f => f !== fecha);
                                } else if (estadoNormalizado === 'completado') {
                                    if (!completados.includes(fecha)) {
                                        completados = [...completados, fecha].slice(-365);
                                    }
                                    pospuestos = pospuestos.filter(f => f !== fecha);
                                } else if (estadoNormalizado === 'pospuesto') {
                                    if (!pospuestos.includes(fecha)) {
                                        pospuestos = [...pospuestos, fecha].slice(-90);
                                    }
                                    completados = completados.filter(f => f !== fecha);
                                }

                                /* Recalcular ultimoCompletado */
                                const ordenados = [...completados].sort();
                                const hoyLocal = obtenerFechaHoy();
                                const ultimoCompletado = completados.includes(hoyLocal)
                                    ? hoyLocal
                                    : (ordenados.length > 0 ? ordenados[ordenados.length - 1] : undefined);

                                return {
                                    ...sh,
                                    historialCompletados: completados,
                                    historialPospuestos: pospuestos,
                                    ultimoCompletado
                                };
                            })
                        };
                    })
                }),
                false,
                'marcarDiaSubHabito'
            );

            /* Registrar actividad */
            const idVirtual = -(habitoId * 1000 + subHabitoId) - 100000;
            if (estadoNormalizado === 'completado') {
                registrarTareaCompletada(idVirtual, undefined, subHabito.nombre);
            } else if (estadoNormalizado === null || estadoNormalizado === 'pospuesto') {
                registrarTareaDesmarcada(idVirtual, undefined, subHabito.nombre);
            }

            invalidarCache();
            return true;
        },

        desmarcarDiaSubHabito: (habitoId, subHabitoId, fecha) => {
            const habito = get().habitos.find(h => h.id === habitoId);
            if (!habito) return false;
            const subHabito = habito.subhabitos?.find(sh => sh.id === subHabitoId);
            if (!subHabito) return false;

            set(
                state => ({
                    habitos: state.habitos.map(h => {
                        if (h.id !== habitoId) return h;
                        return {
                            ...h,
                            subhabitos: (h.subhabitos || []).map(sh => {
                                if (sh.id !== subHabitoId) return sh;
                                return {
                                    ...sh,
                                    historialCompletados: (sh.historialCompletados || []).filter(f => f !== fecha),
                                    historialPospuestos: (sh.historialPospuestos || []).filter(f => f !== fecha)
                                };
                            })
                        };
                    })
                }),
                false,
                'desmarcarDiaSubHabito'
            );

            invalidarCache();
            return true;
        }
    });
