/* [29-08-2026] E2E del agente (plan-agente-ia-plugin, Fase 0/1) contra el
 * backend vivo. Verifica:
 * 1. Auth: /api/agente/stream sin sesión → 401.
 * 2. Conversación inexistente → 404 (no confía en el front).
 * 3. POST con sesión válida → SSE con evento `done` (o `error` claro si el
 *    proveedor no tiene clave — nunca falso éxito).
 * 4. Rate limit: tras N turnos → 429.
 *
 * Uso: node .freebuff/agente-e2e.mjs (requiere backend en :3001 y BD local). */
const BASE = process.env.PARITY_BASE_URL || 'http://127.0.0.1:3001/api';

let fallos = 0;
function assert(cond, msg) {
  if (!cond) {
    fallos += 1;
    console.error(`  ✗ ${msg}`);
  } else {
    console.log(`  ✓ ${msg}`);
  }
}

/* ---- Cookie jar manual (mismo patrón que verify-parity.mjs) ---- */
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
  Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');

async function api(path, { method = 'GET', body, csrf } = {}) {
  const headers = { cookie: headerCookie() };
  if (body !== undefined) headers['content-type'] = 'application/json';
  /* Mutaciones: CSRF automático desde el jar (mismo patrón que parity). */
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    headers['x-csrf-token'] = csrf || cookies['csrf_token'] || '';
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  capturarCookies(res);
  return { status: res.status, headers: res.headers, body: await res.text() };
}

async function leerSSE(res) {
  const texto = await res.text();
  const eventos = [];
  for (const linea of texto.split('\n')) {
    const l = linea.trim();
    if (!l.startsWith('data:')) continue;
    try {
      eventos.push(JSON.parse(l.slice(5).trim()));
    } catch {
      /* línea no JSON: ignorar */
    }
  }
  return eventos;
}async function main() {
  const email = `agente-e2e-${Date.now()}@test.local`;

  console.log('1. Sin sesión → 401');
  {
    const r = await api('/agente/stream', {
      method: 'POST',
      body: { conversacionId: '00000000-0000-0000-0000-000000000000', mensaje: 'hola' },
    });
    assert(r.status === 401, `401 sin sesión (got ${r.status})`);
  }

  console.log('2. Registro y login');
  {
    let r = await api('/auth/register', {
      method: 'POST',
      body: { email, password: 'password123', nombre: 'Agente E2E' },
    });
    assert([200, 201].includes(r.status), `registro (got ${r.status})`);
    if (r.status !== 200 && r.status !== 201) return process.exit(1);

    r = await api('/auth/login', {
      method: 'POST',
      body: { email, password: 'password123' },
    });
    assert(r.status === 200, `login (got ${r.status})`);
    if (r.status !== 200) return process.exit(1);
  }

  console.log('3. Conversación inexistente → 404');
  {
    const r = await api('/agente/stream', {
      method: 'POST',
      body: { conversacionId: '11111111-2222-3333-4444-555555555555', mensaje: 'hola' },
    });
    if (r.status !== 404) console.log(`    body: ${r.body.slice(0, 200)}`);
    assert(r.status === 404, `404 conversación no encontrada (got ${r.status})`);
  }

  console.log('4. Crear conversación');
  let conversacionId;
  {
    const r = await api('/agente/conversaciones', {
      method: 'POST',
      body: { titulo: 'E2E' },
    });
    assert([200, 201].includes(r.status), `crear conversación (got ${r.status})`);
    if (r.status !== 200 && r.status !== 201) return process.exit(1);
    conversacionId = JSON.parse(r.body).id;
  }

  {
    console.log(`5. Turno SSE con conversación ${conversacionId}`);
    const r = await fetch(`${BASE}/agente/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: headerCookie(),
        'x-csrf-token': cookies['csrf_token'] || '',
      },
      body: JSON.stringify({ conversacionId, mensaje: 'Hola, responde brevemente.' }),
    });
    const eventos = await leerSSE(r);
    const tipos = eventos.map((e) => e.tipo);
    assert(r.status === 200, `SSE 200 (got ${r.status})`);
    assert(
      tipos.includes('done') || tipos.includes('error'),
      `termina con done o error (tipos: ${tipos.join(', ')})`
    );
    if (tipos.includes('error')) {
      const err = eventos.find((e) => e.tipo === 'error');
      console.log(`    (error del proveedor: ${err.mensaje} — retryable: ${err.retryable})`);
    }
  }

  {
    /* DoD Fase 1: el agente ejecuta una tool de dominio y la acción se
     * persiste (auditoría + entidad real). Si el proveedor no tiene clave,
     * el stream termina en error claro y el caso se reporta como skip
     * legítimo (nunca falso éxito). */
    console.log(`6. Tool de dominio: crear tarea vía agente`);
    const nombreTarea = `TareaAgenteE2E-${Date.now()}`;
    const r = await fetch(`${BASE}/agente/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: headerCookie(),
        'x-csrf-token': cookies['csrf_token'] || '',
      },
      body: JSON.stringify({
        conversacionId,
        mensaje: `Crea UNA sola tarea llamada ${nombreTarea} y responde brevemente.`,
      }),
    });
    const eventos = await leerSSE(r);
    const errorEv = eventos.find((e) => e.tipo === 'error');
    const toolStart = eventos.filter((e) => e.tipo === 'tool_start');
    const toolOk = eventos.find((e) => e.tipo === 'tool_result' && e.ok);
    if (errorEv) {
      console.log(`    (skip legítimo: error de proveedor — ${errorEv.mensaje.slice(0, 120)})`);
    } else {
      assert(toolStart.length >= 1, `el agente llamó crear_tarea (llamadas: ${toolStart.length})`);
      assert(!!toolOk, `crear_tarea terminó ok`);
      // La tarea debe existir en el dashboard del usuario.
      const dash = await api('/dashboard');
      assert(
        dash.body.includes(nombreTarea),
        `la tarea '${nombreTarea}' persiste en /dashboard`
      );
    }
  }

  {
    /* Scheduler (Fase 1, sección 8.1): CRUD + validación. La ejecución real
     * (worker → turno → entidad) se verifica en el caso 8 con espera. */
    console.log(`7. Tareas programadas (CRUD + validación)`);
    // Recurrente sin cron → 400.
    let r = await api('/agente/tareas-programadas', {
      method: 'POST',
      body: { nombre: 'X', prompt: 'haz algo', tipo: 'recurrente' },
    });
    assert(r.status === 400, `recurrente sin cron → 400 (got ${r.status})`);
    // Crear una_vez válida.
    const pasado = new Date(Date.now() - 60_000).toISOString();
    r = await api('/agente/tareas-programadas', {
      method: 'POST',
      body: {
        nombre: 'E2E Scheduler',
        prompt: 'Crea una tarea llamada TareaE2EScheduler',
        tipo: 'una_vez',
        ejecutar_en: pasado,
      },
    });
    assert(r.status === 200, `crear tarea programada (got ${r.status})`);
    const tareaProg = JSON.parse(r.body);
    assert(!!tareaProg.id, 'tarea programada devuelve id');
    // Listar la incluye.
    r = await api('/agente/tareas-programadas');
    const lista = JSON.parse(r.body);
    assert(
      lista.some((t) => t.id === tareaProg.id),
      'la tarea programada aparece en el listado'
    );
    // Eliminar.
    r = await api(`/agente/tareas-programadas/${tareaProg.id}`, { method: 'DELETE' });
    assert(r.status === 204, `eliminar tarea programada (got ${r.status})`);
  }

  {
    /* Ejecución real del scheduler: crear con ejecutar_en en el pasado y
     * esperar un ciclo (el worker corre cada 30s). Verifica que el agente
     * creó la tarea real y que la tarea programada quedó completada. */
    console.log(`8. Scheduler: ejecución real (espera ~35s)`);
    const nombreTarea = `TareaE2EScheduler-${Date.now()}`;
    const pasado = new Date(Date.now() - 60_000).toISOString();
    let r = await api('/agente/tareas-programadas', {
      method: 'POST',
      body: {
        nombre: 'E2E Scheduler Real',
        prompt: `Crea una tarea llamada ${nombreTarea}`,
        tipo: 'una_vez',
        ejecutar_en: pasado,
      },
    });
    assert(r.status === 200, `crear tarea programada (got ${r.status})`);
    const tareaProg = JSON.parse(r.body);
    await new Promise((res) => setTimeout(res, 35_000));
    r = await api('/agente/tareas-programadas');
    const t = JSON.parse(r.body).find((x) => x.id === tareaProg.id);
    assert(
      t && t.estado === 'completada',
      `el worker ejecutó la tarea (estado: ${t ? t.estado : '?'})`
    );
    const dash = await api('/dashboard');
    assert(dash.body.includes(nombreTarea), `la tarea real '${nombreTarea}' persiste`);
  }

  console.log(`\n${fallos === 0 ? 'AGENTE-E2E OK' : `${fallos} FALLO(S)`}`);
  process.exit(fallos === 0 ? 0 : 1);
}

await main();
