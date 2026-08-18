/*
 * useLocalStorage
 * Hook genérico para persistir estado en localStorage
 * Responsabilidad única: sincronizar un valor de estado con localStorage
 *
 * [233A-66] Añadido bus de sincronización cross-instancia para la misma pestaña.
 * Sin esto, dos instancias del hook con la misma clave (ej: modal config + layout)
 * tienen estados independientes: escribir en una no actualiza la otra.
 * Solución: CustomEvent '__glory_ls_update__' notifica a todas las instancias
 * del mismo key en la misma pestaña. El evento 'storage' cubre cross-tab.
 */

import {useState, useCallback, useEffect} from 'react';

/* Nombre del evento de sincronización entre instancias (misma pestaña) */
const EVENTO_SYNC = '__glory_ls_update__';

interface UseLocalStorageConfig<T> {
    validarValor?: (valor: unknown) => boolean;
    valorPorDefecto: T;
}

interface UseLocalStorageReturn<T> {
    valor: T;
    setValor: (nuevoValor: T | ((prev: T) => T)) => void;
    eliminar: () => void;
    cargando: boolean;
}

/*
 * Hook para sincronizar estado con localStorage
 * Incluye validación, hidratación y manejo de errores
 */
export function useLocalStorage<T>(clave: string, config: UseLocalStorageConfig<T>): UseLocalStorageReturn<T> {
    const {valorPorDefecto, validarValor} = config;
    const [cargando, setCargando] = useState(true);
    const [valor, setValorInterno] = useState<T>(valorPorDefecto);

    /*
     * Hidratación: carga el valor de localStorage al montar
     * Se ejecuta solo una vez para evitar problemas de SSG/SSR
     */
    useEffect(() => {
        try {
            const valorAlmacenado = localStorage.getItem(clave);

            if (valorAlmacenado === null) {
                setCargando(false);
                return;
            }

            const valorParseado = JSON.parse(valorAlmacenado) as T;

            if (validarValor && !validarValor(valorParseado)) {
                console.warn(`[useLocalStorage] Valor inválido para clave "${clave}", usando valor por defecto`);
                setCargando(false);
                return;
            }

            setValorInterno(valorParseado);
        } catch (error) {
            console.error(`[useLocalStorage] Error al leer clave "${clave}":`, error);
        } finally {
            setCargando(false);
        }
    }, [clave, validarValor]);

    /*
     * [233A-66] Sincronización cross-instancia (misma pestaña + cross-tab)
     * El CustomEvent notifica otras instancias del hook con la misma clave
     * dentro de la misma pestaña. El evento 'storage' cubre otras pestañas.
     * React 18 batchea las actualizaciones, por lo que no hay renders extras.
     */
    useEffect(() => {
        const handleSync = (e: Event) => {
            const ev = e as CustomEvent<{clave: string; valor: string}>;
            if (ev.detail.clave !== clave) return;
            try {
                setValorInterno(JSON.parse(ev.detail.valor) as T);
            } catch {
                /* ignorar JSON inválido */
            }
        };

        const handleStorageEvent = (e: StorageEvent) => {
            if (e.key !== clave || e.newValue === null) return;
            try {
                setValorInterno(JSON.parse(e.newValue) as T);
            } catch {
                /* ignorar JSON inválido */
            }
        };

        window.addEventListener(EVENTO_SYNC, handleSync);
        window.addEventListener('storage', handleStorageEvent);
        return () => {
            window.removeEventListener(EVENTO_SYNC, handleSync);
            window.removeEventListener('storage', handleStorageEvent);
        };
    }, [clave]);

    /*
     * Actualiza el valor en estado y localStorage.
     * Después de escribir, emite EVENTO_SYNC para que otras instancias
     * con la misma clave actualicen su estado en tiempo real.
     */
    const setValor = useCallback(
        (nuevoValor: T | ((prev: T) => T)) => {
            setValorInterno(prevValor => {
                const valorFinal = typeof nuevoValor === 'function' ? (nuevoValor as (prev: T) => T)(prevValor) : nuevoValor;

                try {
                    const valorJSON = JSON.stringify(valorFinal);
                    localStorage.setItem(clave, valorJSON);
                    window.dispatchEvent(new CustomEvent(EVENTO_SYNC, {detail: {clave, valor: valorJSON}}));
                } catch (error) {
                    console.error(`[useLocalStorage] Error al guardar clave "${clave}":`, error);
                }

                return valorFinal;
            });
        },
        [clave]
    );

    /*
     * Elimina el valor de localStorage y restaura el valor por defecto
     */
    const eliminar = useCallback(() => {
        try {
            localStorage.removeItem(clave);
            setValorInterno(valorPorDefecto);
        } catch (error) {
            console.error(`[useLocalStorage] Error al eliminar clave "${clave}":`, error);
        }
    }, [clave, valorPorDefecto]);

    return {valor, setValor, eliminar, cargando};
}

/*
 * Claves estandarizadas para el dashboard
 * Centralizadas para evitar errores de escritura
 */
export const CLAVES_LOCALSTORAGE = {
    habitos: 'dashboard_habitos',
    tareas: 'dashboard_tareas',
    notas: 'dashboard_notas',
    configuracion: 'dashboard_config',
    proyectos: 'dashboard_proyectos',
    sync: 'dashboard_sync_meta'
} as const;
