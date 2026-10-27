/* Columnas del carril: orden plano + marcador de apiladas, y las tres operaciones. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aplanar, apilar, columnasDe, leerApiladas, separar, sin } from '../src/logica/columnas.ts';

test('lo guardado se lee tolerante: solo cadenas, sin repetir, el vacío vale', () => {
  assert.deepEqual(leerApiladas(['b', 3, 'b', '', null, 'c']), ['b', '', 'c']);
  assert.deepEqual(leerApiladas(undefined), []);
  assert.deepEqual(leerApiladas('b'), []);
});

test('sin apiladas, cada caja es su columna (la vista de siempre)', () => {
  assert.deepEqual(columnasDe(['a', 'b', 'c'], []), [['a'], ['b'], ['c']]);
});

test('una apilada va debajo de la anterior; la primera nunca se apila; un id ajeno no hace nada', () => {
  assert.deepEqual(columnasDe(['a', 'b', 'c', 'd'], ['b', 'c']), [['a', 'b', 'c'], ['d']]);
  assert.deepEqual(columnasDe(['a', 'b'], ['a', 'zzz']), [['a'], ['b']]);
});

test('aplanar y columnasDe son inversas', () => {
  const columnas = [['a', 'b'], ['c'], ['d', 'e', 'f']];
  const { orden, apiladas } = aplanar(columnas);
  assert.deepEqual(orden, ['a', 'b', 'c', 'd', 'e', 'f']);
  assert.deepEqual(apiladas, ['b', 'e', 'f']);
  assert.deepEqual(columnasDe(orden, apiladas), columnas);
});

test('apilar mete la caja encima o debajo del objetivo y vacía su columna de origen', () => {
  const base = [['a'], ['b', 'c'], ['d']];
  assert.deepEqual(apilar(base, 'a', 'c', true), [['b', 'c', 'a'], ['d']]);
  assert.deepEqual(apilar(base, 'd', 'b', false), [['a'], ['d', 'b', 'c']]);
  assert.deepEqual(base, [['a'], ['b', 'c'], ['d']]);
});

test('apilar dentro de la misma pila la reordena; sobre sí misma o sobre nada no cambia', () => {
  assert.deepEqual(apilar([['a', 'b', 'c']], 'c', 'a', false), [['c', 'a', 'b']]);
  assert.deepEqual(apilar([['a'], ['b']], 'a', 'a', true), [['a'], ['b']]);
  assert.deepEqual(apilar([['a'], ['b']], 'a', 'x', true), [['a'], ['b']]);
});

test('separar saca la caja de su pila a una columna propia, antes o después de la referencia', () => {
  assert.deepEqual(separar([['a', 'b'], ['c'], ['d']], 'a', 'c', true), [['b'], ['c'], ['a'], ['d']]);
  assert.deepEqual(separar([['a'], ['b'], ['c', 'd']], 'd', 'a', false), [['d'], ['a'], ['b'], ['c']]);
});

test('separar con una caja sola es el cruce de siempre, aunque su columna desaparezca', () => {
  assert.deepEqual(separar([['a'], ['b'], ['c']], 'a', 'b', true), [['b'], ['a'], ['c']]);
  assert.deepEqual(separar([['a'], ['b'], ['c']], 'c', 'a', false), [['c'], ['a'], ['b']]);
});

test('separar puede sacar una caja de su propia pila por cualquiera de los lados', () => {
  assert.deepEqual(separar([['a', 'b', 'c']], 'c', 'a', true), [['a', 'b'], ['c']]);
  assert.deepEqual(separar([['x'], ['a', 'b']], 'b', 'a', false), [['x'], ['b'], ['a']]);
});

test('separar con una referencia desconocida, o la propia caja, no toca nada', () => {
  const base = [['a', 'b'], ['c']];
  assert.deepEqual(separar(base, 'a', 'x', true), base);
  assert.deepEqual(separar(base, 'c', 'c', true), base);
});

test('quitar la caja de arriba de una pila deja la de abajo como cabeza de su columna, sin pegarla a la vecina', () => {
  const { orden, apiladas } = aplanar(sin([['a'], ['b', 'c'], ['d']], 'b'));
  assert.deepEqual(columnasDe(orden, apiladas), [['a'], ['c'], ['d']]);
});
