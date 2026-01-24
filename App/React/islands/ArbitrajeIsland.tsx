/*
 * ArbitrajeIsland.tsx
 * Calculadora de arbitraje para compra/venta internacional
 *
 * Flujo: Compra eBay → Venta local → Conversión USD→Bs→USDT→PayPal
 * Compara dos rutas de conversión y simula ganancias por ciclos
 */

import {useState, useMemo} from 'react';

/* Tipos para la calculadora */
interface RangoValor {
    min: number;
    max: number;
}

interface TasasConversion {
    usdABs: number;
    bsAPaypal: number;
    usdtAPaypal: number;
    comisionBinance: number;
}

interface DetalleRuta {
    pasos: {descripcion: string; entrada: number; salida: number; unidadEntrada: string; unidadSalida: string; tasa?: string; comision?: number}[];
    totalFinal: number;
    ganancia: number;
}

interface ResultadoEscenario {
    nombre: string;
    tipo: 'pesimista' | 'realista' | 'optimista';
    costoTotal: number;
    ventaUsd: number;
    gananciaRutaA: number;
    gananciaRutaB: number;
    mejorRuta: 'A' | 'B';
    roi: number;
    margen: number;
    breakeven: number;
    detalleRutaA: DetalleRuta;
    detalleRutaB: DetalleRuta;
}

type ModoSimulacion = 'fijo' | 'reinversion';

/* Props del componente */
interface ArbitrajeIslandProps {
    titulo?: string;
}

/* Componente Modal para detalles de ruta */
function ModalDetalleRuta({ruta, detalle, costoTotal, onCerrar}: {ruta: 'A' | 'B'; detalle: DetalleRuta; costoTotal: number; onCerrar: () => void}): JSX.Element {
    const formatearMoneda = (valor: number, decimales = 2): string => {
        const signo = valor >= 0 ? '' : '-';
        return `${signo}$${Math.abs(valor).toFixed(decimales)}`;
    };

    const formatearNumero = (valor: number, decimales = 2): string => {
        return valor.toLocaleString('es-ES', {minimumFractionDigits: decimales, maximumFractionDigits: decimales});
    };

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

/* Componente principal */
export function ArbitrajeIsland({titulo = 'Calculadora de Arbitraje'}: ArbitrajeIslandProps): JSX.Element {
    /* Estados para inputs de compra */
    const [costoProducto, setCostoProducto] = useState<RangoValor>({min: 200, max: 200});
    const [costoEnvio, setCostoEnvio] = useState<RangoValor>({min: 50, max: 100});

    /* Estados para inputs de venta */
    const [precioVenta, setPrecioVenta] = useState<RangoValor>({min: 300, max: 500});

    /* Estados para tasas de conversión */
    const [tasas, setTasas] = useState<TasasConversion>({
        usdABs: 470,
        bsAPaypal: 431,
        usdtAPaypal: 0.996,
        comisionBinance: 0.1
    });

    /* Estado para simulador de ciclos */
    const [numeroCiclos, setNumeroCiclos] = useState(5);
    const [modoSimulacion, setModoSimulacion] = useState<ModoSimulacion>('fijo');

    /* Estado para modal de detalle */
    const [modalDetalle, setModalDetalle] = useState<{ruta: 'A' | 'B'; detalle: DetalleRuta; costoTotal: number} | null>(null);

    /* Cálculo de escenarios */
    const escenarios = useMemo((): ResultadoEscenario[] => {
        const calcularEscenario = (nombre: string, tipo: 'pesimista' | 'realista' | 'optimista', costoProductoVal: number, costoEnvioVal: number, precioVentaVal: number): ResultadoEscenario => {
            const costoTotal = costoProductoVal + costoEnvioVal;
            const ventaUsd = precioVentaVal;

            /*
             * Ruta A: USD → Bs (tasa USDT) → USDT (Binance) → PayPal
             */
            const bolivaresRutaA = ventaUsd * tasas.usdABs;
            const usdtObtenidos = bolivaresRutaA / tasas.usdABs;
            const comisionVentaUsdt = usdtObtenidos * (tasas.comisionBinance / 100);
            const usdtNeto = usdtObtenidos - comisionVentaUsdt;
            const paypalRutaA = usdtNeto * tasas.usdtAPaypal;
            const gananciaRutaA = paypalRutaA - costoTotal;

            const detalleRutaA: DetalleRuta = {
                pasos: [
                    {
                        descripcion: 'Venta local: Recibir USD físico',
                        entrada: ventaUsd,
                        salida: ventaUsd,
                        unidadEntrada: 'USD (venta)',
                        unidadSalida: 'USD (efectivo)',
                        tasa: '1:1'
                    },
                    {
                        descripcion: 'Convertir USD a Bolívares',
                        entrada: ventaUsd,
                        salida: bolivaresRutaA,
                        unidadEntrada: 'USD',
                        unidadSalida: 'Bs',
                        tasa: `${tasas.usdABs} Bs/$`
                    },
                    {
                        descripcion: 'Comprar USDT con Bolívares (Binance P2P - Taker)',
                        entrada: bolivaresRutaA,
                        salida: usdtObtenidos,
                        unidadEntrada: 'Bs',
                        unidadSalida: 'USDT',
                        tasa: `${tasas.usdABs} Bs/USDT`,
                        comision: 0
                    },
                    {
                        descripcion: 'Vender USDT para PayPal (Binance P2P - Maker)',
                        entrada: usdtObtenidos,
                        salida: paypalRutaA,
                        unidadEntrada: 'USDT',
                        unidadSalida: 'USD PayPal',
                        tasa: `${tasas.usdtAPaypal} $/USDT`,
                        comision: comisionVentaUsdt
                    }
                ],
                totalFinal: paypalRutaA,
                ganancia: gananciaRutaA
            };

            /*
             * Ruta B: USD → Bs → PayPal directo
             */
            const bolivaresRutaB = ventaUsd * tasas.usdABs;
            const paypalRutaB = bolivaresRutaB / tasas.bsAPaypal;
            const gananciaRutaB = paypalRutaB - costoTotal;

            const detalleRutaB: DetalleRuta = {
                pasos: [
                    {
                        descripcion: 'Venta local: Recibir USD físico',
                        entrada: ventaUsd,
                        salida: ventaUsd,
                        unidadEntrada: 'USD (venta)',
                        unidadSalida: 'USD (efectivo)',
                        tasa: '1:1'
                    },
                    {
                        descripcion: 'Convertir USD a Bolívares',
                        entrada: ventaUsd,
                        salida: bolivaresRutaB,
                        unidadEntrada: 'USD',
                        unidadSalida: 'Bs',
                        tasa: `${tasas.usdABs} Bs/$`
                    },
                    {
                        descripcion: 'Comprar saldo PayPal directamente',
                        entrada: bolivaresRutaB,
                        salida: paypalRutaB,
                        unidadEntrada: 'Bs',
                        unidadSalida: 'USD PayPal',
                        tasa: `${tasas.bsAPaypal} Bs/$PP`
                    }
                ],
                totalFinal: paypalRutaB,
                ganancia: gananciaRutaB
            };

            const mejorGanancia = Math.max(gananciaRutaA, gananciaRutaB);
            const mejorRuta: 'A' | 'B' = gananciaRutaA >= gananciaRutaB ? 'A' : 'B';
            const roi = costoTotal > 0 ? (mejorGanancia / costoTotal) * 100 : 0;
            const margen = ventaUsd > 0 ? (mejorGanancia / ventaUsd) * 100 : 0;
            const breakeven = costoTotal / tasas.usdtAPaypal;

            return {
                nombre,
                tipo,
                costoTotal,
                ventaUsd,
                gananciaRutaA,
                gananciaRutaB,
                mejorRuta,
                roi,
                margen,
                breakeven,
                detalleRutaA,
                detalleRutaB
            };
        };

        const costoProductoPromedio = (costoProducto.min + costoProducto.max) / 2;
        const costoEnvioPromedio = (costoEnvio.min + costoEnvio.max) / 2;
        const precioVentaPromedio = (precioVenta.min + precioVenta.max) / 2;

        return [calcularEscenario('Pesimista', 'pesimista', costoProducto.max, costoEnvio.max, precioVenta.min), calcularEscenario('Realista', 'realista', costoProductoPromedio, costoEnvioPromedio, precioVentaPromedio), calcularEscenario('Optimista', 'optimista', costoProducto.min, costoEnvio.min, precioVenta.max)];
    }, [costoProducto, costoEnvio, precioVenta, tasas]);

    /* Simulación de ciclos con opción de reinversión */
    const simulacionCiclos = useMemo(() => {
        const pesimista = escenarios[0];
        const realista = escenarios[1];
        const optimista = escenarios[2];

        const mejorGananciaPesimista = Math.max(pesimista.gananciaRutaA, pesimista.gananciaRutaB);
        const mejorGananciaRealista = Math.max(realista.gananciaRutaA, realista.gananciaRutaB);
        const mejorGananciaOptimista = Math.max(optimista.gananciaRutaA, optimista.gananciaRutaB);

        if (modoSimulacion === 'fijo') {
            /* Modo fijo: misma inversión cada ciclo, ganancias se suman linealmente */
            return {
                pesimista: mejorGananciaPesimista * numeroCiclos,
                realista: mejorGananciaRealista * numeroCiclos,
                optimista: mejorGananciaOptimista * numeroCiclos,
                inversionTotal: realista.costoTotal * numeroCiclos,
                capitalFinalPesimista: realista.costoTotal + mejorGananciaPesimista * numeroCiclos,
                capitalFinalRealista: realista.costoTotal + mejorGananciaRealista * numeroCiclos,
                capitalFinalOptimista: realista.costoTotal + mejorGananciaOptimista * numeroCiclos
            };
        }

        /* Modo reinversión: cada ciclo se reinvierte todo el capital (compounding) */
        const calcularCompounding = (capitalInicial: number, gananciaBase: number, costoBase: number, ciclos: number) => {
            let capital = capitalInicial;
            let gananciaAcumulada = 0;

            for (let i = 0; i < ciclos; i++) {
                /* Cuántos productos puedo comprar con el capital actual */
                const productosComprables = Math.floor(capital / costoBase);
                if (productosComprables <= 0) break;

                /* Ganancia de este ciclo */
                const gananciaDelCiclo = productosComprables * gananciaBase;
                gananciaAcumulada += gananciaDelCiclo;

                /* Reinvertir: capital queda igual más la ganancia */
                capital = capital + gananciaDelCiclo;
            }

            return {gananciaTotal: gananciaAcumulada, capitalFinal: capital};
        };

        const capitalInicial = realista.costoTotal;

        const resultadoPesimista = calcularCompounding(capitalInicial, mejorGananciaPesimista, pesimista.costoTotal, numeroCiclos);
        const resultadoRealista = calcularCompounding(capitalInicial, mejorGananciaRealista, realista.costoTotal, numeroCiclos);
        const resultadoOptimista = calcularCompounding(capitalInicial, mejorGananciaOptimista, optimista.costoTotal, numeroCiclos);

        return {
            pesimista: resultadoPesimista.gananciaTotal,
            realista: resultadoRealista.gananciaTotal,
            optimista: resultadoOptimista.gananciaTotal,
            inversionTotal: capitalInicial,
            capitalFinalPesimista: resultadoPesimista.capitalFinal,
            capitalFinalRealista: resultadoRealista.capitalFinal,
            capitalFinalOptimista: resultadoOptimista.capitalFinal
        };
    }, [escenarios, numeroCiclos, modoSimulacion]);

    /* Determinar viabilidad del negocio */
    const viabilidad = useMemo(() => {
        const pesimista = escenarios[0];
        const mejorGananciaPesimista = Math.max(pesimista.gananciaRutaA, pesimista.gananciaRutaB);

        if (mejorGananciaPesimista > 0) {
            return {estado: 'viable', mensaje: 'Rentable incluso en peor caso'};
        }

        const realista = escenarios[1];
        const mejorGananciaRealista = Math.max(realista.gananciaRutaA, realista.gananciaRutaB);

        if (mejorGananciaRealista > 0) {
            return {estado: 'riesgoso', mensaje: 'Rentable pero con riesgo de pérdida'};
        }

        return {estado: 'noViable', mensaje: 'No rentable en escenario realista'};
    }, [escenarios]);

    /* Helper para formatear moneda */
    const formatearMoneda = (valor: number, decimales = 2): string => {
        const signo = valor >= 0 ? '' : '-';
        return `${signo}$${Math.abs(valor).toFixed(decimales)}`;
    };

    /* Helper para actualizar rango */
    const actualizarRango = (setter: React.Dispatch<React.SetStateAction<RangoValor>>, campo: 'min' | 'max', valor: string) => {
        const numerico = parseFloat(valor) || 0;
        setter(prev => ({...prev, [campo]: numerico}));
    };

    /* Helper para actualizar tasas */
    const actualizarTasa = (campo: keyof TasasConversion, valor: string) => {
        const numerico = parseFloat(valor) || 0;
        setTasas(prev => ({...prev, [campo]: numerico}));
    };

    /* Abrir modal de detalle */
    const abrirDetalleRuta = (ruta: 'A' | 'B') => {
        const escenarioRealista = escenarios[1];
        const detalle = ruta === 'A' ? escenarioRealista.detalleRutaA : escenarioRealista.detalleRutaB;
        setModalDetalle({ruta, detalle, costoTotal: escenarioRealista.costoTotal});
    };

    return (
        <div id="calculadoraArbitraje" className="contenedorArbitraje">
            {/* Modal de detalle */}
            {modalDetalle && <ModalDetalleRuta ruta={modalDetalle.ruta} detalle={modalDetalle.detalle} costoTotal={modalDetalle.costoTotal} onCerrar={() => setModalDetalle(null)} />}

            {/* Cabecera */}
            <header className="cabeceraArbitraje">
                <div>
                    <h1 className="tituloArbitraje">{titulo}</h1>
                    <span className="subtituloArbitraje">eBay → Venta Local → USDT/PayPal</span>
                </div>
                <div className={`estadoViabilidad ${viabilidad.estado}`}>
                    <span className="iconoViabilidad">{viabilidad.estado === 'viable' ? '✓' : viabilidad.estado === 'riesgoso' ? '⚠' : '✗'}</span>
                    {viabilidad.mensaje}
                </div>
            </header>

            {/* Resumen rápido */}
            <div className="resumenRapido">
                <div className="itemResumen">
                    <span className="valorResumen">{formatearMoneda(escenarios[1].costoTotal)}</span>
                    <span className="etiquetaResumen">Inversión (realista)</span>
                </div>
                <div className="itemResumen">
                    <span className="valorResumen">{formatearMoneda(escenarios[1].ventaUsd)}</span>
                    <span className="etiquetaResumen">Venta esperada</span>
                </div>
                <div className="itemResumen">
                    <span className={`valorResumen ${Math.max(escenarios[1].gananciaRutaA, escenarios[1].gananciaRutaB) >= 0 ? 'positivo' : 'negativo'}`}>{formatearMoneda(Math.max(escenarios[1].gananciaRutaA, escenarios[1].gananciaRutaB))}</span>
                    <span className="etiquetaResumen">Ganancia neta</span>
                </div>
                <div className="itemResumen">
                    <span className="valorResumen">{escenarios[1].roi.toFixed(1)}%</span>
                    <span className="etiquetaResumen">ROI</span>
                </div>
                <div className="itemResumen">
                    <span className="valorResumen">Ruta {escenarios[1].mejorRuta}</span>
                    <span className="etiquetaResumen">Mejor opción</span>
                </div>
            </div>

            {/* Layout principal */}
            <div className="layoutArbitraje">
                {/* Panel de inputs */}
                <aside className="panelInputs">
                    {/* Sección: Compra */}
                    <section className="seccionInputs">
                        <h2 className="tituloSeccion">
                            <span className="iconoSeccion">$</span>
                            Costos de Compra
                        </h2>

                        <div className="grupoInputRango">
                            <label className="etiquetaInput">Costo Producto (USD)</label>
                            <div className="contenedorRango">
                                <input type="number" className="inputNumerico" value={costoProducto.min} onChange={e => actualizarRango(setCostoProducto, 'min', e.target.value)} placeholder="Min" />
                                <span className="separadorRango">a</span>
                                <input type="number" className="inputNumerico" value={costoProducto.max} onChange={e => actualizarRango(setCostoProducto, 'max', e.target.value)} placeholder="Max" />
                            </div>
                        </div>

                        <div className="grupoInputRango">
                            <label className="etiquetaInput">Costo Envío (USD)</label>
                            <div className="contenedorRango">
                                <input type="number" className="inputNumerico" value={costoEnvio.min} onChange={e => actualizarRango(setCostoEnvio, 'min', e.target.value)} placeholder="Min" />
                                <span className="separadorRango">a</span>
                                <input type="number" className="inputNumerico" value={costoEnvio.max} onChange={e => actualizarRango(setCostoEnvio, 'max', e.target.value)} placeholder="Max" />
                            </div>
                        </div>
                    </section>

                    {/* Sección: Venta */}
                    <section className="seccionInputs">
                        <h2 className="tituloSeccion">
                            <span className="iconoSeccion">↗</span>
                            Precio de Venta
                        </h2>

                        <div className="grupoInputRango">
                            <label className="etiquetaInput">Precio Venta Local (USD)</label>
                            <div className="contenedorRango">
                                <input type="number" className="inputNumerico" value={precioVenta.min} onChange={e => actualizarRango(setPrecioVenta, 'min', e.target.value)} placeholder="Min" />
                                <span className="separadorRango">a</span>
                                <input type="number" className="inputNumerico" value={precioVenta.max} onChange={e => actualizarRango(setPrecioVenta, 'max', e.target.value)} placeholder="Max" />
                            </div>
                        </div>
                    </section>

                    {/* Sección: Tasas de conversión */}
                    <section className="seccionInputs">
                        <h2 className="tituloSeccion">
                            <span className="iconoSeccion">⇄</span>
                            Tasas de Conversión
                        </h2>

                        <div className="grupoInputSimple">
                            <label className="etiquetaInput">Tasa USD → Bolívares</label>
                            <div className="inputConUnidad">
                                <input type="number" className="inputNumerico" value={tasas.usdABs} onChange={e => actualizarTasa('usdABs', e.target.value)} step="0.01" />
                                <span className="unidadInput">Bs/$</span>
                            </div>
                        </div>

                        <div className="grupoInputSimple">
                            <label className="etiquetaInput">Tasa Bs → PayPal</label>
                            <div className="inputConUnidad">
                                <input type="number" className="inputNumerico" value={tasas.bsAPaypal} onChange={e => actualizarTasa('bsAPaypal', e.target.value)} step="0.01" />
                                <span className="unidadInput">Bs/$PP</span>
                            </div>
                        </div>

                        <div className="grupoInputSimple">
                            <label className="etiquetaInput">Tasa USDT → PayPal</label>
                            <div className="inputConUnidad">
                                <input type="number" className="inputNumerico" value={tasas.usdtAPaypal} onChange={e => actualizarTasa('usdtAPaypal', e.target.value)} step="0.0001" />
                                <span className="unidadInput">$/USDT</span>
                            </div>
                        </div>

                        <div className="grupoInputSimple">
                            <label className="etiquetaInput">Comisión Binance (maker)</label>
                            <div className="inputConUnidad">
                                <input type="number" className="inputNumerico" value={tasas.comisionBinance} onChange={e => actualizarTasa('comisionBinance', e.target.value)} step="0.01" />
                                <span className="unidadInput">%</span>
                            </div>
                        </div>
                    </section>
                </aside>

                {/* Panel de resultados */}
                <main className="panelResultados">
                    {/* Tarjetas de escenarios */}
                    <div className="tarjetasEscenarios">
                        {escenarios.map(escenario => {
                            const mejorGanancia = Math.max(escenario.gananciaRutaA, escenario.gananciaRutaB);
                            return (
                                <article key={escenario.tipo} className={`tarjetaEscenario escenario${escenario.nombre}`}>
                                    <header className="cabeceraEscenario">
                                        <span className="nombreEscenario">{escenario.nombre}</span>
                                        <span className={`badgeEscenario badge${escenario.nombre}`}>Ruta {escenario.mejorRuta}</span>
                                    </header>

                                    <div className="metricaPrincipal">
                                        <span className={`valorMetrica ${mejorGanancia >= 0 ? 'positivo' : 'negativo'}`}>{formatearMoneda(mejorGanancia)}</span>
                                        <span className="etiquetaMetrica">Ganancia Neta</span>
                                    </div>

                                    <div className="listaDetalles">
                                        <div className="itemDetalle">
                                            <span className="claveDetalle">Inversión</span>
                                            <span className="valorDetalle">{formatearMoneda(escenario.costoTotal)}</span>
                                        </div>
                                        <div className="itemDetalle">
                                            <span className="claveDetalle">Venta</span>
                                            <span className="valorDetalle">{formatearMoneda(escenario.ventaUsd)}</span>
                                        </div>
                                        <div className="itemDetalle">
                                            <span className="claveDetalle">ROI</span>
                                            <span className="valorDetalle">{escenario.roi.toFixed(1)}%</span>
                                        </div>
                                        <div className="itemDetalle">
                                            <span className="claveDetalle">Margen</span>
                                            <span className="valorDetalle">{escenario.margen.toFixed(1)}%</span>
                                        </div>
                                        <div className="itemDetalle">
                                            <span className="claveDetalle">Break-even</span>
                                            <span className="valorDetalle">{formatearMoneda(escenario.breakeven)}</span>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>

                    {/* Comparación de rutas */}
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
                                <tr className={escenarios[1].mejorRuta === 'A' ? 'rutaGanadora' : 'rutaPerdedora'}>
                                    <td>Ruta A{escenarios[1].mejorRuta === 'A' && <span className="indicadorMejor">★</span>}</td>
                                    <td>USD → Bs → USDT → PayPal</td>
                                    <td>{formatearMoneda(escenarios[1].gananciaRutaA)}</td>
                                    <td>
                                        <button className="botonDetalle" onClick={() => abrirDetalleRuta('A')}>
                                            Ver desglose
                                        </button>
                                    </td>
                                </tr>
                                <tr className={escenarios[1].mejorRuta === 'B' ? 'rutaGanadora' : 'rutaPerdedora'}>
                                    <td>Ruta B{escenarios[1].mejorRuta === 'B' && <span className="indicadorMejor">★</span>}</td>
                                    <td>USD → Bs → PayPal directo</td>
                                    <td>{formatearMoneda(escenarios[1].gananciaRutaB)}</td>
                                    <td>
                                        <button className="botonDetalle" onClick={() => abrirDetalleRuta('B')}>
                                            Ver desglose
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </section>

                    {/* Simulador de ciclos */}
                    <section className="seccionSimulador">
                        <header className="cabeceraSimulador">
                            <h2 className="tituloSimulador">Simulador de Ciclos</h2>
                            <div className="controlesSimulador">
                                <div className="controlCiclos">
                                    <input type="number" className="inputCiclos" value={numeroCiclos} onChange={e => setNumeroCiclos(Math.max(1, parseInt(e.target.value) || 1))} min="1" max="100" />
                                    <span className="etiquetaCiclos">ciclos</span>
                                </div>
                                <div className="toggleModoSimulacion">
                                    <button className={`botonModo ${modoSimulacion === 'fijo' ? 'activo' : ''}`} onClick={() => setModoSimulacion('fijo')}>
                                        Inversión Fija
                                    </button>
                                    <button className={`botonModo ${modoSimulacion === 'reinversion' ? 'activo' : ''}`} onClick={() => setModoSimulacion('reinversion')}>
                                        Reinversión
                                    </button>
                                </div>
                            </div>
                        </header>

                        <p className="descripcionModo">{modoSimulacion === 'fijo' ? 'Cada ciclo inviertes el mismo monto inicial. Las ganancias se acumulan sin reinvertir.' : 'Cada ciclo reinviertes todo el capital (ganancias + inversión). Efecto compuesto.'}</p>

                        <div className="resultadosSimulador">
                            <div className="resultadoCiclo">
                                <span className={`valorCiclo ${simulacionCiclos.pesimista >= 0 ? 'positivo' : ''}`}>{formatearMoneda(simulacionCiclos.pesimista)}</span>
                                <span className="etiquetaCiclo">Ganancia pesimista</span>
                                <span className="capitalFinalCiclo">Capital final: {formatearMoneda(simulacionCiclos.capitalFinalPesimista)}</span>
                            </div>
                            <div className="resultadoCiclo">
                                <span className={`valorCiclo ${simulacionCiclos.realista >= 0 ? 'positivo' : ''}`}>{formatearMoneda(simulacionCiclos.realista)}</span>
                                <span className="etiquetaCiclo">Ganancia realista</span>
                                <span className="capitalFinalCiclo">Capital final: {formatearMoneda(simulacionCiclos.capitalFinalRealista)}</span>
                            </div>
                            <div className="resultadoCiclo">
                                <span className={`valorCiclo ${simulacionCiclos.optimista >= 0 ? 'positivo' : ''}`}>{formatearMoneda(simulacionCiclos.optimista)}</span>
                                <span className="etiquetaCiclo">Ganancia optimista</span>
                                <span className="capitalFinalCiclo">Capital final: {formatearMoneda(simulacionCiclos.capitalFinalOptimista)}</span>
                            </div>
                        </div>

                        <p className="notaInfo">{modoSimulacion === 'fijo' ? `Inversión total: ${formatearMoneda(simulacionCiclos.inversionTotal)} (${formatearMoneda(escenarios[1].costoTotal)} × ${numeroCiclos})` : `Inversión inicial: ${formatearMoneda(simulacionCiclos.inversionTotal)} (se reinvierte cada ciclo)`}</p>
                    </section>
                </main>
            </div>
        </div>
    );
}

export default ArbitrajeIsland;
