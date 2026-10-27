/* Reordenar a mano: destino de la fila arrastrada y números de orden nuevos. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { destinoFila, mover, ordenesNuevos } from '../src/logica/reordenar.ts';

// Cuatro grupos de 10 de alto: centros en 5, 15, 25 y 35.
const tramos = [0, 10, 20, 30].map((arriba) => ({ arriba, abajo: arriba + 10 }));

test('mover pone la pieza en su sitio sin tocar el resto', () => {
  assert.deepEqual(mover(['a', 'b', 'c', 'd'], 0, 2), ['b', 'c', 'a', 'd']);
  assert.deepEqual(mover(['a', 'b', 'c', 'd'], 3, 1), ['a', 'd', 'b', 'c']);
  assert.deepEqual(mover(['a', 'b'], 1, 1), ['a', 'b']);
});

test('la vecina cede solo al cruzar su centro', () => {
  // Arrastrada la fila 1 (10..20): sin moverse, se queda.
  assert.equal(destinoFila(tramos, 1, 10, 20), 1);
  // Su borde de abajo aún no llega al centro de la 2 (25).
  assert.equal(destinoFila(tramos, 1, 14, 24), 1);
  assert.equal(destinoFila(tramos, 1, 16, 26), 2);
  // Hacia arriba: el borde de arriba pasa el centro de la 0 (5).
  assert.equal(destinoFila(tramos, 1, 6, 16), 1);
  assert.equal(destinoFila(tramos, 1, 4, 14), 0);
});

test('un gesto largo cruza varias a la vez y se queda en los extremos', () => {
  assert.equal(destinoFila(tramos, 0, 25, 35), 2);
  assert.equal(destinoFila(tramos, 0, 100, 110), 3);
  assert.equal(destinoFila(tramos, 3, -50, -40), 0);
});

test('los grupos de distinto alto se miden por su propio centro', () => {
  const desiguales = [
    { arriba: 0, abajo: 10 },
    { arriba: 10, abajo: 40 },
    { arriba: 40, abajo: 50 },
  ];
  // Centro del grupo alto: 25.
  assert.equal(destinoFila(desiguales, 0, 14, 24), 0);
  assert.equal(destinoFila(desiguales, 0, 16, 26), 1);
});

test('los órdenes nuevos reusan los números, ascendentes y sin repetir', () => {
  assert.deepEqual(ordenesNuevos([5, 2, 9]), [2, 5, 9]);
  assert.deepEqual(ordenesNuevos([0, 0, 0]), [0, 1, 2]);
  assert.deepEqual(ordenesNuevos([3, 3, 4]), [3, 4, 5]);
  assert.deepEqual(ordenesNuevos([]), []);
});
