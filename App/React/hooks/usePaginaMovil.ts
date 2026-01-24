/*
 * usePaginaMovil
 * Hook para gestionar la navegación por páginas en móvil
 * Fase 10.8.1: Sistema de navegación por páginas
 *
 * Refactor OCP - Fase 4: Ahora deriva páginas válidas del registro de paneles
 * Ya no hay tipos hardcodeados de páginas
 */

import {useState, useEffect, useCallback} from 'react';
import {obtenerPaginasMovilValidas, paginaMovilAPanelId} from '../config/registroPaneles';

/*
 * PaginaMovil ahora es string dinámico
 * Las páginas válidas se derivan del registro de paneles
 */
export type PaginaMovil = string;

interface UsePaginaMovilResult {
    paginaActiva: PaginaMovil;
    cambiarPagina: (pagina: PaginaMovil) => void;
    esPaginaActiva: (pagina: PaginaMovil) => boolean;
}

const STORAGE_KEY = 'gloryPaginaMovilActiva';
const PAGINA_DEFECTO: PaginaMovil = 'ejecucion';

/* Validar que el valor sea una PaginaMovil válida usando el registro */
function esPaginaValida(valor: string | null): valor is PaginaMovil {
    if (!valor) return false;
    const paginasValidas = obtenerPaginasMovilValidas();
    return paginasValidas.includes(valor);
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
 * Ahora usa el registro de paneles
 */
export function paginaAPanelId(pagina: PaginaMovil): string {
    return paginaMovilAPanelId(pagina) || pagina;
}
