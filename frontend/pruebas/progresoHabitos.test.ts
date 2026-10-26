/* Progreso de hábitos del día: solo cuentan los del día. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contarProgreso } from '../src/logica/progreso.ts';

test('cuenta hechos y total, ignorando los que no cuentan hoy', () => {
  const estados = [
    { cuenta: true, hecho: true },
    { cuenta: true, hecho: false },
    { cuenta: false, hecho: false },
  ];
  assert.deepEqual(contarProgreso(estados), { hechos: 1, total: 2 });
});

test('sin hábitos el total es cero (la barra no se pinta)', () => {
  assert.deepEqual(contarProgreso([]), { hechos: 0, total: 0 });
});
