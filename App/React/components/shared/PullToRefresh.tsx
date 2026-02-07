/*
 * Componente PullToRefresh
 *
 * Permite recargar la aplicación tirando hacia abajo en dispositivos móviles.
 * Similar al comportamiento nativo de apps móviles.
 *
 * TAREA 9: Mecanismo de recarga en APK
 *
 * Uso:
 * <PullToRefresh onRefresh={async () => { await recargarDatos(); }}>
 *   <TuContenido />
 * </PullToRefresh>
 */

import {useState, useRef, useCallback, useEffect, type ReactNode} from 'react';
import {RefreshCw} from 'lucide-react';
import '../../styles/dashboard/componentes/pullToRefresh.css';

interface PullToRefreshProps {
    children: ReactNode;
    onRefresh: () => Promise<void>;
    /* Distancia mínima de arrastre para activar refresh (px) */
    umbralRefresh?: number;
    /* Máxima distancia de arrastre (px) */
    maxArrastre?: number;
    /* Deshabilitar el componente */
    deshabilitado?: boolean;
    /* Clase CSS adicional */
    className?: string;
}

export function PullToRefresh({
    children,
    onRefresh,
    umbralRefresh = 80,
    maxArrastre = 150,
    deshabilitado = false,
    className = ''
}: PullToRefreshProps): JSX.Element {
    const [arrastre, setArrastre] = useState(0);
    const [refrescando, setRefrescando] = useState(false);
    const [mostrarIndicador, setMostrarIndicador] = useState(false);

    const contenedorRef = useRef<HTMLDivElement>(null);
    const inicioYRef = useRef<number | null>(null);
    const arrastrableRef = useRef(false);

    /* Verificar si podemos iniciar el arrastre (solo si estamos en top) */
    const puedeArrastrar = useCallback((): boolean => {
        if (deshabilitado || refrescando) return false;

        const contenedor = contenedorRef.current;
        if (!contenedor) return false;

        /* Solo permitir si el scroll está en la parte superior */
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

    /* Fin del toque */
    const manejarTouchEnd = useCallback(async () => {
        if (!arrastrableRef.current) return;

        arrastrableRef.current = false;
        inicioYRef.current = null;

        /* Si superamos el umbral, ejecutar refresh */
        if (arrastre >= umbralRefresh) {
            setRefrescando(true);
            setArrastre(umbralRefresh); /* Mantener indicador visible */

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
            /* Animar vuelta a posición inicial */
            setArrastre(0);
            setTimeout(() => setMostrarIndicador(false), 200);
        }
    }, [arrastre, umbralRefresh, onRefresh]);

    /* Calcular progreso del arrastre (0-1) */
    const progreso = Math.min(arrastre / umbralRefresh, 1);
    const rotacion = progreso * 360;
    const escala = 0.5 + progreso * 0.5;
    const iconoListo = arrastre >= umbralRefresh;

    /* Registrar evento touchmove con passive: false para permitir preventDefault */
    useEffect(() => {
        const contenedor = contenedorRef.current;
        if (!contenedor) return;

        const manejadorNativo = (evento: TouchEvent) => {
            if (!arrastrableRef.current || inicioYRef.current === null) return;

            const deltaY = evento.touches[0].clientY - inicioYRef.current;

            /* Solo arrastrar hacia abajo */
            if (deltaY < 0) {
                setArrastre(0);
                setMostrarIndicador(false);
                return;
            }

            /* Limitar el arrastre máximo */
            const arrastreCalculado = Math.min(deltaY * 0.5, maxArrastre);
            setArrastre(arrastreCalculado);
            setMostrarIndicador(arrastreCalculado > 10);

            /* Prevenir scroll mientras arrastramos - ahora funciona sin warning */
            if (arrastreCalculado > 10) {
                evento.preventDefault();
            }
        };

        contenedor.addEventListener('touchmove', manejadorNativo, {passive: false});

        return () => {
            contenedor.removeEventListener('touchmove', manejadorNativo);
        };
    }, [maxArrastre]);

    /* Clases dinámicas */
    const clasesContenedor = `pullToRefresh ${arrastre > 0 ? 'pullToRefresh--arrastrando' : ''} ${className}`.trim();
    const clasesIndicador = `pullToRefresh__indicador ${refrescando ? '' : 'pullToRefresh__indicador--animando'}`.trim();
    const clasesIcono = `pullToRefresh__icono ${iconoListo ? 'pullToRefresh__icono--listo' : ''} ${refrescando ? 'pullToRefresh__icono--girando' : ''}`.trim();
    const clasesContenido = `pullToRefresh__contenido ${!arrastrableRef.current ? 'pullToRefresh__contenido--animando' : ''}`.trim();

    /* CSS custom properties para valores dinámicos (transforms) */
    const estiloIndicador = {
        '--ptr-translateY': `${arrastre - 40}px`
    } as React.CSSProperties;

    const estiloIcono = {
        '--ptr-rotacion': `${rotacion}deg`,
        '--ptr-escala': escala
    } as React.CSSProperties;

    const estiloContenido = {
        '--ptr-contenido-translateY': `${arrastre}px`
    } as React.CSSProperties;

    return (
        <div
            ref={contenedorRef}
            className={clasesContenedor}
            onTouchStart={manejarTouchStart}
            onTouchEnd={manejarTouchEnd}>
            {/* Indicador de refresh */}
            {mostrarIndicador && (
                <div className={clasesIndicador} style={estiloIndicador}>
                    <RefreshCw size={20} className={clasesIcono} style={estiloIcono} />
                </div>
            )}

            {/* Contenido con desplazamiento */}
            <div className={clasesContenido} style={estiloContenido}>
                {children}
            </div>
        </div>
    );
}
