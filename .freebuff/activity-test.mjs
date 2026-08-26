// Verifica el fix de concepto: el heatmap de actividad debe reflejar el
// HISTORIAL REAL de cumplimiento (payload de hábitos + completed_at de tareas),
// no depender de activity_events (que está vacío para datos importados).
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

// Heatmap de un año: debe contener los días del historial importado (jul-ago 2026)
const hm = await api('GET', '/activity?periodo=anio&fechaHoyLocal=2026-08-26');
console.log('heatmap status:', hm.status);
if (hm.status !== 200) { console.log(hm.txt.slice(0, 200)); process.exit(1); }
const heatmap = hm.json.heatmap || {};
const dias = Object.keys(heatmap).sort();
console.log('días con actividad:', dias.length);
console.log('muestra:', dias.slice(0, 5).join(', '), '...', dias.slice(-3).join(', '));
const totalActividad = Object.values(heatmap).reduce((s, d) => s + (d.total || 0), 0);
const habitoCumplidoTotal = Object.values(heatmap).reduce((s, d) => s + (d.tipos?.habito_cumplido || 0), 0);
console.log('total actividad:', totalActividad, '| habito_cumplido:', habitoCumplidoTotal);
check('el heatmap NO está vacío', dias.length >= 10);
check('hay habito_cumplido del historial importado', habitoCumplidoTotal >= 20);
check('incluye el 12 Jul 2026 (primer cumplido de Acomodar cuarto)', !!heatmap['2026-07-12']);
check('incluye el 25 Ago 2026 (último cumplido)', !!heatmap['2026-08-25']);

// Detalle del día 25 Ago (tiene cumplidos del historial)
const dia = await api('GET', '/activity/dia?fecha=2026-08-25');
console.log('\ndetalle 2026-08-25 status:', dia.status);
if (dia.status === 200) {
  const det = dia.json.detalle || [];
  console.log('items del día:', det.length, '->', det.slice(0, 6).map(i => `${i.tipo}:${i.elementoNombre || i.elementoId}`).join(' | '));
  check('el detalle del día refleja el historial real', det.some(i => i.tipo === 'habito_cumplido'));
}

// Estadísticas
const st = await api('GET', '/activity/estadisticas?fechaHoyLocal=2026-08-26');
console.log('\nestadisticas status:', st.status);
if (st.status === 200) {
  console.log('totales:', JSON.stringify(st.json.estadisticas.totales), '| diasActivos:', st.json.estadisticas.diasActivos, '| racha:', st.json.estadisticas.racha);
  check('estadisticas.totales.habito_cumplido >= 20', (st.json.estadisticas.totales?.habito_cumplido || 0) >= 20);
  check('diasActivos > 0', (st.json.estadisticas.diasActivos || 0) > 0);
}

console.log(fallos === 0 ? '\nALL ACTIVITY MERGE ASSERTIONS PASSED ✅' : `\n${fallos} fallaron`);
process.exit(fallos === 0 ? 0 : 1);
