/* Verificación end-to-end de los dominios de paridad (18-08-2026).
 * Recorre el ciclo de vida real de cada dominio contra el backend en vivo
 * y falla con código 1 si algún assert no se cumple. */
const BASE = process.env.PARITY_BASE_URL || 'http://127.0.0.1:3000/api';
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
  return api(metodo, ruta, opts);
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
  r = await api('PUT', '/security/password', {body: {nuevaContrasena: 'clave-nueva-99'}, csrf});
  assert(r.status === 200 && r.data.success, 'cambiar contraseña → success');
  r = await api('GET', '/auth/me');
  assert(r.status === 401, 'sesión antigua invalidada → 401');
  r = await apiAuth('POST', '/auth/login', {body: {email, password: 'clave-nueva-99'}});
  assert(r.status === 200, 'login con la nueva contraseña → 200');
  r = await apiAuth('POST', '/auth/login', {body: {email, password: 'password123'}});
  assert(r.status === 401, 'login con la contraseña vieja → 401');

  console.log('\n== Admin (es_admin) ==');
  /* El usuario paridad@test.app ya es admin en BD; login con su contraseña actual. */
  r = await apiAuth('POST', '/auth/login', {body: {email: 'paridad@test.app', password: 'nueva12345'}});
  if (r.status !== 200) console.log('  [debug] login admin →', r.status, JSON.stringify(r.data)?.slice(0, 160));
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

  console.log(`\n== RESULTADO: ${pasados} pasados, ${fallados} fallados ==`);
  if (fallados > 0) {
    console.log('Fallaron:', errores.join(' | '));
    process.exit(1);
  }
}

main().catch(e => { console.error('FALLO DE SCRIPT:', e.message); process.exit(1); });
