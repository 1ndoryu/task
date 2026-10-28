import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dentroDeLimites, mesDe, moverMes, rejillaMes } from '../src/logica/calendario.ts';

test('la rejilla tiene 42 días y empieza en lunes', () => {
  const r = rejillaMes({ anio: 2026, mes: 9 }); // octubre 2026: el 1 es jueves
  assert.equal(r.length, 42);
  assert.equal(r[0], '2026-09-28');
  assert.ok(r.includes('2026-10-31'));
});

test('moverMes cruza el año', () => {
  assert.deepEqual(moverMes({ anio: 2026, mes: 11 }, 1), { anio: 2027, mes: 0 });
  assert.deepEqual(moverMes({ anio: 2026, mes: 0 }, -1), { anio: 2025, mes: 11 });
});

test('mesDe lee la fecha', () => {
  assert.deepEqual(mesDe('2026-10-27'), { anio: 2026, mes: 9 });
});

test('límites inclusivos y opcionales', () => {
  assert.ok(dentroDeLimites('2026-10-27', '2026-10-27', '2026-10-27'));
  assert.ok(!dentroDeLimites('2026-10-26', '2026-10-27'));
  assert.ok(!dentroDeLimites('2026-10-28', undefined, '2026-10-27'));
  assert.ok(dentroDeLimites('2026-10-28'));
});
