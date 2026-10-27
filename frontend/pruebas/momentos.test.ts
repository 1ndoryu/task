/* «Cuándo es mejor hacer»: lectura, elección y peso de los momentos del día. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aplicarMomentos, elegirMomento, leerMomentos, momentoDe } from '../src/logica/momentos.ts';

test('el momento del día sale de la hora', () => {
  const a = (hora: number) => momentoDe(new Date(2026, 9, 26, hora));
  assert.deepEqual([a(4), a(5), a(11), a(12), a(18), a(19), a(23), a(0)], [
    'noche', 'temprano', 'temprano', 'tarde', 'tarde', 'noche', 'noche', 'noche',
  ]);
});

test('lo guardado se lee tolerante: descarta lo desconocido y deja un solo momento', () => {
  assert.deepEqual(leerMomentos(['noche', 'x', 3, 'temprano', 'noche']), ['temprano']);
  assert.deepEqual(leerMomentos(['x', 3]), []);
  assert.deepEqual(leerMomentos(undefined), []);
});

test('elegir cambia el momento; pulsar el activo lo quita', () => {
  assert.deepEqual(elegirMomento('noche', 'temprano'), ['temprano']);
  assert.deepEqual(elegirMomento('noche', 'noche'), []);
  assert.deepEqual(elegirMomento(undefined, 'tarde'), ['tarde']);
});

test('en su momento duplica el peso base; si ya pasó suma poco; si no llega, igual', () => {
  assert.equal(aplicarMomentos(300, ['tarde'], 'tarde'), 600);
  assert.equal(aplicarMomentos(300, ['tarde'], 'noche'), 350);
  assert.equal(aplicarMomentos(300, ['tarde'], 'temprano'), 300);
  assert.equal(aplicarMomentos(300, [], 'tarde'), 300);
  assert.equal(aplicarMomentos(300, undefined, 'tarde'), 300);
});

test('si quedaron varios de antes, solo cuenta el primero del día', () => {
  assert.equal(aplicarMomentos(300, ['temprano', 'tarde'], 'temprano'), 600);
  assert.equal(aplicarMomentos(300, ['temprano', 'tarde'], 'tarde'), 350);
});

test('un peso base no positivo no se duplica: en su momento recibe el bono fijo', () => {
  assert.equal(aplicarMomentos(0, ['tarde'], 'tarde'), 100);
  assert.equal(aplicarMomentos(-200, ['tarde'], 'tarde'), -100);
  assert.equal(aplicarMomentos(-200, ['tarde'], 'temprano'), -200);
});

test('de tarde, temprano va antes que noche y tarde antes que ambos', () => {
  const peso = (m: 'temprano' | 'tarde' | 'noche') => aplicarMomentos(-200, [m], 'tarde');
  assert.ok(peso('tarde') > peso('temprano'));
  assert.ok(peso('temprano') > peso('noche'));
});
