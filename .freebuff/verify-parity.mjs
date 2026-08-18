/* Verificación end-to-end de los dominios de paridad (18-08-2026).
 * Recorre el ciclo de vida real de cada dominio contra el backend en vivo
 * y falla con código 1 si algún assert no se cumple. */
const BASE = 'http://127.0.0.1:3000/api';

let pasados = 0;
let fallados = 0;
const errores = [];

function assert(condicion, nombre) {
  if (condicion) {
    pasados++;
    console.log(`  ✓ ${nombre}`);
  } else {
    fallados++;
    errores.push(nombre);
    console.log(`  ✗ ${nombre}`);
  }
}

/* ---- Cookie jar manual (Node fetch permite header cookie) ---- */
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

async function api(metodo, ruta, {body, csrf, crudo} = {}) {
  const headers = {cookie: headerCookie()};
  if (body !== undefined && !(body instanceof FormData)) headers['content-type'] = 'application/json';
  if (csrf) headers['x-csrf-token'] = csrf;
  const res = await fetch(BASE + ruta, {
    method: metodo,
    headers,
    body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined
  });
  capturarCookies(res);
  const texto = await res.text();
  let data = null;
  try { data = texto ? JSON.parse(texto) : null; } catch { data = texto; }
  if (crudo) return res;
  return {status: res.status, data};
}

async function main() {
  const email = `verif-${Date.now()}@test.app`;
  console.log(`\n== Registro y sesión (${email}) ==`);
  let r = await api('POST', '/auth/register', {body: {email, password: 'password123'}});
  assert(r.status === 201 && r.data?.user?.id, 'register 201 con user.id');
  const uid = r.data.user.id;
  const csrf = cookies['csrf_token'];
  assert(!!csrf, 'cookie csrf_token emitida');

  console.log('\n== Suscripción ==');
  r = await api('GET', '/subscription');
  assert(r.status === 200 && r.data.plan === 'free' && r.data.trialDisponible === true, 'GET /subscription → free, trialDisponible');
  assert(r.data.limites.habitos === 5 && r.data.limites.tareasActivas === 20 && r.data.limites.proyectos === 3 && r.data.limites.adjuntosPorTarea === 0, 'límites FREE = 5/20/3/0 (paridad WordPress)');
  r = await api('POST', '/subscription/trial', {csrf});
  assert(r.status === 200 && r.data.success && r.data.data.estado === 'trial', 'POST /subscription/trial → trial activo');
  r = await api('GET', '/subscription');
  assert(r.status === 200 && r.data.estado === 'trial' && r.data.diasRestantes >= 29, 'trial de 30 días persistido (diasRestantes >= 29)');
  r = await api('POST', '/subscription/trial', {}); // sin CSRF
  assert(r.status === 403, 'mutación sin CSRF → 403');

  console.log('\n== Almacenamiento / adjuntos ==');
  r = await api('POST', '/storage/verify', {body: {tamano: 100}, csrf});
  assert(r.status === 200 && r.data.puedeSubir === true, 'verify espacio → puedeSubir');
  const fd = new FormData();
  fd.append('file', new Blob(['contenido de prueba para verificación'], {type: 'text/plain'}), 'verif.txt');
  fd.append('tipo', 'archivo');
  r = await api('POST', '/storage/files', {body: fd, csrf});
  assert(r.status === 201 && r.data.id && r.data.url.includes(r.data.id), 'upload multipart → 201, url con id');
  const adjId = r.data.id;
  r = await api('GET', '/storage');
  assert(r.status === 200 && r.data.usado >= 30, 'GET /storage → usado > 0');
  assert(r.data.limite === 52428800 && r.data.limiteFormateado === '50.0 MB', 'límite FREE = 50 MB (paridad WordPress AlmacenamientoService)');
  const descarga = await api('GET', `/storage/files/${adjId}`);
  assert(descarga.status === 200 && descarga.data.includes('contenido de prueba'), 'descarga autenticada → 200 con contenido');
  r = await api('DELETE', `/storage/files/${adjId}`, {csrf});
  assert(r.status === 204, 'DELETE adjunto → 204');
  r = await api('GET', `/storage/files/${adjId}`);
  assert(r.status === 404, 'adjunto eliminado → 404');

  console.log('\n== Backups ==');
  r = await api('POST', '/backups', {body: {trigger: 'manual'}, csrf});
  assert(r.status === 200 && r.data.success && r.data.backup.hash, 'crear backup → snapshot con hash');
  const backupId = r.data.backup.id;
  r = await api('GET', '/backups');
  assert(r.status === 200 && Array.isArray(r.data) && r.data.some(b => b.id === backupId), 'lista backups contiene el creado');
  r = await api('POST', `/backups/${backupId}/restore`, {csrf});
  assert(r.status === 200 && r.data.success, 'restore → success');
  r = await api('DELETE', `/backups/${backupId}`, {csrf});
  assert(r.status === 204, 'DELETE backup → 204');

  console.log('\n== Feedback ==');
  r = await api('GET', '/feedback/state');
  assert(r.status === 200 && r.data.restante === 3, 'state inicial restante=3');
  r = await api('POST', '/feedback', {body: {tipo: 'sugerencia', mensaje: 'Mensaje de verificación automática'}, csrf});
  assert(r.status === 200 && r.data.success, 'enviar feedback → success');
  r = await api('GET', '/feedback/state');
  assert(r.status === 200 && r.data.restante === 2, 'restante decrementado a 2');

  console.log('\n== Cifrado E2E ==');
  r = await api('GET', '/security/e2e');
  assert(r.status === 200 && r.data.habilitado === false, 'e2e inicial deshabilitado');
  r = await api('PUT', '/security/e2e', {body: {habilitado: true, claveCifrada: 'Y2xhdmUtcHJ1ZWJh', algoritmo: 'AES-GCM', derivacion: 'PBKDF2'}, csrf});
  assert(r.status === 200 && r.data.success && r.data.estado.habilitado === true, 'habilitar e2e → habilitado');
  r = await api('GET', '/security/e2e');
  assert(r.status === 200 && r.data.habilitado === true, 'e2e persistido');

  console.log('\n== Tokens MCP ==');
  r = await api('GET', '/security/mcp/token');
  assert(r.status === 200 && r.data.existe === false, 'sin token inicial');
  r = await api('POST', '/security/mcp/token', {csrf});
  assert(r.status === 201 && r.data.success && r.data.token.startsWith('mcp_'), 'generar token mcp_');
  const tokenId = r.data.id;
  r = await api('GET', '/security/mcp/token');
  assert(r.status === 200 && r.data.existe === true && r.data.id === tokenId, 'estado token existe');
  r = await api('DELETE', `/security/mcp/token/${tokenId}`, {csrf});
  assert(r.status === 200 && r.data.success, 'revocar token');
  r = await api('GET', '/security/mcp/token');
  assert(r.status === 200 && r.data.existe === false, 'token revocado');

  console.log('\n== Timeline + WebSocket (tiempo real) ==');
  const tareaId = 555001;
  r = await api('PUT', `/tasks/${tareaId}`, {body: {texto: 'Tarea para verificar chat RT', completado: false}, csrf});
  assert(r.status === 200, 'crear tarea para el chat');
  const wsEvento = await new Promise(resolve => {
    const ws = new WebSocket('ws://127.0.0.1:3000/api/realtime/ws', {headers: {cookie: headerCookie()}});
    const timer = setTimeout(() => { ws.close(); resolve(null); }, 8000);
    ws.onopen = async () => {
      await new Promise(s => setTimeout(s, 400));
      try {
        await api('POST', '/timeline', {body: {itemType: 'tarea', itemId: tareaId, content: 'mensaje RT de verificación'}, csrf});
      } catch (e) { /* el assert del POST se hace abajo */ }
    };
    ws.onmessage = ev => {
      if (ev.data.includes('"type":"timeline"') && ev.data.includes('mensaje RT de verificación')) {
        clearTimeout(timer); ws.close(); resolve(ev.data);
      }
    };
    ws.onerror = () => { clearTimeout(timer); ws.close(); resolve(null); };
  });
  assert(!!wsEvento, 'broadcast WS al enviar mensaje de timeline');

  console.log('\n== Cambio de contraseña ==');
  r = await api('PUT', '/security/password', {body: {nuevaContrasena: 'clave-nueva-99'}, csrf});
  assert(r.status === 200 && r.data.success, 'cambiar contraseña → success');
  r = await api('GET', '/auth/me');
  assert(r.status === 401, 'sesión antigua invalidada → 401');
  r = await api('POST', '/auth/login', {body: {email, password: 'clave-nueva-99'}});
  assert(r.status === 200, 'login con la nueva contraseña → 200');
  r = await api('POST', '/auth/login', {body: {email, password: 'password123'}});
  assert(r.status === 401, 'login con la contraseña vieja → 401');

  console.log('\n== Admin (es_admin) ==');
  /* El usuario paridad@test.app ya es admin en BD; login con su contraseña actual. */
  r = await api('POST', '/auth/login', {body: {email: 'paridad@test.app', password: 'nueva12345'}});
  assert(r.status === 200, 'login admin paridad');
  const csrfAdmin = cookies['csrf_token'];
  r = await api('GET', '/admin/stats');
  assert(r.status === 200 && typeof r.data.totalUsuarios === 'number', 'admin stats → totalUsuarios');
  r = await api('GET', '/admin/users?pagina=1&porPagina=5');
  assert(r.status === 200 && Array.isArray(r.data.usuarios) && r.data.usuarios.length > 0, 'admin lista usuarios');
  r = await api('GET', `/admin/users/${uid}`);
  assert(r.status === 200 && r.data.id === uid, 'admin detalle del usuario verificado');
  r = await api('POST', `/admin/users/${uid}/premium`, {body: {duracion: 30}, csrf: csrfAdmin});
  assert(r.status === 200 && r.data.success, 'admin activa premium 30 días');
  r = await api('POST', `/admin/users/${uid}/cancel-premium`, {csrf: csrfAdmin});
  assert(r.status === 200 && r.data.success, 'admin cancela premium');

  console.log(`\n== RESULTADO: ${pasados} pasados, ${fallados} fallados ==`);
  if (fallados > 0) {
    console.log('Fallaron:', errores.join(' | '));
    process.exit(1);
  }
}

main().catch(e => { console.error('FALLO DE SCRIPT:', e.message); process.exit(1); });
