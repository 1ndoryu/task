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
import {devWarn} from '../../utils/devLog';
import {
    CLAVES_PREFERENCIAS,
    recolectarPreferencias,
} from '../../utils/preferenciasUsuario';
import {registrarEscritura} from '../../utils/timestampsPreferencias';

const DEBOUNCE_MS = 1200;

/* Snapshot de las claves de preferencias: detecta cambios que NO pasan por los
 * eventos (stores persist de Zustand escriben directo a localStorage sin
 * CustomEvent). Se compara por clave en un intervalo corto y se registra el ts
 * de cada clave que cambió (necesario para el LWW multinavegador). */
function snapshotPreferencias(): Record<string, string | null> {
    const snapshot: Record<string, string | null> = {};
    for (const clave of CLAVES_PREFERENCIAS) {
        try {
            snapshot[clave] = localStorage.getItem(clave);
        } catch {
            snapshot[clave] = null;
        }
    }
    return snapshot;
}

/* Devuelve las claves cuyo valor cambió respecto al snapshot previo y actualiza
 * el snapshot. `null` -> clave ausente (borrada). */
function detectarCambios(
    previo: Record<string, string | null>,
    actual: Record<string, string | null>
): string[] {
    const cambiadas: string[] = [];
    for (const clave of CLAVES_PREFERENCIAS) {
        if (previo[clave] !== actual[clave]) cambiadas.push(clave);
    }
    return cambiadas;
}

export function usePreferenciasServidor(estaLogueado: boolean): void {
    const logueadoRef = useRef(estaLogueado);
    logueadoRef.current = estaLogueado;

    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const enVueloRef = useRef(false);
    const snapshotRef = useRef<Record<string, string | null>>(snapshotPreferencias());

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
                    devWarn('[Preferencias] No se pudo subir al servidor:', error);
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
                registrarEscritura(detail.clave);
                snapshotRef.current[detail.clave] = localStorage.getItem(detail.clave);
                programar();
            }
        };

        /* Evento nativo (cross-tab) */
        const handleStorage = (event: StorageEvent) => {
            if (event.key && CLAVES_PREFERENCIAS.includes(event.key)) {
                registrarEscritura(event.key);
                snapshotRef.current[event.key] = event.newValue;
                programar();
            }
        };

        /* [18-08-2026] Polling ligero: los stores persist de Zustand (plugins,
         * ayuno, time tracker, recordatorios, grupos...) escriben directo a
         * localStorage sin emitir CustomEvent ni storage en la misma pestaña.
         * [25-08-2026] Comparación por clave: registra el ts de cada clave que
         * cambió (el fingerprint por longitud no sabía cuál era). */
        const intervalo = window.setInterval(() => {
            const actual = snapshotPreferencias();
            const cambiadas = detectarCambios(snapshotRef.current, actual);
            if (cambiadas.length > 0) {
                for (const clave of cambiadas) {
                    registrarEscritura(clave);
                }
                snapshotRef.current = actual;
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
