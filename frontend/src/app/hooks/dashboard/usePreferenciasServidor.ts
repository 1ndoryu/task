/*
 * usePreferenciasServidor
 * [18-08-2026] Sube SOLO el blob de preferencias (layout, plugins, tema,
 * órdenes...) cuando cambia en localStorage, con debounce y PUT parcial.
 *
 * Por qué existe: el SyncManager dispara guardado cuando cambian tareas,
 * hábitos, notas o proyectos — pero mover un panel, cambiar el tema o activar
 * un plugin NO cambia esos datos, así que sin este observador las preferencias
 * solo se subirían en el siguiente guardado por otra causa (o nunca).
 * Escucha el mismo canal que useLocalStorage (__glory_ls_update__) y el evento
 * nativo 'storage', y persiste con PUT /api/dashboard/settings parcial
 * ({ preferencias }), que el backend mergea sin tocar notas ni config.
 */

import {useEffect, useRef} from 'react';
import {apiFetch} from '../../utils/apiClient';
import {
    CLAVES_PREFERENCIAS,
    recolectarPreferencias,
} from '../../utils/preferenciasUsuario';

const DEBOUNCE_MS = 1200;

/* Fingerprint de las claves de preferencias: detecta cambios que NO pasan
 * por los eventos (stores persist de Zustand escriben directo a localStorage
 * sin CustomEvent). Se compara en un intervalo corto. */
function fingerprintPreferencias(): string {
    let total = 0;
    for (const clave of CLAVES_PREFERENCIAS) {
        try {
            const raw = localStorage.getItem(clave);
            if (raw !== null) total += raw.length;
        } catch {
            /* localStorage no disponible */
        }
    }
    return String(total);
}

export function usePreferenciasServidor(estaLogueado: boolean): void {
    const logueadoRef = useRef(estaLogueado);
    logueadoRef.current = estaLogueado;

    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const enVueloRef = useRef(false);
    const fingerprintRef = useRef(fingerprintPreferencias());

    useEffect(() => {
        const subir = () => {
            if (!logueadoRef.current) return;
            if (enVueloRef.current) return;
            enVueloRef.current = true;

            const preferencias = recolectarPreferencias();
            apiFetch('/dashboard/settings', {
                method: 'PUT',
                body: {preferencias}
            })
                .catch(error => {
                    console.warn('[Preferencias] No se pudo subir al servidor:', error);
                })
                .finally(() => {
                    enVueloRef.current = false;
                });
        };

        const programar = () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(subir, DEBOUNCE_MS);
        };

        /* Canal de useLocalStorage (misma pestaña) */
        const handleCustomEvent = (event: Event) => {
            const detail = (event as CustomEvent<{clave: string}>).detail;
            if (detail && CLAVES_PREFERENCIAS.includes(detail.clave)) {
                fingerprintRef.current = fingerprintPreferencias();
                programar();
            }
        };

        /* Evento nativo (cross-tab) */
        const handleStorage = (event: StorageEvent) => {
            if (event.key && CLAVES_PREFERENCIAS.includes(event.key)) {
                fingerprintRef.current = fingerprintPreferencias();
                programar();
            }
        };

        /* [18-08-2026] Polling ligero: los stores persist de Zustand (plugins,
         * ayuno, time tracker, recordatorios, grupos...) escriben directo a
         * localStorage sin emitir CustomEvent ni storage en la misma pestaña.
         * El fingerprint por longitud es barato (~35 claves) y detecta cualquier
         * write, incluso writes directos fuera de los hooks. */
        const intervalo = window.setInterval(() => {
            const actual = fingerprintPreferencias();
            if (actual !== fingerprintRef.current) {
                fingerprintRef.current = actual;
                programar();
            }
        }, 5000);

        window.addEventListener('__glory_ls_update__', handleCustomEvent);
        window.addEventListener('storage', handleStorage);

        return () => {
            window.removeEventListener('__glory_ls_update__', handleCustomEvent);
            window.removeEventListener('storage', handleStorage);
            window.clearInterval(intervalo);
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);
}
