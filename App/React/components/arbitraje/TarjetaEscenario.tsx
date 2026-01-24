/*
 * Tarjeta individual de escenario (pesimista/realista/optimista)
 * Muestra métricas detalladas de un escenario específico
 * Ahora incluye ganancias de AMBAS rutas para transparencia
 */

import type {TarjetaEscenarioProps} from './types/arbitraje.types';
import {formatearMoneda} from './utils/arbitraje.utils';

export function TarjetaEscenario({escenario}: TarjetaEscenarioProps): JSX.Element {
    const mejorGanancia = Math.max(escenario.gananciaRutaA, escenario.gananciaRutaB);

    return (
        <article className={`tarjetaEscenario escenario${escenario.nombre}`}>
            <header className="cabeceraEscenario">
                <span className="nombreEscenario">{escenario.nombre}</span>
                <span className={`badgeEscenario badge${escenario.nombre}`}>Mejor: Ruta {escenario.mejorRuta}</span>
            </header>

            {/* Ganancias de ambas rutas para comparar disponibilidad */}
            <div className="comparacionRutas">
                <div className={`gananciaRuta ${escenario.mejorRuta === 'A' ? 'rutaMejor' : ''}`}>
                    <span className="etiquetaRuta">Ruta A (USDT→PP)</span>
                    <span className={`valorRuta ${escenario.gananciaRutaA >= 0 ? 'positivo' : 'negativo'}`}>{formatearMoneda(escenario.gananciaRutaA)}</span>
                </div>
                <div className={`gananciaRuta ${escenario.mejorRuta === 'B' ? 'rutaMejor' : ''}`}>
                    <span className="etiquetaRuta">Ruta B (Bs→PP)</span>
                    <span className={`valorRuta ${escenario.gananciaRutaB >= 0 ? 'positivo' : 'negativo'}`}>{formatearMoneda(escenario.gananciaRutaB)}</span>
                </div>
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
                    <span className="claveDetalle">ROI (mejor)</span>
                    <span className="valorDetalle">{escenario.roi.toFixed(1)}%</span>
                </div>
                <div className="itemDetalle">
                    <span className="claveDetalle">Break-even</span>
                    <span className="valorDetalle">{formatearMoneda(escenario.breakeven)}</span>
                </div>
            </div>
        </article>
    );
}
