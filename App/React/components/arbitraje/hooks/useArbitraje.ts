/*
 * Hook de lógica para la calculadora de arbitraje
 * Extrae toda la lógica de cálculos del componente principal
 */

import {useState, useMemo} from 'react';
import type {RangoValor, TasasConversion, ResultadoEscenario, DetalleRuta, ModoSimulacion, EstadoViabilidad, SimulacionCiclos} from '../types/arbitraje.types';

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

            /* Ruta B: USD → Bs → PayPal directo */
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
    const simulacionCiclos = useMemo((): SimulacionCiclos => {
        const pesimista = escenarios[0];
        const realista = escenarios[1];
        const optimista = escenarios[2];

        const mejorGananciaPesimista = Math.max(pesimista.gananciaRutaA, pesimista.gananciaRutaB);
        const mejorGananciaRealista = Math.max(realista.gananciaRutaA, realista.gananciaRutaB);
        const mejorGananciaOptimista = Math.max(optimista.gananciaRutaA, optimista.gananciaRutaB);

        if (modoSimulacion === 'fijo') {
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

        /* Modo reinversión: compounding */
        const calcularCompounding = (capitalInicial: number, gananciaBase: number, costoBase: number, ciclos: number) => {
            let capital = capitalInicial;
            let gananciaAcumulada = 0;

            for (let i = 0; i < ciclos; i++) {
                const productosComprables = Math.floor(capital / costoBase);
                if (productosComprables <= 0) break;

                const gananciaDelCiclo = productosComprables * gananciaBase;
                gananciaAcumulada += gananciaDelCiclo;
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
