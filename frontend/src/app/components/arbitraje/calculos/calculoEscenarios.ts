/* [H-F13-01] Cálculo de escenarios de arbitraje (rutas A y B), extraído de
 * useArbitraje: función pura — `tasas` pasa a ser parámetro explícito. */

import type {DetalleRuta, ResultadoEscenario, TasasConversion} from '../types/arbitraje.types';

export function calcularEscenario(
    tasas: TasasConversion,
    nombre: string,
    tipo: 'pesimista' | 'realista' | 'optimista',
    costoProductoVal: number,
    costoEnvioVal: number,
    precioVentaVal: number
): ResultadoEscenario {
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
}
