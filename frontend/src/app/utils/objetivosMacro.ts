/*
 * utils/objetivosMacro.ts
 * [H-F15-01] Cálculo de objetivos de macros y calorías diarios (extraído de
 * calculoTMB.ts).
 */

import type {DatosUsuarioTMB} from '../types/deficitCalorico';

export interface ObjetivosNutricionales {
    calorias: number;
    proteinas: number /* gramos */;
    carbohidratos: number /* gramos */;
    grasas: number /* gramos */;
    azucar: number /* gramos (límite máximo) */;
    deficitDiario: number;
}

/*
 * Calcula objetivos de macros y calorías diarios
 * Basado en TDEE, objetivo de déficit seleccionado y distribución estándar
 */
export function calcularObjetivosMacro(tdee: number, objetivo: DatosUsuarioTMB['objetivoDeficit']): ObjetivosNutricionales {
    let deficit = 0;

    switch (objetivo) {
        case 'bajo':
            deficit = 250;
            break;
        case 'moderado':
            deficit = 500;
            break;
        case 'alto':
            deficit = 750;
            break;
        case 'peligroso':
            deficit = 1000;
            break;
        default:
            deficit = 500; /* Moderado por defecto */
    }

    /* Calorías objetivo (mínimo de seguridad 1200 para evitar desnutrición severa automática) */
    const caloriasObjetivo = Math.max(tdee - deficit, 1200);

    /*
     * Distribución de Macros Estándar (Balanceada):
     * Proteínas: 30% (4 kcal/g) - Importante para mantener masa muscular en déficit
     * Carbohidratos: 40% (4 kcal/g) - Energía
     * Grasas: 30% (9 kcal/g) - Hormonal
     */
    const proteinas = Math.round((caloriasObjetivo * 0.3) / 4);
    const carbohidratos = Math.round((caloriasObjetivo * 0.4) / 4);
    const grasas = Math.round((caloriasObjetivo * 0.3) / 9);

    /*
     * Azúcar: Límite recomendado OMS < 10% de calorías totales (ideal < 5%)
     * Usamos 10% como límite "máximo"
     */
    const azucar = Math.round((caloriasObjetivo * 0.1) / 4);

    return {
        calorias: caloriasObjetivo,
        proteinas,
        carbohidratos,
        grasas,
        azucar,
        deficitDiario: deficit
    };
}
