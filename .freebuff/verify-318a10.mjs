/* [02-09-2026] Verificación funcional del fix 318A-10/11 del panel IA.
 * Reproduce el caso real que antes daba 400 en commandcode:
 * "Messages with role 'tool' must be a response to a preceding message with 'tool_calls'".
 * - Login admin/admin, crea conversación en modo autonomo (tools se ejecutan).
 * - Envía mensaje que fuerza una tool (crear_tarea).
 * - El turno ejecuta la tool y vuelve al LLM -> si validar_mensajes descartaba el
 *   assistant(tool_calls), commandcode respondía 400.
 * Uso: node .freebuff/verify-318a10.mjs
 */
const BASE = process.env.PARITY_BASE_URL || 'http://127.0.0.1:3001/api';

const cookies = {};
function capturarCookies(res) {
  const setCookies =
    typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  for (const sc of setCookies) {
    const [par] = sc.split(';');
    const i = par.indexOf('=');
    cookies[par.slice(0, i)] = par.slice(i + 1);
  }
}
const headerCookie = () =>
  Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');

async function api(path, { method = 'GET', body, csrf } = {}) {
  const headers = { cookie: headerCookie() };
  if (body !== undefined) headers['content-type'] = 'application/json';
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

async function leerSSE(res) {
  const texto = await res.text();
  const eventos = [];
  for (const linea of texto.split('\n')) {
    const l = linea.trim();
    if (!l.startsWith('data:')) continue;
    try {
      eventos.push(JSON.parse(l.slice(5).trim()));
    } catch { /* ignorar línea no JSON */ }
  }
  return eventos;
}

let fallos = 0;
function assert(cond, msg) {
  if (!cond) {
    fallos += 1;
    console.error(`  ✗ ${msg}`);
  } else {
    console.log(`  ✓ ${msg}`);
  }
}

async function main() {
  console.log('1. Login admin/admin');
  let r = await api('/auth/login', { method: 'POST', body: { email: 'admin@nakomi.studio', password: 'admin' } });
  assert(r.status === 200, `login admin (got ${r.status})`);
  if (r.status !== 200) { console.log(r.body.slice(0, 300)); return process.exit(1); }

  console.log('2. Crear conversación (modo autonomo → tools se ejecutan)');
  r = await api('/agente/conversaciones', {
    method: 'POST',
    body: {
      titulo: `Verify 318A-10 ${Date.now()}`,
      modo: 'autonomo',
      config: { provider: 'commandcode', modelo: 'poolside/laguna-s-2.1-free', temperatura: 0.7, max_tokens: 512 },
    },
  });
  assert([200, 201].includes(r.status), `crear conversación (got ${r.status})`);
  if (![200, 201].includes(r.status)) { console.log(r.body.slice(0, 300)); return process.exit(1); }
  const conversacionId = JSON.parse(r.body).id;

  console.log(`3. Turno SSE que fuerza tool (conversación ${conversacionId})`);
  const res = await fetch(`${BASE}/agente/stream`, {
    method: 'POST',
    headers: {
      cookie: headerCookie(),
      'content-type': 'application/json',
      'x-csrf-token': cookies['csrf_token'] || '',
    },
    body: JSON.stringify({
      conversacionId,
      mensaje: 'Crea una tarea llamada "Verificar 318A-10" y luego responde que terminaste',
    }),
  });
  capturarCookies(res);
  const eventos = await leerSSE(res);

  const tipos = eventos.map((e) => e.tipo || e.event || '?');
  console.log('   Eventos:', tipos.join(', '));

  const error = eventos.find((e) => (e.tipo || e.event) === 'error');
  const done = eventos.find((e) => (e.tipo || e.event) === 'done' || (e.tipo || e.event) === 'final');
  const tools = eventos.filter((e) => (e.tipo || e.event) === 'tool_start' || (e.tipo || e.event) === 'tool_result');
  const tokens = eventos.filter((e) => (e.tipo || e.event) === 'usage');

  assert(!!done, `turno terminó con done/final (got ${tipos.join(', ')})`);
  if (error) console.log(`   ERROR en turno: ${JSON.stringify(error).slice(0, 400)}`);
  assert(!error, `sin evento error (${error ? JSON.stringify(error).slice(0, 300) : ''})`);
  assert(tools.length > 0, `ejecutó al menos una tool (${tools.length})`);
  console.log(`   Tools: ${tools.map((t) => `${t.tool || t.nombre || '?'}`).join(', ')}`);
  if (tokens.length) {
    const u = tokens[0];
    console.log(`   Usage: prompt=${u.tokens_prompt ?? '?'} completion=${u.tokens_complecion ?? '?'}`);
  }

  console.log(fallos === 0 ? '\n✅ RESULTADO: OK' : `\n❌ RESULTADO: ${fallos} fallos`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('Fallo fatal:', e);
  process.exit(1);
});
