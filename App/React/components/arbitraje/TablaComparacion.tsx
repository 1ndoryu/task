/*
 * Tabla de comparación de rutas de conversión
 * Muestra las dos rutas lado a lado con botón de detalle
 */

import type {TablaComparacionProps} from './types/arbitraje.types';
import {formatearMoneda} from './utils/arbitraje.utils';
import {Boton} from '../ui/Boton';

export function TablaComparacion({escenarioRealista, onVerDetalle}: TablaComparacionProps): JSX.Element {
    return (
        <section className="seccionComparacion">
            <h2 className="tituloComparacion">Comparación de Rutas (Escenario Realista)</h2>
            <table className="tablaComparacion">
                <thead>
                    <tr>
                        <th>Ruta</th>
                        <th>Proceso</th>
                        <th>Ganancia</th>
                        <th>Detalle</th>
                    </tr>
                </thead>
                <tbody>
                    <tr className={escenarioRealista.mejorRuta === 'A' ? 'rutaGanadora' : 'rutaPerdedora'}>
                        {/* sentinel-disable-next-line emoji-en-codigo — indicador visual de mejor ruta */}
                        <td>Ruta A{escenarioRealista.mejorRuta === 'A' && <span className="indicadorMejor">★</span>}</td>
                        <td>USD → Bs → USDT → PayPal</td>
                        <td>{formatearMoneda(escenarioRealista.gananciaRutaA)}</td>
                        <td>
                            <Boton claseAdicional="botonDetalle" onClick={() => onVerDetalle('A')}>
                                Ver desglose
                            </Boton>
                        </td>
                    </tr>
                    <tr className={escenarioRealista.mejorRuta === 'B' ? 'rutaGanadora' : 'rutaPerdedora'}>
                        {/* sentinel-disable-next-line emoji-en-codigo */}
                        <td>Ruta B{escenarioRealista.mejorRuta === 'B' && <span className="indicadorMejor">★</span>}</td>
                        <td>USD → Bs → PayPal directo</td>
                        <td>{formatearMoneda(escenarioRealista.gananciaRutaB)}</td>
                        <td>
                            <Boton claseAdicional="botonDetalle" onClick={() => onVerDetalle('B')}>
                                Ver desglose
                            </Boton>
                        </td>
                    </tr>
                </tbody>
            </table>
        </section>
    );
}
