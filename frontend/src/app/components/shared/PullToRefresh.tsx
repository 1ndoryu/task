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

import type {ReactNode} from 'react';
import {RefreshCw} from 'lucide-react';
import '../../styles/dashboard/componentes/pullToRefresh.css';
import {usePullToRefresh} from '../../hooks/shared/usePullToRefresh';

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
    const {
        mostrarIndicador,
        contenedorRef,
        clasesContenedor,
        clasesIndicador,
        clasesIcono,
        clasesContenido,
        estiloIndicador,
        estiloIcono,
        estiloContenido,
        manejarTouchStart,
        manejarTouchEnd
    } = usePullToRefresh({onRefresh, umbralRefresh, maxArrastre, deshabilitado});

    return (
        <div
            ref={contenedorRef}
            className={`${clasesContenedor} ${className}`.trim()}
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
