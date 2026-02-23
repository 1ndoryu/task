/*
 * usePullToRefresh
 * Hook que gestiona la lógica de pull-to-refresh para dispositivos móviles.
 * Incluye: tracking de touch, cálculo de progreso, estados de arrastre
 * y registro nativo de touchmove con passive: false.
 */

import {useState, useRef, useCallback, useEffect} from 'react';

interface UsePullToRefreshParams {
    onRefresh: () => Promise<void>;
    umbralRefresh?: number;
    maxArrastre?: number;
    deshabilitado?: boolean;
}

export function usePullToRefresh({onRefresh, umbralRefresh = 80, maxArrastre = 150, deshabilitado = false}: UsePullToRefreshParams) {
    const [arrastre, setArrastre] = useState(0);
    const [refrescando, setRefrescando] = useState(false);
    const [mostrarIndicador, setMostrarIndicador] = useState(false);

    const contenedorRef = useRef<HTMLDivElement>(null);
    const inicioYRef = useRef<number | null>(null);
    const arrastrableRef = useRef(false);

    /* Verificar si podemos iniciar el arrastre (solo si scroll está en top) */
    const puedeArrastrar = useCallback((): boolean => {
        if (deshabilitado || refrescando) return false;
        const contenedor = contenedorRef.current;
        if (!contenedor) return false;
        return contenedor.scrollTop <= 0;
    }, [deshabilitado, refrescando]);

    /* Inicio del toque */
    const manejarTouchStart = useCallback(
        (evento: React.TouchEvent) => {
            if (!puedeArrastrar()) {
                arrastrableRef.current = false;
                return;
            }
            inicioYRef.current = evento.touches[0].clientY;
            arrastrableRef.current = true;
        },
        [puedeArrastrar]
    );

    /* Fin del toque: ejecutar refresh si superamos umbral */
    const manejarTouchEnd = useCallback(async () => {
        if (!arrastrableRef.current) return;

        arrastrableRef.current = false;
        inicioYRef.current = null;

        if (arrastre >= umbralRefresh) {
            setRefrescando(true);
            setArrastre(umbralRefresh);

            try {
                await onRefresh();
            } catch (error) {
                console.error('[PullToRefresh] Error:', error);
            } finally {
                setRefrescando(false);
                setArrastre(0);
                setMostrarIndicador(false);
            }
        } else {
            setArrastre(0);
            setTimeout(() => setMostrarIndicador(false), 200);
        }
    }, [arrastre, umbralRefresh, onRefresh]);

    /* Valores derivados para UI */
    const progreso = Math.min(arrastre / umbralRefresh, 1);
    const rotacion = progreso * 360;
    const escala = 0.5 + progreso * 0.5;
    const iconoListo = arrastre >= umbralRefresh;

    /* Registrar touchmove nativo con passive: false para permitir preventDefault */
    useEffect(() => {
        const contenedor = contenedorRef.current;
        if (!contenedor) return;

        const manejadorNativo = (evento: TouchEvent) => {
            if (!arrastrableRef.current || inicioYRef.current === null) return;

            const deltaY = evento.touches[0].clientY - inicioYRef.current;

            if (deltaY < 0) {
                setArrastre(0);
                setMostrarIndicador(false);
                return;
            }

            const arrastreCalculado = Math.min(deltaY * 0.5, maxArrastre);
            setArrastre(arrastreCalculado);
            setMostrarIndicador(arrastreCalculado > 10);

            if (arrastreCalculado > 10) {
                evento.preventDefault();
            }
        };

        contenedor.addEventListener('touchmove', manejadorNativo, {passive: false});
        return () => contenedor.removeEventListener('touchmove', manejadorNativo);
    }, [maxArrastre]);

    /* Clases y estilos dinámicos */
    const clasesIndicador = `pullToRefresh__indicador ${refrescando ? '' : 'pullToRefresh__indicador--animando'}`.trim();
    const clasesIcono = `pullToRefresh__icono ${iconoListo ? 'pullToRefresh__icono--listo' : ''} ${refrescando ? 'pullToRefresh__icono--girando' : ''}`.trim();
    const clasesContenido = `pullToRefresh__contenido ${!arrastrableRef.current ? 'pullToRefresh__contenido--animando' : ''}`.trim();

    const estiloIndicador = {'--ptr-translateY': `${arrastre - 40}px`} as React.CSSProperties;
    const estiloIcono = {'--ptr-rotacion': `${rotacion}deg`, '--ptr-escala': escala} as React.CSSProperties;
    const estiloContenido = {'--ptr-contenido-translateY': `${arrastre}px`} as React.CSSProperties;

    return {
        contenedorRef,
        arrastre,
        refrescando,
        mostrarIndicador,
        manejarTouchStart,
        manejarTouchEnd,
        progreso,
        iconoListo,
        clasesIndicador,
        clasesIcono,
        clasesContenido,
        estiloIndicador,
        estiloIcono,
        estiloContenido
    };
}
