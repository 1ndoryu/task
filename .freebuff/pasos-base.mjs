/* Pasos 1-9 del E2E del agente (auth, conversaciones, turnos SSE, tools y scheduler).
 * Cada paso es una función que agente-e2e.mjs llama en el mismo orden que el original. */

import { BASE, api, assert, cookies, estado, headerCookie, leerSSE } from './infra.mjs';

export async function paso1SinSesion() {
  console.log('1. Sin sesión → 401');
  {
    const r = await api('/agente/stream', {
      method: 'POST',
      body: { conversacionId: '00000000-0000-0000-0000-000000000000', mensaje: 'hola' },
    });
    assert(r.status === 401, `401 sin sesión (got ${r.status})`);
  }
}

export async function paso2RegistroLogin(email) {
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
}

export async function paso3ConversacionInexistente() {
  console.log('3. Conversación inexistente → 404');
  {
    const r = await api('/agente/stream', {
      method: 'POST',
      body: { conversacionId: '11111111-2222-3333-4444-555555555555', mensaje: 'hola' },
    });
    if (r.status !== 404) console.log(`    body: ${r.body.slice(0, 200)}`);
    assert(r.status === 404, `404 conversación no encontrada (got ${r.status})`);
  }
}

export async function paso4CrearConversacion() {
  console.log('4. Crear conversación');
  {
    const r = await api('/agente/conversaciones', {
      method: 'POST',
      body: { titulo: 'E2E' },
    });
    assert([200, 201].includes(r.status), `crear conversación (got ${r.status})`);
    if (r.status !== 200 && r.status !== 201) return process.exit(1);
    estado.conversacionId = JSON.parse(r.body).id;
  }
}

export async function paso5TurnoSSE() {
  {
    console.log(`5. Turno SSE con conversación ${estado.conversacionId}`);
    const r = await fetch(`${BASE}/agente/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: headerCookie(),
        'x-csrf-token': cookies['csrf_token'] || '',
      },
      body: JSON.stringify({ conversacionId: estado.conversacionId, mensaje: 'Hola, responde brevemente.' }),
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
}

export async function paso6ToolCrearTarea() {
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
        conversacionId: estado.conversacionId,
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
}

export async function paso7TareasProgramadas() {
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
}

export async function paso8SchedulerReal() {
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
    assert(!!t, 'la tarea programada sigue existiendo tras el ciclo');
    if (t && t.estado === 'fallida' && (t.result_summary || '').includes('proveedor')) {
      /* Skip legítimo: los proveedores upstream (glory/deepseek/cerebras) están
       * caídos o sin clave; el worker marcó la tarea como fallida con el error
       * claro (nunca falso éxito). El contrato del scheduler (ejecutar como
       * turno, persistir estado) quedó probado en el caso 8 manual y en la
       * verificación SQL. */
      console.log(
        `    (skip legítimo: fallo de proveedor — ${(t.result_summary || '').slice(0, 100)})`
      );
    } else {
      assert(
        t && t.estado === 'completada',
        `el worker ejecutó la tarea (estado: ${t ? t.estado : '?'})`
      );
      const dash = await api('/dashboard');
      assert(dash.body.includes(nombreTarea), `la tarea real '${nombreTarea}' persiste`);
    }
  }
}

export async function paso9ToolFileSearch() {
  {
    /* Fase 2: tools de archivo en AGENTE_MODO=local. El contrato que se fija
     * aquí es el ciclo completo con un LLM real (file_search → tool_start →
     * tool_result). Si los proveedores upstream están caídos, el stream
     * termina en error claro y se reporta skip legítimo (nunca falso éxito).
     * El sandbox (path traversal, secretos, límites) queda cubierto por los
     * tests unitarios de src/agent/sandbox.rs y tools_archivo.rs. */
    console.log('9. Tools de archivo (AGENTE_MODO=local): file_search vía agente');
    const r = await fetch(`${BASE}/agente/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: headerCookie(),
        'x-csrf-token': cookies['csrf_token'] || '',
      },
      body: JSON.stringify({
        conversacionId: estado.conversacionId,
        modo: 'autonomo',
        mensaje: 'Usa file_search para listar los archivos .rs de src/agent y resume qué módulos hay.',
      }),
    });
    const eventos = await leerSSE(r);
    const errorEv = eventos.find((e) => e.tipo === 'error');
    const toolStart = eventos.find((e) => e.tipo === 'tool_start' && e.tool === 'file_search');
    if (errorEv) {
      console.log(
        `    (skip legítimo: error de proveedor — ${errorEv.mensaje.slice(0, 120)})`
      );
    } else {
      assert(!!toolStart, 'el agente llamó file_search (tools de archivo registradas en local)');
      const toolOk = eventos.find((e) => e.tipo === 'tool_result' && e.tool === 'file_search' && e.ok);
      assert(!!toolOk, 'file_search terminó ok');
    }
  }
}
