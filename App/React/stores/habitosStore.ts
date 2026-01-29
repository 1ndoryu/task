/**
 * Store de Habitos (Zustand)
 *
 * Fuente única de verdad para el estado de hábitos.
 * Centraliza la gestión de:
 * - Lista de hábitos con historial básico
 * - Historial detallado para modal/heatmap
 * - Acciones CRUD y toggle
 *
 * @package App/React/stores
 */

import {create} from 'zustand';
import {persist, devtools} from 'zustand/middleware';
import type {Habito, DatosNuevoHabito} from '../types/dashboard';
import type {HistorialHabito, EstadoHabito, DiaHistorial, EstadisticasHabito} from '../types/historialHabitos';
import {obtenerFechaHoy, fueCompletadoHoy} from '../utils/fecha';
import {registrarHabitoCumplido, registrarHabitoDesmarcado, registrarHabitoPospuesto} from '../services/actividadService';
import {invalidarCache} from '../services/actividadStore';
import {habitosService} from '../services/habitosService';
import {calcularToggleHabito, calcularPosponerHabito, calcularPausarHabito, generarResumen7Dias} from '../utils/habitosLogica';

/*
 * Tipos del Store
 */

interface HabitosState {
    /* Lista de hábitos con historial básico incluido */
    habitos: Habito[];

    /* Estado de operaciones asíncronas */
    estadoGuardado: 'idle' | 'guardando' | 'error';
    errorGuardado: string | null;

    /* Indica si los hábitos ya fueron inicializados */
    inicializado: boolean;
}

interface HabitosActions {
    /* Inicialización */
    setHabitos: (habitos: Habito[]) => void;
    marcarInicializado: () => void;

    /* CRUD básico */
    crearHabito: (datos: DatosNuevoHabito) => Habito;
    editarHabito: (id: number, datos: DatosNuevoHabito) => void;
    eliminarHabito: (id: number) => Habito | null;

    /* Toggle, posponer y pausar (día actual) */
    toggleHabito: (id: number) => {accion: 'completado' | 'desmarcado'; estadoAnterior: Habito} | null;
    posponerHabito: (id: number) => {accion: 'pospuesto' | 'despospuesto'; estadoAnterior: Habito} | null;
    pausarHabito: (id: number) => {accion: 'pausado' | 'reanudado'; estadoAnterior: Habito} | null;

    /* Historial retroactivo */
    marcarDia: (habitoId: number, fecha: string, estado: EstadoHabito) => Promise<boolean>;
    desmarcarDia: (habitoId: number, fecha: string) => Promise<boolean>;

    /* Actualización de historial (sincronización UI) */
    actualizarHistorialHabito: (id: number, fecha: string, estado: 'completado' | 'pospuesto' | null) => void;

    /* Restaurar estado (para deshacer) */
    restaurarHabito: (habito: Habito) => void;
    restaurarHabitos: (habitos: Habito[]) => void;

    /* Actualizar orden de tareas del hábito - Fase 14.8 */
    actualizarOrdenTareasHabito: (habitoId: number, tareasIds: number[]) => void;
}

export type HabitosStore = HabitosState & HabitosActions;

import {useHabitosHistorialStore} from './habitosHistorialStore';

/*
 * Store principal
 */
export const useHabitosStore = create<HabitosStore>()(
    devtools(
        persist(
            (set, get) => ({
                /* Estado inicial */
                habitos: [],
                estadoGuardado: 'idle',
                errorGuardado: null,
                inicializado: false,

                /* Inicialización */
                setHabitos: habitos => {
                    set({habitos, inicializado: true}, false, 'setHabitos');
                },

                marcarInicializado: () => {
                    set({inicializado: true}, false, 'marcarInicializado');
                },

                /* CRUD básico */
                crearHabito: datos => {
                    const hoy = obtenerFechaHoy();
                    const nuevoHabito: Habito = {
                        id: Date.now(),
                        nombre: datos.nombre,
                        importancia: datos.importancia,
                        tags: datos.tags,
                        frecuencia: datos.frecuencia,
                        diasInactividad: 0,
                        racha: 0,
                        historialCompletados: [],
                        ultimoCompletado: undefined,
                        fechaCreacion: hoy
                    };

                    set(
                        state => ({
                            habitos: [...state.habitos, nuevoHabito]
                        }),
                        false,
                        'crearHabito'
                    );

                    return nuevoHabito;
                },

                editarHabito: (id, datos) => {
                    set(
                        state => ({
                            habitos: state.habitos.map(h => {
                                if (h.id !== id) return h;
                                return {
                                    ...h,
                                    nombre: datos.nombre,
                                    importancia: datos.importancia,
                                    tags: datos.tags,
                                    frecuencia: datos.frecuencia
                                };
                            })
                        }),
                        false,
                        'editarHabito'
                    );
                },

                eliminarHabito: id => {
                    const habito = get().habitos.find(h => h.id === id);
                    if (!habito) return null;

                    set(
                        state => ({
                            habitos: state.habitos.filter(h => h.id !== id)
                        }),
                        false,
                        'eliminarHabito'
                    );

                    /* Limpiar cache de historial detallado */
                    useHabitosHistorialStore.getState().invalidarHistorialDetallado(id);

                    return habito;
                },

                /* Toggle (día actual) */
                toggleHabito: id => {
                    const hoy = obtenerFechaHoy();
                    const habito = get().habitos.find(h => h.id === id);

                    if (!habito) return null;

                    const estadoAnterior = {...habito, historialCompletados: [...(habito.historialCompletados || [])]};
                    const estabaCompletadoHoy = fueCompletadoHoy(habito.ultimoCompletado);

                    const {accion, nuevoHabito} = calcularToggleHabito(habito, hoy, estabaCompletadoHoy);

                    set(
                        state => ({
                            habitos: state.habitos.map(h => (h.id === id ? nuevoHabito : h))
                        }),
                        false,
                        `toggleHabito/${accion}`
                    );

                    /* Actualizar historial detallado si existe */
                    get().actualizarHistorialHabito(id, hoy, accion === 'completado' ? 'completado' : null);

                    /* Registrar actividad (invalida cache internamente al confirmar éxito) */
                    if (accion === 'completado') {
                        registrarHabitoCumplido(id, habito.nombre);
                    } else {
                        registrarHabitoDesmarcado(id, habito.nombre);
                    }

                    return {accion, estadoAnterior};
                },

                /* Posponer hábito */
                posponerHabito: id => {
                    const hoy = obtenerFechaHoy();
                    const habito = get().habitos.find(h => h.id === id);

                    if (!habito) return null;

                    const estadoAnterior = {
                        ...habito,
                        historialPospuestos: [...(habito.historialPospuestos || [])]
                    };
                    const estabaPospuestoHoy = habito.historialPospuestos?.includes(hoy) ?? false;

                    const {accion, nuevoHabito} = calcularPosponerHabito(habito, hoy, estabaPospuestoHoy);

                    set(
                        state => ({
                            habitos: state.habitos.map(h => (h.id === id ? nuevoHabito : h))
                        }),
                        false,
                        `posponerHabito/${accion === 'pospuesto' ? 'agregar' : 'quitar'}`
                    );

                    /* Actualizar historial detallado */
                    get().actualizarHistorialHabito(id, hoy, accion === 'pospuesto' ? 'pospuesto' : null);

                    /* Registrar actividad */
                    if (accion === 'pospuesto') {
                        registrarHabitoPospuesto(id, habito.nombre);
                    }

                    return {accion, estadoAnterior};
                },

                /* Pausar/Reanudar hábito */
                pausarHabito: id => {
                    const hoy = obtenerFechaHoy();
                    const habito = get().habitos.find(h => h.id === id);

                    if (!habito) return null;

                    const estadoAnterior = {
                        ...habito,
                        pausado: habito.pausado,
                        fechaPausa: habito.fechaPausa
                    };
                    const estaPausado = habito.pausado ?? false;

                    const {accion, nuevoHabito} = calcularPausarHabito(habito, hoy, estaPausado);

                    set(
                        state => ({
                            habitos: state.habitos.map(h => (h.id === id ? nuevoHabito : h))
                        }),
                        false,
                        `pausarHabito/${accion === 'pausado' ? 'pausar' : 'reanudar'}`
                    );

                    return {accion, estadoAnterior};
                },

                /* Historial retroactivo */
                marcarDia: async (habitoId, fecha, estado) => {
                    const habito = get().habitos.find(h => h.id === habitoId);
                    if (!habito) return false;

                    /* Capturar estado anterior para posible rollback */
                    const estadoAnteriorCompletados = [...(habito.historialCompletados || [])];
                    const estadoAnteriorPospuestos = [...(habito.historialPospuestos || [])];

                    /* Actualización optimista: actualizar UI inmediatamente */
                    const estadoNormalizado = estado === 'omitido' ? null : estado;
                    get().actualizarHistorialHabito(habitoId, fecha, estadoNormalizado);

                    /* Marcar como guardando */
                    set({estadoGuardado: 'guardando'}, false, 'marcarDia/guardando');

                    try {
                        /* Llamar al servicio */
                        await habitosService.marcarDia(habitoId, fecha, estado);

                        /* Confirmar guardado exitoso */
                        set({estadoGuardado: 'idle', errorGuardado: null}, false, 'marcarDia/exito');

                        /* Invalidar cache de actividad */
                        invalidarCache();

                        return true;
                    } catch (error) {
                        const mensaje = error instanceof Error ? error.message : 'Error desconocido';

                        /* Rollback: restaurar estado anterior */
                        set(
                            state => {
                                const habitosRestaurados = state.habitos.map(h => {
                                    if (h.id !== habitoId) return h;
                                    return {
                                        ...h,
                                        historialCompletados: estadoAnteriorCompletados,
                                        historialPospuestos: estadoAnteriorPospuestos
                                    };
                                });

                                return {
                                    habitos: habitosRestaurados,
                                    estadoGuardado: 'error',
                                    errorGuardado: mensaje
                                };
                            },
                            false,
                            'marcarDia/rollback'
                        );

                        return false;
                    }
                },

                desmarcarDia: async (habitoId, fecha) => {
                    const habito = get().habitos.find(h => h.id === habitoId);
                    if (!habito) return false;

                    /* Capturar estado anterior para posible rollback */
                    const estadoAnteriorCompletados = [...(habito.historialCompletados || [])];
                    const estadoAnteriorPospuestos = [...(habito.historialPospuestos || [])];

                    /* Actualización optimista: eliminar de UI inmediatamente */
                    get().actualizarHistorialHabito(habitoId, fecha, null);

                    /* Marcar como guardando */
                    set({estadoGuardado: 'guardando'}, false, 'desmarcarDia/guardando');

                    try {
                        /* Llamar al servicio */
                        await habitosService.desmarcarDia(habitoId, fecha);

                        /* Confirmar guardado exitoso */
                        set({estadoGuardado: 'idle', errorGuardado: null}, false, 'desmarcarDia/exito');

                        /* Invalidar cache de actividad */
                        invalidarCache();

                        return true;
                    } catch (error) {
                        const mensaje = error instanceof Error ? error.message : 'Error desconocido';

                        /* Rollback: restaurar estado anterior */
                        set(
                            state => {
                                const habitosRestaurados = state.habitos.map(h => {
                                    if (h.id !== habitoId) return h;
                                    return {
                                        ...h,
                                        historialCompletados: estadoAnteriorCompletados,
                                        historialPospuestos: estadoAnteriorPospuestos
                                    };
                                });

                                return {
                                    habitos: habitosRestaurados,
                                    estadoGuardado: 'error',
                                    errorGuardado: mensaje
                                };
                            },
                            false,
                            'desmarcarDia/rollback'
                        );

                        return false;
                    }
                },

                /* Actualización de historial (para sincronización UI) */
                actualizarHistorialHabito: (id, fecha, estado) => {
                    set(
                        state => {
                            /* Actualizar hábito */
                            const habitosActualizados = state.habitos.map(h => {
                                if (h.id !== id) return h;

                                let historialCompletados = [...(h.historialCompletados || [])];
                                let historialPospuestos = [...(h.historialPospuestos || [])];

                                if (estado === null) {
                                    historialCompletados = historialCompletados.filter(f => f !== fecha);
                                    historialPospuestos = historialPospuestos.filter(f => f !== fecha);
                                } else if (estado === 'completado') {
                                    if (!historialCompletados.includes(fecha)) {
                                        historialCompletados = [...historialCompletados, fecha].slice(-365);
                                    }
                                    historialPospuestos = historialPospuestos.filter(f => f !== fecha);
                                } else if (estado === 'pospuesto') {
                                    if (!historialPospuestos.includes(fecha)) {
                                        historialPospuestos = [...historialPospuestos, fecha].slice(-90);
                                    }
                                    historialCompletados = historialCompletados.filter(f => f !== fecha);
                                }

                                /* Recalcular ultimoCompletado basándose en el historial */
                                const fechasOrdenadas = [...historialCompletados].sort();
                                const ultimoCompletado = fechasOrdenadas.length > 0 ? fechasOrdenadas[fechasOrdenadas.length - 1] : undefined;

                                return {
                                    ...h,
                                    historialCompletados,
                                    historialPospuestos,
                                    ultimoCompletado
                                };
                            });

                            return {habitos: habitosActualizados};
                        },
                        false,
                        'actualizarHistorialHabito'
                    );

                    /* Actualizar en store de historial detallado */
                    useHabitosHistorialStore.getState().actualizarDiaHistorial(id, fecha, estado);
                },

                /* Restaurar estado (para deshacer) */
                restaurarHabito: habito => {
                    set(
                        state => {
                            const existe = state.habitos.some(h => h.id === habito.id);
                            if (existe) {
                                return {
                                    habitos: state.habitos.map(h => (h.id === habito.id ? habito : h))
                                };
                            } else {
                                return {
                                    habitos: [...state.habitos, habito]
                                };
                            }
                        },
                        false,
                        'restaurarHabito'
                    );
                },

                restaurarHabitos: habitos => {
                    set({habitos}, false, 'restaurarHabitos');
                },

                /* Actualizar orden de tareas del hábito - Fase 14.8 */
                actualizarOrdenTareasHabito: (habitoId, tareasIds) => {
                    set(
                        state => ({
                            habitos: state.habitos.map(h => {
                                if (h.id !== habitoId) return h;
                                return {
                                    ...h,
                                    tareasIds
                                };
                            })
                        }),
                        false,
                        'actualizarOrdenTareasHabito'
                    );
                }
            }),
            {
                name: 'glory-habitos-store',
                partialize: state => ({
                    /* Solo persistir hábitos, no historial detallado ni estado temporal */
                    habitos: state.habitos
                }),
                version: 1
            }
        ),
        {name: 'HabitosStore', enabled: typeof window !== 'undefined' && window.location.hostname === 'localhost'}
    )
);

/*
 * Selectores optimizados
 */

/* Obtener todos los hábitos */
export const useHabitos = () => useHabitosStore(state => state.habitos);

/* Obtener un hábito por ID */
export const useHabito = (id: number) => useHabitosStore(state => state.habitos.find(h => h.id === id));

/* Obtener estado de inicialización */
export const useHabitosInicializado = () => useHabitosStore(state => state.inicializado);

/* Obtener estado de un día específico para un hábito */
export const useEstadoDia = (habitoId: number, fecha: string): EstadoHabito | null => {
    return useHabitosStore(state => {
        const habito = state.habitos.find(h => h.id === habitoId);
        if (!habito) return null;

        if (habito.historialCompletados?.includes(fecha)) return 'completado';
        if (habito.historialPospuestos?.includes(fecha)) return 'pospuesto';

        return null;
    });
};

/* Obtener resumen de últimos 7 días para un hábito */
export const useResumen7Dias = (habitoId: number): DiaHistorial[] => {
    return useHabitosStore(state => {
        const habito = state.habitos.find(h => h.id === habitoId);
        if (!habito) return [];
        return generarResumen7Dias(habito);
    });
};

/* Obtener estado de guardado */
export const useEstadoGuardado = () => useHabitosStore(state => state.estadoGuardado);

/* Obtener error de guardado */
export const useErrorGuardado = () => useHabitosStore(state => state.errorGuardado);

/*
 * Acciones del store (para uso fuera de componentes React)
 */
export const habitosActions = {
    setHabitos: (habitos: Habito[]) => useHabitosStore.getState().setHabitos(habitos),
    crearHabito: (datos: DatosNuevoHabito) => useHabitosStore.getState().crearHabito(datos),
    editarHabito: (id: number, datos: DatosNuevoHabito) => useHabitosStore.getState().editarHabito(id, datos),
    eliminarHabito: (id: number) => useHabitosStore.getState().eliminarHabito(id),
    toggleHabito: (id: number) => useHabitosStore.getState().toggleHabito(id),
    posponerHabito: (id: number) => useHabitosStore.getState().posponerHabito(id),
    pausarHabito: (id: number) => useHabitosStore.getState().pausarHabito(id),
    marcarDia: (habitoId: number, fecha: string, estado: EstadoHabito) => useHabitosStore.getState().marcarDia(habitoId, fecha, estado),
    desmarcarDia: (habitoId: number, fecha: string) => useHabitosStore.getState().desmarcarDia(habitoId, fecha),
    actualizarHistorialHabito: (id: number, fecha: string, estado: 'completado' | 'pospuesto' | null) => useHabitosStore.getState().actualizarHistorialHabito(id, fecha, estado),

    restaurarHabito: (habito: Habito) => useHabitosStore.getState().restaurarHabito(habito),
    getHabitos: () => useHabitosStore.getState().habitos,
    getHabito: (id: number) => useHabitosStore.getState().habitos.find(h => h.id === id),
    actualizarOrdenTareasHabito: (habitoId: number, tareasIds: number[]) => useHabitosStore.getState().actualizarOrdenTareasHabito(habitoId, tareasIds)
};

/* Exponer store globalmente para debugging/migración */
if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).useHabitosStore = useHabitosStore;
}
