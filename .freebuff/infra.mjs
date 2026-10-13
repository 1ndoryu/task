/* Helpers compartidos del E2E del agente: cliente HTTP con cookie jar, lectura de SSE
 * y aserciones. Lo usan agente-e2e.mjs y los pasos-*.mjs. El estado que cambia entre
 * pasos (fallos, conversación activa) vive en `estado`: un binding importado no se
 * puede reasignar desde otro módulo. */

export const BASE = process.env.PARITY_BASE_URL || 'http://127.0.0.1:3001/api';

export const estado = { fallos: 0, conversacionId: undefined };
export function assert(cond, msg) {
  if (!cond) {
    estado.fallos += 1;
    console.error(`  ✗ ${msg}`);
  } else {
    console.log(`  ✓ ${msg}`);
  }
}

/* ---- Cookie jar manual (mismo patrón que verify-parity.mjs) ---- */
export const cookies = {};
function capturarCookies(res) {
  const setCookies =
    typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  for (const sc of setCookies) {
    const [par] = sc.split(';');
    const i = par.indexOf('=');
    cookies[par.slice(0, i)] = par.slice(i + 1);
  }
}
export const headerCookie = () =>
  Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');

export async function api(path, { method = 'GET', body, csrf } = {}) {
  const headers = { cookie: headerCookie() };
  if (body !== undefined) headers['content-type'] = 'application/json';
  /* Mutaciones: CSRF automático desde el jar (mismo patrón que parity). */
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    headers['x-csrf-token'] = csrf || cookies['csrf_token'] || '';
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  capturarCookies(res);
  return { status: res.status, headers: res.headers, body: await res.text() };
}

export async function leerSSE(res) {
  const texto = await res.text();
  const eventos = [];
  for (const linea of texto.split('\n')) {
    const l = linea.trim();
    if (!l.startsWith('data:')) continue;
    try {
      eventos.push(JSON.parse(l.slice(5).trim()));
    } catch {
      /* línea no JSON: ignorar */
    }
  }
  return eventos;
}
