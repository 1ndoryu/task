/*
 * Cabecera de la calculadora de arbitraje
 * Muestra título e indicador de viabilidad
 */

import type {CabeceraArbitrajeProps} from './types/arbitraje.types';

export function CabeceraArbitraje({titulo, viabilidad}: CabeceraArbitrajeProps): JSX.Element {
    const obtenerIcono = (): string => {
        switch (viabilidad.estado) {
            case 'viable':
                /* sentinel-disable-next-line emoji-en-codigo — simbolo Unicode tipografico, no emoji real */
                return '✓';
            case 'riesgoso':
                /* sentinel-disable-next-line emoji-en-codigo */
                return '⚠';
            default:
                /* sentinel-disable-next-line emoji-en-codigo */
                return '✗';
        }
    };

    return (
        <header className="cabeceraArbitraje">
            <div>
                <h1 className="tituloArbitraje">{titulo}</h1>
                <span className="subtituloArbitraje">eBay → Venta Local → USDT/PayPal</span>
            </div>
            <div className={`estadoViabilidad ${viabilidad.estado}`}>
                <span className="iconoViabilidad">{obtenerIcono()}</span>
                {viabilidad.mensaje}
            </div>
        </header>
    );
}
