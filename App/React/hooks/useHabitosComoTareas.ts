/*
 * useHabitosComoTareas
 * Hook que convierte hábitos que "tocan hoy" en tareas virtuales para Ejecución
 * La urgencia se calcula automáticamente basada en días de inactividad
 *
 * Fase 14.8: Ahora también incluye las tareas asociadas al hábito como subtareas
 * SubHabitos: También incluye subhábitos como subtareas virtuales
 * Las tareas heredan prioridad del hábito y mantienen su orden definido en tareasIds
 */

import {useMemo} from 'react';
import type {Habito, Tarea, TareaHabito, SubHabito, NivelUrgencia, NivelPrioridad} from '../types/dashboard';
import {tocaHoy} from '../utils/frecuenciaHabitos';
import {FRECUENCIA_POR_DEFECTO} from '../types/dashboard';
import {obtenerFechaHoy} from '../utils/fecha';
import type {UmbralesUrgencia} from './useConfiguracionHabitos';

/*
 * Umbrales por defecto (moderado)
 */
const UMBRALES_DEFECTO: UmbralesUrgencia = {normal: 1, urgente: 3, bloqueante: 5};

/*
 * Mapea importancia de hábito a prioridad de tarea
 */
const mapearImportanciaAPrioridad = (importancia: Habito['importancia']): NivelPrioridad => {
    const mapa: Record<Habito['importancia'], NivelPrioridad> = {
        'Muy Alta': 'muy_alta',
        Alta: 'alta',
        Media: 'media',
        Baja: 'baja'
    };
    return mapa[importancia];
};

/*
 * Calcula urgencia automática basada en días de inactividad y umbrales configurables
 * Mayor inactividad = mayor urgencia
 */
const calcularUrgenciaAutomatica = (diasInactividad: number, racha: number, umbrales: UmbralesUrgencia = UMBRALES_DEFECTO): NivelUrgencia => {
    /* Si tiene racha y está dentro del umbral normal, es chill */
    if (racha > 0 && diasInactividad < umbrales.normal) {
        return 'chill';
    }

    /* Si supera el umbral bloqueante */
    if (diasInactividad >= umbrales.bloqueante) {
        return 'bloqueante';
    }
    /* Si supera el umbral urgente */
    if (diasInactividad >= umbrales.urgente) {
        return 'urgente';
    }
    /* Si supera el umbral normal */
    if (diasInactividad >= umbrales.normal) {
        return 'normal';
    }

    return 'chill';
};

/*
 * Genera un ID único negativo para tareas-hábito
 * Los IDs negativos evitan colisión con tareas reales
 */
const generarIdTareaHabito = (habitoId: number): number => {
    return -habitoId - 10000;
};

/*
 * Genera un ID único negativo para subhábitos como tareas virtuales
 * Usa un rango diferente para evitar colisión con tareas-hábito
 */
const generarIdSubHabitoTarea = (habitoId: number, subhabitoId: number): number => {
    return -(habitoId * 1000 + subhabitoId) - 100000;
};

/*
 * Verifica si un subhábito "toca hoy"
 */
const subhabitoTocaHoy = (subhabito: SubHabito, frecuenciaPadre: Habito['frecuencia']): boolean => {
    const frecuencia = subhabito.frecuencia || frecuenciaPadre || FRECUENCIA_POR_DEFECTO;
    const hoy = obtenerFechaHoy();
    const completadoHoy = subhabito.ultimoCompletado === hoy;
    const pospuestoHoy = subhabito.historialPospuestos?.includes(hoy) ?? false;
    return tocaHoy(frecuencia, subhabito.ultimoCompletado) && !completadoHoy && !pospuestoHoy;
};

/*
 * Verifica si un hábito fue pospuesto hoy
 */
const fuePospuestoHoy = (habito: Habito, fechaHoy: string): boolean => {
    return habito.historialPospuestos?.includes(fechaHoy) ?? false;
};

interface UseHabitosComoTareasParams {
    habitos: Habito[];
    tareas: Tarea[];
    mostrarHabitos: boolean;
    onToggleHabito: (habitoId: number) => void;
    onToggleSubHabito?: (habitoId: number, subHabitoId: number) => void;
    umbralesUrgencia?: UmbralesUrgencia;
}

interface UseHabitosComoTareasReturn {
    tareasHabito: TareaHabito[];
    /* Incluye tanto tareas virtuales de hábito como las subtareas reales del hábito */
    tareasConSubtareas: Tarea[];
    manejarToggleTareaHabito: (tareaId: number) => boolean;
}

export function useHabitosComoTareas({habitos, tareas, mostrarHabitos, onToggleHabito, onToggleSubHabito, umbralesUrgencia}: UseHabitosComoTareasParams): UseHabitosComoTareasReturn {
    const umbrales = umbralesUrgencia || UMBRALES_DEFECTO;

    /*
     * Tareas virtuales de hábitos que tocan hoy
     */
    const tareasHabito = useMemo<TareaHabito[]>(() => {
        if (!mostrarHabitos) return [];

        const hoy = obtenerFechaHoy();

        return habitos
            .filter(habito => {
                /* Los hábitos pausados nunca aparecen en el panel de ejecución */
                if (habito.pausado) return false;

                const frecuencia = habito.frecuencia || FRECUENCIA_POR_DEFECTO;
                /* Solo incluir hábitos que tocan hoy y no están completados hoy ni pospuestos */
                const tocaHoyResult = tocaHoy(frecuencia, habito.ultimoCompletado);
                const completadoHoy = habito.ultimoCompletado === hoy;
                const pospuestoHoy = fuePospuestoHoy(habito, hoy);
                return tocaHoyResult && !completadoHoy && !pospuestoHoy;
            })
            .map(habito => {
                const urgenciaAutomatica = calcularUrgenciaAutomatica(habito.diasInactividad, habito.racha, umbrales);

                const tareaHabito: TareaHabito = {
                    id: generarIdTareaHabito(habito.id),
                    texto: habito.nombre,
                    completado: false,
                    fechaCreacion: habito.fechaCreacion,
                    prioridad: mapearImportanciaAPrioridad(habito.importancia),
                    urgencia: urgenciaAutomatica,
                    /* Campos específicos de TareaHabito */
                    esHabito: true,
                    habitoId: habito.id,
                    habitoNombre: habito.nombre,
                    habitoRacha: habito.racha,
                    habitoImportancia: habito.importancia
                };

                return tareaHabito;
            });
    }, [habitos, mostrarHabitos, umbrales]);

    /*
     * Tareas virtuales + subtareas reales del hábito + subhábitos como tareas virtuales
     * Fase 14.8: Las subtareas heredan prioridad del hábito y no tienen urgencia propia
     * SubHabitos: Los subhábitos que "tocan hoy" también aparecen como subtareas virtuales
     * Mantienen el orden definido en tareasIds del hábito
     */
    const tareasConSubtareas = useMemo<Tarea[]>(() => {
        if (!mostrarHabitos) return [];

        const resultado: Tarea[] = [];

        for (const tareaHabito of tareasHabito) {
            /* Agregar la tarea virtual del hábito */
            resultado.push(tareaHabito);

            /* Buscar hábito original para obtener tareasIds (orden) y subhábitos */
            const habito = habitos.find(h => h.id === tareaHabito.habitoId);
            if (!habito) continue;

            /* Agregar subhábitos que "tocan hoy" como tareas virtuales */
            if (habito.subhabitos && habito.subhabitos.length > 0) {
                for (const subhabito of habito.subhabitos) {
                    /* Solo incluir si no está pausado y "toca hoy" */
                    if (subhabito.pausado) continue;
                    if (!subhabitoTocaHoy(subhabito, habito.frecuencia)) continue;

                    /* Crear tarea virtual para el subhábito */
                    const tareaSubhabito: Tarea = {
                        id: generarIdSubHabitoTarea(habito.id, subhabito.id),
                        texto: subhabito.nombre,
                        completado: false,
                        fechaCreacion: subhabito.fechaCreacion,
                        prioridad: mapearImportanciaAPrioridad(subhabito.importancia),
                        parentId: tareaHabito.id,
                        /* Sin urgencia propia (heredada del hábito visual) */
                        urgencia: undefined
                    };

                    resultado.push(tareaSubhabito);
                }
            }

            /* Filtrar tareas que pertenecen a este hábito */
            const tareasDelHabito = tareas.filter(t => t.habitoId === habito.id && !t.completado);

            /* Ordenar según tareasIds si existe */
            let tareasOrdenadas: Tarea[];
            if (habito.tareasIds && habito.tareasIds.length > 0) {
                const ordenMap = new Map(habito.tareasIds.map((id, index) => [id, index]));
                tareasOrdenadas = [...tareasDelHabito].sort((a, b) => {
                    const ordenA = ordenMap.get(a.id) ?? 999;
                    const ordenB = ordenMap.get(b.id) ?? 999;
                    return ordenA - ordenB;
                });
            } else {
                tareasOrdenadas = tareasDelHabito;
            }

            /* Agregar las subtareas con parentId apuntando al ID virtual del hábito */
            for (const tarea of tareasOrdenadas) {
                resultado.push({
                    ...tarea,
                    parentId: tareaHabito.id,
                    /* Heredar prioridad del hábito */
                    prioridad: tareaHabito.prioridad,
                    /* Sin urgencia propia (heredada del hábito visual) */
                    urgencia: undefined
                });
            }
        }

        return resultado;
    }, [tareasHabito, tareas, habitos, mostrarHabitos]);

    /*
     * Maneja el toggle de una tarea-hábito o subhábito
     * Retorna true si fue manejado (era una tarea-hábito o subhábito), false si no
     */
    const manejarToggleTareaHabito = (tareaId: number): boolean => {
        /* Las tareas-hábito tienen IDs negativos */
        if (tareaId >= 0) return false;

        /* Encontrar el hábito correspondiente (tarea principal de hábito) */
        const tareaHabito = tareasHabito.find(t => t.id === tareaId);
        if (tareaHabito) {
            /* Llamar al toggle del hábito original */
            onToggleHabito(tareaHabito.habitoId);
            return true;
        }

        /* Verificar si es un subhábito (IDs más negativos: -(habitoId * 1000 + subhabitoId) - 100000) */
        /* Buscar en todos los hábitos si algún subhábito tiene este ID */
        for (const habito of habitos) {
            if (!habito.subhabitos) continue;
            for (const subhabito of habito.subhabitos) {
                const idSubhabito = generarIdSubHabitoTarea(habito.id, subhabito.id);
                if (idSubhabito === tareaId) {
                    /* Llamar al toggle del subhábito si está disponible */
                    if (onToggleSubHabito) {
                        onToggleSubHabito(habito.id, subhabito.id);
                    }
                    return true;
                }
            }
        }

        return false;
    };

    return {
        tareasHabito,
        tareasConSubtareas,
        manejarToggleTareaHabito
    };
}
