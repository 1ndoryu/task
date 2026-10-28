/* Fin de día: el «hoy» se retrasa tantas horas como diga la preferencia. */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hoyLogico } from '../src/logica/fechas.ts';

const ahora = (h: number, m = 0) => new Date(2026, 9, 27, h, m);

test('con fin de día 0 el hoy es el natural', () => {
  assert.equal(hoyLogico(ahora(0, 30), 0), '2026-10-27');
});

test('con fin de día 3, a las 02:59 aún es ayer', () => {
  assert.equal(hoyLogico(ahora(2, 59), 3), '2026-10-26');
});

test('con fin de día 3, a las 03:00 ya es hoy', () => {
  assert.equal(hoyLogico(ahora(3, 0), 3), '2026-10-27');
});

test('cruza el cambio de mes', () => {
  assert.equal(hoyLogico(new Date(2026, 10, 1, 1, 0), 3), '2026-10-31');
});
