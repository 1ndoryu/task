// Round-trip test: el backend debe PRESERVAR el objeto de frecuencia (cadaDias/diasSemana)
// [26-08-2026] Fix payload_for_storage en src/models/productivity.rs: antes se
// sobrescribía payload.frecuencia con el string del tipo, perdiendo el intervalo.
const BASE = process.env.BASE || 'http://127.0.0.1:3001/api';

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
  if (body !== undefined) {
    headers['content-type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(BASE + ruta, { method: metodo, headers, body: payload });
  capturarCookies(res);
  const txt = await res.text();
  let json = null;
  try { json = txt ? JSON.parse(txt) : null; } catch { json = null; }
  return { status: res.status, json, txt };
}

let fallos = 0;
const check = (n, c) => { console.log((c ? '  ✓ ' : '  ✗ ') + n); if (!c) fallos++; };

const admin = await api('POST', '/auth/login', { body: { email: 'admin@nakomi.studio', password: 'admin' } });
if (admin.status !== 200) { console.log('LOGIN FAIL ' + admin.status + ' ' + admin.txt.slice(0, 120)); process.exit(1); }
const csrf = cookies['csrf_token'];
if (!csrf) { console.log('sin csrf_token cookie'); process.exit(1); }

const TESTID = 987654321002;
const freqObjeto = { tipo: 'cadaXDias', cadaDias: 2, diasSemana: ['lunes', 'jueves'] };
const payload = { id: TESTID, nombre: 'Test Freq Roundtrip', importancia: 'Media', tags: [],
  frecuencia: freqObjeto, historialCompletados: [], historialPospuestos: [], fechaCreacion: '2026-08-26', diasInactividad: 0, racha: 0 };

// Upsert: campo tipado con el string + payload con el OBJETO completo (como hace el front)
const up = await api('PUT', `/habits/${TESTID}`, { csrf, body: { nombre: 'Test Freq Roundtrip', importancia: 'Media', frecuencia: 'cadaXDias', orden: 0, payload } });
console.log('upsert status:', up.status, up.status === 200 ? '' : (up.txt || '').slice(0, 150));
if (up.status !== 200) process.exit(1);
check('upsert 200', up.status === 200);

// Leer del dashboard y confirmar que la frecuencia vuelve COMPLETA (objeto con cadaDias)
const d = await api('GET', '/dashboard');
const hab = (d.json?.data?.habitos || []).find(h => h.id === TESTID);
if (!hab) { console.log('  ✗ habito no devuelto por el dashboard'); fallos++; }
else {
  const devuelto = JSON.stringify(hab.frecuencia);
  const esperado = JSON.stringify(freqObjeto);
  console.log('  frecuencia devuelta: ' + devuelto);
  /* Comparación semántica (orden de claves puede variar) */
  const iguales = ['tipo', 'cadaDias', 'diasSemana'].every(k =>
    JSON.stringify(hab.frecuencia?.[k]) === JSON.stringify(freqObjeto[k]));
  check('OBJETO de frecuencia COMPLETO preservado (cadaDias=2, diasSemana intacto)', iguales);
  check('  el string del tipo también está presente (tipo=cadaXDias)', hab.frecuencia?.tipo === 'cadaXDias');
}

// cleanup
await api('DELETE', `/habits/${TESTID}`, { csrf });
console.log(fallos === 0 ? '\nALL FREQUENCY ASSERTIONS PASSED ✅' : `\n${fallos} fallaron`);
process.exit(fallos === 0 ? 0 : 1);
