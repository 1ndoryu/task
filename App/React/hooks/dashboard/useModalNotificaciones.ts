/*
 * useModalNotificaciones
 * Hook que encapsula la lógica del modal de notificaciones.
 * Maneja auto-marcar leídas, cierre al clic fuera o Escape,
 * cálculo de posición y handler de click en notificación.
 */

import {useEffect, useRef, useCallback, useMemo} from 'react';
import type {Notificacion} from '../../types/dashboard';

interface UseModalNotificacionesParams {
    noLeidas: number;
    posicionX: number;
    posicionY: number;
    notificaciones: Notificacion[];
    cargandoPrimeraVez: boolean;
    onMarcarLeida: (id: number) => Promise<boolean>;
    onMarcarTodasLeidas: () => Promise<boolean>;
    onClickNotificacion: (notificacion: Notificacion) => void;
    onCerrar: () => void;
}

export function useModalNotificaciones({noLeidas, posicionX, posicionY, notificaciones, cargandoPrimeraVez, onMarcarLeida, onMarcarTodasLeidas, onClickNotificacion, onCerrar}: UseModalNotificacionesParams) {
    const modalRef = useRef<HTMLDivElement>(null);
    const yaMarcoLeidasRef = useRef(false);

    /* Marcar todas como leídas automáticamente al abrir el modal */
    useEffect(() => {
        if (noLeidas > 0 && !yaMarcoLeidasRef.current) {
            yaMarcoLeidasRef.current = true;
            onMarcarTodasLeidas();
        }
    }, [noLeidas, onMarcarTodasLeidas]);

    /* Cerrar al hacer clic fuera o presionar Escape */
    useEffect(() => {
        const manejarClickFuera = (evento: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(evento.target as Node)) {
                onCerrar();
            }
        };

        const manejarEscape = (evento: KeyboardEvent) => {
            if (evento.key === 'Escape') {
                onCerrar();
            }
        };

        document.addEventListener('mousedown', manejarClickFuera);
        document.addEventListener('keydown', manejarEscape);

        return () => {
            document.removeEventListener('mousedown', manejarClickFuera);
            document.removeEventListener('keydown', manejarEscape);
        };
    }, [onCerrar]);

    /* Ajustar posición para que no se salga de la pantalla */
    const calcularEstilo = useCallback(() => {
        const anchoModal = 360;
        const altoMaximo = 480;
        const margen = 12;

        let x = posicionX;
        let y = posicionY;

        /* Evitar que se salga por la derecha */
        if (x + anchoModal > window.innerWidth - margen) {
            x = window.innerWidth - anchoModal - margen;
        }

        /* Evitar que se salga por abajo */
        if (y + altoMaximo > window.innerHeight - margen) {
            y = posicionY - altoMaximo - 40;
            if (y < margen) y = margen;
        }

        return {
            left: `${Math.max(margen, x)}px`,
            top: `${y}px`
        };
    }, [posicionX, posicionY]);

    /* Click en notificación: marcar como leída y luego ejecutar callback */
    const manejarClickNotificacion = useCallback(
        async (notificacion: Notificacion) => {
            if (!notificacion.leida) {
                await onMarcarLeida(notificacion.id);
            }
            onClickNotificacion(notificacion);
        },
        [onMarcarLeida, onClickNotificacion]
    );

    /* Solo mostrar "Cargando..." si es la primera carga y no hay notificaciones en cache */
    const mostrarCargando = useMemo(() => cargandoPrimeraVez && notificaciones.length === 0, [cargandoPrimeraVez, notificaciones.length]);

    return {
        modalRef,
        calcularEstilo,
        manejarClickNotificacion,
        mostrarCargando
    };
}
