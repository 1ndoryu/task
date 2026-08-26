/* Verificación end-to-end de los dominios de paridad (18-08-2026).
 * Recorre el ciclo de vida real de cada dominio contra el backend en vivo
 * y falla con código 1 si algún assert no se cumple. */
/* [25-08-2026] Puerto 3001: el backend de este proyecto vive en 3001 (ver
 * .freebuff/run.md — 3000 lo usan otros proyectos). El default 3000 daba
 * "fetch failed" en cada run sin PARITY_BASE_URL. */
/* [25-08-2026] Normalización de la base: PARITY_BASE_URL puede venir como
 * 'http://host:puerto' o 'http://host:puerto/api'; sin el sufijo /api todas
 * las rutas dan 404 con body vacío (fallo silencioso). Se añade /api si falta. */
const BASE_RAW = (process.env.PARITY_BASE_URL || 'http://127.0.0.1:3001/api').replace(/\/+$/, '');
const BASE = BASE_RAW.endsWith('/api') ? BASE_RAW : BASE_RAW + '/api';

/* [26-08-2026] Acceso directo a BD para auto-provisionar el admin de prueba.
 * El contrato del producto no expone un endpoint para conceder es_admin, así
 * que la suite promueve a su propio usuario recién registrado vía psql
 * (DATABASE_URL del .env del proyecto, override con PARITY_DATABASE_URL).
 * Si psql no está disponible, el bloque admin se OMITE con aviso documentado
 * en vez de depender de un admin sembrado (paridad@test.app). */
import pathApi from 'node:path';
import fsApi from 'node:fs';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
const promisifiedExecFile = promisify(execFile);
const conn = (process.env.PARITY_DATABASE_URL || '');
const dbUrl = conn || (() => {
  try {
    const dir = pathApi.dirname(fileURLToPath(import.meta.url));
    const env = fsApi.readFileSync(pathApi.join(dir, '..', '.env'), 'utf8');
    const m = env.match(/^DATABASE_URL=(.+)\s*$/m);
    return m ? m[1].trim() : '';
  } catch { return ''; }
})();
/* Caminos típicos de psql en Windows/Mac/Linux. */
const psqlCandidatos = [
  process.env.PARITY_PSQL,
  'C:/Program Files/PostgreSQL/18/bin/psql.exe',
  'C:/Program Files/PostgreSQL/17/bin/psql.exe',
  'C:/Program Files/PostgreSQL/16/bin/psql.exe',
  'psql'
].filter(Boolean);
async function ejecutarPsql(consulta, ...args) {
  /* Intenta cada candidato en orden; un ENOENT (binario ausente) avanza al
   * siguiente, cualquier otro error devuelve el fallo real. */
  for (const bin of psqlCandidatos) {
    try {
      const {stdout} = await promisifiedExecFile(
        bin, [dbUrl, '-q', '-t', '-A', '-c', consulta, ...args],
        {timeout: 15000, windowsHide: true});
      return {ok: true, stdout: String(stdout).trim(), code: 0};
    } catch (err) {
      if (err.code === 'ENOENT') continue;
      return {ok: false, stdout: String(err.stdout || '').trim(), stderr: String(err.stderr || '').trim(), code: err.code};
    }
  }
  return {ok: false, stdout: '', stderr: 'sin psql', code: 'ENOENT'};
}
let psqlDisponible = null; // undefined = sin probar; true/false = resultado
async function psqlOK() {
  if (psqlDisponible !== null) return psqlDisponible;
  if (!dbUrl) { psqlDisponible = false; return false; }
  const out = await ejecutarPsql('SELECT 1;');
  psqlDisponible = out.ok;
  if (!psqlDisponible) {
    console.log('  ⚠ psql no disponible o BD no alcanzable (DATABASE_URL del .env) — bloque admin auto-provisionado se omite');
  }
  return psqlDisponible;
}
const WS_URL = BASE.replace(/^http/, 'ws').replace(/\/api$/, '/api/realtime/ws');

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

/* [26-08-2026] El proxy IA depende de proveedores externos (Groq/DeepSeek...).
 * Cuando la API key no está disponible o es inválida, el backend devuelve
 * 502 upstream_error (AppError::Upstream). Esos asserts se OMITEN con aviso
 * documentado en vez de fallar; cualquier otra respuesta (200 mal formada,
 * 5xx interno, rate limit) sigue fallando: no se enmascara un fallo real. */
let omitidos = 0;
function esErrorProveedorExterno(r) {
  return r.status === 502 &&
    (r.data?.error === 'upstream_error' ||
     (typeof r.data?.message === 'string' && /proveedor|api key|unauthorized|401|deepseek/i.test(r.data.message)));
}
function assertIA(condicion, nombre, respuesta) {
  if (esErrorProveedorExterno(respuesta)) {
    omitidos++;
    console.log(`  ⚠ omitido (proveedor externo no disponible): ${nombre} — ${String(respuesta.data?.message).slice(0, 90)}`);
    return;
  }
  assert(condicion, nombre);
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

/* El backend limita /auth/* a 10 solicitudes/minuto por IP (FixedWindowLimiter):
 * este script hace ~10 llamadas de auth en ráfaga, así que se auto-espacia
 * para no chocar con el límite real del producto. */
const llamadasAuth = [];
async function apiAuth(metodo, ruta, opts) {
  const ahora = Date.now();
  const recientes = llamadasAuth.filter(t => ahora - t < 60000);
  llamadasAuth.length = 0;
  llamadasAuth.push(...recientes);
  if (recientes.length >= 9) {
    const masAntigua = Math.min(...recientes);
    const espera = 60000 - (ahora - masAntigua) + 300;
    await new Promise(r => setTimeout(r, espera));
  }
  llamadasAuth.push(Date.now());
  let res = await api(metodo, ruta, opts);
  /* [26-08-2026] El limiter de /auth/* es una ventana FIJA de 10/min por IP:
   * una corrida previa (o esta misma, al cruzar el borde de la ventana) puede
   * dejar la ventana llena, y el espaciado rolling de este proceso no lo ve.
   * Ante 429 se espera a que se vacíe la ventana y se reintenta (máx 2). */
  if (res.status === 429) {
    console.log('  [rate-limit auth] esperando ventana de 60s y reintentando…');
    await new Promise(r => setTimeout(r, 61000));
    res = await api(metodo, ruta, opts);
    if (res.status === 429) {
      console.log('  [rate-limit auth] segunda espera…');
      await new Promise(r => setTimeout(r, 61000));
      res = await api(metodo, ruta, opts);
    }
  }
  return res;
}

async function main() {
  const email = `verif-${Date.now()}@test.app`;
  console.log(`\n== Registro y sesión (${email}) ==`);
  let r = await apiAuth('POST', '/auth/register', {body: {email, password: 'password123'}});
  if (r.status !== 201) console.log('  [debug] register →', r.status, JSON.stringify(r.data)?.slice(0, 200));
  assert(r.status === 201 && r.data?.user?.id, 'register 201 con user.id');
  const uid = r.data.user.id;
  let csrf = cookies['csrf_token'];
  assert(!!csrf, 'cookie csrf_token emitida');

  console.log('\n== Suscripción ==');
  r = await api('GET', '/subscription');
  assert(r.status === 200 && r.data.plan === 'free' && r.data.trialDisponible === true, 'GET /subscription → free, trialDisponible');
  assert(r.data.limites.habitos === 5 && r.data.limites.tareasActivas === 20 && r.data.limites.proyectos === 3 && r.data.limites.adjuntosPorTarea === 0, 'límites FREE = 5/20/3/0 (paridad WordPress)');
  r = await api('GET', '/storage');
  assert(r.status === 200 && r.data.limite === 52428800 && r.data.limiteFormateado === '50.0 MB', 'límite FREE = 50 MB (paridad WordPress AlmacenamientoService)');
  r = await api('POST', '/subscription/trial', {csrf});
  assert(r.status === 200 && r.data.success && r.data.data.estado === 'trial', 'POST /subscription/trial → trial activo');
  r = await api('GET', '/subscription');
  assert(r.status === 200 && r.data.estado === 'trial' && r.data.diasRestantes >= 29, 'trial de 30 días persistido (diasRestantes >= 29)');
  assert(r.data.trialDisponible === false, 'trial de un solo uso: trialDisponible=false tras activarlo (paridad trialUsado)');
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
  assert(r.data.limite === 1073741824 && r.data.limiteFormateado === '1.0 GB', 'límite premium (trial) = 1 GB (paridad WordPress AlmacenamientoService)');
  const descarga = await api('GET', `/storage/files/${adjId}`);
  assert(descarga.status === 200 && descarga.data.includes('contenido de prueba'), 'descarga autenticada → 200 con contenido');
  r = await api('DELETE', `/storage/files/${adjId}`, {csrf});
  assert(r.status === 204, 'DELETE adjunto → 204');
  r = await api('GET', `/storage/files/${adjId}`);
  assert(r.status === 404, 'adjunto eliminado → 404');
  const fdProhibido = new FormData();
  fdProhibido.append('file', new Blob(['contenido'], {type: 'application/x-msdownload'}), 'malo.exe');
  r = await api('POST', '/storage/files', {body: fdProhibido, csrf});
  assert(r.status === 422, 'upload con MIME no permitido → 422 (paridad AdjuntosService)');

  console.log('\n== Backups (beneficio Premium) ==');
  /* Gate: un usuario FREE no puede tocar backups (paridad BackupsApiController::checkPermission). */
  const emailFree = `verif-free-${Date.now()}@test.app`;
  r = await apiAuth('POST', '/auth/register', {body: {email: emailFree, password: 'password123'}});
  assert(r.status === 201, 'registrar usuario FREE para el gate');
  r = await api('POST', '/backups', {body: {trigger: 'manual'}});
  assert(r.status === 403, 'backups con plan FREE → 403');
  /* Volver a la sesión del usuario verificado (trial = premium). */
  r = await apiAuth('POST', '/auth/login', {body: {email, password: 'password123'}});
  assert(r.status === 200, 're-login usuario verificado');
  csrf = cookies['csrf_token'];
  r = await api('POST', '/backups', {body: {trigger: 'manual'}, csrf});
  assert(r.status === 200 && r.data.success && r.data.backup?.hash, 'crear backup (trial) → snapshot con hash');
  const backupId = r.data.backup.id;
  r = await api('POST', '/backups', {body: {trigger: 'auto'}, csrf});
  assert(r.status === 200 && r.data.success === false, 'segunda copia inmediata → rechazada (intervalo 30 min, paridad WP)');
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
    const ws = new WebSocket(WS_URL, {headers: {cookie: headerCookie()}});
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

  console.log('\n== Compartidos (roles + ofuscación de email) ==');
  /* Registrar un compañero y conectar el equipo (paridad EquiposService). */
  const emailComp = `verif-comp-${Date.now()}@test.app`;
  r = await apiAuth('POST', '/auth/register', {body: {email: emailComp, password: 'password123'}});
  assert(r.status === 201, 'registrar compañero');
  const compId = r.data.user.id;
  r = await apiAuth('POST', '/auth/login', {body: {email, password: 'password123'}});
  assert(r.status === 200, 're-login usuario verificado');
  csrf = cookies['csrf_token'];
  r = await api('POST', '/teams/requests', {body: {email: emailComp}, csrf});
  assert(r.status === 201 || r.status === 200, 'enviar solicitud de equipo');
  r = await apiAuth('POST', '/auth/login', {body: {email: emailComp, password: 'password123'}});
  assert(r.status === 200, 'login compañero');
  csrf = cookies['csrf_token'];
  r = await api('GET', '/teams');
  const solicitudId = r.data?.received?.[0]?.id;
  assert(!!solicitudId, 'compañero tiene solicitud recibida');
  r = await api('PUT', `/teams/requests/${solicitudId}`, {body: {action: 'accept'}, csrf});
  assert(r.status === 200 && r.data?.status === 'accepted', 'aceptar solicitud → accepted');
  /* El usuario verificado comparte la tarea del chat con el compañero. */
  r = await apiAuth('POST', '/auth/login', {body: {email, password: 'password123'}});
  assert(r.status === 200, 're-login usuario A');
  csrf = cookies['csrf_token'];
  r = await api('POST', '/shared', {body: {itemType: 'tarea', itemId: tareaId, userId: compId, role: 'colaborador'}, csrf});
  assert(r.status === 201 && r.data?.id, 'compartir tarea con el compañero');
  assert(r.data.recipient.email.includes('***') && !r.data.recipient.email.includes('@test.app'), 'email del destinatario ofuscado en la respuesta (paridad CompartidosService)');
  r = await api('GET', `/shared/participants/tarea/${tareaId}/${uid}`);
  assert(r.status === 200 && r.data.participants.length >= 2 && r.data.participants.every(p => p.user.email.includes('***')), 'participantes con email ofuscado');
  r = await api('POST', '/shared', {body: {itemType: 'tarea', itemId: tareaId, userId: compId, role: 'colaborador'}, csrf});
  assert(r.status === 409, 'compartir dos veces el mismo elemento → 409');

  console.log('\n== Cambio de contraseña ==');
  /* [H-B04-01] El contrato exige contrasenaActual (una sesión robada no basta). */
  r = await api('PUT', '/security/password', {body: {contrasenaActual: 'password123', nuevaContrasena: 'clave-nueva-99'}, csrf});
  assert(r.status === 200 && r.data.success, 'cambiar contraseña → success');
  r = await api('GET', '/auth/me');
  assert(r.status === 401, 'sesión antigua invalidada → 401');
  r = await apiAuth('POST', '/auth/login', {body: {email, password: 'clave-nueva-99'}});
  assert(r.status === 200, 'login con la nueva contraseña → 200');
  r = await apiAuth('POST', '/auth/login', {body: {email, password: 'password123'}});
  assert(r.status === 401, 'login con la contraseña vieja → 401');
  /* [26-08-2026] Restaurar la contraseña original del usuario desechable:
   * las corridas sucesivas no deben heredar estado residual (una ejecución
   * previa dejó al usuario de prueba con la contraseña cambiada y rompió la
   * suite hasta que se restauró a mano). */
  r = await apiAuth('POST', '/auth/login', {body: {email, password: 'clave-nueva-99'}});
  assert(r.status === 200, 're-login con la nueva para restaurar');
  csrf = cookies['csrf_token'];
  r = await api('PUT', '/security/password', {body: {contrasenaActual: 'clave-nueva-99', nuevaContrasena: 'password123'}, csrf});
  assert(r.status === 200 && r.data.success, 'restaurar contraseña original → success (sin estado residual)');

  console.log('\n== Admin (es_admin) ==');
  /* [26-08-2026] La suite NO depende de un admin sembrado: promueve a su propio
   * usuario recién registrado (verif-...@test.app) a es_admin vía psql, porque
   * el contrato del producto no expone un endpoint de concesión de admin.
   * El middleware admin lee es_admin por request (join fresca a users), así que
   * la sesión ya activa ve el rol sin re-login. Si psql/BD no está disponible,
   * se omite el bloque con aviso documentado (skip legítimo). */
  if (await psqlOK()) {
    const prom = await ejecutarPsql(
      "UPDATE users SET es_admin = TRUE WHERE id = '" + uid.replaceAll('\'', '') + "' RETURNING email;");
    assert(prom.ok && prom.stdout.length > 0, 'auto-provisionar admin: es_admin=TRUE (psql)');
  } else {
    omitidos++;
    console.log('  ⚠ omitido (auto-provisionar admin: psql/BD no disponible)');
  }
  /* El bloque de cambio de contraseña invalidó la sesión del usuario verificado
   * (H-B04-01: cambiar password alza todas las sesiones). Re-login para que la
   * sesión admin/preferencias/tombstones (csrfAdmin) esté viva y válida. */
  r = await apiAuth('POST', '/auth/login', {body: {email, password: 'password123'}});
  assert(r.status === 200, 're-login usuario verificable para bloque admin');
  const csrfAdmin = cookies['csrf_token'];
  r = await api('GET', '/admin/stats');
  const adminDisponible = r.status === 200 && typeof r.data.totalUsuarios === 'number';
  if (!adminDisponible) {
    omitidos++;
    console.log('  ⚠ omitido (admin no disponible en este entorno): stats admin → ' + r.status);
  }
  assert(r.status === 200 && typeof r.data.totalUsuarios === 'number', 'admin stats → totalUsuarios');
  if (adminDisponible) {
    r = await api('GET', '/admin/users?pagina=1&porPagina=5');
    assert(r.status === 200 && Array.isArray(r.data.usuarios) && r.data.usuarios.length > 0, 'admin lista usuarios');
    r = await api('GET', `/admin/users/${uid}`);
    assert(r.status === 200 && r.data.id === uid, 'admin detalle del usuario verificado');
    r = await api('POST', `/admin/users/${uid}/premium`, {body: {duracion: 30}, csrf: csrfAdmin});
    assert(r.status === 200 && r.data.success, 'admin activa premium 30 días');
    r = await api('POST', `/admin/users/${uid}/cancel-premium`, {csrf: csrfAdmin});
    assert(r.status === 200 && r.data.success, 'admin cancela premium');

    /* [26-08-2026] Proxy IA (paridad WordPress). 2 llamadas reales por corrida
     * (límites 80/h chat y 60/h nutrición por usuario). La cadena usa modelos
     * vigentes de la cuenta en vez de los obsoletos que daban 404. TODO el
     * dominio admin (incluido /ai/*, que exige require_admin) se omite si psql
     * no pudo auto-provisionar al admin en este entorno. */
    console.log('\n== Proxy IA (/ai/*) ==');
    const csrfIa = cookies['csrf_token'];
    r = await api('POST', '/ai/chat', {body: {messages: [{role: 'user', content: 'hola'}]}, csrf: csrfIa});
    assertIA(r.status === 200 && typeof r.data.contenido === 'string' && r.data.contenido.length > 0, 'chat IA admin → contenido real', r);
    r = await api('POST', '/ai/nutricion', {body: {descripcion: 'un plato de arroz con pollo'}, csrf: csrfIa});
    assertIA(r.status === 200 && typeof r.data.calorias === 'number' && r.data.calorias > 0, 'nutrición IA admin → macros con calorías', r);
    r = await api('POST', '/ai/nutricion', {body: {descripcion: ''}, csrf: csrfIa});
    assert(r.status === 422 || r.status === 400, 'nutrición sin descripción → error de validación');
  }

  /* [18-08-2026] Preferencias UI/plugins por usuario: el servidor debe
   * persistir el blob (layout, plugins, tema...) y devolverlo en el GET.
   * En WordPress esto vivía solo en localStorage y se perdía al cambiar
   * de navegador o limpiar cache. */
  console.log('\n== Preferencias de usuario (persistencia UI/plugins) ==');
  const blobPrefs = {
    'glory_config_layout': {modoColumnas: 2, anchos: {izquierda: 320, derecha: 380}},
    'glory_sidebar_expandido': false,
    'glory-plugins': {pluginsActivos: ['ayuno', 'time-tracker'], configuracionPlugins: {ayuno: {habitoId: 7}}},
    'glory_config_tareas': {ocultarCompletadas: true, modoCompacto: false},
    'glory_config_habitos_desktop': {columnasVisibles: {nombre: true, progreso: true}},
    'glory_orden_habitos': 'inteligente',
    'glory_orden_tareas': 'manual',
    'dashboard_tema': 'oscuro',
    'glory-config-usuario': {state: {horaFinDia: 4}, version: 0},
    /* [18-08-2026] Auditoría exhaustiva: claves añadidas tras inventario total
     * de writes de localStorage (stores persist + hooks + writes directos). */
    'glory-ayuno': {state: {estado: 'activo', historial: [{inicio: 1000, fin: 2000}]}, version: 0},
    'glory-deficit-calorico': {state: {datosUsuario: {sexo: 'masculino'}}, version: 0},
    'grupos-tareas-storage': {state: {grupos: [{id: 1, nombre: 'Trabajo', colapsado: false}]}, version: 0},
    'GruposFbStore': {state: {grupos: [{id: 'g1', nombre: 'Grupo A'}]}, version: 0},
    'magnific_last_task': {taskId: 't-123', estado: 'done', mode: 'precision'},
    'gruposFb_columnas': {check: true, nombre: true, acciones: false},
    'gloryPaginaMovilActiva': 'tareas',
    'glory_nota_activa_id': 42,
    'glory_notas_activas_panel': {'scratchpad': 42},
    'arbitraje_costoProducto': {min: 10, max: 20},
    'arbitraje_tasas': {usdABs: 36.5},
    'arbitraje_modoSimulacion': 'ciclos'
  };
  r = await api('PUT', '/dashboard/settings', {body: {notas: 'nota-prefs', configuracion: {}, preferencias: blobPrefs}, csrf: csrfAdmin});
  assert(r.status === 204, 'PUT settings con preferencias → 204');
  r = await api('GET', '/dashboard');
  const prefsDevueltas = r.data?.data?.configuracion?.preferencias;
  assert(r.status === 200 && prefsDevueltas?.['glory_config_layout']?.modoColumnas === 2, 'GET dashboard devuelve glory_config_layout persistida');
  assert(prefsDevueltas?.['glory-plugins']?.pluginsActivos?.includes('time-tracker'), 'plugins activos persistidos (glory-plugins)');
  assert(prefsDevueltas?.['glory_config_tareas']?.ocultarCompletadas === true, 'config de tareas persistida');
  assert(prefsDevueltas?.['glory_orden_habitos'] === 'inteligente', 'orden de hábitos persistido');
  assert(prefsDevueltas?.['dashboard_tema'] === 'oscuro', 'tema persistido');
  assert(prefsDevueltas?.['glory-config-usuario']?.state?.horaFinDia === 4, 'hora fin de día persistida (glory-config-usuario)');
  assert(prefsDevueltas?.['glory-ayuno']?.state?.estado === 'activo', 'datos de ayuno persistidos (glory-ayuno, sin backend propio)');
  assert(prefsDevueltas?.['glory-deficit-calorico']?.state?.datosUsuario?.sexo === 'masculino', 'datos de déficit calórico persistidos');
  assert(prefsDevueltas?.['grupos-tareas-storage']?.state?.grupos?.[0]?.nombre === 'Trabajo', 'grupos de tareas persistidos');
  assert(prefsDevueltas?.['GruposFbStore']?.state?.grupos?.[0]?.nombre === 'Grupo A', 'grupos FB persistidos (service legacy sin backend)');
  assert(prefsDevueltas?.['magnific_last_task']?.taskId === 't-123', 'estado del escalador de imagen persistido');
  assert(prefsDevueltas?.['gruposFb_columnas']?.acciones === false, 'columnas de grupos FB persistidas');
  assert(prefsDevueltas?.['gloryPaginaMovilActiva'] === 'tareas', 'página móvil activa persistida');
  assert(prefsDevueltas?.['glory_nota_activa_id'] === 42, 'nota activa persistida');
  assert(prefsDevueltas?.['glory_notas_activas_panel']?.scratchpad === 42, 'mapa de notas activas por panel persistido');
  assert(prefsDevueltas?.['arbitraje_costoProducto']?.min === 10, 'config de la isla Arbitraje persistida');
  /* PUT parcial: solo preferencias, sin notas → notas se conservan; y PUT
   * solo notas → preferencias no se borran (merge COALESCE del backend). */
  r = await api('PUT', '/dashboard/settings', {body: {notas: 'nota-parcial', configuracion: {}, preferencias: {'glory_sidebar_expandido': true}}, csrf: csrfAdmin});
  assert(r.status === 204, 'PUT notas+config+prefs → 204');
  r = await api('PUT', '/dashboard/settings', {body: {preferencias: {'glory_config_layout': {modoColumnas: 3}}}, csrf: csrfAdmin});
  assert(r.status === 204, 'PUT solo preferencias (parcial) → 204');
  r = await api('GET', '/dashboard');
  assert(r.data?.data?.notas === 'nota-parcial', 'PUT parcial conserva notas existentes');
  assert(r.data?.data?.configuracion?.preferencias?.['glory_config_layout']?.modoColumnas === 3, 'PUT parcial actualiza preferencias');
  r = await api('PUT', '/dashboard/settings', {body: {notas: 'nota-solo'}, csrf: csrfAdmin});
  assert(r.status === 204, 'PUT solo notas (parcial inverso) → 204');
  r = await api('GET', '/dashboard');
  assert(r.data?.data?.notas === 'nota-solo', 'notas actualizadas por PUT parcial');
  assert(r.data?.data?.configuracion?.preferencias?.['glory_config_layout']?.modoColumnas === 3, 'PUT solo notas NO borra preferencias (merge COALESCE)');
  /* Restaurar preferencias vacías para no dejar el usuario de paridad sucio. */
  r = await api('PUT', '/dashboard/settings', {body: {notas: 'nota-prefs', configuracion: {}, preferencias: {}}, csrf: csrfAdmin});
  assert(r.status === 204, 'limpieza de preferencias de prueba → 204');

  /* [18-08-2026] Paridad actividad: el front llama GET /api/activity/dia
   * (WordPress: /actividad/dia); la ruta Rust era /activity/day y el front
   * recibía el HTML del SPA ("Unexpected token '<'"). */
  r = await api('GET', '/activity/dia?fecha=2026-08-18');
  assert(r.status === 200 && r.data.success === true, 'detalle de actividad por dia (ruta dia)');
  r = await api('GET', '/activity?fechaHoyLocal=2026-08-18&periodo=anio');
  assert(r.status === 200 && typeof r.data.heatmap === 'object', 'heatmap de actividad');

  /* [18-08-2026] Tombstones de borrado: el bug era que eliminar tareas solo
   * filtraba en el cliente y el backend las conservaba (soft-delete nunca
   * llegaba) → reaparecían al refrescar. Ahora DELETE /tasks/:id hace
   * soft-delete y el upsert posterior (undo/re-creación) lo revive. */
  console.log('\n== Tombstones de tareas (borrar no debe reaparecer) ==');
  const tareaBorradaId = 9700010001;
  r = await api('PUT', `/tasks/${tareaBorradaId}`, {body: {texto: 'tarea a borrar (tombstone)', completado: false}, csrf: csrfAdmin});
  assert(r.status === 200, 'crear tarea para tombstone → 200');
  r = await api('GET', '/dashboard');
  assert(Array.isArray(r.data?.data?.tareas) && r.data.data.tareas.some(t => t.id === tareaBorradaId), 'tarea visible en el dashboard');
  r = await api('DELETE', `/tasks/${tareaBorradaId}`, {csrf: csrfAdmin});
  assert(r.status === 204, 'DELETE soft de tarea → 204');
  r = await api('GET', '/dashboard');
  assert(!r.data?.data?.tareas.some(t => t.id === tareaBorradaId), 'tarea borrada NO aparece tras refrescar el dashboard');
  r = await api('DELETE', `/tasks/${tareaBorradaId}`, {csrf: csrfAdmin});
  assert(r.status === 204, 'DELETE repetido es idempotente → 204');
  /* Upsert posterior revive (camino de undo/re-creación del cliente). */
  r = await api('PUT', `/tasks/${tareaBorradaId}`, {body: {texto: 'tarea revivida (undo)', completado: false}, csrf: csrfAdmin});
  assert(r.status === 200, 're-PUT de tarea borrada → 200');
  r = await api('GET', '/dashboard');
  assert(r.data?.data?.tareas.some(t => t.id === tareaBorradaId && t.texto === 'tarea revivida (undo)'), 'upsert revive la tarea (undo del cliente)');
  r = await api('DELETE', `/tasks/${tareaBorradaId}`, {csrf: csrfAdmin});
  assert(r.status === 204, 'limpieza del tombstone de prueba → 204');

  /* [25-08-2026] LWW de preferencias: el backend debe fusionar el blob por
   * clave conservando la de mayor ts, nunca borrar claves ausentes y no dejar
   * que un PUT vacío/parcial haga wipe (coherencia multinavegador). Usuario
   * desechable: las claves de prueba quedan en su blob, no en el del admin. */
  console.log('\n== Preferencias LWW (merge por clave con ts) ==');
  const emailLww = `lww-${Date.now()}@test.app`;
  r = await apiAuth('POST', '/auth/register', {body: {email: emailLww, password: 'password123'}});
  assert(r.status === 201 && r.data?.user?.id, 'register usuario LWW → 201');
  const csrfLww = cookies['csrf_token'];
  const getPref = async () => {
    const res = await api('GET', '/dashboard');
    return res.data?.data?.configuracion?.preferencias || {};
  };
  r = await api('PUT', '/dashboard/settings', {body: {preferencias: {claveLww: {valor: 1, ts: 100}}}, csrf: csrfLww});
  assert(r.status === 204 || r.status === 200, 'PUT preferencias inicial → 204/200');
  let pref = await getPref();
  assert(pref.claveLww?.valor === 1 && pref.claveLww?.ts === 100, 'blob guardado con {valor, ts}');
  r = await api('PUT', '/dashboard/settings', {body: {preferencias: {claveLww: {valor: 2, ts: 50}}}, csrf: csrfLww});
  pref = await getPref();
  assert(pref.claveLww?.valor === 1, 'ts menor NO pisa (sigue valor 1)');
  r = await api('PUT', '/dashboard/settings', {body: {preferencias: {claveLww: {valor: 3, ts: 200}}}, csrf: csrfLww});
  pref = await getPref();
  assert(pref.claveLww?.valor === 3, 'ts mayor pisa (valor 3)');
  r = await api('PUT', '/dashboard/settings', {body: {preferencias: {}}, csrf: csrfLww});
  pref = await getPref();
  assert(pref.claveLww?.valor === 3, 'PUT vacío NO borra el blob (anti-wipe)');
  r = await api('PUT', '/dashboard/settings', {body: {preferencias: {otraClaveLww: {valor: 'x', ts: 300}}}, csrf: csrfLww});
  pref = await getPref();
  assert(pref.claveLww?.valor === 3 && pref.otraClaveLww?.valor === 'x', 'PUT parcial conserva claves ajenas y añade las nuevas');

  /* [26-08-2026] PARIDAD DE CONCEPTO: el panel de Actividad debe reflejar el
   * HISTORIAL REAL de cumplimiento (payload de hábitos + completed_at de
   * tareas), no depender de activity_events. Regresión integrada de
   * .freebuff/activity-test.mjs + activity-delete-test.mjs, con datos 100%
   * autocontenidos: se crean hábitos con historial en fechas recientes
   * deterministas (respecto a hoy) bajo la sesión del usuario verificable, y
   * se comprueba que el historial del payload alimenta heatmap/detalle/
   * estadísticas y que persiste tras borrar la entidad. NO depende de un
   * admin sembrado ni de historial importado previo. */
  console.log('\n== Actividad derivada del historial real (no de activity_events) ==');
  /* Usuario desechable dedicado: aisla el dominio de actividad de cualquier resto
   * del resto de la suite y garantiza que los asserts midan solo los datos que
   * este bloque crea (self-contained, sin depender de datos previos ni ajenos). */
  const emailAct = `act-${Date.now()}@test.app`;
  r = await apiAuth('POST', '/auth/register', {body: {email: emailAct, password: 'password123'}});
  assert(r.status === 201 && r.data?.user?.id, 'register usuario dedicado de actividad → 201');
  const csrfAct = cookies['csrf_token'];
  /* Fechas auxiliares ISO locales (YYYY-MM-DD), estables y dentro de la ventana
   * periodo=anio respecto a hoy. Se evita colisionar con actividad previa: se
   * usan 3 fechas contiguas hace <100 días y se comprueba antes/después por
   * inclusión exacta, no por conteo global. */
  const isoLocal = (dt) => {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  const hoy = new Date();
  const fechaHoy = isoLocal(hoy);
  const fechasAct = [18, 17, 16].map(n => {
    const d = new Date(hoy); d.setDate(d.getDate() - n); return isoLocal(d);
  }); // 3 fechas contiguas: hoy-16, hoy-17, hoy-18
  const actTestId = 987654321098;
  const payloadAct = {id: actTestId, nombre: 'Test Actividad Durable', importancia: 'Media',
    frecuencia: 'diario', historialCompletados: fechasAct, historialPospuestos: [],
    fechaCreacion: isoLocal(new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1)), ultimoCompletado: fechasAct[0]};
  r = await api('PUT', `/habits/${actTestId}`, {csrf: csrfAct, body: {nombre: 'Test Actividad Durable', importancia: 'Media', frecuencia: 'diario', orden: 0, payload: payloadAct}});
  assert(r.status === 200, 'crear hábito de prueba con historial en fechas recientes → 200');
  const conActividad = (hm) => ({diasCon: Object.keys(hm).filter(d => (hm[d]?.total || 0) > 0 && fechasAct.includes(d)),
    totalHabitos: Object.values(hm).reduce((s, d) => s + (d.tipos?.habito_cumplido || 0), 0)});
  const leerHeatmap = async () => {
    const hm = await api('GET', `/activity?periodo=anio&fechaHoyLocal=${fechaHoy}`);
    return hm.data?.heatmap || {};
  };
  let hm = await leerHeatmap();
  let vis = conActividad(hm);
  assert(vis.diasCon.length === 3, `el hábito aporta su historial al heatmap (derivación del payload; fechas ${fechasAct})`);
  assert(vis.totalHabitos >= 3, `habito_cumplido presente en el heatmap (${vis.totalHabitos})`);
  /* Detalle del día más reciente: debe listar el cumplimiento del hábito. */
  r = await api('GET', `/activity/dia?fecha=${fechasAct[0]}`);
  assert(r.status === 200 && Array.isArray(r.data.detalle) && r.data.detalle.some(i => i.tipo === 'habito_cumplido'), 'detalle del día refleja el historial real (habito_cumplido)');
  /* Estadísticas coherentes: totales de habito_cumplido >= las fechas creadas. */
  r = await api('GET', `/activity/estadisticas?fechaHoyLocal=${fechaHoy}`);
  assert(r.status === 200 && (r.data?.estadisticas?.totales?.habito_cumplido || 0) >= 3 && (r.data?.estadisticas?.diasActivos || 0) > 0, 'estadísticas coherentes con el historial creado');
  /* Borrar una entidad NO borra su actividad (hecho durable: soft-delete). */
  r = await api('DELETE', `/habits/${actTestId}`, {csrf: csrfAct});
  assert(r.status === 204, 'DELETE soft del hábito de prueba → 204');
  hm = await leerHeatmap();
  const visPost = conActividad(hm);
  assert(visPost.diasCon.length === 3, 'la actividad PERSISTE tras borrar el hábito (hecho durable)');

  console.log(`\n== RESULTADO: ${pasados} pasados, ${fallados} fallados${omitidos > 0 ? `, ${omitidos} omitidos (proveedor externo)` : ''} ==`);
  if (fallados > 0) {
    console.log('Fallaron:', errores.join(' | '));
    process.exit(1);
  }
}

main().catch(e => { console.error('FALLO DE SCRIPT:', e.message); process.exit(1); });
