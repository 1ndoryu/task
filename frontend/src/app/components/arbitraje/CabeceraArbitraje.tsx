/*
 * Cabecera de la calculadora de arbitraje
 * Muestra título e indicador de viabilidad
 * [044A-14] Reemplazados simbolos Unicode por iconos SVG de lucide-react
 */

import type {CabeceraArbitrajeProps} from './types/arbitraje.types';
import {Check, AlertTriangle, X} from 'lucide-react';

export function CabeceraArbitraje({titulo, viabilidad}: CabeceraArbitrajeProps): JSX.Element {
    const obtenerIcono = (): JSX.Element => {
        switch (viabilidad.estado) {
            case 'viable':
                return <Check size={16} />;
            case 'riesgoso':
                return <AlertTriangle size={16} />;
            default:
                return <X size={16} />;
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
