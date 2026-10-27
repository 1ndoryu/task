/* Orden de Completados: por fecha de completado, lo último arriba. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { masRecienteHecho } from '../src/logica/completados.ts';

test('lo último hecho va primero y lo sin fecha, al final', () => {
  const filas = [
    { id: 'vieja', hecho: '' },
    { id: 'ayer', hecho: '2026-10-26' },
    { id: 'hoy', hecho: '2026-10-27' },
  ];
  assert.deepEqual(filas.sort(masRecienteHecho).map((f) => f.id), ['hoy', 'ayer', 'vieja']);
});

test('el mismo día conserva el orden de llegada', () => {
  const filas = [
    { id: 'a', hecho: '2026-10-27' },
    { id: 'b', hecho: '2026-10-27' },
  ];
  assert.deepEqual(filas.sort(masRecienteHecho).map((f) => f.id), ['a', 'b']);
});
