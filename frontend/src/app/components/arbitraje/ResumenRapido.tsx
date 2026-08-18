/*
 * Resumen rápido de métricas del arbitraje
 * Muestra indicadores clave del escenario realista
 * Dividido para mostrar ganancias de AMBAS rutas
 */

import type {ResumenRapidoProps} from './types/arbitraje.types';
import {formatearMoneda} from './utils/arbitraje.utils';

export function ResumenRapido({escenarioRealista}: ResumenRapidoProps): JSX.Element {
    return (
        <div className="resumenRapido">
            {/* Sección común: inversión y venta */}
            <div className="resumenComun">
                <div className="itemResumen">
                    <span className="valorResumen">{formatearMoneda(escenarioRealista.costoTotal)}</span>
                    <span className="etiquetaResumen">Inversión</span>
                </div>
                <div className="itemResumen">
                    <span className="valorResumen">{formatearMoneda(escenarioRealista.ventaUsd)}</span>
                    <span className="etiquetaResumen">Venta esperada</span>
                </div>
            </div>

            {/* División de ganancias por ruta */}
            <div className="resumenDividido">
                <div className={`columnaRuta ${escenarioRealista.mejorRuta === 'A' ? 'rutaMejor' : ''}`}>
                    <span className="tituloColumna">Ruta A (USDT→PayPal)</span>
                    <span className={`valorGananciaRuta ${escenarioRealista.gananciaRutaA >= 0 ? 'positivo' : 'negativo'}`}>{formatearMoneda(escenarioRealista.gananciaRutaA)}</span>
                    <span className="etiquetaResumen">Ganancia neta</span>
                </div>

                <div className="separadorVertical" />

                <div className={`columnaRuta ${escenarioRealista.mejorRuta === 'B' ? 'rutaMejor' : ''}`}>
                    <span className="tituloColumna">Ruta B (Bs→PayPal)</span>
                    <span className={`valorGananciaRuta ${escenarioRealista.gananciaRutaB >= 0 ? 'positivo' : 'negativo'}`}>{formatearMoneda(escenarioRealista.gananciaRutaB)}</span>
                    <span className="etiquetaResumen">Ganancia neta</span>
                </div>
            </div>

            {/* ROI y mejor ruta */}
            <div className="resumenFinal">
                <div className="itemResumen">
                    <span className="valorResumen">{escenarioRealista.roi.toFixed(1)}%</span>
                    <span className="etiquetaResumen">ROI (mejor)</span>
                </div>
                <div className="itemResumen">
                    <span className="valorResumen badgeMejorRuta">Ruta {escenarioRealista.mejorRuta}</span>
                    <span className="etiquetaResumen">Mejor opción</span>
                </div>
            </div>
        </div>
    );
}
