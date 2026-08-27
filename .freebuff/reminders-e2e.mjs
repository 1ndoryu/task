/* E2E de recordatorios (27-08-2026): verifica el contrato /api/reminders
 * contra el backend vivo: CRUD autenticado, validación de fecha futura,
 * idempotencia por clave, aislamiento por usuario y estados. Falla con
 * código 1 si algún assert no se cumple. No depende de datos sembrados:
 * registra sus propios usuarios desechables. */
const BASE_RAW = (process.env.PARITY_BASE_URL || 'http://127.0.0.1:3001/api').replace(/\/+$/, '');
const BASE = BASE_RAW.endsWith('/api') ? BASE_RAW : BASE_RAW + '/api';

let pasados = 0, fallados = 0;
const errores = [];
function assert(cond, nombre) {
  if (cond) { pasados++; console.log(`  ✓ ${nombre}`); }
  else { fallados++; errores.push(nombre); console.log(`  ✗ ${nombre}`); }
}

const cookies = {};
function capturarCookies(res) {
  const setCookies = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  for (const sc of setCookies) {
    const [par] = sc.split(';');
    const i = par.indexOf('=');
    cookies[par.slice(0, i)] = par.slice(i + 1);
  }
}
const headerCookie = () => Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');

async function api(metodo, ruta, {body, csrf} = {}) {
  const headers = {cookie: headerCookie()};
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (csrf) headers['x-csrf-token'] = csrf;
  const res = await fetch(BASE + ruta, {
    method: metodo, headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  capturarCookies(res);
  const texto = await res.text();
  let data = null;
  try { data = texto ? JSON.parse(texto) : null; } catch { data = texto; }
  return {status: res.status, data};
}

const futuro = (horas) => new Date(Date.now() + horas * 3600_000).toISOString();
const pasado = () => new Date(Date.now() - 3600_000).toISOString();

async function main() {
  const email = `rem-${Date.now()}@test.app`;
  console.log(`\n== Registro (${email}) ==`);
  let r = await api('POST', '/auth/register', {body: {email, password: 'password123'}});
  assert(r.status === 201 && r.data?.user?.id, 'register 201');
  let csrf = cookies['csrf_token'];
  assert(!!csrf, 'cookie csrf emitida');

  console.log('\n== Crear recordatorio (validación) ==');
  r = await api('POST', '/reminders', {body: {titulo: 'R1', mensaje: 'm', programado_para: pasado()}, csrf});
  assert(r.status === 422, 'fecha pasada → 422');
  r = await api('POST', '/reminders', {body: {titulo: '', mensaje: '', programado_para: futuro(1)}, csrf});
  assert(r.status === 422, 'título vacío → 422');
  r = await api('POST', '/reminders', {body: {titulo: 'R1', programado_para: futuro(1)}, csrf});
  assert(r.status === 201 && r.data?.id && r.data.estado === 'pendiente', 'crear → 201 pendiente');
  const id1 = r.data.id;

  console.log('\n== Idempotencia (misma clave = misma fila) ==');
  const clave = 'k-' + Date.now();
  r = await api('POST', '/reminders', {body: {titulo: 'R2', mensaje: 'm2', programado_para: futuro(2), idempotency_key: clave}, csrf});
  assert(r.status === 201 && r.data?.id, 'crear con idempotency_key → 201');
  const id2 = r.data.id;
  r = await api('POST', '/reminders', {body: {titulo: 'R2 dup', mensaje: 'm2', programado_para: futuro(2), idempotency_key: clave}, csrf});
  assert(r.status === 201 && r.data?.id === id2, 'misma clave → misma fila (no duplica)');

  /* [28-08-2026] Regresión de la race de idempotencia (fix ON CONFLICT):
   * dos confirmaciones SIMULTÁNEAS con la misma key no deben chocar con el
   * UNIQUE y devolver 500 — deben obtener todas la misma fila. */
  console.log('\n== Idempotencia concurrente (misma key, N simultáneos) ==');
  const claveRace = 'k-race-' + Date.now();
  const bodyRace = {titulo: 'R-race', mensaje: 'm', programado_para: futuro(2), idempotency_key: claveRace};
  const simultaneos = await Promise.all(
    Array.from({length: 5}, () => api('POST', '/reminders', {body: bodyRace, csrf}))
  );
  assert(simultaneos.every(x => x.status === 201), '5 confirmaciones simultáneas → todas 201 (sin 5xx)');
  const idsRace = [...new Set(simultaneos.map(x => x.data?.id).filter(Boolean))];
  assert(idsRace.length === 1, 'misma key concurrente → exactamente 1 id');
  r = await api('GET', '/reminders');
  assert(r.data.items.filter(x => x.titulo === 'R-race').length === 1, 'solo 1 fila R-race en el listado');

  console.log('\n== Listar / filtrar ==');
  r = await api('GET', '/reminders');
  assert(r.status === 200 && Array.isArray(r.data.items) && r.data.items.some(x => x.id === id1), 'listar incluye R1');
  assert(r.data.items.every(x => x.estado === 'pendiente'), 'listado default = pendientes');
  r = await api('GET', '/reminders?estado=cancelado');
  assert(r.status === 200 && r.data.items.every(x => x.estado === 'cancelado'), 'filtro por estado');
  r = await api('GET', '/reminders?estado=inexistente');
  assert(r.status === 422, 'estado inválido → 422');

  console.log('\n== Actualizar ==');
  r = await api('PUT', `/reminders/${id1}`, {body: {titulo: 'R1 editado'}, csrf});
  assert(r.status === 200 && r.data.titulo === 'R1 editado' && r.data.mensaje === '' && r.data.programado_para !== undefined, 'update parcial conserva campos no enviados');
  r = await api('PUT', `/reminders/${id1}`, {body: {programado_para: pasado()}, csrf});
  assert(r.status === 422, 'update con fecha pasada → 422');
  r = await api('PUT', `/reminders/${id1}`, {body: {programado_para: futuro(5)}, csrf});
  assert(r.status === 200, 'update con fecha futura → 200');

  console.log('\n== Completar / cancelar ==');
  r = await api('POST', `/reminders/${id1}/complete`, {csrf});
  assert(r.status === 200 && r.data.estado === 'completado', 'complete → completado');
  r = await api('POST', `/reminders/${id2}/cancel`, {csrf});
  assert(r.status === 200 && r.data.estado === 'cancelado', 'cancel → cancelado');
  r = await api('GET', '/reminders');
  assert(r.data.items.some(x => x.id === id1 && x.estado === 'completado'), 'lista refleja completado');
  assert(r.data.items.some(x => x.id === id2 && x.estado === 'cancelado'), 'lista refleja cancelado');

  console.log('\n== Aislamiento por usuario ==');
  const emailB = `rem-b-${Date.now()}@test.app`;
  r = await api('POST', '/auth/register', {body: {email: emailB, password: 'password123'}});
  assert(r.status === 201, 'register usuario B');
  r = await api('GET', '/reminders');
  assert(r.status === 200 && r.data.items.length === 0, 'usuario B no ve recordatorios de A');
  r = await api('PUT', `/reminders/${id1}`, {body: {titulo: 'hack'}, csrf: cookies['csrf_token']});
  assert(r.status === 404, 'usuario B no puede editar recordatorio de A → 404');
  r = await api('DELETE', `/reminders/${id1}`, {csrf: cookies['csrf_token']});
  assert(r.status === 404, 'usuario B no puede borrar recordatorio de A → 404');

  console.log('\n== Eliminar (usuario A) ==');
  r = await api('POST', '/auth/login', {body: {email, password: 'password123'}});
  assert(r.status === 200, 're-login usuario A');
  csrf = cookies['csrf_token'];
  r = await api('DELETE', `/reminders/${id1}`, {csrf});
  assert(r.status === 204, 'DELETE → 204');
  r = await api('GET', '/reminders');
  assert(!r.data.items.some(x => x.id === id1), 'eliminado no aparece');
  r = await api('DELETE', `/reminders/${id1}`, {csrf});
  assert(r.status === 404, 'DELETE repetido → 404');

  console.log(`\n== RESULTADO: ${pasados} pasados, ${fallados} fallados ==`);
  if (fallados > 0) { console.log('Fallaron:', errores.join(' | ')); process.exit(1); }
}
main().catch(e => { console.error('FALLO DE SCRIPT:', e.message); process.exit(1); });
