/*
 * usePaginaMovil
 * Hook para gestionar la navegación por páginas en móvil
 * Fase 10.8.1: Sistema de navegación por páginas
 *
 * Cada panel principal es una página independiente en móvil:
 * - ejecucion: Panel de Tareas/Ejecución (por defecto)
 * - proyectos: Panel de Proyectos
 * - habitos: Panel de Hábitos (focoPrioritario)
 * - actividad: Panel de Actividad/Mapa de Calor
 */

import {useState, useEffect, useCallback} from 'react';

export type PaginaMovil = 'ejecucion' | 'proyectos' | 'habitos' | 'actividad';

interface UsePaginaMovilResult {
    paginaActiva: PaginaMovil;
    cambiarPagina: (pagina: PaginaMovil) => void;
    esPaginaActiva: (pagina: PaginaMovil) => boolean;
}

const STORAGE_KEY = 'gloryPaginaMovilActiva';
const PAGINA_DEFECTO: PaginaMovil = 'ejecucion';

/* Validar que el valor sea una PaginaMovil válida */
function esPaginaValida(valor: string | null): valor is PaginaMovil {
    return valor === 'ejecucion' || valor === 'proyectos' || valor === 'habitos' || valor === 'actividad';
}

/* Obtener la página guardada del localStorage */
function obtenerPaginaGuardada(): PaginaMovil {
    if (typeof window === 'undefined') return PAGINA_DEFECTO;

    try {
        const guardada = localStorage.getItem(STORAGE_KEY);
        return esPaginaValida(guardada) ? guardada : PAGINA_DEFECTO;
    } catch {
        return PAGINA_DEFECTO;
    }
}

/* Guardar la página activa en localStorage */
function guardarPagina(pagina: PaginaMovil): void {
    if (typeof window === 'undefined') return;

    try {
        localStorage.setItem(STORAGE_KEY, pagina);
    } catch {
        /* Ignorar errores de localStorage */
    }
}

export function usePaginaMovil(): UsePaginaMovilResult {
    const [paginaActiva, setPaginaActiva] = useState<PaginaMovil>(obtenerPaginaGuardada);

    /* Sincronizar con localStorage cuando cambia la página */
    useEffect(() => {
        guardarPagina(paginaActiva);
    }, [paginaActiva]);

    const cambiarPagina = useCallback((pagina: PaginaMovil) => {
        setPaginaActiva(pagina);
    }, []);

    const esPaginaActiva = useCallback(
        (pagina: PaginaMovil): boolean => {
            return paginaActiva === pagina;
        },
        [paginaActiva]
    );

    return {
        paginaActiva,
        cambiarPagina,
        esPaginaActiva
    };
}

/*
 * Mapeo de PaginaMovil a PanelId para renderizado selectivo
 * focoPrioritario se mapea desde 'habitos'
 */
export function paginaAPanelId(pagina: PaginaMovil): string {
    const mapeo: Record<PaginaMovil, string> = {
        ejecucion: 'ejecucion',
        proyectos: 'proyectos',
        habitos: 'focoPrioritario',
        actividad: 'actividad'
    };

    return mapeo[pagina];
}
