/*
 * useOrdenarHabitos
 * Hook para ordenar habitos segun diferentes criterios
 * Responsabilidad unica: proveer logica de ordenamiento para habitos
 */

import {useMemo, useCallback} from 'react';
import type {Habito} from '../types/dashboard';
import {FRECUENCIA_POR_DEFECTO} from '../types/dashboard';
import {useLocalStorage} from './useLocalStorage';
import {estaEnVentanaOportunidad} from '../utils/frecuenciaHabitos';

/* Clave para persistencia en localStorage */
const KEY_ORDEN_HABITOS = 'glory_orden_habitos';

export type ModoOrdenHabitos = 'importancia' | 'inactividad' | 'racha' | 'nombre' | 'urgenciaPonderada';

interface ModoOrdenInfo {
    id: ModoOrdenHabitos;
    etiqueta: string;
    descripcion: string;
}

export const MODOS_ORDEN: ModoOrdenInfo[] = [
    {id: 'importancia', etiqueta: 'Importancia', descripcion: 'Importancia'},
    {id: 'inactividad', etiqueta: 'Urgentes', descripcion: 'Urgencia'},
    {id: 'racha', etiqueta: 'Racha', descripcion: 'Racha'},
    {id: 'nombre', etiqueta: 'Nombre', descripcion: 'A-Z'},
    {id: 'urgenciaPonderada', etiqueta: 'Inteligente', descripcion: 'Inteligente'}
];

const PESO_IMPORTANCIA: Record<Habito['importancia'], number> = {
    'Muy Alta': 4,
    Alta: 3,
    Media: 2,
    Baja: 1
};

/*
 * Calcula los ciclos de inactividad efectivos de un hábito.
 * Para hábitos no diarios, los días intermedios (libres) no cuentan como incumplidos.
 * Ejemplo: frecuencia "cada 7 días" y 7 días de inactividad = 1 ciclo incumplido.
 * Esto evita que hábitos semanales se inflen artificialmente en urgencia.
 */
function calcularInactividadEfectiva(habito: Habito): number {
    const frecuencia = habito.frecuencia || FRECUENCIA_POR_DEFECTO;
    const diasBrutos = habito.diasInactividad;

    switch (frecuencia.tipo) {
        case 'diario':
            return diasBrutos;
        case 'cadaXDias': {
            const intervalo = frecuencia.cadaDias || 2;
            return Math.floor(diasBrutos / intervalo);
        }
        case 'semanal':
            return Math.floor(diasBrutos / 7);
        case 'diasEspecificos': {
            /* Contar solo los días de la semana configurados dentro del rango de inactividad */
            const diasSemana = frecuencia.diasSemana || [];
            if (diasSemana.length === 0 || diasSemana.length === 7) return diasBrutos;
            /* Aproximar: proporción de días configurados por semana */
            return Math.floor(diasBrutos * (diasSemana.length / 7));
        }
        case 'mensual': {
            const vecesAlMes = frecuencia.vecesAlMes || 4;
            const intervaloIdeal = Math.floor(30 / vecesAlMes);
            return Math.floor(diasBrutos / intervaloIdeal);
        }
        default:
            return diasBrutos;
    }
}

/*
 * Funciones de ordenamiento por modo
 */
function ordenarPorImportancia(a: Habito, b: Habito): number {
    const pesoA = PESO_IMPORTANCIA[a.importancia];
    const pesoB = PESO_IMPORTANCIA[b.importancia];

    if (pesoA !== pesoB) return pesoB - pesoA;

    /* Si misma importancia, ordenar por inactividad efectiva (más ciclos primero) */
    return calcularInactividadEfectiva(b) - calcularInactividadEfectiva(a);
}

function ordenarPorInactividad(a: Habito, b: Habito): number {
    return calcularInactividadEfectiva(b) - calcularInactividadEfectiva(a);
}

function ordenarPorRacha(a: Habito, b: Habito): number {
    return b.racha - a.racha;
}

function ordenarPorNombre(a: Habito, b: Habito): number {
    return a.nombre.localeCompare(b.nombre, 'es', {sensitivity: 'base'});
}

function ordenarPorUrgenciaPonderada(a: Habito, b: Habito): number {
    /*
     * Formula: (importancia * 2) + (inactividadEfectiva * 1.5) - (racha > 0 ? 1 : 0)
     * Usar inactividad efectiva para que días libres no inflen la urgencia.
     */
    const inactividadA = calcularInactividadEfectiva(a);
    const inactividadB = calcularInactividadEfectiva(b);
    let scoreA = PESO_IMPORTANCIA[a.importancia] * 2 + inactividadA * 1.5 - (a.racha > 0 ? 1 : 0);
    let scoreB = PESO_IMPORTANCIA[b.importancia] * 2 + inactividadB * 1.5 - (b.racha > 0 ? 1 : 0);

    /* Multiplicador por ventana de oportunidad (x3) */
    if (estaEnVentanaOportunidad(a)) scoreA *= 3;
    if (estaEnVentanaOportunidad(b)) scoreB *= 3;

    return scoreB - scoreA;
}

interface UseOrdenarHabitosReturn {
    habitosOrdenados: Habito[];
    modoActual: ModoOrdenHabitos;
    cambiarModo: (modo: ModoOrdenHabitos) => void;
    modosDisponibles: ModoOrdenInfo[];
}

export function useOrdenarHabitos(habitos: Habito[], _modoInicial: ModoOrdenHabitos = 'importancia'): UseOrdenarHabitosReturn {
    /* Persistencia del modo con localStorage */
    const {valor: modoActual, setValor: setModoActual} = useLocalStorage<ModoOrdenHabitos>(KEY_ORDEN_HABITOS, {
        valorPorDefecto: 'importancia'
    });

    const habitosOrdenados = useMemo(() => {
        const copia = [...habitos];

        switch (modoActual) {
            case 'importancia':
                return copia.sort(ordenarPorImportancia);
            case 'inactividad':
                return copia.sort(ordenarPorInactividad);
            case 'racha':
                return copia.sort(ordenarPorRacha);
            case 'nombre':
                return copia.sort(ordenarPorNombre);
            case 'urgenciaPonderada':
                return copia.sort(ordenarPorUrgenciaPonderada);
            default:
                return copia;
        }
    }, [habitos, modoActual]);

    const cambiarModo = useCallback(
        (modo: ModoOrdenHabitos) => {
            setModoActual(modo);
        },
        [setModoActual]
    );

    return {
        habitosOrdenados,
        modoActual,
        cambiarModo,
        modosDisponibles: MODOS_ORDEN
    };
}
