/* Boot del front ORIGINAL (Glory Islands) como SPA servido por Rust.
 * [correccion de rumbo 18-08-2026] El frontend real del consumidor es el
 * original de WordPress (App/React -> src/app + Glory/assets/react ->
 * src/glory-core), no el slice previo. Aqui se monta en modo SPA
 * (__GLORY_ROUTES__ + PageRenderer) y se expone window.gloryDashboard
 * desde la sesion de Rust (antes lo inyectaba PHP). */
import './glory-core/index.css';
import { islandRegistry } from './glory-core/core';
import { initializeIslands } from './glory-core/core/hydration';
import appIslands, { AppProvider } from '@app/appIslands';
import {inicializarSuscripcionStore} from '@app/stores/suscripcionStore';
import type { GloryRoutesMap } from './glory-core/core/router/navigationStore';

islandRegistry.registerAll(appIslands);

window.__GLORY_ROUTES__ = {
    '/': { island: 'DashboardIsland', title: 'Dashboard', props: {} },
    '/arbitraje/': { island: 'ArbitrajeIsland', title: 'Arbitraje', props: {} },
    '/privacidad/': { island: 'PoliticaPrivacidadIsland', title: 'Política de privacidad', props: {} },
    '/terminos/': { island: 'TerminosServicioIsland', title: 'Términos de servicio', props: {} },
    '/prueba/': { island: 'PaginaPruebaIsland', title: 'Página de prueba', props: {} },
} as GloryRoutesMap;

/* Sesion desde Rust: expone window.gloryDashboard para los hooks legacy.
 * El nonce queda vacio (Rust usa cookie HttpOnly + CSRF); los hooks que
 * dependen de nonce se adaptan por dominio en la migracion. */
async function cargarSesionRust(): Promise<void> {
    /* [18-08-2026] El shim ya no es un puente de WordPress: es el contexto de
     * sesion Rust (isLoggedIn, currentUser con id UUID para compartidos/equipos).
     * apiUrl/apiBase quedan obsoletos y apuntan a /api por compatibilidad. */
    const base = { nonce: '', apiUrl: '/api', apiBase: '/api' };
    try {
        const respuesta = await fetch('/api/auth/me', { credentials: 'include' });
        if (!respuesta.ok) {
            window.gloryDashboard = { ...base, isLoggedIn: false, esAdmin: false };
            return;
        }
        const usuario = await respuesta.json();
        /* [H-F15-03] /api/auth/me devuelve el UserResponse directamente (no
         * envuelto en {user}): es_admin real para el gate del panel admin. */
        window.gloryDashboard = {
            ...base,
            currentUser: {
                id: usuario?.id,
                name: usuario?.display_name || usuario?.email || '',
                email: usuario?.email,
                avatarUrl: usuario?.avatar_url ?? undefined,
            },
            isLoggedIn: true,
            esAdmin: Boolean(usuario?.es_admin),
        };
    } catch {
        window.gloryDashboard = { ...base, isLoggedIn: false, esAdmin: false };
    }
}

async function iniciarApp(): Promise<void> {
    await cargarSesionRust();
    /* [H-F11-03] Hidratación de suscripción explícita (antes setTimeout en la
     * evaluación del store, fuera del ciclo de React). */
    inicializarSuscripcionStore();

    /* [18-08-2026] Recuperacion de sesion perdida: el dashboard detecta un 401
     * estando autenticado y emite 'glory:sesion-perdida'; aqui recargamos para
     * que /api/auth/me (401) deje la app en la landing. El gate isLoggedIn
     * evita bucles: en la landing ya es false y no se vuelve a recargar. */
    window.addEventListener('glory:sesion-perdida', () => {
        if (window.gloryDashboard?.isLoggedIn) {
            console.warn('[Sesion] Perdida durante el uso, recargando a la landing...');
            window.location.reload();
        }
    });

    initializeIslands({ appProvider: AppProvider });
}

void iniciarApp();
