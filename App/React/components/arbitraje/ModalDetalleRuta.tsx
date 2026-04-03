/*
 * Modal de detalle de ruta de conversión
 * Muestra el desglose paso a paso de una ruta
 * Incluye pérdidas/ganancias individuales y totales por conversión
 */

import type {ModalDetalleRutaProps} from './types/arbitraje.types';
import {formatearMoneda, formatearNumero} from './utils/arbitraje.utils';
import {Boton} from '../ui';

export function ModalDetalleRuta({ruta, detalle, costoTotal, onCerrar}: ModalDetalleRutaProps): JSX.Element {
    /* Calcular pérdidas totales en el proceso de conversión */
    const perdidaTotal = detalle.pasos.reduce((suma, paso) => {
        return suma + (paso.comision || 0);
    }, 0);

    /* Calcular diferencia neta entre venta y lo recibido en PayPal */
    const ventaInicial = detalle.pasos[0]?.entrada || 0;
    const diferenciaConversion = ventaInicial - detalle.totalFinal;

    return (
        <div className="fondoModal" onClick={onCerrar}>
            <div className="contenidoModal" onClick={e => e.stopPropagation()}>
                <header className="cabeceraModal">
                    <h3 className="tituloModal">
                        Desglose Ruta {ruta}
                        <span className="subtituloModal">{ruta === 'A' ? 'USD → Bs → USDT → PayPal' : 'USD → Bs → PayPal directo'}</span>
                    </h3>
                    {/* sentinel-disable-next-line emoji-en-codigo — simbolo tipografico de cierre */}
                    <Boton claseAdicional="botonCerrarModal" onClick={onCerrar} aria-label="Cerrar">
                        ✕
                    </Boton>
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

                    {/* Pasos del proceso con pérdida individual */}
                    <div className="seccionModal">
                        <h4 className="tituloSeccionModal">Proceso de Conversión</h4>
                        <div className="listaPasos">
                            {detalle.pasos.map((paso, index) => {
                                /* Calcular pérdida en este paso si la unidad de entrada/salida son comparables */
                                const tienePerdida = paso.comision !== undefined && paso.comision > 0;

                                return (
                                    <div key={paso.descripcion} className="pasoConversion">
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
                                            <div className="metasPaso">
                                                {paso.tasa && <span className="tasaPaso">Tasa: {paso.tasa}</span>}
                                                {tienePerdida && <span className="comisionPaso negativo">Pérdida: -{formatearMoneda(paso.comision!)}</span>}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Resumen de pérdidas en conversión */}
                    <div className="seccionModal seccionPerdidas">
                        <h4 className="tituloSeccionModal">Pérdidas en Conversión</h4>
                        <div className="filaModal">
                            <span className="claveModal">Comisiones totales</span>
                            <span className="valorModal negativo">-{formatearMoneda(perdidaTotal)}</span>
                        </div>
                        <div className="filaModal">
                            <span className="claveModal">Diferencia USD venta → USD PayPal</span>
                            <span className={`valorModal ${diferenciaConversion <= 0 ? 'positivo' : 'negativo'}`}>{diferenciaConversion > 0 ? `-${formatearMoneda(diferenciaConversion)}` : `+${formatearMoneda(Math.abs(diferenciaConversion))}`}</span>
                        </div>
                        <div className="filaModal">
                            <span className="claveModal">Eficiencia de conversión</span>
                            <span className="valorModal">{ventaInicial > 0 ? ((detalle.totalFinal / ventaInicial) * 100).toFixed(2) : 0}%</span>
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
