/*
 * Hook useNotificadorCambiosWebSocket
 *
 * Detecta cambios en entidades (tareas, hábitos, proyectos, notas) y 
 * notifica automáticamente al servidor WebSocket para sincronización
 * en tiempo real entre dispositivos.
 *
 * TAREA 9: Sincronización en tiempo real entre dispositivos
 *
 * Características:
 * - Detecta cambios comparando estado anterior vs actual
 * - Infiere automáticamente el tipo de acción (crear/editar/eliminar)
 * - Debounce para evitar notificaciones excesivas
 * - No notifica durante la carga inicial
 */

import {useRef, useEffect, useCallback} from 'react';
import type {Tarea, Habito, Proyecto} from '../types/dashboard';
import type {CambioLocal, AccionSincronizacion, EntidadSincronizable} from './useSincronizacionTiempoReal';

interface UseNotificadorCambiosProps {
    tareas: Tarea[];
    habitos: Habito[];
    proyectos: Proyecto[];
    notas: string;
    notificarCambio: (cambio: Omit<CambioLocal, 'timestamp'>) => void;
    habilitado: boolean;
    cargando: boolean;
}

interface EstadoAnterior {
    tareas: Map<number, Tarea>;
    habitos: Map<number, Habito>;
    proyectos: Map<number, Proyecto>;
    notas: string;
    inicializado: boolean;
}

/*
 * Compara dos objetos de forma superficial para detectar cambios relevantes
 * Ignora campos que no son relevantes para sincronización
 */
function hayCambiosRelevantes<T extends object>(anterior: T | undefined, actual: T, camposIgnorar: (keyof T)[] = []): boolean {
    if (!anterior) return true;

    const claves = Object.keys(actual) as (keyof T)[];
    const clavesRelevantes = claves.filter(k => !camposIgnorar.includes(k));

    return clavesRelevantes.some(clave => {
        const valorAnterior = anterior[clave];
        const valorActual = actual[clave];

        /* Comparación profunda para objetos/arrays */
        if (typeof valorActual === 'object' && valorActual !== null) {
            return JSON.stringify(valorAnterior) !== JSON.stringify(valorActual);
        }

        return valorAnterior !== valorActual;
    });
}

/*
 * Convierte array a Map para búsqueda O(1)
 */
function arrayAMapa<T extends {id: number}>(items: T[]): Map<number, T> {
    return new Map(items.map(item => [item.id, item]));
}

export function useNotificadorCambiosWebSocket({
    tareas,
    habitos,
    proyectos,
    notas,
    notificarCambio,
    habilitado,
    cargando
}: UseNotificadorCambiosProps): void {
    /* Estado anterior para comparación */
    const estadoAnteriorRef = useRef<EstadoAnterior>({
        tareas: new Map(),
        habitos: new Map(),
        proyectos: new Map(),
        notas: '',
        inicializado: false
    });

    /* Debounce para notas (cambian muy frecuentemente al escribir) */
    const debounceNotasRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    /*
     * Notificar cambio genérico
     */
    const notificar = useCallback(
        (entidad: EntidadSincronizable, accion: AccionSincronizacion, id?: number, datos?: unknown) => {
            if (!habilitado) return;

            notificarCambio({
                entidad,
                accion,
                id,
                datos
            });
        },
        [habilitado, notificarCambio]
    );

    /*
     * Detectar cambios en tareas
     */
    useEffect(() => {
        if (!habilitado || cargando) return;

        const anterior = estadoAnteriorRef.current.tareas;
        const actual = arrayAMapa(tareas);

        /* Solo procesar si ya tenemos estado anterior */
        if (estadoAnteriorRef.current.inicializado) {
            /* Detectar tareas nuevas */
            actual.forEach((tarea, id) => {
                if (!anterior.has(id)) {
                    console.log('[NotificadorWS] Tarea creada:', id);
                    notificar('tarea', 'crear', id, tarea);
                }
            });

            /* Detectar tareas eliminadas */
            anterior.forEach((tarea, id) => {
                if (!actual.has(id)) {
                    console.log('[NotificadorWS] Tarea eliminada:', id);
                    notificar('tarea', 'eliminar', id, {id});
                }
            });

            /* Detectar tareas modificadas */
            actual.forEach((tareaActual, id) => {
                const tareaAnterior = anterior.get(id);
                if (tareaAnterior && hayCambiosRelevantes(tareaAnterior, tareaActual, ['orden'])) {
                    console.log('[NotificadorWS] Tarea editada:', id);
                    notificar('tarea', 'editar', id, tareaActual);
                }
            });
        }

        /* Actualizar estado anterior */
        estadoAnteriorRef.current.tareas = actual;
    }, [tareas, habilitado, cargando, notificar]);

    /*
     * Detectar cambios en hábitos
     */
    useEffect(() => {
        if (!habilitado || cargando) return;

        const anterior = estadoAnteriorRef.current.habitos;
        const actual = arrayAMapa(habitos);

        if (estadoAnteriorRef.current.inicializado) {
            /* Detectar hábitos nuevos */
            actual.forEach((habito, id) => {
                if (!anterior.has(id)) {
                    console.log('[NotificadorWS] Hábito creado:', id);
                    notificar('habito', 'crear', id, habito);
                }
            });

            /* Detectar hábitos eliminados */
            anterior.forEach((habito, id) => {
                if (!actual.has(id)) {
                    console.log('[NotificadorWS] Hábito eliminado:', id);
                    notificar('habito', 'eliminar', id, {id});
                }
            });

            /* Detectar hábitos modificados (incluyendo toggle) */
            actual.forEach((habitoActual, id) => {
                const habitoAnterior = anterior.get(id);
                if (habitoAnterior) {
                    /* Detectar toggle específico (cambio en historialCompletados) */
                    const cambioHistorial =
                        JSON.stringify(habitoAnterior.historialCompletados) !== JSON.stringify(habitoActual.historialCompletados) ||
                        JSON.stringify(habitoAnterior.historialPospuestos) !== JSON.stringify(habitoActual.historialPospuestos);

                    if (cambioHistorial) {
                        console.log('[NotificadorWS] Hábito toggle/pospuesto:', id);
                        notificar('habito', 'toggle', id, habitoActual);
                    } else if (hayCambiosRelevantes(habitoAnterior, habitoActual, ['historialCompletados', 'historialPospuestos', 'diasInactividad', 'racha'])) {
                        console.log('[NotificadorWS] Hábito editado:', id);
                        notificar('habito', 'editar', id, habitoActual);
                    }
                }
            });
        }

        estadoAnteriorRef.current.habitos = actual;
    }, [habitos, habilitado, cargando, notificar]);

    /*
     * Detectar cambios en proyectos
     */
    useEffect(() => {
        if (!habilitado || cargando) return;

        const anterior = estadoAnteriorRef.current.proyectos;
        const actual = arrayAMapa(proyectos);

        if (estadoAnteriorRef.current.inicializado) {
            /* Detectar proyectos nuevos */
            actual.forEach((proyecto, id) => {
                if (!anterior.has(id)) {
                    console.log('[NotificadorWS] Proyecto creado:', id);
                    notificar('proyecto', 'crear', id, proyecto);
                }
            });

            /* Detectar proyectos eliminados */
            anterior.forEach((proyecto, id) => {
                if (!actual.has(id)) {
                    console.log('[NotificadorWS] Proyecto eliminado:', id);
                    notificar('proyecto', 'eliminar', id, {id});
                }
            });

            /* Detectar proyectos modificados */
            actual.forEach((proyectoActual, id) => {
                const proyectoAnterior = anterior.get(id);
                if (proyectoAnterior && hayCambiosRelevantes(proyectoAnterior, proyectoActual, ['progreso'])) {
                    console.log('[NotificadorWS] Proyecto editado:', id);
                    notificar('proyecto', 'editar', id, proyectoActual);
                }
            });
        }

        estadoAnteriorRef.current.proyectos = actual;
    }, [proyectos, habilitado, cargando, notificar]);

    /*
     * Detectar cambios en notas (con debounce)
     */
    useEffect(() => {
        if (!habilitado || cargando) return;

        if (estadoAnteriorRef.current.inicializado && estadoAnteriorRef.current.notas !== notas) {
            /* Cancelar debounce anterior */
            if (debounceNotasRef.current) {
                clearTimeout(debounceNotasRef.current);
            }

            /* Debounce de 1s para notas */
            debounceNotasRef.current = setTimeout(() => {
                console.log('[NotificadorWS] Notas editadas');
                notificar('nota', 'editar', undefined, {contenido: notas});
            }, 1000);
        }

        estadoAnteriorRef.current.notas = notas;

        return () => {
            if (debounceNotasRef.current) {
                clearTimeout(debounceNotasRef.current);
            }
        };
    }, [notas, habilitado, cargando, notificar]);

    /*
     * Marcar como inicializado después del primer render con datos
     * Esto evita notificar todos los datos como "nuevos" en la carga inicial
     */
    useEffect(() => {
        if (!cargando && !estadoAnteriorRef.current.inicializado) {
            /* Pequeño delay para asegurar que el estado se ha estabilizado */
            const timer = setTimeout(() => {
                estadoAnteriorRef.current.inicializado = true;
                console.log('[NotificadorWS] Sistema inicializado, comenzando detección de cambios');
            }, 500);

            return () => clearTimeout(timer);
        }
    }, [cargando]);
}
