/*
 * LayoutManager
 * Componente que orquesta el layout del dashboard
 * Maneja columnas redimensionables y distribución de paneles
 * Lógica de resize extraída a useLayoutManager
 */

import {type ReactNode} from 'react';
import type {ModoColumnas, AnchoColumnas} from '../../hooks/useConfiguracionLayout';
import {useLayoutManager} from '../../hooks/shared/useLayoutManager';

interface LayoutManagerProps {
    modoColumnas: ModoColumnas;
    anchos: AnchoColumnas;
    onAjustarAnchos?: (anchos: Partial<AnchoColumnas>) => void;
    columna1?: ReactNode;
    columna2?: ReactNode;
    columna3?: ReactNode;
    habilitarResize?: boolean;
}

export function LayoutManager({modoColumnas, anchos, onAjustarAnchos, columna1, columna2, columna3, habilitarResize = true}: LayoutManagerProps): JSX.Element {
    const {contenedorRef, arrastrando, iniciarArrastre, estiloGrid} = useLayoutManager({
        modoColumnas,
        anchos,
        onAjustarAnchos
    });

    /* Renderizar handle de resize */
    const renderizarHandle = (id: 'handle1' | 'handle2') => {
        if (!habilitarResize || !onAjustarAnchos) return null;
        if (modoColumnas === 1) return null;
        if (modoColumnas === 2 && id === 'handle2') return null;

        return (
            <div className={`layoutResizeHandle ${arrastrando === id ? 'activo' : ''}`} onMouseDown={iniciarArrastre(id)} title="Arrastrar para redimensionar">
                <div className="layoutResizeHandleLinea" />
            </div>
        );
    };

    return (
        <div ref={contenedorRef} className={`layoutManager modo${modoColumnas}Columnas ${arrastrando ? 'arrastrando' : ''}`} style={estiloGrid}>
            {/* Columna 1 */}
            <div className="layoutColumna layoutColumna1">{columna1}</div>

            {/* Handle 1 (entre columna 1 y 2) */}
            {modoColumnas >= 2 && renderizarHandle('handle1')}

            {/* Columna 2 */}
            {modoColumnas >= 2 && <div className="layoutColumna layoutColumna2">{columna2}</div>}

            {/* Handle 2 (entre columna 2 y 3) */}
            {modoColumnas === 3 && renderizarHandle('handle2')}

            {/* Columna 3 */}
            {modoColumnas === 3 && <div className="layoutColumna layoutColumna3">{columna3}</div>}
        </div>
    );
}
