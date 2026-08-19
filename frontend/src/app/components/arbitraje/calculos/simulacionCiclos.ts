/* [H-F13-01] Simulación de ciclos (fijo y reinversión), extraída de
 * useArbitraje: funciones puras — los parámetros de estado pasan explícitos. */

import type {ModoSimulacion, ResultadoEscenario, ResultadoSimulacionEscenario, SimulacionCiclos} from '../types/arbitraje.types';

function calcularEscenarioSimulacion(escenario: ResultadoEscenario, modoSimulacion: ModoSimulacion, numeroCiclos: number): ResultadoSimulacionEscenario {
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
}

export function calcularSimulacionCiclos(escenarios: ResultadoEscenario[], modoSimulacion: ModoSimulacion, numeroCiclos: number): SimulacionCiclos {
    const pesimista = calcularEscenarioSimulacion(escenarios[0], modoSimulacion, numeroCiclos);
    const realista = calcularEscenarioSimulacion(escenarios[1], modoSimulacion, numeroCiclos);
    const optimista = calcularEscenarioSimulacion(escenarios[2], modoSimulacion, numeroCiclos);

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
}
