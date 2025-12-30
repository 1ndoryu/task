/*
 * useAutoguardado
 * Hook para manejar la detección de cambios y auto-guardado al cerrar modales
 *
 * Responsabilidad única: Comparar estado inicial vs actual y ejecutar guardado
 * si hay cambios al cerrar.
 *
 * Uso:
 * const {hayCambios, guardarEstadoInicial, manejarCerrar} = useAutoguardado({
 *     camposActuales: {nombre, descripcion, ...},
 *     onGuardar: () => {...},
 *     onCerrar: () => {...},
 *     validar: () => nombre.length >= 3
 * });
 */

import {useRef, useCallback} from 'react';

interface UseAutoguardadoParams<T extends Record<string, unknown>> {
    /* Objeto con los valores actuales de los campos */
    camposActuales: T;
    /* Callback para guardar */
    onGuardar: () => void;
    /* Callback para cerrar (sin guardar) */
    onCerrar: () => void;
    /* Función de validación opcional (debe retornar true para permitir guardado) */
    validar?: () => boolean;
    /* Función para determinar si hay cambios válidos en modo creación */
    hayCambiosCreacion?: () => boolean;
}

interface UseAutoguardadoReturn {
    /* Indica si hay cambios respecto al estado inicial */
    hayCambios: () => boolean;
    /* Guarda el estado actual como estado inicial (llamar al montar/cambiar entidad) */
    guardarEstadoInicial: (campos?: Record<string, unknown>) => void;
    /* Limpia el estado inicial (para modo creación) */
    limpiarEstadoInicial: () => void;
    /* Cierra con auto-guardado si hay cambios y pasa validación */
    manejarCerrarConGuardado: () => void;
    /* Cierra sin guardar (cancelar) */
    manejarCancelar: () => void;
    /* Indica si estamos en modo creación (sin estado inicial) */
    esModoCreacion: boolean;
}

/*
 * Compara dos valores de forma profunda
 * Soporta primitivos, arrays y objetos
 */
function sonIguales(a: unknown, b: unknown): boolean {
    /* Primitivos */
    if (a === b) return true;

    /* Null/undefined */
    if (a === null || b === null) return a === b;
    if (a === undefined || b === undefined) return a === b;

    /* Diferentes tipos */
    if (typeof a !== typeof b) return false;

    /* Arrays */
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        /* Comparar arrays ordenados (para tags, adjuntos, etc.) */
        const sortedA = [...a].sort((x, y) => JSON.stringify(x).localeCompare(JSON.stringify(y)));
        const sortedB = [...b].sort((x, y) => JSON.stringify(x).localeCompare(JSON.stringify(y)));
        return JSON.stringify(sortedA) === JSON.stringify(sortedB);
    }

    /* Objetos */
    if (typeof a === 'object' && typeof b === 'object') {
        return JSON.stringify(a) === JSON.stringify(b);
    }

    /* Strings: comparar trimmed */
    if (typeof a === 'string' && typeof b === 'string') {
        return a.trim() === b.trim();
    }

    return false;
}

export function useAutoguardado<T extends Record<string, unknown>>({camposActuales, onGuardar, onCerrar, validar, hayCambiosCreacion}: UseAutoguardadoParams<T>): UseAutoguardadoReturn {
    /* Estado inicial guardado como ref para no causar re-renders */
    const estadoInicialRef = useRef<Record<string, unknown> | null>(null);

    /* Guarda el estado actual como estado inicial */
    const guardarEstadoInicial = useCallback(
        (campos?: Record<string, unknown>) => {
            /* Clonar profundamente para evitar mutaciones */
            estadoInicialRef.current = JSON.parse(JSON.stringify(campos || camposActuales));
        },
        [camposActuales]
    );

    /* Limpia el estado inicial (para modo creación) */
    const limpiarEstadoInicial = useCallback(() => {
        estadoInicialRef.current = null;
    }, []);

    /* Verifica si estamos en modo creación */
    const esModoCreacion = estadoInicialRef.current === null;

    /* Detecta si hay cambios respecto al estado inicial */
    const hayCambios = useCallback((): boolean => {
        const inicial = estadoInicialRef.current;

        /* Modo creación: usar función personalizada o verificar si hay contenido */
        if (!inicial) {
            if (hayCambiosCreacion) {
                return hayCambiosCreacion();
            }
            /* Default: verificar si algún campo tiene contenido */
            return Object.values(camposActuales).some(valor => {
                if (typeof valor === 'string') return valor.trim().length > 0;
                if (Array.isArray(valor)) return valor.length > 0;
                return valor !== null && valor !== undefined;
            });
        }

        /* Modo edición: comparar campo por campo */
        for (const key of Object.keys(camposActuales)) {
            if (!sonIguales(camposActuales[key], inicial[key])) {
                return true;
            }
        }

        return false;
    }, [camposActuales, hayCambiosCreacion]);

    /* Cierra con auto-guardado si hay cambios */
    const manejarCerrarConGuardado = useCallback(() => {
        /* Verificar validación si existe */
        const esValido = validar ? validar() : true;

        if (hayCambios() && esValido) {
            onGuardar();
        } else {
            onCerrar();
        }
    }, [hayCambios, validar, onGuardar, onCerrar]);

    /* Cierra sin guardar (cancelar cambios) */
    const manejarCancelar = useCallback(() => {
        onCerrar();
    }, [onCerrar]);

    return {
        hayCambios,
        guardarEstadoInicial,
        limpiarEstadoInicial,
        manejarCerrarConGuardado,
        manejarCancelar,
        esModoCreacion
    };
}
