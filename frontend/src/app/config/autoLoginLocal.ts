/* Auto-login en desarrollo local: solo con Vite en modo dev y el navegador en
 * localhost. La cuenta es de prueba (admin en la BD local de la 89, no es real).
 * Al depender de import.meta.env.DEV, el build de produccion elimina el bloque
 * y sus credenciales no llegan al bundle. */
const CUENTA_LOCAL = { email: 'dev-admin@test.app', password: 'Nakomi-Dev-7f3kQ9xW2pLm!' };

export async function autoLoginLocal(): Promise<void> {
    if (!import.meta.env.DEV || location.hostname !== 'localhost') return;
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
