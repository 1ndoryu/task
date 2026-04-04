/*
 * services/geminiCaloriasService.ts
 * [243A-17] API Ninjas pasó a freemium: calories y protein_g son premium.
 * Solución: una sola llamada a Groq que entiende el input directamente y devuelve macros.
 * El modelo ya tiene el USDA FoodData Central en su entrenamiento — no hay que pasarle una tabla.
 * Flujo: Texto usuario -> Groq (comprende + calcula macros) -> JSON macros
 */

/* Modelos Groq en orden de preferencia */
const MODELOS_GROQ = ['moonshotai/kimi-k2-instruct', 'moonshotai/kimi-k2-instruct-0905', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b'];

const URL_BASE_GROQ = 'https://api.groq.com/openai/v1/chat/completions';

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
 * Llama a Groq con el input del usuario directo (acepta español).
 * Gotcha: el JSON puede venir envuelto en backticks de markdown — se sanitiza.
 */
async function calcularMacrosGroq(modelo: string, apiKey: string, descripcion: string): Promise<RespuestaCaloriasIA> {
    const respuesta = await fetch(URL_BASE_GROQ, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`},
        body: JSON.stringify({
            model: modelo,
            messages: [
                {role: 'system', content: PROMPT_NUTRICION},
                {role: 'user', content: descripcion}
            ],
            temperature: 0.1,
            max_completion_tokens: 150
        })
    });

    if (!respuesta.ok) {
        const error = await respuesta.text();
        throw new Error(`Groq ${modelo}: ${respuesta.status} - ${error}`);
    }

    const datos = await respuesta.json();
    const contenido: string = datos.choices?.[0]?.message?.content?.trim() ?? '';

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

/*
 * Orquestador: intenta cada modelo en orden hasta que uno responda bien.
 */
export async function estimarCaloriasTexto(descripcion: string, apiKeyGroq: string): Promise<RespuestaCaloriasIA> {
    const log: string[] = [`[1] Input: "${descripcion}"`];
    let ultimoError: unknown = null;

    for (const modelo of MODELOS_GROQ) {
        try {
            log.push(`[2] Modelo: ${modelo}`);
            const resultado = await calcularMacrosGroq(modelo, apiKeyGroq, descripcion);
            log.push(`[3] ✓ ${modelo} — ${resultado.calorias}kcal P:${resultado.proteinas}g C:${resultado.carbohidratos}g G:${resultado.grasas}g A:${resultado.azucar}g`);
            return {
                ...resultado,
                descripcion: descripcion.charAt(0).toUpperCase() + descripcion.slice(1),
                logProceso: log
            };
        } catch (e) {
            ultimoError = e;
            log.push(`[!] ${modelo}: ${e instanceof Error ? e.message : String(e)}`);
            console.warn(`[Nutrición] Fallo ${modelo}:`, e);
        }
    }

    const msg = ultimoError instanceof Error ? ultimoError.message : 'Ningún modelo respondió';
    throw new Error(`Error calculando macros: ${msg}`);
}
