/*
 * config/parserIA.ts
 * [H-F15-01] Parsing de la respuesta del LLM a formato estructurado
 * (extraído de accionesIA.ts).
 */

import type {RespuestaIA} from './tiposAccionesIA';

/*
 * Parsear la respuesta del LLM a formato estructurado
 * Intenta JSON puro primero, luego JSON dentro de code block
 */
export function parsearRespuestaLLM(contenido: string): RespuestaIA {
    /* Limpiar posible think block de modelos como DeepSeek */
    let limpio = contenido.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

    /* Intentar parsear JSON directo */
    try {
        const parsed = JSON.parse(limpio);
        if (typeof parsed.respuesta === 'string') {
            return {
                respuesta: parsed.respuesta,
                acciones: Array.isArray(parsed.acciones) ? parsed.acciones : []
            };
        }
    } catch { /* No es JSON directo, intentar extraer */ }

    /* Buscar JSON dentro de bloques de código ```json ... ``` */
    const matchBloque = limpio.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (matchBloque) {
        try {
            const parsed = JSON.parse(matchBloque[1]);
            if (typeof parsed.respuesta === 'string') {
                return {
                    respuesta: parsed.respuesta,
                    acciones: Array.isArray(parsed.acciones) ? parsed.acciones : []
                };
            }
        } catch { /* JSON inválido dentro del bloque */ }
    }

    /* Fallback: tratar todo como texto sin acciones */
    return {respuesta: limpio, acciones: []};
}
