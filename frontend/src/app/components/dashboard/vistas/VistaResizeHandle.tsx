/*
 * VistaResizeHandle
 *
 * [318A-2] Handle de redimensionamiento para el grid libre del Modo Vistas.
 *
 * Se posiciona sobre el BORDE REAL de una celda (cuadro):
 *  - `tipo='derecha'`: sobre el borde derecho → ajusta el par de pesos
 *    [indice, indice+1] de las columnas (la columna de la celda y la siguiente).
 *  - `tipo='abajo'`: sobre el borde inferior → ajusta el par de pesos
 *    [indice, indice+1] de las filas (la fila de la celda y la siguiente).
 *
 * Se renderiza DENTRO de la celda (position absolute) y el CSS lo posiciona
 * sobre el borde (mitad dentro, mitad fuera) para un agarre cómodo.
 */

import {useCallback} from 'react';
import {useResizeDrag} from '../../../hooks/useResizeDrag';

interface VistaResizeHandleProps {
    /* 'x' = columna (handle derecho), 'y' = fila (handle inferior) */
    eje: 'x' | 'y';
    /* Borde real de la celda donde se posiciona el handle */
    tipo: 'derecha' | 'abajo';
    /* Pesos completos de la vista (longitud = totalFilas o totalColumnas) */
    proporciones: number[];
    /* Qué par de pesos ajusta (indice del primer peso del par) */
    indice: number;
    /* Callback con los pesos completos actualizados */
    onAjustar: (nuevosPesos: number[]) => void;
}

export function VistaResizeHandle({eje, tipo, proporciones, indice, onAjustar}: VistaResizeHandleProps): JSX.Element {
    /* Valor actual de la primera línea del par (proporción que crece con el drag) */
    const pesoA = proporciones[indice] ?? 1;
    const pesoB = proporciones[indice + 1] ?? 1;
    const sumaPar = pesoA + pesoB;
    /* Porcentaje del primer peso dentro del par (25-75) */
    const valorActual = sumaPar > 0 ? (pesoA / sumaPar) * 100 : 50;

    const handleAjustar = useCallback((nuevo: [number, number]) => {
        /* nuevo[0] = % del par que toma la primera; mantener la suma del par */
        const copia = [...proporciones];
        const pA = proporciones[indice] ?? 1;
        const pB = proporciones[indice + 1] ?? 1;
        const suma = pA + pB;
        const nuevoPesoA = (nuevo[0] / 100) * suma;
        copia[indice] = Math.max(0.1, Math.min(10, nuevoPesoA));
        copia[indice + 1] = Math.max(0.1, Math.min(10, suma - nuevoPesoA));
        onAjustar(copia);
    }, [proporciones, indice, onAjustar]);

    const {arrastrando, contenedorRef, handleMouseDown} = useResizeDrag(eje, valorActual, handleAjustar);

    const resetearPar = useCallback(() => {
        const copia = [...proporciones];
        const pA = proporciones[indice] ?? 1;
        const pB = proporciones[indice + 1] ?? 1;
        const suma = pA + pB;
        copia[indice] = suma / 2;
        copia[indice + 1] = suma / 2;
        onAjustar(copia);
    }, [proporciones, indice, onAjustar]);

    const claseTipo = tipo === 'derecha' ? 'dashboardVistasResize--derecha' : 'dashboardVistasResize--abajo';

    return (
        <div
            ref={contenedorRef}
            className={`dashboardVistasResize ${claseTipo} ${arrastrando ? 'dashboardVistasResize--arrastrando' : ''}`}
            onMouseDown={handleMouseDown}
            onDoubleClick={resetearPar}
            title="Arrastrar para redimensionar. Doble clic para repartir a partes iguales."
        >
            <div className="dashboardVistasResizeLinea" />
        </div>
    );
}

