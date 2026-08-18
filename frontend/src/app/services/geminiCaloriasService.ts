/*
 * services/geminiCaloriasService.ts
 * Nombre legacy: el cálculo usa el proveedor IA central, no Gemini.
 * [243A-17] API Ninjas pasó a freemium: calories y protein_g son premium.
 * Solución: una llamada al proveedor IA central que entiende el input directamente y devuelve macros.
 * El modelo ya tiene el USDA FoodData Central en su entrenamiento — no hay que pasarle una tabla.
 * Flujo: Texto usuario -> proveedor IA (comprende + calcula macros) -> JSON macros
 */

import {enviarMensajeLLM, type ConfigProveedorIA} from './iaService';
import {esUsuarioAdmin, obtenerApiUrlWP, obtenerNonceWP} from '../utils/dashboardRuntime';

interface RespuestaCaloriasIA {
    calorias: number;
    proteinas: number;
    carbohidratos: number;
    grasas: number;
    azucar: number;
    descripcion: string;
    logProceso?: string[];
}

/*
 * Prompt compacto de nutrición.
 * [243A-17] Sin tabla embebida — el modelo usa su conocimiento del USDA.
 * [253A-8] Mejorado para medidas informales latinas (puños, tajadas, media),
 * porciones conservadoras estilo hogar y calibración regional venezolana.
 * Gotcha: "Venezuelan diet" en el prompt activa el conocimiento regional del modelo.
 * Las referencias de calibración evitan sobreestimaciones comunes del modelo.
 */
const PROMPT_NUTRICION = `You are a certified nutritionist estimating macros for a home-cooked Latin American diet.
Rules:
- Use USDA FoodData Central values. For Venezuelan/Latin foods use accurate regional data.
- Assume food is COOKED unless explicitly stated raw. This is critical for rice, pasta, grains (cooked rice ≈ 130 kcal/100g, NOT 360 kcal/100g raw).
- If fried (frito), account for absorbed oil. If with skin (con cuero), include it.
- Be conservative: use home-portion sizes, not restaurant. When uncertain, pick the lower reasonable estimate.
- Never fabricate values. Use the closest known food if exact data is unavailable.

Informal measurements (common in casual Spanish input):
- "puño" (handful) ≈ 75-85g of cooked grains/rice/pasta
- "tajada" (slice of fried ripe plantain) ≈ 35-45g per slice (~50-60 kcal each)
- "media arepa" = half an arepa. A standard homemade arepa (corn, no filling) ≈ 120-150 kcal, so half ≈ 60-75 kcal.
- "cucharada" (tablespoon) ≈ 15ml/15g. "Cucharadita" (teaspoon) ≈ 5ml.
- "pedazo"/"trozo" (piece) = a modest single portion unless context says otherwise.
- "plato" (plate) = a normal home serving, not heaped.
- If no quantity is specified, use ONE standard home serving.

Calibration references (use these as anchors):
- 1 arepa de maíz sin relleno: ~130 kcal
- 1 huevo entero: ~72 kcal
- 1 tajada de plátano maduro frito: ~55 kcal
- 100g arroz blanco cocido: ~130 kcal
- 1 puño arroz cocido (~80g): ~104 kcal

Respond ONLY with valid JSON, no markdown, no explanation.
JSON format:
{"calorias":<kcal>,"proteinas":<g>,"carbohidratos":<g>,"grasas":<g>,"azucar":<g>}`;

/*
 * Llama al proveedor IA central con el input del usuario directo (acepta español).
 * Gotcha: el JSON puede venir envuelto en backticks de markdown — se sanitiza.
 */
async function calcularMacrosIA(config: ConfigProveedorIA, descripcion: string): Promise<RespuestaCaloriasIA> {
    const respuesta = await enviarMensajeLLM([
        {role: 'system', content: PROMPT_NUTRICION},
        {role: 'user', content: descripcion}
    ], config, undefined, {temperature: 0.1, maxTokens: 180});
    const contenido = respuesta.contenido.trim();
    if (!contenido) {
        throw new Error('La IA devolvió una respuesta vacía; revisa modelo, proveedor o cuota disponible.');
    }

    /* Quitar posibles backticks de markdown */
    const jsonLimpio = contenido.replace(/^```[a-z]*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

    let macros: {calorias: number; proteinas: number; carbohidratos: number; grasas: number; azucar: number};
    try {
        macros = JSON.parse(jsonLimpio) as typeof macros;
    } catch {
        throw new Error(`JSON no parseable: "${jsonLimpio.slice(0, 120)}"`);
    }

    if (typeof macros.calorias !== 'number') {
        throw new Error(`JSON sin campo calorias: "${jsonLimpio.slice(0, 120)}"`);
    }

    return {
        calorias: Math.round(macros.calorias ?? 0),
        proteinas: Math.round(macros.proteinas ?? 0),
        carbohidratos: Math.round(macros.carbohidratos ?? 0),
        grasas: Math.round(macros.grasas ?? 0),
        azucar: Math.round(macros.azucar ?? 0),
        descripcion: ''
    };
}

async function calcularMacrosBackend(config: ConfigProveedorIA, descripcion: string): Promise<RespuestaCaloriasIA> {
    const respuesta = await fetch(`${obtenerApiUrlWP()}/ai/nutricion`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            'X-WP-Nonce': obtenerNonceWP()
        },
        body: JSON.stringify({descripcion, provider: config.proveedor, model: config.modelo})
    });

    const datos = await respuesta.json().catch(() => null) as {success?: boolean; data?: RespuestaCaloriasIA; error?: {message?: string}} | null;
    if (!respuesta.ok || !datos?.success || !datos.data) {
        throw new Error(datos?.error?.message || `Error del servidor de nutrición (${respuesta.status})`);
    }
    return {...datos.data, descripcion: datos.data.descripcion || descripcion.charAt(0).toUpperCase() + descripcion.slice(1)};
}

/*
 * Orquestador: intenta cada modelo en orden hasta que uno responda bien.
 */
export async function estimarCaloriasTexto(descripcion: string, config: ConfigProveedorIA): Promise<RespuestaCaloriasIA> {
    const log: string[] = [`[1] Input: "${descripcion}"`];
    try {
        log.push(`[2] Proveedor: ${config.proveedor} / ${config.modelo}`);
        const resultado = !config.apiKey && esUsuarioAdmin()
            ? await calcularMacrosBackend(config, descripcion)
            : await calcularMacrosIA(config, descripcion);
        log.push(`[3] OK ${config.modelo} — ${resultado.calorias}kcal P:${resultado.proteinas}g C:${resultado.carbohidratos}g G:${resultado.grasas}g A:${resultado.azucar}g`);
        return {
            ...resultado,
            descripcion: resultado.descripcion || descripcion.charAt(0).toUpperCase() + descripcion.slice(1),
            logProceso: log
        };
    } catch (e) {
        log.push(`[!] ${config.modelo}: ${e instanceof Error ? e.message : String(e)}`);
        console.warn('[Nutrición] Fallo proveedor IA:', e);
        const msg = e instanceof Error ? e.message : 'Ningún modelo respondió';
        throw new Error(`Error calculando macros: ${msg}`);
    }
}
