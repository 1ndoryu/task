/* «Cuándo es mejor hacer»: lectura, elección y peso de los momentos del día. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALGORITMO_DEFECTO, leerAlgoritmo } from '../src/logica/algoritmo.ts';
import { aplicarMomentos, elegirMomento, leerMomentos, momentoDe } from '../src/logica/momentos.ts';

test('el momento del día sale de la hora', () => {
  const a = (hora: number) => momentoDe(new Date(2026, 9, 26, hora), ALGORITMO_DEFECTO);
  assert.deepEqual([a(4), a(5), a(11), a(12), a(18), a(19), a(23), a(0)], [
    'noche', 'temprano', 'temprano', 'tarde', 'tarde', 'noche', 'noche', 'noche',
  ]);
});

test('las horas de cada momento se pueden cambiar', () => {
  const horas = { ...ALGORITMO_DEFECTO, horaTemprano: 6, horaTarde: 14, horaNoche: 21 };
  const a = (hora: number) => momentoDe(new Date(2026, 9, 26, hora), horas);
  assert.deepEqual([a(5), a(6), a(13), a(14), a(20), a(21), a(0)], [
    'noche', 'temprano', 'temprano', 'tarde', 'tarde', 'noche', 'noche',
  ]);
});

test('los pesos y bonos salen del algoritmo, no de números fijos', () => {
  const a = { ...ALGORITMO_DEFECTO, momMultiplicador: 3, momBono: 10, momBonoPasado: 5 };
  assert.equal(aplicarMomentos(300, ['tarde'], 'tarde', a), 900);
  assert.equal(aplicarMomentos(-200, ['tarde'], 'tarde', a), -190);
  assert.equal(aplicarMomentos(300, ['temprano'], 'tarde', a), 305);
});

test('lo guardado del algoritmo se lee tolerante: lo roto vuelve a fábrica', () => {
  assert.deepEqual(leerAlgoritmo(undefined), ALGORITMO_DEFECTO);
  const leido = leerAlgoritmo({ urgUrgente: 700, priAlta: 'x', fecHoy: 99999, horaTemprano: 20 });
  assert.equal(leido.urgUrgente, 700);
  assert.equal(leido.priAlta, ALGORITMO_DEFECTO.priAlta);
  assert.equal(leido.fecHoy, 5000);
  // Horas fuera de orden: las tres vuelven a las de fábrica.
  assert.deepEqual([leido.horaTemprano, leido.horaTarde, leido.horaNoche], [5, 12, 19]);
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
  assert.equal(aplicarMomentos(300, ['tarde'], 'tarde', ALGORITMO_DEFECTO), 600);
  assert.equal(aplicarMomentos(300, ['tarde'], 'noche', ALGORITMO_DEFECTO), 350);
  assert.equal(aplicarMomentos(300, ['tarde'], 'temprano', ALGORITMO_DEFECTO), 300);
  assert.equal(aplicarMomentos(300, [], 'tarde', ALGORITMO_DEFECTO), 300);
  assert.equal(aplicarMomentos(300, undefined, 'tarde'), 300);
});

test('si quedaron varios de antes, solo cuenta el primero del día', () => {
  assert.equal(aplicarMomentos(300, ['temprano', 'tarde'], 'temprano', ALGORITMO_DEFECTO), 600);
  assert.equal(aplicarMomentos(300, ['temprano', 'tarde'], 'tarde', ALGORITMO_DEFECTO), 350);
});

test('un peso base no positivo no se duplica: en su momento recibe el bono fijo', () => {
  assert.equal(aplicarMomentos(0, ['tarde'], 'tarde', ALGORITMO_DEFECTO), 100);
  assert.equal(aplicarMomentos(-200, ['tarde'], 'tarde', ALGORITMO_DEFECTO), -100);
  assert.equal(aplicarMomentos(-200, ['tarde'], 'temprano', ALGORITMO_DEFECTO), -200);
});

test('de tarde, temprano va antes que noche y tarde antes que ambos', () => {
  const peso = (m: 'temprano' | 'tarde' | 'noche') => aplicarMomentos(-200, [m], 'tarde', ALGORITMO_DEFECTO);
  assert.ok(peso('tarde') > peso('temprano'));
  assert.ok(peso('temprano') > peso('noche'));
});
