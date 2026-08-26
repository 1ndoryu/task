/**
 * [T7] Utilidades de conexión y sesión extraídas de `useDashboardApi.ts`.
 *
 * `useOnlineStatus` + `obtenerNonce` vivían como exports colgando del hook
 * principal de API (H-F12-13). Se mueven a un módulo propio: `useOnlineStatus`
 * es un hook de conexión sin relación con el dashboard, y `obtenerNonce` es un
 * puente legacy hacia el contrato WordPress que Rust ya no usa.
 * `useDashboardApi.ts` re-exporta ambos para no romper importadores.
 */

import {useState, useEffect} from 'react';

/**
 * Hook para detectar estado online/offline.
 * [H-F12-05] Se corrigió el leak original: listeners en `useEffect` con
 * cleanup, un solo `useState`.
 */
export function useOnlineStatus(): boolean {
    const [online, setOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setOnline(true);
        const handleOffline = () => setOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return online;
}

/**
 * Obtiene el nonce de WordPress para autenticación.
 * [188A-1] Retorna '' — Rust no usa nonces; la sesión viaja en cookie
 * HttpOnly. Se conserva para que los hooks legacy que lo leen no rompan.
 */
export function obtenerNonce(): string {
    return '';
}