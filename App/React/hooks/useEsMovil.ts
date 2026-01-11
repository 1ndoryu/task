/*
 * useEsMovil
 * Hook para detectar si estamos en viewport móvil
 * Fase 10: Versión Móvil (PWA)
 *
 * Breakpoints:
 * - Móvil: <= 480px
 * - Tablet: <= 768px
 * - Desktop: > 768px
 */

import {useState, useEffect} from 'react';

interface UseEsMovilResult {
    esMovil: boolean /* <= 480px */;
    esTablet: boolean /* <= 768px */;
    esEscritorio: boolean /* > 768px */;
}

const BREAKPOINT_MOVIL = 480;
const BREAKPOINT_TABLET = 768;

export function useEsMovil(): UseEsMovilResult {
    const [dimensiones, setDimensiones] = useState(() => ({
        esMovil: typeof window !== 'undefined' ? window.innerWidth <= BREAKPOINT_MOVIL : false,
        esTablet: typeof window !== 'undefined' ? window.innerWidth <= BREAKPOINT_TABLET : false,
        esEscritorio: typeof window !== 'undefined' ? window.innerWidth > BREAKPOINT_TABLET : true
    }));

    useEffect(() => {
        const manejarResize = () => {
            const ancho = window.innerWidth;
            setDimensiones({
                esMovil: ancho <= BREAKPOINT_MOVIL,
                esTablet: ancho <= BREAKPOINT_TABLET,
                esEscritorio: ancho > BREAKPOINT_TABLET
            });
        };

        /* Actualizar al montar por si el estado inicial es incorrecto */
        manejarResize();

        window.addEventListener('resize', manejarResize);
        return () => window.removeEventListener('resize', manejarResize);
    }, []);

    return dimensiones;
}

/* Versión simplificada que solo retorna booleano */
export function useEsDispositivoMovil(): boolean {
    const {esTablet} = useEsMovil();
    return esTablet;
}
