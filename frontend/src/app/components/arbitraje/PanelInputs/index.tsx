/*
 * Panel de inputs para la calculadora de arbitraje
 * Agrupa las secciones de costos, venta y tasas
 */

import type {PanelInputsProps} from '../types/arbitraje.types';
import {SeccionCostos} from './SeccionCostos';
import {SeccionVenta} from './SeccionVenta';
import {SeccionTasas} from './SeccionTasas';

export function PanelInputs({costoProducto, costoEnvio, precioVenta, tasas, onCostoProductoChange, onCostoEnvioChange, onPrecioVentaChange, onTasaChange}: PanelInputsProps): JSX.Element {
    return (
        <aside className="panelInputs">
            <SeccionCostos costoProducto={costoProducto} costoEnvio={costoEnvio} onCostoProductoChange={onCostoProductoChange} onCostoEnvioChange={onCostoEnvioChange} />
            <SeccionVenta precioVenta={precioVenta} onPrecioVentaChange={onPrecioVentaChange} />
            <SeccionTasas tasas={tasas} onTasaChange={onTasaChange} />
        </aside>
    );
}
