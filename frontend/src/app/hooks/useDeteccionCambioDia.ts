/*
 * useDeteccionCambioDia
 * Detecta cuando el día calendario cambia mientras la app está abierta.
 * Al detectarlo, dispara un callback para recalcular hábitos y tareas.
 * También verifica la salud de la conexión WS al detectar interacción del usuario.
 */

import {useEffect, useRef, useCallback} from 'react';
import {obtenerFechaHoy} from '../utils/fecha';

interface ConfigCambioDia {
    /* Callback cuando se detecta un cambio de día */
    onCambioDia: () => void;
    /* Callback cuando el usuario retorna tras inactividad prolongada */
    onRetornoInactividad?: () => void;
    /* Minutos de inactividad para considerar "retorno" (default: 5) */
    minutosInactividad?: number;
    /* Intervalo de verificación en ms (default: 60000 = 1 minuto) */
    intervaloVerificacionMs?: number;
    habilitado?: boolean;
}

export function useDeteccionCambioDia({
    onCambioDia,
    onRetornoInactividad,
    minutosInactividad = 5,
    intervaloVerificacionMs = 60000,
    habilitado = true
}: ConfigCambioDia): void {
    const fechaConocidaRef = useRef<string>(obtenerFechaHoy());
    const ultimaInteraccionRef = useRef<number>(Date.now());
    const onCambioDiaRef = useRef(onCambioDia);
    const onRetornoRef = useRef(onRetornoInactividad);

    onCambioDiaRef.current = onCambioDia;
    onRetornoRef.current = onRetornoInactividad;

    const verificarCambioDia = useCallback(() => {
        const fechaActual = obtenerFechaHoy();
        if (fechaActual !== fechaConocidaRef.current) {
            console.log('[CambioDia] Día cambiado:', fechaConocidaRef.current, '->', fechaActual);
            fechaConocidaRef.current = fechaActual;
            onCambioDiaRef.current();
        }
    }, []);

    useEffect(() => {
        if (!habilitado) return;

        /* Verificación periódica con setInterval */
        const intervalo = setInterval(verificarCambioDia, intervaloVerificacionMs);

        /* Verificar al volver a la pestaña */
        const manejarVisibilidad = () => {
            if (document.visibilityState === 'visible') {
                const ahora = Date.now();
                const minutosInactivo = (ahora - ultimaInteraccionRef.current) / 60000;

                verificarCambioDia();

                /* Si estuvo inactivo más de X minutos, disparar callback de retorno */
                if (minutosInactivo >= minutosInactividad) {
                    console.log(`[CambioDia] Retorno tras ${Math.round(minutosInactivo)}min de inactividad`);
                    onRetornoRef.current?.();
                }

                ultimaInteraccionRef.current = ahora;
            }
        };

        /* Registrar interacciones del usuario para trackear actividad */
        const manejarInteraccion = () => {
            ultimaInteraccionRef.current = Date.now();
        };

        document.addEventListener('visibilitychange', manejarVisibilidad);
        window.addEventListener('focus', manejarVisibilidad);
        document.addEventListener('click', manejarInteraccion, {passive: true});
        document.addEventListener('scroll', manejarInteraccion, {passive: true});
        document.addEventListener('keydown', manejarInteraccion, {passive: true});

        return () => {
            clearInterval(intervalo);
            document.removeEventListener('visibilitychange', manejarVisibilidad);
            window.removeEventListener('focus', manejarVisibilidad);
            document.removeEventListener('click', manejarInteraccion);
            document.removeEventListener('scroll', manejarInteraccion);
            document.removeEventListener('keydown', manejarInteraccion);
        };
    }, [habilitado, verificarCambioDia, minutosInactividad, intervaloVerificacionMs]);
}
