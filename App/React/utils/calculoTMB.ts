/*
 * utils/calculoTMB.ts
 * Cálculo de Tasa Metabólica Basal (TMB) con fórmulas adaptativas
 * 
 * Fórmula primaria: Mifflin-St Jeor (peso + altura + edad + sexo)
 * Fórmula alternativa: Estimación con cintura + altura
 * Factor de actividad aplicado al resultado
 */

import type {DatosUsuarioTMB} from '../types/deficitCalorico';

/*
 * Mifflin-St Jeor (más precisa, requiere peso, altura, edad, sexo)
 * Hombres: TMB = (10 × peso) + (6.25 × altura) - (5 × edad) + 5
 * Mujeres: TMB = (10 × peso) + (6.25 × altura) - (5 × edad) - 161
 */
function calcularTMBMifflin(peso: number, altura: number, edad: number, sexo: 'masculino' | 'femenino'): number {
    const base = (10 * peso) + (6.25 * altura) - (5 * edad);
    return sexo === 'masculino' ? base + 5 : base - 161;
}

/*
 * Estimación alternativa con cintura y altura
 * Fórmula simplificada basada en relación cintura/altura
 * Menos precisa pero útil cuando no se tiene peso o edad
 */
function calcularTMBCinturaAltura(cintura: number, altura: number, sexo?: 'masculino' | 'femenino'): number {
    const ratio = cintura / altura;
    const alturaM = altura / 100;
    /* Estimación de peso aproximada basada en ratio y altura */
    const pesoEstimado = sexo === 'femenino'
        ? (ratio * 100 * alturaM * alturaM) * 1.1
        : (ratio * 100 * alturaM * alturaM) * 1.2;

    /* TMB estimada con peso aproximado */
    const edadEstimada = 30;
    return calcularTMBMifflin(pesoEstimado, altura, edadEstimada, sexo ?? 'masculino');
}

/*
 * Factor de actividad según ejercicio semanal
 * Basado en el estándar Harris-Benedict activity multipliers
 */
function obtenerFactorActividad(sesiones?: number, minutos?: number): number {
    if (!sesiones || sesiones === 0) return 1.2;
    const minutosTotal = (minutos ?? 30) * sesiones;
    if (minutosTotal < 90) return 1.375;
    if (minutosTotal < 270) return 1.55;
    if (minutosTotal < 450) return 1.725;
    return 1.9;
}

/*
 * Calcula la TMB + factor de actividad (TDEE)
 * Usa la mejor fórmula disponible según los datos proporcionados
 * Retorna null si no hay datos suficientes
 */
export function calcularTDEE(datos: DatosUsuarioTMB): number | null {
    const {peso, altura, edad, sexo, cintura, ejercicioSesiones, ejercicioMinutos} = datos;
    let tmbBase: number | null = null;

    /* Intentar Mifflin-St Jeor primero (más precisa) */
    if (peso && altura && edad && sexo) {
        tmbBase = calcularTMBMifflin(peso, altura, edad, sexo);
    }
    /* Fallback: cintura + altura */
    else if (cintura && altura) {
        tmbBase = calcularTMBCinturaAltura(cintura, altura, sexo);
    }
    /* Sin datos suficientes */
    else {
        return null;
    }

    const factor = obtenerFactorActividad(ejercicioSesiones, ejercicioMinutos);
    return Math.round(tmbBase * factor);
}

/*
 * Formatea el texto explicativo de qué fórmula se usó
 */
export function obtenerMetodoCalculo(datos: DatosUsuarioTMB): string {
    if (datos.peso && datos.altura && datos.edad && datos.sexo) {
        return 'Mifflin-St Jeor';
    }
    if (datos.cintura && datos.altura) {
        return 'Estimación cintura/altura';
    }
    return 'Sin datos suficientes';
}
