/* Dominios de sesión, almacenamiento, backups, feedback, cifrado E2E, tokens MCP
 * y timeline en tiempo real de la suite verify-parity. Cada función es una
 * sección del original, en su mismo orden (lo encadena verify-parity.mjs). */
import {estado, api, apiAuth, assert, headerCookie, WS_URL} from './verify-parity-infra.mjs';

export async function registroSesion() {
  estado.email = `verif-${Date.now()}@test.app`;
  console.log(`\n== Registro y sesión (${estado.email}) ==`);
  let r = await apiAuth('POST', '/auth/register', {body: {email: estado.email, password: 'password123'}});
  if (r.status !== 201) console.log('  [debug] register →', r.status, JSON.stringify(r.data)?.slice(0, 200));
  assert(r.status === 201 && r.data?.user?.id, 'register 201 con user.id');
  estado.uid = r.data.user.id;
  estado.csrf = estado.cookies['csrf_token'];
  assert(!!estado.csrf, 'cookie csrf_token emitida');
}

export async function suscripcion() {
  console.log('\n== Suscripción ==');
  let r = await api('GET', '/subscription');
  assert(r.status === 200 && r.data.plan === 'free' && r.data.trialDisponible === true, 'GET /subscription → free, trialDisponible');
  assert(r.data.limites.habitos === 5 && r.data.limites.tareasActivas === 20 && r.data.limites.proyectos === 3 && r.data.limites.adjuntosPorTarea === 0, 'límites FREE = 5/20/3/0 (paridad WordPress)');
  r = await api('GET', '/storage');
  assert(r.status === 200 && r.data.limite === 52428800 && r.data.limiteFormateado === '50.0 MB', 'límite FREE = 50 MB (paridad WordPress AlmacenamientoService)');
  r = await api('POST', '/subscription/trial', {csrf: estado.csrf});
  assert(r.status === 200 && r.data.success && r.data.data.estado === 'trial', 'POST /subscription/trial → trial activo');
  r = await api('GET', '/subscription');
  assert(r.status === 200 && r.data.estado === 'trial' && r.data.diasRestantes >= 29, 'trial de 30 días persistido (diasRestantes >= 29)');
  assert(r.data.trialDisponible === false, 'trial de un solo uso: trialDisponible=false tras activarlo (paridad trialUsado)');
  r = await api('POST', '/subscription/trial', {}); // sin CSRF
  assert(r.status === 403, 'mutación sin CSRF → 403');
}

export async function almacenamientoAdjuntos() {
  console.log('\n== Almacenamiento / adjuntos ==');
  let r = await api('POST', '/storage/verify', {body: {tamano: 100}, csrf: estado.csrf});
  assert(r.status === 200 && r.data.puedeSubir === true, 'verify espacio → puedeSubir');
  const fd = new FormData();
  fd.append('file', new Blob(['contenido de prueba para verificación'], {type: 'text/plain'}), 'verif.txt');
  fd.append('tipo', 'archivo');
  r = await api('POST', '/storage/files', {body: fd, csrf: estado.csrf});
  assert(r.status === 201 && r.data.id && r.data.url.includes(r.data.id), 'upload multipart → 201, url con id');
  const adjId = r.data.id;
  r = await api('GET', '/storage');
  assert(r.status === 200 && r.data.usado >= 30, 'GET /storage → usado > 0');
  assert(r.data.limite === 1073741824 && r.data.limiteFormateado === '1.0 GB', 'límite premium (trial) = 1 GB (paridad WordPress AlmacenamientoService)');
  const descarga = await api('GET', `/storage/files/${adjId}`);
  assert(descarga.status === 200 && descarga.data.includes('contenido de prueba'), 'descarga autenticada → 200 con contenido');
  r = await api('DELETE', `/storage/files/${adjId}`, {csrf: estado.csrf});
  assert(r.status === 204, 'DELETE adjunto → 204');
  r = await api('GET', `/storage/files/${adjId}`);
  assert(r.status === 404, 'adjunto eliminado → 404');
  const fdProhibido = new FormData();
  fdProhibido.append('file', new Blob(['contenido'], {type: 'application/x-msdownload'}), 'malo.exe');
  r = await api('POST', '/storage/files', {body: fdProhibido, csrf: estado.csrf});
  assert(r.status === 422, 'upload con MIME no permitido → 422 (paridad AdjuntosService)');
}

export async function backups() {
  console.log('\n== Backups (beneficio Premium) ==');
  /* Gate: un usuario FREE no puede tocar backups (paridad BackupsApiController::checkPermission). */
  const emailFree = `verif-free-${Date.now()}@test.app`;
  let r = await apiAuth('POST', '/auth/register', {body: {email: emailFree, password: 'password123'}});
  assert(r.status === 201, 'registrar usuario FREE para el gate');
  r = await api('POST', '/backups', {body: {trigger: 'manual'}});
  assert(r.status === 403, 'backups con plan FREE → 403');
  /* Volver a la sesión del usuario verificado (trial = premium). */
  r = await apiAuth('POST', '/auth/login', {body: {email: estado.email, password: 'password123'}});
  assert(r.status === 200, 're-login usuario verificado');
  estado.csrf = estado.cookies['csrf_token'];
  r = await api('POST', '/backups', {body: {trigger: 'manual'}, csrf: estado.csrf});
  assert(r.status === 200 && r.data.success && r.data.backup?.hash, 'crear backup (trial) → snapshot con hash');
  const backupId = r.data.backup.id;
  r = await api('POST', '/backups', {body: {trigger: 'auto'}, csrf: estado.csrf});
  assert(r.status === 200 && r.data.success === false, 'segunda copia inmediata → rechazada (intervalo 30 min, paridad WP)');
  r = await api('GET', '/backups');
  assert(r.status === 200 && Array.isArray(r.data) && r.data.some(b => b.id === backupId), 'lista backups contiene el creado');
  r = await api('POST', `/backups/${backupId}/restore`, {csrf: estado.csrf});
  assert(r.status === 200 && r.data.success, 'restore → success');
  r = await api('DELETE', `/backups/${backupId}`, {csrf: estado.csrf});
  assert(r.status === 204, 'DELETE backup → 204');
}

export async function feedback() {
  console.log('\n== Feedback ==');
  let r = await api('GET', '/feedback/state');
  assert(r.status === 200 && r.data.restante === 3, 'state inicial restante=3');
  r = await api('POST', '/feedback', {body: {tipo: 'sugerencia', mensaje: 'Mensaje de verificación automática'}, csrf: estado.csrf});
  assert(r.status === 200 && r.data.success, 'enviar feedback → success');
  r = await api('GET', '/feedback/state');
  assert(r.status === 200 && r.data.restante === 2, 'restante decrementado a 2');
}

export async function cifradoE2E() {
  console.log('\n== Cifrado E2E ==');
  let r = await api('GET', '/security/e2e');
  assert(r.status === 200 && r.data.habilitado === false, 'e2e inicial deshabilitado');
  r = await api('PUT', '/security/e2e', {body: {habilitado: true, claveCifrada: 'Y2xhdmUtcHJ1ZWJh', algoritmo: 'AES-GCM', derivacion: 'PBKDF2'}, csrf: estado.csrf});
  assert(r.status === 200 && r.data.success && r.data.estado.habilitado === true, 'habilitar e2e → habilitado');
  r = await api('GET', '/security/e2e');
  assert(r.status === 200 && r.data.habilitado === true, 'e2e persistido');
}

export async function tokensMcp() {
  console.log('\n== Tokens MCP ==');
  let r = await api('GET', '/security/mcp/token');
  assert(r.status === 200 && r.data.existe === false, 'sin token inicial');
  r = await api('POST', '/security/mcp/token', {csrf: estado.csrf});
  assert(r.status === 201 && r.data.success && r.data.token.startsWith('mcp_'), 'generar token mcp_');
  const tokenId = r.data.id;
  r = await api('GET', '/security/mcp/token');
  assert(r.status === 200 && r.data.existe === true && r.data.id === tokenId, 'estado token existe');
  r = await api('DELETE', `/security/mcp/token/${tokenId}`, {csrf: estado.csrf});
  assert(r.status === 200 && r.data.success, 'revocar token');
  r = await api('GET', '/security/mcp/token');
  assert(r.status === 200 && r.data.existe === false, 'token revocado');
}

export async function timelineWebSocket() {
  console.log('\n== Timeline + WebSocket (tiempo real) ==');
  estado.tareaId = 555001;
  let r = await api('PUT', `/tasks/${estado.tareaId}`, {body: {texto: 'Tarea para verificar chat RT', completado: false}, csrf: estado.csrf});
  assert(r.status === 200, 'crear tarea para el chat');
  const wsEvento = await new Promise(resolve => {
    const ws = new WebSocket(WS_URL, {headers: {cookie: headerCookie()}});
    const timer = setTimeout(() => { ws.close(); resolve(null); }, 8000);
    ws.onopen = async () => {
      await new Promise(s => setTimeout(s, 400));
      try {
        await api('POST', '/timeline', {body: {itemType: 'tarea', itemId: estado.tareaId, content: 'mensaje RT de verificación'}, csrf: estado.csrf});
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
}
