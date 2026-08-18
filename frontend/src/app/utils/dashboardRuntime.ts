/*
 * utils/dashboardRuntime.ts
 * Acceso compacto y seguro a los datos inyectados por WordPress.
 */

export function obtenerGloryDashboard() {
    if (typeof window === 'undefined') return null;
    return window.gloryDashboard ?? null;
}

export function esUsuarioAdmin(): boolean {
    return Boolean(obtenerGloryDashboard()?.esAdmin);
}

export function obtenerNonceWP(): string {
    /* [18-08-2026] Rust usa cookie HttpOnly + X-CSRF-Token, no nonces WP. */
    return obtenerGloryDashboard()?.nonce ?? '';
}

export function obtenerApiUrlWP(): string {
    /* [18-08-2026] Los servicios de IA/agente no tienen backend en Rust aun:
     * apuntan a /api para que el fallo sea un 404 JSON de Rust (no la pagina
     * HTML de Vite) y la UI muestre el estado "no disponible". */
    return '/api';
}