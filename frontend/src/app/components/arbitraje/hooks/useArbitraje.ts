/*
 * Hook de lógica para la calculadora de arbitraje
 * Extrae toda la lógica de cálculos del componente principal
 */

import {useMemo} from 'react';
import {useLocalStorage} from '../../../hooks/useLocalStorage';
import type {RangoValor, TasasConversion, ResultadoEscenario, DetalleRuta, ModoSimulacion, EstadoViabilidad, SimulacionCiclos, ResultadoSimulacionEscenario} from '../types/arbitraje.types';

interface UseArbitrajeReturn {
    /* Estados */
    costoProducto: RangoValor;
    costoEnvio: RangoValor;
    precioVenta: RangoValor;
    tasas: TasasConversion;
    numeroCiclos: number;
    modoSimulacion: ModoSimulacion;
    /* Setters */
    setCostoProducto: React.Dispatch<React.SetStateAction<RangoValor>>;
    setCostoEnvio: React.Dispatch<React.SetStateAction<RangoValor>>;
    setPrecioVenta: React.Dispatch<React.SetStateAction<RangoValor>>;
    setTasas: React.Dispatch<React.SetStateAction<TasasConversion>>;
    setNumeroCiclos: React.Dispatch<React.SetStateAction<number>>;
    setModoSimulacion: React.Dispatch<React.SetStateAction<ModoSimulacion>>;
    /* Cálculos */
    escenarios: ResultadoEscenario[];
    simulacionCiclos: SimulacionCiclos;
    viabilidad: EstadoViabilidad;
}

export function useArbitraje(): UseArbitrajeReturn {
    /* Estados para inputs de compra (Persistentes) */
    const {valor: costoProducto, setValor: setCostoProducto} = useLocalStorage<RangoValor>('arbitraje_costoProducto', {
        valorPorDefecto: {min: 200, max: 200}
    });

    const {valor: costoEnvio, setValor: setCostoEnvio} = useLocalStorage<RangoValor>('arbitraje_costoEnvio', {
        valorPorDefecto: {min: 50, max: 100}
    });

    /* Estados para inputs de venta (Persistentes) */
    const {valor: precioVenta, setValor: setPrecioVenta} = useLocalStorage<RangoValor>('arbitraje_precioVenta', {
        valorPorDefecto: {min: 300, max: 500}
    });

    /* Estados para tasas de conversión (Persistentes) */
    const {valor: tasas, setValor: setTasas} = useLocalStorage<TasasConversion>('arbitraje_tasas', {
        valorPorDefecto: {
            usdABs: 470,
            bsAPaypal: 431,
            usdtAPaypal: 0.996,
            comisionBinance: 0.1,
            comisionPaypal: 5.7
        }
    });

    /* Estado para simulador de ciclos (Persistentes) */
    const {valor: numeroCiclos, setValor: setNumeroCiclos} = useLocalStorage<number>('arbitraje_numeroCiclos', {
        valorPorDefecto: 5
    });

    const {valor: modoSimulacion, setValor: setModoSimulacion} = useLocalStorage<ModoSimulacion>('arbitraje_modoSimulacion', {
        valorPorDefecto: 'fijo'
    });

    /* Cálculo de escenarios */
    const escenarios = useMemo((): ResultadoEscenario[] => {
        const calcularEscenario = (nombre: string, tipo: 'pesimista' | 'realista' | 'optimista', costoProductoVal: number, costoEnvioVal: number, precioVentaVal: number): ResultadoEscenario => {
            const costoTotal = costoProductoVal + costoEnvioVal;
            const ventaUsd = precioVentaVal;

            /* Ruta A: USD → Bs (tasa USDT) → USDT (Binance) → PayPal */
            const bolivaresRutaA = ventaUsd * tasas.usdABs;
            const usdtObtenidos = bolivaresRutaA / tasas.usdABs;
            const comisionVentaUsdt = usdtObtenidos * (tasas.comisionBinance / 100);
            const usdtNeto = usdtObtenidos - comisionVentaUsdt;
            /* Paso 1: Exchange USDT → USD PayPal (antes de comisión PayPal) */
            const paypalBrutoRutaA = usdtNeto * tasas.usdtAPaypal;
            /* Paso 2: PayPal cobra comisión sobre el monto recibido */
            const comisionPaypalRutaA = paypalBrutoRutaA * (tasas.comisionPaypal / 100);
            const paypalRutaA = paypalBrutoRutaA - comisionPaypalRutaA;
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
                        salida: paypalBrutoRutaA,
                        unidadEntrada: 'USDT',
                        unidadSalida: 'USD PayPal (bruto)',
                        tasa: `${tasas.usdtAPaypal} $/USDT`,
                        comision: comisionVentaUsdt
                    },
                    {
                        descripcion: `Comisión PayPal (${tasas.comisionPaypal}%)`,
                        entrada: paypalBrutoRutaA,
                        salida: paypalRutaA,
                        unidadEntrada: 'USD PayPal (bruto)',
                        unidadSalida: 'USD PayPal (neto)',
                        comision: comisionPaypalRutaA
                    }
                ],
                totalFinal: paypalRutaA,
                ganancia: gananciaRutaA
            };

            /* Ruta B: USD → Bs → PayPal directo */
            const bolivaresRutaB = ventaUsd * tasas.usdABs;
            /* Paso 1: Comprar saldo PayPal (Monto Bruto enviado por el tercero) */
            const paypalBrutoRutaB = bolivaresRutaB / tasas.bsAPaypal;
            /* Paso 2: Comisión PayPal sobre el monto recibido */
            const comisionPaypalRutaB = paypalBrutoRutaB * (tasas.comisionPaypal / 100);
            const paypalRutaB = paypalBrutoRutaB - comisionPaypalRutaB;
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
                        descripcion: 'Comprar saldo PayPal (Monto Bruto)',
                        entrada: bolivaresRutaB,
                        salida: paypalBrutoRutaB,
                        unidadEntrada: 'Bs',
                        unidadSalida: 'USD PayPal (bruto)',
                        tasa: `${tasas.bsAPaypal} Bs/$PP`
                    },
                    {
                        descripcion: `Comisión PayPal (${tasas.comisionPaypal}%)`,
                        entrada: paypalBrutoRutaB,
                        salida: paypalRutaB,
                        unidadEntrada: 'USD PayPal (bruto)',
                        unidadSalida: 'USD PayPal (neto)',
                        comision: comisionPaypalRutaB
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
    const simulacionCiclos = useMemo((): SimulacionCiclos => {
        const calcularEscenarioSimulacion = (escenario: ResultadoEscenario): ResultadoSimulacionEscenario => {
            const capitalInicial = escenario.costoTotal;

            if (modoSimulacion === 'fijo') {
                const gananciaA = escenario.gananciaRutaA * numeroCiclos;
                const gananciaB = escenario.gananciaRutaB * numeroCiclos;
                const mejorGanancia = Math.max(gananciaA, gananciaB);
                const rutaMejor = gananciaA >= gananciaB ? 'A' : 'B';
                const capitalFinalMejor = capitalInicial + mejorGanancia;

                return {
                    gananciaMejor: mejorGanancia,
                    gananciaA,
                    gananciaB,
                    capitalFinalMejor,
                    capitalFinalA: capitalInicial + gananciaA,
                    capitalFinalB: capitalInicial + gananciaB,
                    rutaMejor
                };
            }

            /* Modo reinversión: compounding */
            const calcularCompounding = (gananciaBase: number, costoBase: number) => {
                let capital = costoBase; /* Empezamos con el capital justo para 1 unidad en este escenario */
                let gananciaAcumulada = 0;

                for (let i = 0; i < numeroCiclos; i++) {
                    const productosComprables = Math.floor(capital / costoBase);
                    if (productosComprables <= 0) break;

                    const gananciaDelCiclo = productosComprables * gananciaBase;
                    gananciaAcumulada += gananciaDelCiclo;
                    capital = capital + gananciaDelCiclo;
                }

                return {gananciaTotal: gananciaAcumulada, capitalFinal: capital};
            };

            const simA = calcularCompounding(escenario.gananciaRutaA, escenario.costoTotal);
            const simB = calcularCompounding(escenario.gananciaRutaB, escenario.costoTotal);

            const mejorGanancia = Math.max(simA.gananciaTotal, simB.gananciaTotal);
            const rutaMejor = simA.gananciaTotal >= simB.gananciaTotal ? 'A' : 'B';

            return {
                gananciaMejor: mejorGanancia,
                gananciaA: simA.gananciaTotal,
                gananciaB: simB.gananciaTotal,
                capitalFinalMejor: rutaMejor === 'A' ? simA.capitalFinal : simB.capitalFinal,
                capitalFinalA: simA.capitalFinal,
                capitalFinalB: simB.capitalFinal,
                rutaMejor
            };
        };

        const pesimista = calcularEscenarioSimulacion(escenarios[0]);
        const realista = calcularEscenarioSimulacion(escenarios[1]);
        const optimista = calcularEscenarioSimulacion(escenarios[2]);

        /* Inversión total mostrada (basada en realista para referencia) */
        let inversionTotalRef = 0;
        if (modoSimulacion === 'fijo') {
            inversionTotalRef = escenarios[1].costoTotal * numeroCiclos;
        } else {
            inversionTotalRef = escenarios[1].costoTotal;
        }

        return {
            pesimista,
            realista,
            optimista,
            inversionTotal: inversionTotalRef
        };
    }, [escenarios, numeroCiclos, modoSimulacion]);

    /* Determinar viabilidad del negocio */
    const viabilidad = useMemo((): EstadoViabilidad => {
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

    return {
        costoProducto,
        costoEnvio,
        precioVenta,
        tasas,
        numeroCiclos,
        modoSimulacion,
        setCostoProducto,
        setCostoEnvio,
        setPrecioVenta,
        setTasas,
        setNumeroCiclos,
        setModoSimulacion,
        escenarios,
        simulacionCiclos,
        viabilidad
    };
}
