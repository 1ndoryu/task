/*
 * Tarjeta individual de escenario (pesimista/realista/optimista)
 * Muestra métricas detalladas de un escenario específico
 */

import type {TarjetaEscenarioProps} from './types/arbitraje.types';
import {formatearMoneda} from './utils/arbitraje.utils';

export function TarjetaEscenario({escenario}: TarjetaEscenarioProps): JSX.Element {
    const mejorGanancia = Math.max(escenario.gananciaRutaA, escenario.gananciaRutaB);

    return (
        <article className={`tarjetaEscenario escenario${escenario.nombre}`}>
            <header className="cabeceraEscenario">
                <span className="nombreEscenario">{escenario.nombre}</span>
                <span className={`badgeEscenario badge${escenario.nombre}`}>Ruta {escenario.mejorRuta}</span>
            </header>

            <div className="metricaPrincipal">
                <span className={`valorMetrica ${mejorGanancia >= 0 ? 'positivo' : 'negativo'}`}>{formatearMoneda(mejorGanancia)}</span>
                <span className="etiquetaMetrica">Ganancia Neta</span>
            </div>

            <div className="listaDetalles">
                <div className="itemDetalle">
                    <span className="claveDetalle">Inversión</span>
                    <span className="valorDetalle">{formatearMoneda(escenario.costoTotal)}</span>
                </div>
                <div className="itemDetalle">
                    <span className="claveDetalle">Venta</span>
                    <span className="valorDetalle">{formatearMoneda(escenario.ventaUsd)}</span>
                </div>
                <div className="itemDetalle">
                    <span className="claveDetalle">ROI</span>
                    <span className="valorDetalle">{escenario.roi.toFixed(1)}%</span>
                </div>
                <div className="itemDetalle">
                    <span className="claveDetalle">Margen</span>
                    <span className="valorDetalle">{escenario.margen.toFixed(1)}%</span>
                </div>
                <div className="itemDetalle">
                    <span className="claveDetalle">Break-even</span>
                    <span className="valorDetalle">{formatearMoneda(escenario.breakeven)}</span>
                </div>
            </div>
        </article>
    );
}
