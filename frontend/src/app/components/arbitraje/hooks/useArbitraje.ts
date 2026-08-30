/*
 * Hook de lógica para la calculadora de arbitraje
 * Extrae toda la lógica de cálculos del componente principal
 * [H-F13-01] Los cálculos puros viven en calculos/calculoEscenarios.ts y
 * calculos/simulacionCiclos.ts; aquí solo estados persistentes + composición.
 */

import {useMemo} from 'react';
import {useLocalStorage} from '../../../hooks/useLocalStorage';
import type {RangoValor, TasasConversion, ResultadoEscenario, ModoSimulacion, EstadoViabilidad, SimulacionCiclos} from '../types/arbitraje.types';
import {calcularEscenario} from '../calculos/calculoEscenarios';
import {calcularSimulacionCiclos} from '../calculos/simulacionCiclos';

interface UseArbitrajeEstados {
    costoProducto: RangoValor;
    costoEnvio: RangoValor;
    precioVenta: RangoValor;
    tasas: TasasConversion;
    numeroCiclos: number;
    modoSimulacion: ModoSimulacion;
}

interface UseArbitrajeSetters {
    setCostoProducto: React.Dispatch<React.SetStateAction<RangoValor>>;
    setCostoEnvio: React.Dispatch<React.SetStateAction<RangoValor>>;
    setPrecioVenta: React.Dispatch<React.SetStateAction<RangoValor>>;
    setTasas: React.Dispatch<React.SetStateAction<TasasConversion>>;
    setNumeroCiclos: React.Dispatch<React.SetStateAction<number>>;
    setModoSimulacion: React.Dispatch<React.SetStateAction<ModoSimulacion>>;
}

interface UseArbitrajeCalculos {
    escenarios: ResultadoEscenario[];
    simulacionCiclos: SimulacionCiclos;
    viabilidad: EstadoViabilidad;
}

interface UseArbitrajeReturn extends UseArbitrajeEstados, UseArbitrajeSetters, UseArbitrajeCalculos {}

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

    /* Cálculo de escenarios (pesimista/realista/optimista) */
    const escenarios = useMemo((): ResultadoEscenario[] => {
        const costoProductoPromedio = (costoProducto.min + costoProducto.max) / 2;
        const costoEnvioPromedio = (costoEnvio.min + costoEnvio.max) / 2;
        const precioVentaPromedio = (precioVenta.min + precioVenta.max) / 2;

        return [
            calcularEscenario(tasas, 'Pesimista', 'pesimista', costoProducto.max, costoEnvio.max, precioVenta.min),
            calcularEscenario(tasas, 'Realista', 'realista', costoProductoPromedio, costoEnvioPromedio, precioVentaPromedio),
            calcularEscenario(tasas, 'Optimista', 'optimista', costoProducto.min, costoEnvio.min, precioVenta.max)
        ];
    }, [costoProducto, costoEnvio, precioVenta, tasas]);

    /* Simulación de ciclos con opción de reinversión */
    const simulacionCiclos = useMemo(
        () => calcularSimulacionCiclos(escenarios, modoSimulacion, numeroCiclos),
        [escenarios, numeroCiclos, modoSimulacion]
    );

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
