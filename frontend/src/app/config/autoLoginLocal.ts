import { logWarn } from '@app/utils/logger';

/* Auto-login en local: con Vite en modo dev, o con el build local
 * (VITE_AUTO_LOGIN_LOCAL=1, lo ponen scripts/exe-local.mjs y el `build.construirFront`
 * de la ficha del taller), y el navegador en un host local (`*.localhost`, `localhost`
 * o `127.0.0.1`). La cuenta es la misma que la del puente de tareas de workspace-manager
 * (`logs/.tareas-env`): una sola cuenta de administración local para todo el taller.
 * Vite sustituye ambas condiciones al compilar, así que el build de producción (sin la
 * bandera) elimina el bloque y sus credenciales no llegan a ese bundle. */
const CUENTA_LOCAL = { email: 'admin@nakomi.studio', password: 'admin' };
// [por que] `*.localhost` resuelve a loopback por convención del navegador: nunca es un
// host público, así que la cuenta de administración local no puede salir por ahí.
const esHostLocal = (host: string): boolean =>
    host === 'localhost' || host === '127.0.0.1' || host.endsWith('.localhost');

export async function autoLoginLocal(): Promise<void> {
    const activo = import.meta.env.DEV || import.meta.env.VITE_AUTO_LOGIN_LOCAL === '1';
    if (!activo || !esHostLocal(location.hostname)) return;
    try {
        // [por que] Si ya hay sesion valida no se vuelve a autenticar en cada recarga.
        const me = await fetch('/api/auth/me', { credentials: 'include' });
        if (me.ok) {
            // [por que] El perfil del webview (WebView2) sobrevive a las reinstalaciones, asi que
            // una sesion vieja de OTRA cuenta pasa por valida y la app abria con ella en vez de
            // con la local (2026-10-19: abrio como dev-admin@test.app). Solo vale la sesion de
            // la cuenta local; de cualquier otra se reautentica y se pisa la cookie.
            const usuario = (await me.json()) as { email?: string };
            if (usuario.email === CUENTA_LOCAL.email) return;
        }
        const login = await fetch('/api/auth/login', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(CUENTA_LOCAL),
        });
        // [20AA-1] [por que] El resultado se mira y se registra: descartado, un 5xx
        // (BD sin responder) pasaba por auto-login correcto y el diagnóstico se
        // quedaba sin rastro. No se lanza: cargarSesionRust reintenta y decide.
        if (!login.ok) {
            logWarn('autoLoginLocal', `Auto-login local fallo (HTTP ${login.status})`);
        }
    } catch {
        // [por que] Sin backend no se bloquea el arranque: cargarSesionRust cae a no-auth.
    }
}
