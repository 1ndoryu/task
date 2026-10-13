/* Pasos 12-14 del E2E del agente (skills e inyección de contexto, idempotencia del
 * mensaje y cancelación del turno). */

import { BASE, api, assert, cookies, estado, headerCookie, leerSSE } from './infra.mjs';

export async function paso12SkillsCRUD() {
  {
    /* Fase 3 (skills v1): CRUD persistente + inyección observable. Crea una
     * skill activa, comprueba idempotencia por nombre, y verifica que un
     * stream con incluir_skills=true emite el evento `contexto` con la skill
     * inyectada — sin depender de una respuesta exitosa de Glory (el evento
     * se emite antes de la llamada al proveedor). */
    console.log('12. Skills CRUD + inyección de contexto');
    const nombre = `e2e-skill-${Date.now()}`;
    let r = await api('/agente/skills', {
      method: 'POST',
      body: { nombre, descripcion: 'Responder siempre con viñetas (E2E)', activa: true },
    });
    assert([200, 201].includes(r.status), `crear skill (got ${r.status})`);
    const skill = JSON.parse(r.body);
    assert(!!skill.id && skill.nombre === nombre && skill.activa === true, 'la skill creada persiste sus campos');
    // Upsert idempotente por nombre: misma clave, una sola fila.
    r = await api('/agente/skills', {
      method: 'POST',
      body: { nombre, descripcion: 'Responder siempre con viñetas (E2E v2)', activa: true },
    });
    assert([200, 201].includes(r.status), `upsert skill (got ${r.status})`);
    let lista = JSON.parse((await api('/agente/skills')).body);
    assert(lista.filter((s) => s.nombre === nombre).length === 1, `upsert idempotente (1 fila, hay ${lista.filter((s) => s.nombre === nombre).length})`);
    // Validación: descripción vacía rechazada.
    r = await api('/agente/skills', { method: 'POST', body: { nombre: `otra-${Date.now()}`, descripcion: ' ' } });
    assert(r.status === 400, `skill inválida rechazada (got ${r.status})`);
    // Inyección observable: conversación con incluir_skills=true.
    const conv = await api('/agente/conversaciones', {
      method: 'POST',
      body: { titulo: 'E2E skills', modo: 'predeterminado', config: { incluir_skills: true } },
    });
    assert([200, 201].includes(conv.status), `conversación de skills (got ${conv.status})`);
    const convId = JSON.parse(conv.body).id;
    const sr = await fetch(`${BASE}/agente/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: headerCookie(),
        'x-csrf-token': cookies['csrf_token'] || '',
      },
      body: JSON.stringify({ conversacionId: convId, mensaje: 'Prueba de skills' }),
    });
    assert(sr.status === 200, `stream con skills aceptado (got ${sr.status})`);
    const eventos = await leerSSE(sr);
    const ctx = eventos.find((e) => e.tipo === 'contexto');
    assert(!!ctx && ctx.skills >= 1, `evento contexto con skills inyectadas (got ${JSON.stringify(ctx)})`);
    const errorEv = eventos.find((e) => e.tipo === 'error');
    const fin = eventos.find((e) => e.tipo === 'done');
    assert(!!errorEv || !!fin, 'el stream termina con error honesto o done');
    // Editar vía PUT (nombre + descripción): la ruta que consume la UI del modal.
    r = await api(`/agente/skills/${skill.id}`, { method: 'PUT', body: { nombre: `${nombre}-edit`, descripcion: 'Editada desde el modal (E2E)' } });
    assert(r.status === 200, `editar skill (got ${r.status})`);
    const editada = JSON.parse(r.body);
    assert(editada.nombre === `${nombre}-edit` && editada.descripcion === 'Editada desde el modal (E2E)', 'el PUT edita nombre y descripción');
    // Desactivar vía PUT y confirmar el estado.
    r = await api(`/agente/skills/${skill.id}`, { method: 'PUT', body: { activa: false } });
    assert(r.status === 200, `desactivar skill (got ${r.status})`);
    lista = JSON.parse((await api('/agente/skills')).body);
    assert(lista.find((s) => s.id === skill.id)?.activa === false, 'la skill quedó inactiva');
    // Eliminar y confirmar 404 en el segundo intento.
    r = await api(`/agente/skills/${skill.id}`, { method: 'DELETE' });
    assert(r.status === 204, `eliminar skill (got ${r.status})`);
    r = await api(`/agente/skills/${skill.id}`, { method: 'DELETE' });
    assert(r.status === 404, `eliminar dos veces -> 404 (got ${r.status})`);
    lista = JSON.parse((await api('/agente/skills')).body);
    assert(!lista.some((s) => s.id === skill.id), 'la skill eliminada ya no está en la lista');
  }
}

export async function paso13Idempotencia() {
  /* Fase 4: idempotencia del mensaje de usuario al reintentar. Misma
   * `clave_idempotencia` => misma fila en BD (ON CONFLICT DO NOTHING), de
   * forma que reintentar un turno no duplica el mensaje del usuario. */
  console.log('13. Idempotencia del mensaje (retry con misma clave)');
  {
    const r = await api('/agente/conversaciones', {
      method: 'POST',
      body: { titulo: 'E2E idempotencia' },
    });
    const convId = JSON.parse(r.body).id;
    const clave = crypto.randomUUID();
    const enviar = () =>
      fetch(`${BASE}/agente/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: headerCookie(),
          'x-csrf-token': cookies['csrf_token'] || '',
        },
        body: JSON.stringify({ conversacionId: convId, mensaje: 'Mensaje idempotente', clave_idempotencia: clave }),
      });
    // Primer envío y reintento con la MISMA clave.
    await enviar();
    await enviar();
    const msgs = JSON.parse((await api(`/agente/conversaciones/${convId}`)).body);
    const usuarios = msgs.filter((m) => m.rol === 'user');
    assert(usuarios.length === 1, `misma clave => 1 mensaje de usuario (hay ${usuarios.length})`);
    assert(msgs.filter((m) => m.rol === 'user' && m.contenido === 'Mensaje idempotente').length === 1, 'solo una fila con el contenido idempotente');
  }
}

export async function paso14Cancelacion() {
  /* Fase 4: cancelación real. Abortar el SSE a mitad debe cerrar el stream y
   * un reintento con la misma clave no debe duplicar el mensaje (la fila del
   * usuario ya existía del envío abortado). */
  console.log('14. Cancelación del turno (abort del SSE)');
  {
    const r = await api('/agente/conversaciones', {
      method: 'POST',
      body: { titulo: 'E2E cancelación' },
    });
    const convId = JSON.parse(r.body).id;
    const clave = crypto.randomUUID();
    // Envía y aborta a mitad para que el turno quede pendiente/fallido.
    const ac = new AbortController();
    const p = fetch(`${BASE}/agente/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: headerCookie(),
        'x-csrf-token': cookies['csrf_token'] || '',
      },
      body: JSON.stringify({ conversacionId: convId, mensaje: 'Turno a cancelar', clave_idempotencia: clave }),
      signal: ac.signal,
    }).then((res) => leerSSE(res));
    // Aborta poco después de iniciado (mientras el proveedor streama).
    await new Promise((r) => setTimeout(r, 300));
    ac.abort();
    await p.catch(() => {});
    // Reintento con la misma clave: NO debe duplicar el mensaje del usuario.
    const retry = await fetch(`${BASE}/agente/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: headerCookie(),
        'x-csrf-token': cookies['csrf_token'] || '',
      },
      body: JSON.stringify({ conversacionId: convId, mensaje: 'Turno a cancelar', clave_idempotencia: clave }),
    });
    await leerSSE(retry);
    const msgs = JSON.parse((await api(`/agente/conversaciones/${convId}`)).body);
    const usuarios = msgs.filter((m) => m.rol === 'user');
    assert(retry.status === 200, `reintento acepta el turno (got ${retry.status})`);
    assert(usuarios.length === 1, `abort + retry misma clave => 1 mensaje (hay ${usuarios.length})`);
  }
}
