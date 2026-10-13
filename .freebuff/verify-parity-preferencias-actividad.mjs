/* Dominios de preferencias de usuario, paridad de actividad, tombstones de
 * tareas, preferencias LWW y actividad derivada del historial (verify-parity).
 * Cada función es una sección del original, en su mismo orden. */
import {estado, api, apiAuth, assert} from './verify-parity-infra.mjs';

export async function preferencias() {
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
  let r = await api('PUT', '/dashboard/settings', {body: {notas: 'nota-prefs', configuracion: {}, preferencias: blobPrefs}, csrf: estado.csrfAdmin});
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
  r = await api('PUT', '/dashboard/settings', {body: {notas: 'nota-parcial', configuracion: {}, preferencias: {'glory_sidebar_expandido': true}}, csrf: estado.csrfAdmin});
  assert(r.status === 204, 'PUT notas+config+prefs → 204');
  r = await api('PUT', '/dashboard/settings', {body: {preferencias: {'glory_config_layout': {modoColumnas: 3}}}, csrf: estado.csrfAdmin});
  assert(r.status === 204, 'PUT solo preferencias (parcial) → 204');
  r = await api('GET', '/dashboard');
  assert(r.data?.data?.notas === 'nota-parcial', 'PUT parcial conserva notas existentes');
  assert(r.data?.data?.configuracion?.preferencias?.['glory_config_layout']?.modoColumnas === 3, 'PUT parcial actualiza preferencias');
  r = await api('PUT', '/dashboard/settings', {body: {notas: 'nota-solo'}, csrf: estado.csrfAdmin});
  assert(r.status === 204, 'PUT solo notas (parcial inverso) → 204');
  r = await api('GET', '/dashboard');
  assert(r.data?.data?.notas === 'nota-solo', 'notas actualizadas por PUT parcial');
  assert(r.data?.data?.configuracion?.preferencias?.['glory_config_layout']?.modoColumnas === 3, 'PUT solo notas NO borra preferencias (merge COALESCE)');
  /* Restaurar preferencias vacías para no dejar el usuario de paridad sucio. */
  r = await api('PUT', '/dashboard/settings', {body: {notas: 'nota-prefs', configuracion: {}, preferencias: {}}, csrf: estado.csrfAdmin});
  assert(r.status === 204, 'limpieza de preferencias de prueba → 204');
}

export async function paridadActividad() {
  /* [18-08-2026] Paridad actividad: el front llama GET /api/activity/dia
   * (WordPress: /actividad/dia); la ruta Rust era /activity/day y el front
   * recibía el HTML del SPA ("Unexpected token '<'"). */
  let r = await api('GET', '/activity/dia?fecha=2026-08-18');
  assert(r.status === 200 && r.data.success === true, 'detalle de actividad por dia (ruta dia)');
  r = await api('GET', '/activity?fechaHoyLocal=2026-08-18&periodo=anio');
  assert(r.status === 200 && typeof r.data.heatmap === 'object', 'heatmap de actividad');
}

export async function tombstones() {
  /* [18-08-2026] Tombstones de borrado: el bug era que eliminar tareas solo
   * filtraba en el cliente y el backend las conservaba (soft-delete nunca
   * llegaba) → reaparecían al refrescar. Ahora DELETE /tasks/:id hace
   * soft-delete y el upsert posterior (undo/re-creación) lo revive. */
  console.log('\n== Tombstones de tareas (borrar no debe reaparecer) ==');
  const tareaBorradaId = 9700010001;
  let r = await api('PUT', `/tasks/${tareaBorradaId}`, {body: {texto: 'tarea a borrar (tombstone)', completado: false}, csrf: estado.csrfAdmin});
  assert(r.status === 200, 'crear tarea para tombstone → 200');
  r = await api('GET', '/dashboard');
  assert(Array.isArray(r.data?.data?.tareas) && r.data.data.tareas.some(t => t.id === tareaBorradaId), 'tarea visible en el dashboard');
  r = await api('DELETE', `/tasks/${tareaBorradaId}`, {csrf: estado.csrfAdmin});
  assert(r.status === 204, 'DELETE soft de tarea → 204');
  r = await api('GET', '/dashboard');
  assert(!r.data?.data?.tareas.some(t => t.id === tareaBorradaId), 'tarea borrada NO aparece tras refrescar el dashboard');
  r = await api('DELETE', `/tasks/${tareaBorradaId}`, {csrf: estado.csrfAdmin});
  assert(r.status === 204, 'DELETE repetido es idempotente → 204');
  /* Upsert posterior revive (camino de undo/re-creación del cliente). */
  r = await api('PUT', `/tasks/${tareaBorradaId}`, {body: {texto: 'tarea revivida (undo)', completado: false}, csrf: estado.csrfAdmin});
  assert(r.status === 200, 're-PUT de tarea borrada → 200');
  r = await api('GET', '/dashboard');
  assert(r.data?.data?.tareas.some(t => t.id === tareaBorradaId && t.texto === 'tarea revivida (undo)'), 'upsert revive la tarea (undo del cliente)');
  r = await api('DELETE', `/tasks/${tareaBorradaId}`, {csrf: estado.csrfAdmin});
  assert(r.status === 204, 'limpieza del tombstone de prueba → 204');
}

export async function preferenciasLww() {
  /* [25-08-2026] LWW de preferencias: el backend debe fusionar el blob por
   * clave conservando la de mayor ts, nunca borrar claves ausentes y no dejar
   * que un PUT vacío/parcial haga wipe (coherencia multinavegador). Usuario
   * desechable: las claves de prueba quedan en su blob, no en el del admin. */
  console.log('\n== Preferencias LWW (merge por clave con ts) ==');
  const emailLww = `lww-${Date.now()}@test.app`;
  let r = await apiAuth('POST', '/auth/register', {body: {email: emailLww, password: 'password123'}});
  assert(r.status === 201 && r.data?.user?.id, 'register usuario LWW → 201');
  const csrfLww = estado.cookies['csrf_token'];
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
}

export async function actividadDerivada() {
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
  let r = await apiAuth('POST', '/auth/register', {body: {email: emailAct, password: 'password123'}});
  assert(r.status === 201 && r.data?.user?.id, 'register usuario dedicado de actividad → 201');
  const csrfAct = estado.cookies['csrf_token'];
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
}
