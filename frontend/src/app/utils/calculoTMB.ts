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
    const base = 10 * peso + 6.25 * altura - 5 * edad;
    return sexo === 'masculino' ? base + 5 : base - 161;
}

/*
 * Estimación alternativa con cintura y altura
 * Fórmula basada en correlación WHtR con BMI approx
 */
function calcularTMBCinturaAltura(cintura: number, altura: number, sexo?: 'masculino' | 'femenino'): number {
    const ratio = cintura / altura;
    const alturaM = altura / 100;

    /*
     * CORRECCIÓN: La fórmula anterior (ratio * 100) asumía BMI = WHtR%, resultando en valores >60.
     * Heurística ajustada: BMI ≈ Ratio * 50 (para fines de estimación general)
     * Ej: Ratio 0.6 (Obeso) -> BMI 30. Ratio 0.5 (Sano) -> BMI 25.
     */
    const bmiEstimado = ratio * 50; // Factor simplificador más realista
    const pesoEstimado = bmiEstimado * alturaM * alturaM;

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

    /* Intentar Mifflin-St Jeor si tenemos al menos peso y altura (prioridad sobre cintura) */
    if (peso && altura) {
        // Usamos defaults sensatos si faltan edad o sexo para aprovechar el dato de peso real
        tmbBase = calcularTMBMifflin(peso, altura, edad || 30, sexo || 'masculino');
    } else if (cintura && altura) {
        /* Fallback: cintura + altura */
        tmbBase = calcularTMBCinturaAltura(cintura, altura, sexo);
    } else {
        /* Sin datos suficientes */
        return null;
    }

    const factor = obtenerFactorActividad(ejercicioSesiones, ejercicioMinutos);
    return Math.round(tmbBase * factor);
}

/*
 * Formatea el texto explicativo de qué fórmula se usó
 */
export function obtenerMetodoCalculo(datos: DatosUsuarioTMB): string {
    if (datos.peso && datos.altura) {
        if (datos.edad && datos.sexo) return 'Mifflin-St Jeor';
        return 'Mifflin-St Jeor (Estimado)';
    }
    if (datos.cintura && datos.altura) {
        return 'Estimación cintura/altura';
    }
    return 'Sin datos suficientes';
}

/* [H-F15-01] Objetivos de macros: objetivosMacro.ts */
export {calcularObjetivosMacro} from './objetivosMacro';
export type {ObjetivosNutricionales} from './objetivosMacro';
