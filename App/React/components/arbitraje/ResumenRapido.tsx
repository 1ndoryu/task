/*
 * Resumen rápido de métricas del arbitraje
 * Muestra indicadores clave del escenario realista
 */

import type {ResumenRapidoProps} from './types/arbitraje.types';
import {formatearMoneda} from './utils/arbitraje.utils';

export function ResumenRapido({escenarioRealista}: ResumenRapidoProps): JSX.Element {
    const mejorGanancia = Math.max(escenarioRealista.gananciaRutaA, escenarioRealista.gananciaRutaB);

    return (
        <div className="resumenRapido">
            <div className="itemResumen">
                <span className="valorResumen">{formatearMoneda(escenarioRealista.costoTotal)}</span>
                <span className="etiquetaResumen">Inversión (realista)</span>
            </div>
            <div className="itemResumen">
                <span className="valorResumen">{formatearMoneda(escenarioRealista.ventaUsd)}</span>
                <span className="etiquetaResumen">Venta esperada</span>
            </div>
            <div className="itemResumen">
                <span className={`valorResumen ${mejorGanancia >= 0 ? 'positivo' : 'negativo'}`}>{formatearMoneda(mejorGanancia)}</span>
                <span className="etiquetaResumen">Ganancia neta</span>
            </div>
            <div className="itemResumen">
                <span className="valorResumen">{escenarioRealista.roi.toFixed(1)}%</span>
                <span className="etiquetaResumen">ROI</span>
            </div>
            <div className="itemResumen">
                <span className="valorResumen">Ruta {escenarioRealista.mejorRuta}</span>
                <span className="etiquetaResumen">Mejor opción</span>
            </div>
        </div>
    );
}
