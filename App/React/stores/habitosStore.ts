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
import {obtenerFechaHoy, calcularDiasDesde, fueCompletadoHoy, obtenerFechaLocalISO, obtenerFechaEfectiva} from '../utils/fecha';
import {registrarHabitoCumplido, registrarHabitoDesmarcado, registrarHabitoPospuesto} from '../services/actividadService';
import {invalidarCache} from '../services/actividadStore';

/*
 * Obtiene el nonce de WordPress para autenticación
 */
function obtenerNonce(): string {
    const wpData = (window as unknown as {gloryDashboard?: {nonce?: string}}).gloryDashboard;
    return wpData?.nonce || '';
}

/*
 * Tipos del Store
 */

interface HistorialDetalladoEntry {
    historial: HistorialHabito;
    resumen7Dias: DiaHistorial[];
    estadisticas: EstadisticasHabito | null;
    timestamp: number;
    dias: number;
}

interface HabitosState {
    /* Lista de hábitos con historial básico incluido */
    habitos: Habito[];

    /* Historial detallado por hábito (para modal heatmap) */
    historialDetallado: Record<number, HistorialDetalladoEntry>;

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

    /* Carga de historial detallado (para modal) */
    cargarHistorialDetallado: (habitoId: number, dias?: number) => Promise<void>;
    guardarHistorialDetallado: (habitoId: number, historial: HistorialHabito, resumen7Dias: DiaHistorial[], estadisticas: EstadisticasHabito | null, dias: number) => void;
    invalidarHistorialDetallado: (habitoId: number) => void;
    limpiarTodoHistorialDetallado: () => void;
    obtenerHistorialDetallado: (habitoId: number, diasRequeridos?: number) => HistorialDetalladoEntry | null;

    /* Restaurar estado (para deshacer) */
    restaurarHabito: (habito: Habito) => void;
    restaurarHabitos: (habitos: Habito[]) => void;
}

export type HabitosStore = HabitosState & HabitosActions;

/*
 * Configuración del cache de historial detallado
 */
const CACHE_TTL_MS = 10 * 60 * 1000; /* 10 minutos */

/*
 * Store principal
 */
export const useHabitosStore = create<HabitosStore>()(
    devtools(
        persist(
            (set, get) => ({
                /* Estado inicial */
                habitos: [],
                historialDetallado: {},
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
                            habitos: state.habitos.filter(h => h.id !== id),
                            historialDetallado: (() => {
                                const nuevo = {...state.historialDetallado};
                                delete nuevo[id];
                                return nuevo;
                            })()
                        }),
                        false,
                        'eliminarHabito'
                    );

                    return habito;
                },

                /* Toggle (día actual) */
                toggleHabito: id => {
                    const hoy = obtenerFechaHoy();
                    const habito = get().habitos.find(h => h.id === id);

                    if (!habito) return null;

                    const estadoAnterior = {...habito, historialCompletados: [...(habito.historialCompletados || [])]};
                    const estabaCompletadoHoy = fueCompletadoHoy(habito.ultimoCompletado);

                    if (estabaCompletadoHoy) {
                        /* Desmarcar */
                        set(
                            state => ({
                                habitos: state.habitos.map(h => {
                                    if (h.id !== id) return h;

                                    const historialSinHoy = (h.historialCompletados || []).filter(f => f !== hoy);
                                    const ultimoAnterior = historialSinHoy.length > 0 ? historialSinHoy[historialSinHoy.length - 1] : undefined;
                                    const diasInactividadCalculado = ultimoAnterior ? calcularDiasDesde(ultimoAnterior) : calcularDiasDesde(h.fechaCreacion);

                                    return {
                                        ...h,
                                        diasInactividad: diasInactividadCalculado,
                                        racha: Math.max(0, h.racha - 1),
                                        ultimoCompletado: ultimoAnterior,
                                        historialCompletados: historialSinHoy
                                    };
                                })
                            }),
                            false,
                            'toggleHabito/desmarcar'
                        );

                        /* Actualizar historial detallado si existe */
                        get().actualizarHistorialHabito(id, hoy, null);

                        /* Registrar actividad (invalida cache internamente al confirmar éxito) */
                        registrarHabitoDesmarcado(id, habito.nombre);

                        return {accion: 'desmarcado', estadoAnterior};
                    } else {
                        /* Completar */
                        const diasDesdeUltimo = calcularDiasDesde(habito.ultimoCompletado);
                        const nuevaRacha = diasDesdeUltimo <= 1 ? habito.racha + 1 : 1;
                        const nuevoHistorial = [...(habito.historialCompletados || []), hoy].slice(-365);

                        set(
                            state => ({
                                habitos: state.habitos.map(h => {
                                    if (h.id !== id) return h;
                                    return {
                                        ...h,
                                        diasInactividad: 0,
                                        racha: nuevaRacha,
                                        ultimoCompletado: hoy,
                                        historialCompletados: nuevoHistorial
                                    };
                                })
                            }),
                            false,
                            'toggleHabito/completar'
                        );

                        /* Actualizar historial detallado si existe */
                        get().actualizarHistorialHabito(id, hoy, 'completado');

                        /* Registrar actividad (invalida cache internamente al confirmar éxito) */
                        registrarHabitoCumplido(id, habito.nombre);

                        return {accion: 'completado', estadoAnterior};
                    }
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

                    if (estabaPospuestoHoy) {
                        /* Quitar pospuesto */
                        set(
                            state => ({
                                habitos: state.habitos.map(h => {
                                    if (h.id !== id) return h;
                                    return {
                                        ...h,
                                        historialPospuestos: (h.historialPospuestos || []).filter(f => f !== hoy)
                                    };
                                })
                            }),
                            false,
                            'posponerHabito/quitar'
                        );

                        /* Actualizar historial detallado */
                        get().actualizarHistorialHabito(id, hoy, null);

                        return {accion: 'despospuesto', estadoAnterior};
                    } else {
                        /* Posponer */
                        const nuevoHistorialPospuestos = [...(habito.historialPospuestos || []), hoy].slice(-90);

                        set(
                            state => ({
                                habitos: state.habitos.map(h => {
                                    if (h.id !== id) return h;
                                    return {
                                        ...h,
                                        historialPospuestos: nuevoHistorialPospuestos
                                    };
                                })
                            }),
                            false,
                            'posponerHabito/agregar'
                        );

                        /* Actualizar historial detallado */
                        get().actualizarHistorialHabito(id, hoy, 'pospuesto');

                        /* Registrar actividad (invalida cache internamente al confirmar éxito) */
                        registrarHabitoPospuesto(id, habito.nombre);

                        return {accion: 'pospuesto', estadoAnterior};
                    }
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

                    if (estaPausado) {
                        /* Reanudar habito */
                        set(
                            state => ({
                                habitos: state.habitos.map(h => {
                                    if (h.id !== id) return h;
                                    return {
                                        ...h,
                                        pausado: false,
                                        fechaPausa: undefined
                                    };
                                })
                            }),
                            false,
                            'pausarHabito/reanudar'
                        );

                        return {accion: 'reanudado', estadoAnterior};
                    } else {
                        /* Pausar habito */
                        set(
                            state => ({
                                habitos: state.habitos.map(h => {
                                    if (h.id !== id) return h;
                                    return {
                                        ...h,
                                        pausado: true,
                                        fechaPausa: hoy
                                    };
                                })
                            }),
                            false,
                            'pausarHabito/pausar'
                        );

                        return {accion: 'pausado', estadoAnterior};
                    }
                },

                /* Historial retroactivo */
                marcarDia: async (habitoId, fecha, estado) => {
                    const habito = get().habitos.find(h => h.id === habitoId);
                    if (!habito) return false;

                    /* Capturar estado anterior para posible rollback */
                    const estadoAnteriorCompletados = [...(habito.historialCompletados || [])];
                    const estadoAnteriorPospuestos = [...(habito.historialPospuestos || [])];
                    const historialDetalladoAnterior = get().historialDetallado[habitoId] ? {...get().historialDetallado[habitoId]} : null;

                    /* Actualización optimista: actualizar UI inmediatamente */
                    const estadoNormalizado = estado === 'omitido' ? null : estado;
                    get().actualizarHistorialHabito(habitoId, fecha, estadoNormalizado);

                    /* Marcar como guardando */
                    set({estadoGuardado: 'guardando'}, false, 'marcarDia/guardando');

                    try {
                        /* Llamar a la API */
                        const response = await fetch(`/wp-json/glory/v1/habitos/${habitoId}/historial`, {
                            method: 'POST',
                            credentials: 'include',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-WP-Nonce': obtenerNonce()
                            },
                            body: JSON.stringify({fecha, estado})
                        });

                        if (!response.ok) {
                            throw new Error(`Error del servidor: ${response.status}`);
                        }

                        const data = await response.json();
                        if (!data.success) {
                            throw new Error('Error al marcar día');
                        }

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

                                const historialRestaurado = historialDetalladoAnterior ? {...state.historialDetallado, [habitoId]: historialDetalladoAnterior} : state.historialDetallado;

                                return {
                                    habitos: habitosRestaurados,
                                    historialDetallado: historialRestaurado,
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
                    const historialDetalladoAnterior = get().historialDetallado[habitoId] ? {...get().historialDetallado[habitoId]} : null;

                    /* Actualización optimista: eliminar de UI inmediatamente */
                    get().actualizarHistorialHabito(habitoId, fecha, null);

                    /* Marcar como guardando */
                    set({estadoGuardado: 'guardando'}, false, 'desmarcarDia/guardando');

                    try {
                        /* Llamar a la API */
                        const response = await fetch(`/wp-json/glory/v1/habitos/${habitoId}/historial/${fecha}`, {
                            method: 'DELETE',
                            credentials: 'include',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-WP-Nonce': obtenerNonce()
                            }
                        });

                        if (!response.ok) {
                            throw new Error(`Error del servidor: ${response.status}`);
                        }

                        const data = await response.json();
                        if (!data.success) {
                            throw new Error('Error al desmarcar día');
                        }

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

                                const historialRestaurado = historialDetalladoAnterior ? {...state.historialDetallado, [habitoId]: historialDetalladoAnterior} : state.historialDetallado;

                                return {
                                    habitos: habitosRestaurados,
                                    historialDetallado: historialRestaurado,
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

                            /* Actualizar historial detallado si existe */
                            const historialDetallado = {...state.historialDetallado};
                            const entry = historialDetallado[id];
                            if (entry) {
                                const nuevoHistorial = {...entry.historial};
                                if (estado === null) {
                                    delete nuevoHistorial[fecha];
                                } else {
                                    nuevoHistorial[fecha] = {
                                        estado,
                                        notas: null,
                                        fechaRegistro: new Date().toISOString()
                                    };
                                }
                                historialDetallado[id] = {
                                    ...entry,
                                    historial: nuevoHistorial,
                                    timestamp: Date.now()
                                };
                            }

                            return {habitos: habitosActualizados, historialDetallado};
                        },
                        false,
                        'actualizarHistorialHabito'
                    );
                },

                /* Historial detallado (para modal) */
                cargarHistorialDetallado: async (habitoId, dias = 30) => {
                    /* Verificar cache primero */
                    const cacheEntry = get().obtenerHistorialDetallado(habitoId, dias);
                    if (cacheEntry) {
                        return; /* Ya está en cache y es válido */
                    }

                    try {
                        const response = await fetch(`/wp-json/glory/v1/habitos/${habitoId}/historial?dias=${dias}`, {
                            method: 'GET',
                            credentials: 'include',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-WP-Nonce': obtenerNonce()
                            }
                        });

                        if (!response.ok) {
                            throw new Error(`Error del servidor: ${response.status}`);
                        }

                        const data = await response.json();
                        if (!data.success) {
                            throw new Error('Error al cargar historial');
                        }

                        /* Guardar en el store */
                        get().guardarHistorialDetallado(habitoId, data.historial, data.resumen7Dias, data.estadisticas, dias);
                    } catch (error) {
                        console.error('[HabitosStore] Error cargando historial:', error);
                    }
                },

                guardarHistorialDetallado: (habitoId, historial, resumen7Dias, estadisticas, dias) => {
                    set(
                        state => ({
                            historialDetallado: {
                                ...state.historialDetallado,
                                [habitoId]: {
                                    historial,
                                    resumen7Dias,
                                    estadisticas,
                                    timestamp: Date.now(),
                                    dias
                                }
                            }
                        }),
                        false,
                        'guardarHistorialDetallado'
                    );
                },

                invalidarHistorialDetallado: habitoId => {
                    set(
                        state => {
                            const nuevo = {...state.historialDetallado};
                            delete nuevo[habitoId];
                            return {historialDetallado: nuevo};
                        },
                        false,
                        'invalidarHistorialDetallado'
                    );
                },

                limpiarTodoHistorialDetallado: () => {
                    set({historialDetallado: {}}, false, 'limpiarTodoHistorialDetallado');
                },

                obtenerHistorialDetallado: (habitoId, diasRequeridos = 30) => {
                    const entry = get().historialDetallado[habitoId];
                    if (!entry) return null;

                    /* Verificar TTL y días requeridos */
                    const esValido = Date.now() - entry.timestamp < CACHE_TTL_MS && entry.dias >= diasRequeridos;
                    if (!esValido) {
                        get().invalidarHistorialDetallado(habitoId);
                        return null;
                    }

                    return entry;
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

/* Obtener historial detallado de un hábito */
export const useHistorialDetallado = (id: number) => useHabitosStore(state => state.historialDetallado[id]);

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

        const dias: DiaHistorial[] = [];
        /* Usamos obtenerFechaEfectiva para respetar la hora de fin del día */
        const hoy = obtenerFechaEfectiva();
        const diasSemana = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

        for (let i = 6; i >= 0; i--) {
            const fecha = new Date(hoy);
            fecha.setDate(fecha.getDate() - i);
            const fechaStr = obtenerFechaLocalISO(fecha);

            let estado: EstadoHabito | null = null;
            if (habito.historialCompletados?.includes(fechaStr)) {
                estado = 'completado';
            } else if (habito.historialPospuestos?.includes(fechaStr)) {
                estado = 'pospuesto';
            }

            dias.push({
                fecha: fechaStr,
                diaSemana: diasSemana[fecha.getDay()],
                estado,
                esHoy: i === 0
            });
        }

        return dias;
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
    cargarHistorialDetallado: (habitoId: number, dias?: number) => useHabitosStore.getState().cargarHistorialDetallado(habitoId, dias),
    guardarHistorialDetallado: (habitoId: number, historial: HistorialHabito, resumen7Dias: DiaHistorial[], estadisticas: EstadisticasHabito | null, dias: number) => useHabitosStore.getState().guardarHistorialDetallado(habitoId, historial, resumen7Dias, estadisticas, dias),
    limpiarTodoHistorialDetallado: () => useHabitosStore.getState().limpiarTodoHistorialDetallado(),
    restaurarHabito: (habito: Habito) => useHabitosStore.getState().restaurarHabito(habito),
    getHabitos: () => useHabitosStore.getState().habitos,
    getHabito: (id: number) => useHabitosStore.getState().habitos.find(h => h.id === id),
    obtenerHistorialDetallado: (habitoId: number, diasRequeridos?: number) => useHabitosStore.getState().obtenerHistorialDetallado(habitoId, diasRequeridos)
};
