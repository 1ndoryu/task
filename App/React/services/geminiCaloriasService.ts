/*
 * services/geminiCaloriasService.ts
 * (Ahora usando Groq API como traductor + CalorieNinjas para datos)
 * Servicio optimizado para estimar calorías.
 * Flujo: Input Usuario -> Groq (Traduce a Query en Inglés) -> CalorieNinjas API (Datos Reales)
 */

/* Modelos Groq definidos por el usuario */
const MODELOS_GROQ = ['moonshotai/kimi-k2-instruct', 'moonshotai/kimi-k2-instruct-0905', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b'];

const URL_BASE_GROQ = 'https://api.groq.com/openai/v1/chat/completions';
const URL_BASE_NINJAS = 'https://api.calorieninjas.com/v1/nutrition';

interface RespuestaCaloriasIA {
    calorias: number;
    proteinas: number;
    carbohidratos: number;
    grasas: number;
    azucar: number;
    descripcion: string;
    logProceso?: string[] /* Log detallado del proceso para inspección */;
}

/* Interfaz para respuesta de CalorieNinjas */
interface RespuestaCalorieNinjas {
    items: {
        name: string;
        calories: number;
        serving_size_g: number;
        fat_total_g: number;
        fat_saturated_g: number;
        protein_g: number;
        sodium_mg: number;
        potassium_mg: number;
        cholesterol_mg: number;
        carbohydrates_total_g: number;
        fiber_g: number;
        sugar_g: number;
    }[];
}

/*
 * Prompt del sistema para traducción
 * Misión: Convertir lenguaje natural (cualquier idioma) a Query optimizada para CalorieNinjas (Inglés)
 */
const PROMPT_TRADUCTOR = `Eres un asistente nutricional experto en procesar lenguaje natural.
Tu ÚNICA tarea es traducir lo que el usuario comió en una "query string" simple en INGLÉS, ideal para una API de nutrición.
- Detecta alimentos y cantidades.
- Si no hay cantidad explícita, estima una porción estándar lógica.
- CONSERVA nombres propios de comidas locales (ej: Arepa, Tacos, Paella, Empanada) sin traducir si son conocidos internacionalmente.
- Salida formato: "cantidad unidad alimento, cantidad unidad alimento" (todo en INGLÉS salvo nombres culturales).
- NO expliques, NO saludes, NO des formato JSON. SOLO devuelve el string de texto plano.

Ejemplos:
User: "Un plato de arroz con pollo y una coca"
Assistant: "200g rice, 150g chicken breast, 1 can coca cola"

User: "Una arepa con queso"
Assistant: "1 arepa, 1 slice cheese"

User: "3 huevos y pan"
Assistant: "3 large eggs, 2 slices bread"`;

/*
 * 1. Usa Groq para traducir el input del usuario a una query en inglés
 */
async function traducirAQueryIngles(modelo: string, apiKey: string, mensajeUsuario: string): Promise<string> {
    const cuerpo = {
        model: modelo,
        messages: [
            {
                role: 'system',
                content: PROMPT_TRADUCTOR
            },
            {
                role: 'user',
                content: mensajeUsuario
            }
        ],
        temperature: 0.1,
        max_completion_tokens: 100
        /* Sin tools, sin JSON mode complejo, solo texto plano rápido */
    };

    const respuesta = await fetch(URL_BASE_GROQ, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify(cuerpo)
    });

    if (!respuesta.ok) {
        const error = await respuesta.text();
        throw new Error(`Groq ${modelo}: ${respuesta.status} - ${error}`);
    }

    const datos = await respuesta.json();
    return datos.choices?.[0]?.message?.content?.trim() || '';
}

/*
 * 2. Consulta CalorieNinjas con la query en inglés
 */
async function consultarCalorieNinjas(query: string, apiKeyNinjas: string): Promise<RespuestaCaloriasIA> {
    /* Si no hay key, fallamos grácilmente o lanzamos error específico */
    if (!apiKeyNinjas) throw new Error('Falta API Key de CalorieNinjas');

    const url = `${URL_BASE_NINJAS}?query=${encodeURIComponent(query)}`;
    const respuesta = await fetch(url, {
        method: 'GET',
        headers: {'X-Api-Key': apiKeyNinjas}
    });

    if (!respuesta.ok) {
        throw new Error(`CalorieNinjas API Error: ${respuesta.status}`);
    }

    const datos: RespuestaCalorieNinjas = await respuesta.json();

    if (!datos.items || datos.items.length === 0) {
        throw new Error('CalorieNinjas no encontró alimentos para esta búsqueda.');
    }

    /* Sumarizar resultados */
    let totalCalorias = 0;
    let totalProt = 0;
    let totalCarbs = 0;
    let totalGrasas = 0;
    let totalAzucar = 0;

    /* Nota: No forzamos la traducción de nombres aquí para mantener la experiencia simple.
       Se usará la descripción que el usuario ingresó originalmente. */

    for (const item of datos.items) {
        totalCalorias += item.calories;
        totalProt += item.protein_g;
        totalCarbs += item.carbohydrates_total_g;
        totalGrasas += item.fat_total_g;
        totalAzucar += item.sugar_g;
    }

    return {
        calorias: Math.round(totalCalorias),
        proteinas: Math.round(totalProt),
        carbohidratos: Math.round(totalCarbs),
        grasas: Math.round(totalGrasas),
        azucar: Math.round(totalAzucar),
        descripcion: '' /* Se llenará con el input original del usuario */
    };
}

/*
 * Orquestador Principal: Texto -> Groq -> CalorieNinjas
 * Retorna RespuestaCaloriasIA compatible con el resto de la app
 */
export async function estimarCaloriasTexto(descripcion: string, apiKeyGroq: string, apiKeyNinjas: string): Promise<RespuestaCaloriasIA> {
    const log: string[] = [];
    log.push(`[1] Input original: "${descripcion}"`);

    /* Paso 1: Obtener query en inglés desde Groq (intentando varios modelos si falla) */
    let queryIngles = '';
    let errorGroq = null;
    let modeloUsado = '';

    for (const modelo of MODELOS_GROQ) {
        try {
            log.push(`[2] Intentando traducción con modelo: ${modelo}`);
            queryIngles = await traducirAQueryIngles(modelo, apiKeyGroq, descripcion);
            if (queryIngles) {
                modeloUsado = modelo;
                log.push(`[3] ✓ Traducción exitosa con ${modelo}`);
                log.push(`[4] Query generada: "${queryIngles}"`);
                break;
            }
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : String(e);
            log.push(`[!] Error con ${modelo}: ${errorMsg}`);
            console.warn(`[Groq] Fallo traducción con ${modelo}:`, e);
            errorGroq = e;
        }
    }

    if (!queryIngles) {
        const mensajeError = errorGroq instanceof Error ? errorGroq.message : 'Ningún modelo respondió';
        log.push(`[X] FALLO: No se pudo traducir. ${mensajeError}`);
        throw new Error(`Error traduciendo con IA: ${mensajeError}`);
    }

    // console.log(`[Estimador] User: "${descripcion}" -> Query: "${queryIngles}"`);

    /* Paso 2: Consultar CalorieNinjas */
    try {
        log.push(`[5] Consultando CalorieNinjas con query: "${queryIngles}"`);
        const resultado = await consultarCalorieNinjas(queryIngles, apiKeyNinjas);
        log.push(`[6] ✓ CalorieNinjas respondió exitosamente`);
        log.push(`[7] Calorías totales: ${resultado.calorias} kcal`);
        log.push(`[8] Macros - P:${resultado.proteinas}g C:${resultado.carbohidratos}g G:${resultado.grasas}g A:${resultado.azucar}g`);

        /* USAMOS LA DESCRIPCIÓN ORIGINAL DEL USUARIO EN ESPAÑOL */
        return {
            ...resultado,
            descripcion: descripcion.charAt(0).toUpperCase() + descripcion.slice(1),
            logProceso: log
        };
    } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        log.push(`[X] Error en CalorieNinjas: ${errorMsg}`);
        console.error('[CalorieNinjas] Error:', e);
        throw new Error(`Error en CalorieNinjas: ${e instanceof Error ? e.message : 'Desconocido'}`);
    }
}
