// Verifica el fix: /habits/{id}/history debe fusionar el historial del payload
const BASE = 'http://127.0.0.1:3001/api';
const cookies = {};
function capturarCookies(res) {
  const setCookies = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  for (const sc of setCookies) {
    const par = sc.split(';')[0];
    const i = par.indexOf('=');
    if (i < 0) continue;
    cookies[par.slice(0, i)] = par.slice(i + 1);
  }
}
const headerCookie = () => Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
async function api(metodo, ruta, { body, csrf } = {}) {
  const headers = { cookie: headerCookie() };
  if (csrf) headers['x-csrf-token'] = csrf;
  let payload;
  if (body !== undefined) { headers['content-type'] = 'application/json'; payload = JSON.stringify(body); }
  const res = await fetch(BASE + ruta, { method: metodo, headers, body: payload });
  capturarCookies(res);
  const txt = await res.text();
  let json = null; try { json = txt ? JSON.parse(txt) : null; } catch { json = null; }
  return { status: res.status, json, txt };
}

let fallos = 0;
const check = (n, c) => { console.log((c ? '  ✓ ' : '  ✗ ') + n); if (!c) fallos++; };

const login = await api('POST', '/auth/login', { body: { email: 'admin@nakomi.studio', password: 'admin' } });
if (login.status !== 200) { console.log('LOGIN FAIL ' + login.status + ' ' + (login.txt||'').slice(0,120)); process.exit(1); }
const csrf = cookies['csrf_token'];
if (!csrf) { console.log('sin csrf_token'); process.exit(1); }

// Hábito con historial en payload pero tabla separada vacía
const r = await api('GET', '/habits/1783898138798/history?days=90');
console.log('status:', r.status);
if (r.status !== 200) { console.log('respuesta:', r.txt.slice(0, 200)); process.exit(1); }
const fechas = (r.json.history || []).map(e => e.date).sort();
const completados = (r.json.history || []).filter(e => e.status === 'completado').map(e => e.date).sort();
console.log('completados devueltos:', JSON.stringify(completados));
console.log('stats:', JSON.stringify(r.json.stats));
check('devuelve historialCompletados del payload (2026-07-12 y 2026-08-25)',
  completados.includes('2026-07-12') && completados.includes('2026-08-25'));
check('devuelve historialPospuestos del payload (2026-07-13)',
  (r.json.history || []).some(e => e.status === 'pospuesto' && e.date === '2026-07-13'));
check('historial no vacío', fechas.length >= 20);
check('stats.completed >= 20', r.json.stats.completed >= 20);

console.log(fallos === 0 ? '\nALL HISTORY MERGE ASSERTIONS PASSED ✅' : `\n${fallos} fallaron`);
process.exit(fallos === 0 ? 0 : 1);
