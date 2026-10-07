/*
 * tasks-core/src/operaciones.test.ts
 * Bulk por posición, fusión que conserva no afectadas y round-trip de preferencias.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
    CLAVE_KANBAN_V1,
    construirMovimientosBulk,
    leerOrdenKanbanDesdePreferencias,
    mezclarPreferenciasKanban,
    reordenarLista,
} from './operaciones.ts';

test('construye movimientos bulk con el orden como posición', () => {
    assert.deepEqual(construirMovimientosBulk([{id: 7}, {id: 3}]), [
        {legacyId: 7, orden: 0},
        {legacyId: 3, orden: 1},
    ]);
    assert.deepEqual(construirMovimientosBulk([{id: 7}], 42), [{legacyId: 7, orden: 0, proyectoId: 42}]);
});

test('fusiona reordenadas conservando las no afectadas y reasigna el orden', () => {
    const previas: Array<{id: number; orden?: number}> = [{id: 1}, {id: 2}, {id: 3}];
    const resultado = reordenarLista(previas, [{id: 3}, {id: 1}]);
    assert.deepEqual(resultado.map((t) => t.id), [2, 3, 1]);
    assert.deepEqual(resultado.map((t) => t.orden), [0, 1, 2]);
});

test('filtra elementos virtuales antes de fusionar', () => {
    const resultado = reordenarLista([{id: 1}], [{id: 1}, {id: -9}], (t) => t.id < 0);
    assert.deepEqual(resultado.map((t) => t.id), [1]);
});

test('mezclar y leer preferencias hace round-trip bajo la clave versionada', () => {
    const orden = {ordenColumnas: [9001, 9002], ordenTareas: {'9001': [5, 6]}};
    const prefs = mezclarPreferenciasKanban({tema: 'oscuro'}, orden, '2026-10-07T00:00:00.000Z');
    assert.equal((prefs as {tema: string}).tema, 'oscuro');
    assert.deepEqual(leerOrdenKanbanDesdePreferencias(prefs), {
        ordenColumnas: [9001, 9002],
        ordenTareas: {'9001': [5, 6]},
    });
    const envelope = (prefs as Record<string, {ts: string}>)[CLAVE_KANBAN_V1];
    assert.equal(envelope.ts, '2026-10-07T00:00:00.000Z');
});

test('leer preferencias rotas devuelve null', () => {
    for (const roto of [null, {}, {nota: 1}, {[CLAVE_KANBAN_V1]: null}, {[CLAVE_KANBAN_V1]: {valor: {ordenColumnas: ['x']}}}]) {
        assert.equal(leerOrdenKanbanDesdePreferencias(roto), null);
    }
});
