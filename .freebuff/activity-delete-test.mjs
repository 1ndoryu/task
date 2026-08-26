// Verifica: borrar un hábito/tarea NO debe borrar su actividad del panel.
// La actividad es un hecho durable: se deriva del payload (que el soft-delete
// conserva) + dashboard_habit_history + completed_at, sin filtrar deleted_at.
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
if (login.status !== 200) { console.log('LOGIN FAIL ' + login.status); process.exit(1); }
const csrf = cookies['csrf_token'];

// 1. Crear un hábito con historial en fechas concretas (no choca con el real)
const TESTID = 987654321099;
const fechas = ['2026-08-10', '2026-08-11', '2026-08-12'];
const payload = { id: TESTID, nombre: 'Test Borrado Actividad', importancia: 'Media',
  frecuencia: 'diario', historialCompletados: fechas, historialPospuestos: [],
  fechaCreacion: '2026-08-01', ultimoCompletado: '2026-08-12' };
const up = await api('PUT', `/habits/${TESTID}`, { csrf, body: { nombre: 'Test Borrado Actividad', importancia: 'Media', frecuencia: 'diario', orden: 0, payload } });
console.log('upsert:', up.status);
if (up.status !== 200) { console.log(up.txt.slice(0, 150)); process.exit(1); }

const enHeatmap = async () => {
  const hm = await api('GET', '/activity?periodo=mes&fechaHoyLocal=2026-08-20');
  const dias = Object.keys(hm.json?.heatmap || {}).filter(d => fechas.includes(d));
  return dias;
};

const antes = await enHeatmap();
console.log('días con actividad del test antes de borrar:', JSON.stringify(antes));
check('el hábito nuevo aporta actividad al heatmap', antes.length === 3);

// 2. Borrar el hábito (soft-delete)
const del = await api('DELETE', `/habits/${TESTID}`, { csrf });
console.log('delete:', del.status);
check('delete 204', del.status === 204);

// 3. El heatmap DEBE seguir mostrando la actividad (payload conservado)
const despues = await enHeatmap();
console.log('días con actividad del test después de borrar:', JSON.stringify(despues));
check('la actividad PERSISTE tras borrar el hábito', despues.length === 3);

console.log(fallos === 0 ? '\nALL DELETE-PERSISTENCE ASSERTIONS PASSED ✅' : `\n${fallos} fallaron`);
process.exit(fallos === 0 ? 0 : 1);
