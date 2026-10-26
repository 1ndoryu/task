/* «Cuándo es mejor hacer»: lectura, alterno y peso de los momentos del día. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alternarMomento, leerMomentos, momentoDe, pesoDeMomentos } from '../src/logica/momentos.ts';

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

test('el peso: suma en su momento, resta fuera y es neutro sin momentos o con los tres', () => {
  assert.ok(pesoDeMomentos(['tarde'], 'tarde') > 0);
  assert.ok(pesoDeMomentos(['tarde'], 'noche') < 0);
  assert.equal(pesoDeMomentos([], 'tarde'), 0);
  assert.equal(pesoDeMomentos(undefined, 'tarde'), 0);
  assert.equal(pesoDeMomentos(['temprano', 'tarde', 'noche'], 'tarde'), 0);
});

test('a igual peso base, lo de su momento queda por delante de lo neutro y de lo de otro momento', () => {
  const peso = (momentos: Parameters<typeof pesoDeMomentos>[0]) => pesoDeMomentos(momentos, 'temprano');
  assert.ok(peso(['temprano']) > peso(undefined));
  assert.ok(peso(undefined) > peso(['noche']));
});
