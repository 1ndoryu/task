/*
 * tasks-core/src/jerarquia.test.ts
 * Las consultas de árbol responden igual que en el editor (origen F1b).
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
    asignarOrden,
    contarSubtareas,
    esDescendiente,
    esSubtarea,
    esTareaPadre,
    obtenerPadre,
    obtenerSubtareas,
    obtenerTareaAnterior,
    ordenarConJerarquia,
    obtenerTareasPrincipales,
    tieneSubtareas,
} from './jerarquia.ts';

const arbol: Array<{id: number; parentId?: number; orden?: number; completado?: boolean}> = [
    {id: 1, orden: 0},
    {id: 2, parentId: 1, orden: 1, completado: true},
    {id: 3, parentId: 1, orden: 0, completado: false},
    {id: 4, orden: 1},
];

test('subtareas ordenadas, padre, banderas y conteo', () => {
    assert.deepEqual(obtenerSubtareas(arbol, 1).map((t) => t.id), [3, 2]);
    assert.equal(obtenerPadre(arbol, {id: 2, parentId: 1})?.id, 1);
    assert.equal(obtenerPadre(arbol, {id: 1}), undefined);
    assert.equal(tieneSubtareas(arbol, 1), true);
    assert.equal(tieneSubtareas(arbol, 4), false);
    assert.deepEqual(contarSubtareas(arbol, 1), {total: 2, completadas: 1});
    assert.equal(esTareaPadre(arbol, 1), true);
    assert.equal(esSubtarea({id: 2, parentId: 1}), true);
    assert.equal(esSubtarea({id: 1}), false);
});

test('descendencia solo hacia arriba y sin ciclos propios', () => {
    assert.equal(esDescendiente(arbol, 2, 1), true);
    assert.equal(esDescendiente(arbol, 1, 2), false);
    assert.equal(esDescendiente(arbol, 1, 1), false);
    assert.equal(esDescendiente(arbol, 4, 1), false);
});

test('principales, aplanado con jerarquía, orden e índice', () => {
    assert.deepEqual(obtenerTareasPrincipales(arbol).map((t) => t.id), [1, 4]);
    assert.deepEqual(ordenarConJerarquia(arbol).map((t) => t.id), [1, 3, 2, 4]);
    assert.deepEqual(asignarOrden<{id: number; orden?: number}>([{id: 9}, {id: 8}]).map((t) => t.orden), [0, 1]);
    assert.equal(obtenerTareaAnterior(arbol, 4)?.id, 3);
    assert.equal(obtenerTareaAnterior(arbol, 1), undefined);
});
