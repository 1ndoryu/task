#!/usr/bin/env node

/* [07AA-1] Seed del kanban F1 vía API pública (register/login + upserts):
 * crea 2 proyectos x 3 tareas y fija el orden de columnas en
 * `preferencias.kanban.v1` (envelope {valor, ts} que preserva el merge LWW
 * por clave del servidor). Solo contra BD de rama/nunca permanente.
 * Uso: node scripts/seed-kanban-f1.mjs [--base URL] [--email E] [--password P]
 */

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};
const BASE = opt('--base', 'http://127.0.0.1:4199');
const EMAIL = opt('--email', 'kanban-f1@local.test');
const PASSWORD = opt('--password', 'F1k4nb4n-Test-07AA1!');

const jar = {};
function guardarCookies(res) {
  const crudas = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  for (const c of crudas) {
    const [par] = c.split(';');
    const eq = par.indexOf('=');
    if (eq > 0) jar[par.slice(0, eq).trim()] = par.slice(eq + 1).trim();
  }
}
function cabeceras(mutar) {
  const h = { 'Content-Type': 'application/json' };
  const cookies = Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
  if (cookies) h.Cookie = cookies;
  if (mutar && jar.csrf_token) h['x-csrf-token'] = jar.csrf_token;
  return h;
}
async function llamar(metodo, ruta, cuerpo) {
  const res = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers: cabeceras(metodo !== 'GET'),
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  guardarCookies(res);
  const texto = await res.text();
  let datos = null;
  try {
    datos = texto ? JSON.parse(texto) : null;
  } catch {
    datos = { crudo: texto.slice(0, 200) };
  }
  return { estado: res.status, datos };
}

const proyectos = [
  { legacyId: 9001, nombre: 'Columna A F1' },
  { legacyId: 9002, nombre: 'Columna B F1' },
];
const tareas = [
  { legacyId: 9101, texto: 'Tarea A1 F1', proyectoId: 9001, orden: 0 },
  { legacyId: 9102, texto: 'Tarea A2 F1', proyectoId: 9001, orden: 1 },
  { legacyId: 9103, texto: 'Tarea A3 F1', proyectoId: 9001, orden: 2 },
  { legacyId: 9104, texto: 'Tarea B1 F1', proyectoId: 9002, orden: 0 },
  { legacyId: 9105, texto: 'Tarea B2 F1', proyectoId: 9002, orden: 1 },
  { legacyId: 9106, texto: 'Tarea B3 F1', proyectoId: 9002, orden: 2 },
];

let r = await llamar('POST', '/api/auth/register', { email: EMAIL, password: PASSWORD });
if (r.estado === 409 || r.estado === 422) {
  r = await llamar('POST', '/api/auth/login', { email: EMAIL, password: PASSWORD });
}
if (r.estado !== 200 && r.estado !== 201) {
  console.error('auth falló:', r.estado, JSON.stringify(r.datos));
  process.exit(1);
}
if (!jar.session_id || !jar.csrf_token) {
  console.error('sin cookies de sesión tras auth');
  process.exit(1);
}

for (const p of proyectos) {
  const up = await llamar('PUT', `/api/projects/${p.legacyId}`, { nombre: p.nombre });
  if (up.estado !== 200) {
    console.error('upsert proyecto falló:', p.legacyId, up.estado, JSON.stringify(up.datos));
    process.exit(1);
  }
}
for (const t of tareas) {
  const up = await llamar('PUT', `/api/tasks/${t.legacyId}`, {
    texto: t.texto,
    proyectoId: t.proyectoId,
    orden: t.orden,
  });
  if (up.estado !== 200) {
    console.error('upsert tarea falló:', t.legacyId, up.estado, JSON.stringify(up.datos));
    process.exit(1);
  }
}
const orden = {
  ordenColumnas: [9001, 9002],
  ordenTareas: { 9001: [9101, 9102, 9103], 9002: [9104, 9105, 9106] },
};
const st = await llamar('PUT', '/api/dashboard/settings', {
  preferencias: { 'kanban.v1': { valor: orden, ts: Date.now() } },
});
if (st.estado !== 204) {
  console.error('settings falló:', st.estado, JSON.stringify(st.datos));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, proyectos: 2, tareas: 6, ordenColumnas: orden.ordenColumnas }));
