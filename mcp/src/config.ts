/*
 * Configuración del servidor MCP
 * Las variables de entorno son proporcionadas por el cliente MCP
 */

export const config = {
    /* URL base de la API de Glory (requerida) */
    apiUrl: process.env.GLORY_API_URL || '',

    /* Token de autenticación (Base64 codificado user:pass) */
    authToken: process.env.GLORY_AUTH_TOKEN || '',

    /* Credenciales alternativas (Usuario y Password RAW) */
    wpUsername: process.env.GLORY_WP_USERNAME || '',
    wpPassword: process.env.GLORY_WP_PASSWORD || '',

    /* Modo de depuración */
    debug: process.env.DEBUG === 'true'
};

/*
 * Obtiene el header de autorización para las peticiones HTTP
 */
export function obtenerAuthHeader(): string {
    if (config.authToken) {
        return `Basic ${config.authToken}`;
    }

    if (config.wpUsername && config.wpPassword) {
        const base64 = Buffer.from(`${config.wpUsername}:${config.wpPassword}`).toString('base64');
        return `Basic ${base64}`;
    }

    return '';
}
