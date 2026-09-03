/* [03-09-2026] Línea base de telemetría del agente (plan-mejora-agente
 * 318A-15, F0 item 3): agrega conversaciones REALES de la IA de PT a través
 * de la API de solo-lectura (login + listado + historial enriquecido).
 * No toca la BD ni escribe nada en producción: solo GET autenticados.
 *
 * Informe: longitud por conversación (mensajes/tokens), tools usadas (con
 * fallos), turnos con error de tool, skills inyectadas (contexto) — el mismo
 * tipo de datos que el evento `ResumenTurno` del núcleo expone por turno.
 *
 * Uso: node .freebuff/linea-base-agente.mjs   (backend en :3001 + BD local)
 * Salida: imprime el informe y lo guarda en `.freebuff/informe-linea-base-agente.md`.
 */
const BASE = process.env.PARITY_BASE_URL || 'http://127.0.0.1:3001/api';
const LIMITE_CONVERSACIONES = Number(process.env.LIMITE_CONVERSACIONES || 20);
const SALIDA = fileURLToPath(new URL('./informe-linea-base-agente.md', import.meta.url));

import { fileURLToPath } from 'node:url';

const cookies = {};
function capturarCookies(res) {
  const setCookies =
    typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  for (const sc of setCookies) {
    const [par] = sc.split(';');
    const i = par.indexOf('=');
    cookies[par.slice(0, i)] = par.slice(i + 1);
  }
}
const headerCookie = () =>
  Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');

async function api(path, { method = 'GET', body } = {}) {
  const headers = { cookie: headerCookie() };
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    headers['x-csrf-token'] = cookies['csrf_token'] || '';
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  capturarCookies(res);
  const texto = await res.text();
  let json = null;
  try { json = texto ? JSON.parse(texto) : null; } catch { /* no-JSON */ }
  return { status: res.status, json, texto };
}

async function main() {
  /* 1. Login local: el alias admin → admin@nakomi.studio solo aplica en
   * modo loopback (cookie_secure=false). Credenciales dev locales. */
  let r = await api('/auth/login', {
    method: 'POST',
    body: { email: 'admin', password: 'admin' },
  });
  if (r.status !== 200) {
    console.error(`✗ login falló (${r.status}): ${r.texto.slice(0, 200)}`);
    process.exit(1);
  }

  /* 2. Listado de conversaciones (API ya limita a 50, orden desc). */
  r = await api('/agente/conversaciones');
  if (r.status !== 200) {
    console.error(`✗ listado falló (${r.status}): ${r.texto.slice(0, 200)}`);
    process.exit(1);
  }
  const conversaciones = (r.json || []).slice(0, LIMITE_CONVERSACIONES);
  if (conversaciones.length === 0) {
    console.error('✗ no hay conversaciones del agente para el usuario admin');
    process.exit(1);
  }

  /* 3. Historial enriquecido de cada conversación (solo lectura). */
  const porConversacion = [];
  const tools = new Map(); // nombre -> { usos, ok, errores }
  let totalMensajes = 0;
  let totalTokens = 0;
  let turnosConErrorTool = 0;
  let turnosConSkills = 0;

  for (const conv of conversaciones) {
    const det = await api(`/agente/conversaciones/${conv.id}`);
    if (det.status !== 200) continue;
    const mensajes = det.json || [];
    const msgsUser = mensajes.filter((m) => m.rol === 'user').length;
    const msgsAsist = mensajes.filter((m) => m.rol === 'assistant').length;
    const herramientas = mensajes.flatMap((m) => m.herramientas || []);
    const conSkills = mensajes.filter((m) => m.contexto && m.contexto.skills > 0).length;
    let tokens = 0;
    for (const m of mensajes) {
      if (typeof m.contenido === 'string') tokens += Math.ceil(m.contenido.length / 4);
    }
    totalMensajes += mensajes.length;
    totalTokens += tokens;
    turnosConSkills += conSkills;
    for (const h of herramientas) {
      const t = tools.get(h.tool) || { usos: 0, ok: 0, errores: 0 };
      t.usos += 1;
      if (h.ok === false) { t.errores += 1; turnosConErrorTool += 1; } else { t.ok += 1; }
      tools.set(h.tool, t);
    }
    porConversacion.push({
      titulo: conv.titulo,
      modo: conv.modo,
      mensajes: mensajes.length,
      msgsUser,
      msgsAsist,
      tools: herramientas.length,
      conSkills,
    });
  }

  const n = porConversacion.length;
  const media = totalMensajes / n;
  const conErrores = porConversacion.filter((c) => c.tools > 0).length;
  const herramientas = [...tools.entries()]
    .sort((a, b) => b[1].usos - a[1].usos)
    .map(([nombre, v]) => `  - ${nombre}: ${v.usos} usos (${v.ok} ok / ${v.errores} error)`);

  const lineas = [
    '# Informe de línea base — IA del agente (PT)',
    '',
    `- Fecha: ${new Date().toISOString()}`,
    `- Fuente: API solo-lectura (${BASE}), usuario admin local`,
    `- Conversaciones agregadas: **${n}** (de ${conversaciones.length} solicitadas)`,
    `- Mensajes totales: **${totalMensajes}** (media **${media.toFixed(1)}**/conversación; user+assistant)` +
      ` · tokens estimados: **${totalTokens}**`,
    `- Conversaciones con herramientas usadas: ${conErrores}`,
    `- Turnos con error de tool: **${turnosConErrorTool}**`,
    `- Turnos con skills inyectadas (contexto): **${turnosConSkills}**`,
    '',
    '## Tools usadas (top por usos)',
    herramientas.length ? herramientas.join('\n') : '  (ninguna registrada en el historial enriquecido)',
    '',
    '## Por conversación',
    ...porConversacion.map(
      (c) => `- ${c.titulo} [${c.modo}]: ${c.mensajes} msgs (${c.msgsUser}u/${c.msgsAsist}a), ${c.tools} tools, skills: ${c.conSkills}`,
    ),
    '',
    '> Generado por `.freebuff/linea-base-agente.mjs` — solo-lectura, sin tocar producción.',
    '',
  ];
  const informe = lineas.join('\n');
  const fs = await import('node:fs');
  fs.writeFileSync(SALIDA, informe, 'utf8');
  console.log(informe);
  console.log(`\nInforme guardado en ${SALIDA}`);
}

main().catch((e) => {
  console.error('✗ error inesperado:', e);
  process.exit(1);
});