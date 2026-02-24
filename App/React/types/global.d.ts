/*
 * Tipos globales para la aplicación Glory Dashboard
 * Extiende Window con las propiedades inyectadas por WordPress
 */

interface GloryDashboardData {
    currentUser?: {
        name: string;
        email?: string;
        login?: string;
        avatarUrl?: string;
        description?: string;
    };
    nonce: string;
    apiUrl: string;
    apiBase?: string;
    isLoggedIn?: boolean;
    userId?: number;
    suscripcion?: import('./dashboard').InfoSuscripcion;
}

interface Window {
    gloryDashboard?: GloryDashboardData;
    /* Expuesto para debugging/migración desde habitosStore */
    useHabitosStore?: unknown;
}
