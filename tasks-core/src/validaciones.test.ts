/*
 * tasks-core/src/validaciones.test.ts
 * Espejo de los topes del backend: el núcleo rechaza lo mismo que el servidor.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TOPE_BULK, validarLote, validarMovimiento} from './validaciones.ts';

const loteValido = (n: number): unknown[] =>
    Array.from({length: n}, (_, i) => ({legacyId: i + 1, orden: i}));

test('acepta lotes de 1 y de 200 movimientos', () => {
    assert.equal(validarLote(loteValido(1)).ok, true);
    assert.equal(validarLote(loteValido(200)).ok, true);
});

test('rechaza lote vacío y mayor de 200 con el mensaje de rango, y no-array aparte', () => {
    for (const malo of [[], loteValido(201)]) {
        const resultado = validarLote(malo);
        assert.equal(resultado.ok, false);
        assert.match(resultado.errores.join('; '), /entre 1 y 200/);
    }
    const noArray = validarLote('no-array');
    assert.equal(noArray.ok, false);
    assert.match(noArray.errores.join('; '), /debe ser un array/);
});

test('detecta legacyId no positivo, orden no entero y proyectoId cero', () => {
    assert.ok(validarMovimiento({legacyId: 0, orden: 0}, 0).join().includes('legacyId'));
    assert.ok(validarMovimiento({legacyId: -3, orden: 0}, 1).join().includes('legacyId'));
    assert.ok(validarMovimiento({legacyId: 5, orden: 1.5}, 2).join().includes('orden'));
    assert.ok(validarMovimiento({legacyId: 5, orden: 0, proyectoId: 0}, 3).join().includes('proyectoId'));
    assert.deepEqual(validarMovimiento({legacyId: 5, orden: 0}, 4), []);
    assert.deepEqual(validarMovimiento({legacyId: 5, orden: 0, proyectoId: 9}, 5), []);
});

test('rechaza elementos que no son objetos', () => {
    const resultado = validarLote([null]);
    assert.equal(resultado.ok, false);
    assert.match(resultado.errores.join(), /debe ser un objeto/);
});
