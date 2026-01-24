/*
 * Simulador de ciclos de inversión
 * Permite simular múltiples ciclos con inversión fija o reinversión
 */

import type {SimuladorCiclosProps} from './types/arbitraje.types';
import {formatearMoneda} from './utils/arbitraje.utils';

export function SimuladorCiclos({numeroCiclos, modoSimulacion, simulacionCiclos, costoTotalRealista, onNumeroCiclosChange, onModoSimulacionChange}: SimuladorCiclosProps): JSX.Element {
    const handleCiclosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onNumeroCiclosChange(Math.max(1, parseInt(e.target.value) || 1));
    };

    return (
        <section className="seccionSimulador">
            <header className="cabeceraSimulador">
                <h2 className="tituloSimulador">Simulador de Ciclos</h2>
                <div className="controlesSimulador">
                    <div className="controlCiclos">
                        <input type="number" className="inputCiclos" value={numeroCiclos} onChange={handleCiclosChange} min="1" max="100" />
                        <span className="etiquetaCiclos">ciclos</span>
                    </div>
                    <div className="toggleModoSimulacion">
                        <button className={`botonModo ${modoSimulacion === 'fijo' ? 'activo' : ''}`} onClick={() => onModoSimulacionChange('fijo')}>
                            Inversión Fija
                        </button>
                        <button className={`botonModo ${modoSimulacion === 'reinversion' ? 'activo' : ''}`} onClick={() => onModoSimulacionChange('reinversion')}>
                            Reinversión
                        </button>
                    </div>
                </div>
            </header>

            <p className="descripcionModo">{modoSimulacion === 'fijo' ? 'Cada ciclo inviertes el mismo monto inicial. Las ganancias se acumulan sin reinvertir.' : 'Cada ciclo reinviertes todo el capital (ganancias + inversión). Efecto compuesto.'}</p>

            <div className="resultadosSimulador">
                <div className="resultadoCiclo">
                    <span className={`valorCiclo ${simulacionCiclos.pesimista.gananciaMejor >= 0 ? 'positivo' : ''}`}>{formatearMoneda(simulacionCiclos.pesimista.gananciaMejor)}</span>
                    <span className="etiquetaCiclo">Ganancia pesimista (Ruta {simulacionCiclos.pesimista.rutaMejor})</span>
                    <span className="capitalFinalCiclo">Capital final: {formatearMoneda(simulacionCiclos.pesimista.capitalFinalMejor)}</span>
                    <small className="detalleAlternativo">
                        vs Ruta {simulacionCiclos.pesimista.rutaMejor === 'A' ? 'B' : 'A'}: {formatearMoneda(simulacionCiclos.pesimista.rutaMejor === 'A' ? simulacionCiclos.pesimista.gananciaB : simulacionCiclos.pesimista.gananciaA)}
                    </small>
                </div>
                <div className="resultadoCiclo">
                    <span className={`valorCiclo ${simulacionCiclos.realista.gananciaMejor >= 0 ? 'positivo' : ''}`}>{formatearMoneda(simulacionCiclos.realista.gananciaMejor)}</span>
                    <span className="etiquetaCiclo">Ganancia realista (Ruta {simulacionCiclos.realista.rutaMejor})</span>
                    <span className="capitalFinalCiclo">Capital final: {formatearMoneda(simulacionCiclos.realista.capitalFinalMejor)}</span>
                    <small className="detalleAlternativo">
                        vs Ruta {simulacionCiclos.realista.rutaMejor === 'A' ? 'B' : 'A'}: {formatearMoneda(simulacionCiclos.realista.rutaMejor === 'A' ? simulacionCiclos.realista.gananciaB : simulacionCiclos.realista.gananciaA)}
                    </small>
                </div>
                <div className="resultadoCiclo">
                    <span className={`valorCiclo ${simulacionCiclos.optimista.gananciaMejor >= 0 ? 'positivo' : ''}`}>{formatearMoneda(simulacionCiclos.optimista.gananciaMejor)}</span>
                    <span className="etiquetaCiclo">Ganancia optimista (Ruta {simulacionCiclos.optimista.rutaMejor})</span>
                    <span className="capitalFinalCiclo">Capital final: {formatearMoneda(simulacionCiclos.optimista.capitalFinalMejor)}</span>
                    <small className="detalleAlternativo">
                        vs Ruta {simulacionCiclos.optimista.rutaMejor === 'A' ? 'B' : 'A'}: {formatearMoneda(simulacionCiclos.optimista.rutaMejor === 'A' ? simulacionCiclos.optimista.gananciaB : simulacionCiclos.optimista.gananciaA)}
                    </small>
                </div>
            </div>

            <p className="notaInfo">{modoSimulacion === 'fijo' ? `Inversión total: ${formatearMoneda(simulacionCiclos.inversionTotal)} (${formatearMoneda(costoTotalRealista)} × ${numeroCiclos})` : `Inversión inicial: ${formatearMoneda(simulacionCiclos.inversionTotal)} (se reinvierte cada ciclo)`}</p>
        </section>
    );
}
