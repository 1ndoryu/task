/* Marcas por estado destino: repetir la misma marca no cambia nada. Así, un 409
 * reaplicado sobre la copia nueva no desmarca lo que otra pestaña ya marcó. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fijarCompletado, fijarMarcaSubhabito } from '../src/logica/marcas.ts';
import type { SubHabito, Tarea } from '../src/logica/tipos.ts';

const tarea = { id: 1, texto: 'x', completado: false, configuracion: {} } as Tarea;
const sub = { id: 7, nombre: 'y' } as SubHabito;

test('completar dos veces la misma tarea da lo mismo que una', () => {
  const una = fijarCompletado(tarea, true, '2026-10-28');
  assert.deepEqual(fijarCompletado(una, true, '2026-10-28'), una);
});

test('desmarcar una tarea ya desmarcada no toca su configuración', () => {
  assert.deepEqual(fijarCompletado(tarea, false, '2026-10-28'), tarea);
});

test('marcar un subhábito dos veces deja un solo día en su historial', () => {
  const uno = fijarMarcaSubhabito(sub, true, '2026-10-28');
  const dos = fijarMarcaSubhabito(uno, true, '2026-10-28');
  assert.deepEqual(dos.historialCompletados, ['2026-10-28']);
  assert.equal(dos.ultimoCompletado, '2026-10-28');
});

test('desmarcar un subhábito que no está marcado hoy no quita otros días', () => {
  const conAyer = { ...sub, historialCompletados: ['2026-10-27'] } as SubHabito;
  assert.deepEqual(fijarMarcaSubhabito(conAyer, false, '2026-10-28').historialCompletados, ['2026-10-27']);
});
