/*
 * Modal de detalle de ruta de conversión
 * Muestra el desglose paso a paso de una ruta
 */

import type {ModalDetalleRutaProps} from './types/arbitraje.types';
import {formatearMoneda, formatearNumero} from './utils/arbitraje.utils';

export function ModalDetalleRuta({ruta, detalle, costoTotal, onCerrar}: ModalDetalleRutaProps): JSX.Element {
    return (
        <div className="fondoModal" onClick={onCerrar}>
            <div className="contenidoModal" onClick={e => e.stopPropagation()}>
                <header className="cabeceraModal">
                    <h3 className="tituloModal">
                        Desglose Ruta {ruta}
                        <span className="subtituloModal">{ruta === 'A' ? 'USD → Bs → USDT → PayPal' : 'USD → Bs → PayPal directo'}</span>
                    </h3>
                    <button className="botonCerrarModal" onClick={onCerrar} aria-label="Cerrar">
                        ✕
                    </button>
                </header>

                <div className="cuerpoModal">
                    {/* Inversión inicial */}
                    <div className="seccionModal">
                        <h4 className="tituloSeccionModal">Inversión Inicial</h4>
                        <div className="filaModal filaInversion">
                            <span className="claveModal">Costo total (Producto + Envío)</span>
                            <span className="valorModal negativo">{formatearMoneda(costoTotal)}</span>
                        </div>
                    </div>

                    {/* Pasos del proceso */}
                    <div className="seccionModal">
                        <h4 className="tituloSeccionModal">Proceso de Conversión</h4>
                        <div className="listaPasos">
                            {detalle.pasos.map((paso, index) => (
                                <div key={index} className="pasoConversion">
                                    <div className="numeroPaso">{index + 1}</div>
                                    <div className="contenidoPaso">
                                        <span className="descripcionPaso">{paso.descripcion}</span>
                                        <div className="detallesPaso">
                                            <span className="entradaPaso">
                                                {formatearNumero(paso.entrada)} {paso.unidadEntrada}
                                            </span>
                                            <span className="flechaPaso">→</span>
                                            <span className="salidaPaso">
                                                {formatearNumero(paso.salida)} {paso.unidadSalida}
                                            </span>
                                        </div>
                                        {paso.tasa && <span className="tasaPaso">Tasa: {paso.tasa}</span>}
                                        {paso.comision !== undefined && paso.comision > 0 && <span className="comisionPaso">Comisión: {formatearMoneda(paso.comision)}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Resultado final */}
                    <div className="seccionModal seccionResultado">
                        <h4 className="tituloSeccionModal">Resultado Final</h4>
                        <div className="filaModal">
                            <span className="claveModal">Recibido en PayPal</span>
                            <span className="valorModal">{formatearMoneda(detalle.totalFinal)}</span>
                        </div>
                        <div className="filaModal">
                            <span className="claveModal">Inversión</span>
                            <span className="valorModal negativo">-{formatearMoneda(costoTotal)}</span>
                        </div>
                        <div className="filaModal filaGanancia">
                            <span className="claveModal">Ganancia Neta</span>
                            <span className={`valorModal ${detalle.ganancia >= 0 ? 'positivo' : 'negativo'}`}>{formatearMoneda(detalle.ganancia)}</span>
                        </div>
                        <div className="filaModal">
                            <span className="claveModal">ROI</span>
                            <span className="valorModal">{costoTotal > 0 ? ((detalle.ganancia / costoTotal) * 100).toFixed(1) : 0}%</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
