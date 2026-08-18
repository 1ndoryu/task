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
    const base = { nonce: '', apiUrl: '/wp-json/glory/v1', apiBase: '/wp-json/glory/v1' };
    try {
        const respuesta = await fetch('/api/auth/me', { credentials: 'include' });
        if (!respuesta.ok) {
            window.gloryDashboard = { ...base, isLoggedIn: false, esAdmin: false };
            return;
        }
        const datos = await respuesta.json();
        const usuario = datos?.user;
        window.gloryDashboard = {
            ...base,
            currentUser: {
                name: usuario?.display_name || usuario?.email || '',
                email: usuario?.email,
                avatarUrl: usuario?.avatar_url ?? undefined,
            },
            isLoggedIn: true,
            esAdmin: false,
        };
    } catch {
        window.gloryDashboard = { ...base, isLoggedIn: false, esAdmin: false };
    }
}

async function iniciarApp(): Promise<void> {
    await cargarSesionRust();
    initializeIslands({ appProvider: AppProvider });
}

void iniciarApp();
