/* Regla de destino del arrastre: cruzar el centro en el sentido de la marcha. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { destinoPorCruce } from '../src/logica/destinoArrastre.ts';

// Tres cajas de 100 con hueco de 10: centros 50, 160 y 270.
const tres = [
  { id: 'a', centro: 50 },
  { id: 'b', centro: 160 },
  { id: 'c', centro: 270 },
];

test('sin cruzar el centro de la vecina, la arrastrada se queda', () => {
  assert.equal(destinoPorCruce(tres, 'a', 100), null);
  assert.equal(destinoPorCruce(tres, 'a', 159), null);
  assert.equal(destinoPorCruce(tres, 'c', 200), null);
});

test('al cruzar el centro de la vecina, se coloca a su lado', () => {
  assert.equal(destinoPorCruce(tres, 'a', 160), 'b');
  assert.equal(destinoPorCruce(tres, 'c', 160), 'b');
});

test('un gesto rápido que cruza varias elige la más lejana', () => {
  assert.equal(destinoPorCruce(tres, 'a', 400), 'c');
  assert.equal(destinoPorCruce(tres, 'c', 0), 'a');
});

test('tras el cambio no hay rebote: con otros anchos el puntero sigue sin volver', () => {
  // `a` (ancha, 200) pasó sobre `b` (100): ahora b queda primero, centro 50, y a
  // ocupa 110-310 con centro 210. El puntero sigue en 160.
  const despues = [
    { id: 'b', centro: 50 },
    { id: 'a', centro: 210 },
    { id: 'c', centro: 370 },
  ];
  assert.equal(destinoPorCruce(despues, 'a', 160), null);
});

test('una movida desconocida o la única pieza no cambian nada', () => {
  assert.equal(destinoPorCruce(tres, 'z', 160), null);
  assert.equal(destinoPorCruce([{ id: 'a', centro: 50 }], 'a', 500), null);
});
