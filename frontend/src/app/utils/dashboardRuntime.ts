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
    /* [18-08-2026] Rust usa cookie HttpOnly + X-CSRF-Token, no nonces WP.
     * [25-08-2026] /ai/chat y /ai/nutricion ya migraron a apiFetch (X-CSRF-Token);
     * quedan legacy para agentActionsService y magnificService. */
    return obtenerGloryDashboard()?.nonce ?? '';
}

export function obtenerApiUrlWP(): string {
    /* [18-08-2026] Rust sirve la API en /api. Los servicios aún sin backend en
     * Rust (agent actions, magnific) apuntan aqui y la UI muestra el error. */
    return '/api';
}