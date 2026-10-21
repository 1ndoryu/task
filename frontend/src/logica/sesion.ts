/* Sesión local: entra con la cuenta única de administración del taller.
 * Igual que el front original (`config/autoLoginLocal.ts`), pero sin logging:
 * solo actúa en hosts loopback y cuando el build lo pide explícitamente
 * (`VITE_AUTO_LOGIN_LOCAL=1`, lo pone `build.construirFront` de la ficha). */
const CUENTA_LOCAL = { email: 'admin@nakomi.studio', password: 'admin' };

const esHostLocal = (host: string): boolean =>
  host === 'localhost' || host === '127.0.0.1' || host.endsWith('.localhost');

/** Devuelve el correo de la cuenta en sesión, o `null` si no hay ninguna. */
export async function asegurarSesionLocal(): Promise<string | null> {
  const correoActual = async (): Promise<string | null> => {
    const actual = await fetch('/api/auth/me', { credentials: 'include' });
    if (!actual.ok) return null;
    return ((await actual.json()) as { email?: string }).email ?? null;
  };

  const activo = import.meta.env.DEV || import.meta.env.VITE_AUTO_LOGIN_LOCAL === '1';
  if (!activo || !esHostLocal(location.hostname)) return correoActual();

  // Si ya hay sesión de la cuenta local no se reautentica en cada recarga.
  if ((await correoActual()) === CUENTA_LOCAL.email) return CUENTA_LOCAL.email;

  const acceso = await fetch('/api/auth/login', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(CUENTA_LOCAL),
  });
  return acceso.ok ? CUENTA_LOCAL.email : null;
}
