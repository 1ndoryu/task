/* «Cuándo es mejor hacer»: lectura, alterno y peso de los momentos del día. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alternarMomento, aplicarMomentos, leerMomentos, momentoDe } from '../src/logica/momentos.ts';

test('el momento del día sale de la hora', () => {
  const a = (hora: number) => momentoDe(new Date(2026, 9, 26, hora));
  assert.deepEqual([a(4), a(5), a(11), a(12), a(18), a(19), a(23), a(0)], [
    'noche', 'temprano', 'temprano', 'tarde', 'tarde', 'noche', 'noche', 'noche',
  ]);
});

test('lo guardado se lee tolerante: descarta lo desconocido y deja el orden del día', () => {
  assert.deepEqual(leerMomentos(['noche', 'x', 3, 'temprano', 'noche']), ['temprano', 'noche']);
  assert.deepEqual(leerMomentos(undefined), []);
});

test('alternar añade o quita sin tocar el original', () => {
  const inicial = ['noche' as const];
  assert.deepEqual(alternarMomento(inicial, 'temprano'), ['temprano', 'noche']);
  assert.deepEqual(alternarMomento(inicial, 'noche'), []);
  assert.deepEqual(inicial, ['noche']);
});

test('en su momento duplica el peso base; si no, lo deja igual', () => {
  assert.equal(aplicarMomentos(300, ['tarde'], 'tarde'), 600);
  assert.equal(aplicarMomentos(300, ['tarde'], 'noche'), 300);
  assert.equal(aplicarMomentos(300, [], 'tarde'), 300);
  assert.equal(aplicarMomentos(300, undefined, 'tarde'), 300);
  assert.equal(aplicarMomentos(300, ['temprano', 'tarde', 'noche'], 'tarde'), 300);
});

test('un peso base no positivo no se duplica, ni siquiera en su momento', () => {
  assert.equal(aplicarMomentos(0, ['tarde'], 'tarde'), 0);
  assert.equal(aplicarMomentos(-200, ['tarde'], 'tarde'), -200);
});
