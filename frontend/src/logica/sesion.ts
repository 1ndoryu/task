/* Sesión local: entra con la cuenta única de administración del taller.
 * Igual que el front original (`config/autoLoginLocal.ts`), pero sin logging:
 * solo actúa en hosts loopback y cuando el build lo pide explícitamente
 * (`VITE_AUTO_LOGIN_LOCAL=1`, lo pone `build.construirFront` de la ficha). */
const CUENTA_LOCAL = { email: 'admin@nakomi.studio', password: 'admin' };

const esHostLocal = (host: string): boolean =>
  host === 'localhost' || host === '127.0.0.1' || host.endsWith('.localhost');

export async function asegurarSesionLocal(): Promise<boolean> {
  const activo = import.meta.env.DEV || import.meta.env.VITE_AUTO_LOGIN_LOCAL === '1';
  if (!activo || !esHostLocal(location.hostname)) return true;

  // Si ya hay sesión de la cuenta local no se reautentica en cada recarga.
  const actual = await fetch('/api/auth/me', { credentials: 'include' });
  if (actual.ok) {
    const usuario = (await actual.json()) as { email?: string };
    if (usuario.email === CUENTA_LOCAL.email) return true;
  }

  const acceso = await fetch('/api/auth/login', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(CUENTA_LOCAL),
  });
  return acceso.ok;
}
