/* Pasos 10, 11 y 10 bis del E2E del agente (configuración del stream y aislada, memoria
 * persistente). "10 bis" es el bloque de memoria, que el log original numera también "10". */

import { BASE, api, assert, cookies, estado, headerCookie, leerSSE } from './infra.mjs';

export async function paso10ConfiguracionAvanzada() {
  {
    /* Configuración avanzada: todos los campos del contrato llegan al stream.
     * Glory/commandcode no se sobreescribe aquí: el backend debe elegirlo por
     * defecto y devolver error honesto si el endpoint está caído. */
    console.log('10. Configuración avanzada del stream');
    const r = await fetch(`${BASE}/agente/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: headerCookie(),
        'x-csrf-token': cookies['csrf_token'] || '',
      },
      body: JSON.stringify({
        conversacionId: estado.conversacionId,
        mensaje: 'Prueba de configuración avanzada',
        temperatura: 0.7,
        max_tokens: 512,
        idioma: 'es',
        incluir_notas: true,
        incluir_tareas_completadas: true,
        incluir_habitos_pausados: true,
        permitir_busqueda_web: false,
        permitir_recordatorios: false,
        prompt_sistema: 'Responde de forma breve.',
        max_turns: 5,
        timeout_tool_secs: 10,
      }),
    });
    assert(r.status === 200, `stream acepta configuración avanzada (got ${r.status})`);
    const eventos = await leerSSE(r);
    const errorEv = eventos.find((e) => e.tipo === 'error');
    const fin = eventos.find((e) => e.tipo === 'done');
    assert(!!errorEv || !!fin, 'configuración avanzada termina con error honesto o done');
    if (errorEv) {
      assert(errorEv.retryable === true, 'fallo de proveedor marcado retryable');
      assert(String(errorEv.mensaje).includes('glory/commandcode'), 'el default efectivo intentó glory/commandcode');
    }
  }
}

export async function paso11ConfiguracionAislada() {
  {
    console.log('11. Configuración aislada por conversación');
    const otra = await api('/agente/conversaciones', {method: 'POST', body: {titulo: 'E2E aislada', modo: 'meta', config: {modelo: 'commandcode', temperatura: 1.4, max_tokens: 512}}});
    assert([200, 201].includes(otra.status), `segunda conversación con config propia (got ${otra.status})`);
    const configOtra = otra.status === 200 || otra.status === 201 ? JSON.parse(otra.body).config : null;
    console.log(`    config recibida: ${JSON.stringify(configOtra)}`);
    assert(configOtra?.temperatura === 1.4 && configOtra?.max_tokens === 512, 'la configuración de la segunda conversación persiste sus valores');
    const listaConfigs = JSON.parse((await api('/agente/conversaciones')).body);
    const primera = listaConfigs.find((c) => c.id === estado.conversacionId);
    const segunda = listaConfigs.find((c) => c.id === (otra.status === 200 || otra.status === 201 ? JSON.parse(otra.body).id : ''));
    assert(primera?.config?.temperatura !== segunda?.config?.temperatura, 'las configuraciones quedan aisladas en servidor');
  }
}

export async function paso10bisMemoria() {
  {
    /* Fase 3 v1: memoria persistente (CRUD). Verifica el contrato de
     * memoria que se inyecta como contexto en agente_stream (system). El
     * upsert se prueba poniendo dos veces la misma clave y confirmando que
     * queda UNA sola entrada con el contenido actualizado (idempotencia). */
    console.log('10. Memoria persistente (CRUD)');
    const clave = `e2e-mem-${Date.now()}`;
    let r = await api('/agente/memoria', {
      method: 'PUT',
      body: { clave, contenido: 'preferencia E2E v1' },
    });
    assert(r.status === 200, `guardar memoria (got ${r.status})`);
    // Upsert idempotente: misma clave, otro contenido → sigue una sola.
    r = await api('/agente/memoria', {
      method: 'PUT',
      body: { clave, contenido: 'preferencia E2E v1 actualizada' },
    });
    assert(r.status === 200, `upsert memoria (got ${r.status})`);
    let lista = JSON.parse((await api('/agente/memoria')).body);
    const entradas = lista.filter((m) => m.clave === clave);
    assert(entradas.length === 1, `upsert idempotente (1 entrada, hay ${entradas.length})`);
    assert(entradas[0].contenido === 'preferencia E2E v1 actualizada', 'el contenido se actualizó');
    // Validación: clave vacía/illegal rechazada.
    r = await api('/agente/memoria', { method: 'PUT', body: { clave: '..', contenido: 'x' } });
    assert(r.status === 400, `clave inválida rechazada (got ${r.status})`);
    // Eliminar y confirmar 404 en un segundo intento.
    r = await api(`/agente/memoria/${clave}`, { method: 'DELETE' });
    assert(r.status === 204, `eliminar memoria (got ${r.status})`);
    r = await api(`/agente/memoria/${clave}`, { method: 'DELETE' });
    assert(r.status === 404, `eliminar dos veces -> 404 (got ${r.status})`);
    lista = JSON.parse((await api('/agente/memoria')).body);
    assert(!lista.some((m) => m.clave === clave), 'la memoria eliminada ya no está en la lista');
  }
}
