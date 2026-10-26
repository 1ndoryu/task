/* Regla de destino del arrastre: pasar por el borde, apilar por el centro. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  destinoApilar,
  destinoEnPila,
  destinoPorBorde,
  destinoPorCruce,
  type ColumnaMedida,
} from '../src/logica/destinoArrastre.ts';

const caja = (id: string, arriba = 0, abajo = 100) => ({ id, arriba, abajo });
// Tres columnas de 100 con hueco de 10: [0,100], [110,210], [220,320]. Bandas de 25.
const tres: ColumnaMedida[] = [
  { izq: 0, der: 100, cajas: [caja('a')] },
  { izq: 110, der: 210, cajas: [caja('b')] },
  { izq: 220, der: 320, cajas: [caja('c')] },
];

test('sin llegar al borde lejano de la vecina, la caja se queda', () => {
  assert.equal(destinoPorBorde(tres, 'a', 100), null);
  assert.equal(destinoPorBorde(tres, 'a', 184), null);
  assert.equal(destinoPorBorde(tres, 'c', 140), null);
});

test('al llegar al borde lejano de la vecina, pasa al otro lado', () => {
  assert.deepEqual(destinoPorBorde(tres, 'a', 185), { modo: 'separar', referencia: 'b', despues: true });
  assert.deepEqual(destinoPorBorde(tres, 'c', 135), { modo: 'separar', referencia: 'b', despues: false });
});

test('un gesto rápido que pasa por varias elige la más lejana', () => {
  assert.equal(destinoPorBorde(tres, 'a', 400)?.referencia, 'c');
  assert.equal(destinoPorBorde(tres, 'c', 0)?.referencia, 'a');
});

test('una movida desconocida o la única columna no cambian nada', () => {
  assert.equal(destinoPorBorde(tres, 'z', 160), null);
  assert.equal(destinoPorBorde([tres[0]], 'a', 500), null);
});

test('una pila se deja por la banda del lado de su propia columna', () => {
  const pila: ColumnaMedida[] = [{ izq: 0, der: 100, cajas: [caja('a', 0, 100), caja('b', 110, 210)] }];
  assert.equal(destinoPorBorde(pila, 'b', 50), null);
  assert.deepEqual(destinoPorBorde(pila, 'b', 10), { modo: 'separar', referencia: 'a', despues: false });
  assert.deepEqual(destinoPorBorde(pila, 'a', 90), { modo: 'separar', referencia: 'b', despues: true });
});

test('apilar: el centro de otra columna elige la caja más cercana y el lado', () => {
  const dos: ColumnaMedida[] = [
    { izq: 0, der: 100, cajas: [caja('a')] },
    { izq: 110, der: 210, cajas: [caja('b', 0, 100), caja('c', 110, 210)] },
  ];
  assert.deepEqual(destinoApilar(dos, 'a', 160, 20), { modo: 'apilar', referencia: 'b', despues: false });
  assert.deepEqual(destinoApilar(dos, 'a', 160, 90), { modo: 'apilar', referencia: 'b', despues: true });
  assert.deepEqual(destinoApilar(dos, 'a', 160, 400), { modo: 'apilar', referencia: 'c', despues: true });
});

test('apilar: ni las bandas, ni la propia columna, ni el vacío cuentan', () => {
  assert.equal(destinoApilar(tres, 'a', 125, 50), null);
  assert.equal(destinoApilar(tres, 'a', 195, 50), null);
  assert.equal(destinoApilar(tres, 'a', 50, 50), null);
  assert.equal(destinoApilar(tres, 'a', 215, 50), null);
});

test('en la pila, solo cruzar el centro de la vecina recoloca', () => {
  const pila: ColumnaMedida = { izq: 0, der: 100, cajas: [caja('a', 0, 100), caja('b', 110, 210)] };
  assert.equal(destinoEnPila(pila, 'a', 100), null);
  assert.deepEqual(destinoEnPila(pila, 'a', 160), { modo: 'apilar', referencia: 'b', despues: true });
  assert.deepEqual(destinoEnPila(pila, 'b', 50), { modo: 'apilar', referencia: 'a', despues: false });
});

test('cruce: una vecina solo se adelanta tras cruzar su centro', () => {
  const c = [
    { id: 'a', centro: 50 },
    { id: 'b', centro: 160 },
    { id: 'c', centro: 270 },
  ];
  assert.equal(destinoPorCruce(c, 'a', 159), null);
  assert.equal(destinoPorCruce(c, 'a', 160), 'b');
  assert.equal(destinoPorCruce(c, 'a', 400), 'c');
  assert.equal(destinoPorCruce(c, 'z', 160), null);
});
