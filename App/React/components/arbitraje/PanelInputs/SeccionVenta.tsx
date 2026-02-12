/*
 * Sección de inputs para precio de venta
 */

import type {RangoValor} from '../types/arbitraje.types';
import {Input} from '../../ui/Input';

interface SeccionVentaProps {
    precioVenta: RangoValor;
    onPrecioVentaChange: (campo: 'min' | 'max', valor: string) => void;
}

export function SeccionVenta({precioVenta, onPrecioVentaChange}: SeccionVentaProps): JSX.Element {
    return (
        <section className="seccionInputs">
            <h2 className="tituloSeccion">
                <span className="iconoSeccion">↗</span>
                Precio de Venta
            </h2>

            <div className="grupoInputRango">
                <label className="etiquetaInput">Precio Venta Local (USD)</label>
                <div className="contenedorRango">
                    <Input tipo="number" claseAdicional="inputNumerico" value={precioVenta.min} onChange={e => onPrecioVentaChange('min', (e.target as HTMLInputElement).value)} placeholder="Min" />
                    <span className="separadorRango">a</span>
                    <Input tipo="number" claseAdicional="inputNumerico" value={precioVenta.max} onChange={e => onPrecioVentaChange('max', (e.target as HTMLInputElement).value)} placeholder="Max" />
                </div>
            </div>
        </section>
    );
}
