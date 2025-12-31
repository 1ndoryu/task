/*
 * Configuración del servidor MCP
 * Variables de entorno y constantes
 */

export const config = {
    /* URL base de la API de Glory */
    apiUrl: process.env.GLORY_API_URL || 'http://glorybuilder.local/wp-json/glory/v1',

    /* Token de autenticación (Base64 codificado user:pass) */
    authToken: process.env.GLORY_AUTH_TOKEN || '',

    /* Credenciales alternativas (Usuario y Password RAW) */
    wpUsername: process.env.GLORY_WP_USERNAME || '',
    wpPassword: process.env.GLORY_WP_PASSWORD || '',

    /* Modo de depuración */
    debug: process.env.DEBUG === 'true'
};

/*
 * Valida que la configuración sea correcta
 */
export function validarConfiguracion(): boolean {
    if (!config.authToken && (!config.wpUsername || !config.wpPassword)) {
        // console.error('[MCP Glory] Error: Debe configurar GLORY_AUTH_TOKEN o (GLORY_WP_USERNAME y GLORY_WP_PASSWORD)');
        return false;
    }
    return true;
}
