/*
 * services/geminiCaloriasService.ts
 * Servicio para estimar calorías de comidas usando Gemini AI
 * Implementa cadena de fallback entre modelos de Google
 */

/* Modelos en orden de preferencia (más capaz -> más ligero) */
const MODELOS_GEMINI = [
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b'
];

const URL_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

interface RespuestaCaloriasIA {
    calorias: number;
    proteinas?: number;
    carbohidratos?: number;
    grasas?: number;
    descripcion: string;
}

/*
 * Prompt del sistema para estimación calórica
 * Devuelve JSON estructurado
 */
const PROMPT_SISTEMA = `Eres un nutricionista experto. Analiza la comida descrita o mostrada en la imagen y estima las calorías y macronutrientes.

Responde ÚNICAMENTE con un JSON válido (sin markdown, sin comentarios) con esta estructura exacta:
{
  "calorias": number,
  "proteinas": number,
  "carbohidratos": number,
  "grasas": number,
  "descripcion": "descripción breve de lo que identificaste"
}

Si no puedes identificar la comida, estima lo más razonable posible. Las cantidades son en gramos para macros y kcal para calorías.`;

/*
 * Convierte un File a base64
 */
async function archivoABase64(archivo: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const lector = new FileReader();
        lector.onload = () => {
            const resultado = lector.result as string;
            /* Extraer solo la parte base64 sin el prefijo data:image/...;base64, */
            const base64 = resultado.split(',')[1];
            resolve(base64);
        };
        lector.onerror = reject;
        lector.readAsDataURL(archivo);
    });
}

/*
 * Intenta estimar calorías con un modelo específico
 */
async function estimarConModelo(
    modelo: string,
    apiKey: string,
    contenido: Array<{text?: string; inlineData?: {mimeType: string; data: string}}>
): Promise<RespuestaCaloriasIA> {
    const url = `${URL_BASE}/${modelo}:generateContent?key=${apiKey}`;

    const cuerpo = {
        contents: [{
            parts: [
                {text: PROMPT_SISTEMA},
                ...contenido
            ]
        }],
        generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 300,
            responseMimeType: 'application/json'
        }
    };

    const respuesta = await fetch(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(cuerpo)
    });

    if (!respuesta.ok) {
        const error = await respuesta.text();
        throw new Error(`Modelo ${modelo}: ${respuesta.status} - ${error}`);
    }

    const datos = await respuesta.json();
    const textoRespuesta = datos.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textoRespuesta) {
        throw new Error(`Modelo ${modelo}: respuesta vacía`);
    }

    /* Parsear JSON de la respuesta */
    const resultado: RespuestaCaloriasIA = JSON.parse(textoRespuesta);

    if (typeof resultado.calorias !== 'number' || resultado.calorias < 0) {
        throw new Error(`Modelo ${modelo}: calorías inválidas`);
    }

    return resultado;
}

/*
 * Estima calorías de una comida por descripción de texto
 * Intenta con cada modelo en cadena de fallback
 */
export async function estimarCaloriasTexto(
    descripcion: string,
    apiKey: string
): Promise<RespuestaCaloriasIA> {
    const contenido = [{text: `Comida: ${descripcion}`}];

    for (const modelo of MODELOS_GEMINI) {
        try {
            return await estimarConModelo(modelo, apiKey, contenido);
        } catch (error) {
            console.warn(`[Gemini] Fallo con ${modelo}:`, error);
            /* Continuar con el siguiente modelo */
        }
    }

    throw new Error('No se pudo conectar con ningún modelo de IA. Verifica tu API Key o conexión.');
}

/*
 * Estima calorías de una comida por imagen (foto)
 * Intenta con cada modelo en cadena de fallback
 */
export async function estimarCaloriasFoto(
    archivo: File,
    apiKey: string,
    descripcionAdicional?: string
): Promise<RespuestaCaloriasIA> {
    const base64 = await archivoABase64(archivo);
    const contenido: Array<{text?: string; inlineData?: {mimeType: string; data: string}}> = [];

    contenido.push({
        inlineData: {
            mimeType: archivo.type || 'image/jpeg',
            data: base64
        }
    });

    if (descripcionAdicional) {
        contenido.push({text: `Contexto adicional: ${descripcionAdicional}`});
    }

    for (const modelo of MODELOS_GEMINI) {
        try {
            return await estimarConModelo(modelo, apiKey, contenido);
        } catch (error) {
            console.warn(`[Gemini] Fallo con ${modelo}:`, error);
        }
    }

    throw new Error('No se pudo analizar la imagen con ningún modelo de IA.');
}
