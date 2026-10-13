/* Dominios de compartidos, cambio de contraseña y admin (con Proxy IA) de la
 * suite verify-parity. Cada función es una sección del original, en su orden. */
import {estado, api, apiAuth, assert, assertIA, psqlOK, ejecutarPsql} from './verify-parity-infra.mjs';

export async function compartidos() {
  console.log('\n== Compartidos (roles + ofuscación de email) ==');
  /* Registrar un compañero y conectar el equipo (paridad EquiposService). */
  const emailComp = `verif-comp-${Date.now()}@test.app`;
  let r = await apiAuth('POST', '/auth/register', {body: {email: emailComp, password: 'password123'}});
  assert(r.status === 201, 'registrar compañero');
  const compId = r.data.user.id;
  r = await apiAuth('POST', '/auth/login', {body: {email: estado.email, password: 'password123'}});
  assert(r.status === 200, 're-login usuario verificado');
  estado.csrf = estado.cookies['csrf_token'];
  r = await api('POST', '/teams/requests', {body: {email: emailComp}, csrf: estado.csrf});
  assert(r.status === 201 || r.status === 200, 'enviar solicitud de equipo');
  r = await apiAuth('POST', '/auth/login', {body: {email: emailComp, password: 'password123'}});
  assert(r.status === 200, 'login compañero');
  estado.csrf = estado.cookies['csrf_token'];
  r = await api('GET', '/teams');
  const solicitudId = r.data?.received?.[0]?.id;
  assert(!!solicitudId, 'compañero tiene solicitud recibida');
  r = await api('PUT', `/teams/requests/${solicitudId}`, {body: {action: 'accept'}, csrf: estado.csrf});
  assert(r.status === 200 && r.data?.status === 'accepted', 'aceptar solicitud → accepted');
  /* El usuario verificado comparte la tarea del chat con el compañero. */
  r = await apiAuth('POST', '/auth/login', {body: {email: estado.email, password: 'password123'}});
  assert(r.status === 200, 're-login usuario A');
  estado.csrf = estado.cookies['csrf_token'];
  r = await api('POST', '/shared', {body: {itemType: 'tarea', itemId: estado.tareaId, userId: compId, role: 'colaborador'}, csrf: estado.csrf});
  assert(r.status === 201 && r.data?.id, 'compartir tarea con el compañero');
  assert(r.data.recipient.email.includes('***') && !r.data.recipient.email.includes('@test.app'), 'email del destinatario ofuscado en la respuesta (paridad CompartidosService)');
  r = await api('GET', `/shared/participants/tarea/${estado.tareaId}/${estado.uid}`);
  assert(r.status === 200 && r.data.participants.length >= 2 && r.data.participants.every(p => p.user.email.includes('***')), 'participantes con email ofuscado');
  r = await api('POST', '/shared', {body: {itemType: 'tarea', itemId: estado.tareaId, userId: compId, role: 'colaborador'}, csrf: estado.csrf});
  assert(r.status === 409, 'compartir dos veces el mismo elemento → 409');
}

export async function cambioContrasena() {
  console.log('\n== Cambio de contraseña ==');
  /* [H-B04-01] El contrato exige contrasenaActual (una sesión robada no basta). */
  let r = await api('PUT', '/security/password', {body: {contrasenaActual: 'password123', nuevaContrasena: 'clave-nueva-99'}, csrf: estado.csrf});
  assert(r.status === 200 && r.data.success, 'cambiar contraseña → success');
  r = await api('GET', '/auth/me');
  assert(r.status === 401, 'sesión antigua invalidada → 401');
  r = await apiAuth('POST', '/auth/login', {body: {email: estado.email, password: 'clave-nueva-99'}});
  assert(r.status === 200, 'login con la nueva contraseña → 200');
  r = await apiAuth('POST', '/auth/login', {body: {email: estado.email, password: 'password123'}});
  assert(r.status === 401, 'login con la contraseña vieja → 401');
  /* [26-08-2026] Restaurar la contraseña original del usuario desechable:
   * las corridas sucesivas no deben heredar estado residual (una ejecución
   * previa dejó al usuario de prueba con la contraseña cambiada y rompió la
   * suite hasta que se restauró a mano). */
  r = await apiAuth('POST', '/auth/login', {body: {email: estado.email, password: 'clave-nueva-99'}});
  assert(r.status === 200, 're-login con la nueva para restaurar');
  estado.csrf = estado.cookies['csrf_token'];
  r = await api('PUT', '/security/password', {body: {contrasenaActual: 'clave-nueva-99', nuevaContrasena: 'password123'}, csrf: estado.csrf});
  assert(r.status === 200 && r.data.success, 'restaurar contraseña original → success (sin estado residual)');
}

export async function admin() {
  console.log('\n== Admin (es_admin) ==');
  /* [26-08-2026] La suite NO depende de un admin sembrado: promueve a su propio
   * usuario recién registrado (verif-...@test.app) a es_admin vía psql, porque
   * el contrato del producto no expone un endpoint de concesión de admin.
   * El middleware admin lee es_admin por request (join fresca a users), así que
   * la sesión ya activa ve el rol sin re-login. Si psql/BD no está disponible,
   * se omite el bloque con aviso documentado (skip legítimo). */
  if (await psqlOK()) {
    const prom = await ejecutarPsql(
      "UPDATE users SET es_admin = TRUE WHERE id = '" + estado.uid.replaceAll('\'', '') + "' RETURNING email;");
    assert(prom.ok && prom.stdout.length > 0, 'auto-provisionar admin: es_admin=TRUE (psql)');
  } else {
    estado.omitidos++;
    console.log('  ⚠ omitido (auto-provisionar admin: psql/BD no disponible)');
  }
  /* El bloque de cambio de contraseña invalidó la sesión del usuario verificado
   * (H-B04-01: cambiar password alza todas las sesiones). Re-login para que la
   * sesión admin/preferencias/tombstones (csrfAdmin) esté viva y válida. */
  let r = await apiAuth('POST', '/auth/login', {body: {email: estado.email, password: 'password123'}});
  assert(r.status === 200, 're-login usuario verificable para bloque admin');
  estado.csrfAdmin = estado.cookies['csrf_token'];
  r = await api('GET', '/admin/stats');
  const adminDisponible = r.status === 200 && typeof r.data.totalUsuarios === 'number';
  if (!adminDisponible) {
    estado.omitidos++;
    console.log('  ⚠ omitido (admin no disponible en este entorno): stats admin → ' + r.status);
  }
  assert(r.status === 200 && typeof r.data.totalUsuarios === 'number', 'admin stats → totalUsuarios');
  if (adminDisponible) {
    r = await api('GET', '/admin/users?pagina=1&porPagina=5');
    assert(r.status === 200 && Array.isArray(r.data.usuarios) && r.data.usuarios.length > 0, 'admin lista usuarios');
    r = await api('GET', `/admin/users/${estado.uid}`);
    assert(r.status === 200 && r.data.id === estado.uid, 'admin detalle del usuario verificado');
    r = await api('POST', `/admin/users/${estado.uid}/premium`, {body: {duracion: 30}, csrf: estado.csrfAdmin});
    assert(r.status === 200 && r.data.success, 'admin activa premium 30 días');
    r = await api('POST', `/admin/users/${estado.uid}/cancel-premium`, {csrf: estado.csrfAdmin});
    assert(r.status === 200 && r.data.success, 'admin cancela premium');

    /* [26-08-2026] Proxy IA (paridad WordPress). 2 llamadas reales por corrida
     * (límites 80/h chat y 60/h nutrición por usuario). La cadena usa modelos
     * vigentes de la cuenta en vez de los obsoletos que daban 404. TODO el
     * dominio admin (incluido /ai/*, que exige require_admin) se omite si psql
     * no pudo auto-provisionar al admin en este entorno. */
    console.log('\n== Proxy IA (/ai/*) ==');
    const csrfIa = estado.cookies['csrf_token'];
    r = await api('POST', '/ai/chat', {body: {messages: [{role: 'user', content: 'hola'}]}, csrf: csrfIa});
    assertIA(r.status === 200 && typeof r.data.contenido === 'string' && r.data.contenido.length > 0, 'chat IA admin → contenido real', r);
    r = await api('POST', '/ai/nutricion', {body: {descripcion: 'un plato de arroz con pollo'}, csrf: csrfIa});
    assertIA(r.status === 200 && typeof r.data.calorias === 'number' && r.data.calorias > 0, 'nutrición IA admin → macros con calorías', r);
    r = await api('POST', '/ai/nutricion', {body: {descripcion: ''}, csrf: csrfIa});
    assert(r.status === 422 || r.status === 400, 'nutrición sin descripción → error de validación');
  }
}
