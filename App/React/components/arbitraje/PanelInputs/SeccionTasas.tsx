/*
 * Sección de inputs para tasas de conversión
 * Incluye USD→Bs, Bs→PayPal, USDT→PayPal y comisión Binance
 */

import type {TasasConversion} from '../types/arbitraje.types';

interface SeccionTasasProps {
    tasas: TasasConversion;
    onTasaChange: (campo: keyof TasasConversion, valor: string) => void;
}

export function SeccionTasas({tasas, onTasaChange}: SeccionTasasProps): JSX.Element {
    return (
        <section className="seccionInputs">
            <h2 className="tituloSeccion">
                <span className="iconoSeccion">⇄</span>
                Tasas de Conversión
            </h2>

            <div className="grupoInputSimple">
                <label className="etiquetaInput">Tasa USD → Bolívares</label>
                <div className="inputConUnidad">
                    <input type="number" className="inputNumerico" value={tasas.usdABs} onChange={e => onTasaChange('usdABs', e.target.value)} step="0.01" />
                    <span className="unidadInput">Bs/$</span>
                </div>
            </div>

            <div className="grupoInputSimple">
                <label className="etiquetaInput">Tasa Bs → PayPal</label>
                <div className="inputConUnidad">
                    <input type="number" className="inputNumerico" value={tasas.bsAPaypal} onChange={e => onTasaChange('bsAPaypal', e.target.value)} step="0.01" />
                    <span className="unidadInput">Bs/$PP</span>
                </div>
            </div>

            <div className="grupoInputSimple">
                <label className="etiquetaInput">Tasa USDT → PayPal</label>
                <div className="inputConUnidad">
                    <input type="number" className="inputNumerico" value={tasas.usdtAPaypal} onChange={e => onTasaChange('usdtAPaypal', e.target.value)} step="0.0001" />
                    <span className="unidadInput">$/USDT</span>
                </div>
            </div>

            <div className="grupoInputSimple">
                <label className="etiquetaInput">Comisión Binance (maker)</label>
                <div className="inputConUnidad">
                    <input type="number" className="inputNumerico" value={tasas.comisionBinance} onChange={e => onTasaChange('comisionBinance', e.target.value)} step="0.01" />
                    <span className="unidadInput">%</span>
                </div>
            </div>

            <div className="grupoInputSimple">
                <label className="etiquetaInput">Comisión PayPal (recepción)</label>
                <div className="inputConUnidad">
                    <input type="number" className="inputNumerico" value={tasas.comisionPaypal} onChange={e => onTasaChange('comisionPaypal', e.target.value)} step="0.1" />
                    <span className="unidadInput">%</span>
                </div>
                <p className="notaInput" style={{fontSize: '11px', color: 'var(--dashboard-textoApagado)', marginTop: '4px', fontStyle: 'italic'}}>
                    * Pon 0% si el vendedor cubre la comisión
                </p>
            </div>
        </section>
    );
}
