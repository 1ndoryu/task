/* Cajas minimizadas: lectura de lo guardado y alterno. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alternarMinimizada, leerMinimizadas } from '../src/logica/minimizadas.ts';

test('lo guardado se lee tolerante: descarta lo que no es texto y los repetidos', () => {
  assert.deepEqual(leerMinimizadas(['a', 3, null, 'a', 'b']), ['a', 'b']);
  assert.deepEqual(leerMinimizadas(undefined), []);
  assert.deepEqual(leerMinimizadas({ a: 1 }), []);
});

test("el id vacío es una caja válida: es «Tareas»", () => {
  assert.deepEqual(leerMinimizadas(['']), ['']);
});

test('alternar añade si no estaba y quita si estaba, sin tocar el original', () => {
  const inicial = ['a'];
  assert.deepEqual(alternarMinimizada(inicial, 'b'), ['a', 'b']);
  assert.deepEqual(alternarMinimizada(inicial, 'a'), []);
  assert.deepEqual(inicial, ['a']);
});
