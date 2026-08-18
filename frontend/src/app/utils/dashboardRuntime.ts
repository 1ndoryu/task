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
    return obtenerGloryDashboard()?.nonce ?? '';
}

export function obtenerApiUrlWP(): string {
    return obtenerGloryDashboard()?.apiUrl ?? '/wp-json/glory/v1';
}