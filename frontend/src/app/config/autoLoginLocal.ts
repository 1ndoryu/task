/* Auto-login en local: con Vite en modo dev, o con el build de exe local
 * (VITE_AUTO_LOGIN_LOCAL=1, lo pone scripts/exe-local.mjs), y el navegador en
 * localhost o 127.0.0.1. La cuenta es de prueba (admin en la BD local de la 89).
 * Vite sustituye ambas condiciones en build, así que el build de produccion
 * elimina el bloque y sus credenciales no llegan al bundle. */
const CUENTA_LOCAL = { email: 'dev-admin@test.app', password: 'Nakomi-Dev-7f3kQ9xW2pLm!' };
const HOSTS_LOCALES = ['localhost', '127.0.0.1'];

export async function autoLoginLocal(): Promise<void> {
    const activo = import.meta.env.DEV || import.meta.env.VITE_AUTO_LOGIN_LOCAL === '1';
    if (!activo || !HOSTS_LOCALES.includes(location.hostname)) return;
    try {
        // [por que] Si ya hay sesion valida no se vuelve a autenticar en cada recarga.
        const me = await fetch('/api/auth/me', { credentials: 'include' });
        if (me.ok) return;
        await fetch('/api/auth/login', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(CUENTA_LOCAL),
        });
    } catch {
        // [por que] Sin backend no se bloquea el arranque: cargarSesionRust cae a no-auth.
    }
}
