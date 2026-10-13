/* Infraestructura compartida de la suite de paridad (verify-parity): config,
 * acceso a BD, contadores, aserciones, cookie jar y cliente HTTP. Los módulos
 * verify-parity-*.mjs la importan; el orden de ejecución lo fija verify-parity.mjs. */
import pathApi from 'node:path';
import fsApi from 'node:fs';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';

const BASE_RAW = (process.env.PARITY_BASE_URL || 'http://127.0.0.1:3001/api').replace(/\/+$/, '');
const BASE = BASE_RAW.endsWith('/api') ? BASE_RAW : BASE_RAW + '/api';

/* [26-08-2026] Acceso directo a BD para auto-provisionar el admin de prueba.
 * El contrato del producto no expone un endpoint para conceder es_admin, así
 * que la suite promueve a su propio usuario recién registrado vía psql
 * (DATABASE_URL del .env del proyecto, override con PARITY_DATABASE_URL).
 * Si psql no está disponible, el bloque admin se OMITE con aviso documentado
 * en vez de depender de un admin sembrado (paridad@test.app). */
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
export async function ejecutarPsql(consulta, ...args) {
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
export async function psqlOK() {
  if (psqlDisponible !== null) return psqlDisponible;
  if (!dbUrl) { psqlDisponible = false; return false; }
  const out = await ejecutarPsql('SELECT 1;');
  psqlDisponible = out.ok;
  if (!psqlDisponible) {
    console.log('  ⚠ psql no disponible o BD no alcanzable (DATABASE_URL del .env) — bloque admin auto-provisionado se omite');
  }
  return psqlDisponible;
}
export const WS_URL = BASE.replace(/^http/, 'ws').replace(/\/api$/, '/api/realtime/ws');

/* Estado compartido de la suite. Va en un objeto exportado porque un binding
 * importado (let/const) no se puede reasignar desde otro módulo. */
export const estado = {
  pasados: 0,
  fallados: 0,
  omitidos: 0,
  errores: [],
  cookies: {},
  email: undefined,
  uid: undefined,
  csrf: undefined,
  tareaId: undefined,
  csrfAdmin: undefined
};

export function assert(condicion, nombre) {
  if (condicion) {
    estado.pasados++;
    console.log(`  ✓ ${nombre}`);
  } else {
    estado.fallados++;
    estado.errores.push(nombre);
    console.log(`  ✗ ${nombre}`);
  }
}

/* [26-08-2026] El proxy IA depende de proveedores externos (Groq/DeepSeek...).
 * Cuando la API key no está disponible o es inválida, el backend devuelve
 * 502 upstream_error (AppError::Upstream). Esos asserts se OMITEN con aviso
 * documentado en vez de fallar; cualquier otra respuesta (200 mal formada,
 * 5xx interno, rate limit) sigue fallando: no se enmascara un fallo real. */
function esErrorProveedorExterno(r) {
  return r.status === 502 &&
    (r.data?.error === 'upstream_error' ||
     (typeof r.data?.message === 'string' && /proveedor|api key|unauthorized|401|deepseek/i.test(r.data.message)));
}
export function assertIA(condicion, nombre, respuesta) {
  if (esErrorProveedorExterno(respuesta)) {
    estado.omitidos++;
    console.log(`  ⚠ omitido (proveedor externo no disponible): ${nombre} — ${String(respuesta.data?.message).slice(0, 90)}`);
    return;
  }
  assert(condicion, nombre);
}

/* ---- Cookie jar manual (Node fetch permite header cookie) ---- */
function capturarCookies(res) {
  const setCookies = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  for (const sc of setCookies) {
    const [par] = sc.split(';');
    const i = par.indexOf('=');
    estado.cookies[par.slice(0, i)] = par.slice(i + 1);
  }
}
export const headerCookie = () => Object.entries(estado.cookies).map(([k, v]) => `${k}=${v}`).join('; ');

export async function api(metodo, ruta, {body, csrf, crudo} = {}) {
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
export async function apiAuth(metodo, ruta, opts) {
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
