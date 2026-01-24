/*
 * Sección de inputs para costos de compra
 * Incluye costo del producto y costo de envío
 */

import type {RangoValor} from '../types/arbitraje.types';

interface SeccionCostosProps {
    costoProducto: RangoValor;
    costoEnvio: RangoValor;
    onCostoProductoChange: (campo: 'min' | 'max', valor: string) => void;
    onCostoEnvioChange: (campo: 'min' | 'max', valor: string) => void;
}

export function SeccionCostos({costoProducto, costoEnvio, onCostoProductoChange, onCostoEnvioChange}: SeccionCostosProps): JSX.Element {
    return (
        <section className="seccionInputs">
            <h2 className="tituloSeccion">
                <span className="iconoSeccion">$</span>
                Costos de Compra
            </h2>

            <div className="grupoInputRango">
                <label className="etiquetaInput">Costo Producto (USD)</label>
                <div className="contenedorRango">
                    <input type="number" className="inputNumerico" value={costoProducto.min} onChange={e => onCostoProductoChange('min', e.target.value)} placeholder="Min" />
                    <span className="separadorRango">a</span>
                    <input type="number" className="inputNumerico" value={costoProducto.max} onChange={e => onCostoProductoChange('max', e.target.value)} placeholder="Max" />
                </div>
            </div>

            <div className="grupoInputRango">
                <label className="etiquetaInput">Costo Envío (USD)</label>
                <div className="contenedorRango">
                    <input type="number" className="inputNumerico" value={costoEnvio.min} onChange={e => onCostoEnvioChange('min', e.target.value)} placeholder="Min" />
                    <span className="separadorRango">a</span>
                    <input type="number" className="inputNumerico" value={costoEnvio.max} onChange={e => onCostoEnvioChange('max', e.target.value)} placeholder="Max" />
                </div>
            </div>
        </section>
    );
}
