import assert from 'node:assert/strict';
import { test } from 'node:test';
import { alternarCaja, cajaActiva } from '../src/logica/cajasActivas.ts';
import type { Panel } from '../src/logica/paneles.ts';

const caja = (id: string, tipo: Panel['tipo'] = 'tareas'): Panel => ({ id, tipo, etiqueta: id, fija: false, mueve: true, grupo: null });
const ajustes = { ocultas: [] as string[], mostrarCompletados: true, mostrarDiario: false };
const todos = [caja('a'), caja('b'), caja('c', 'completados'), caja('d', 'diario')];

test('el diario apagado en ajustes no está activo y se enciende con su interruptor', () => {
  assert.equal(cajaActiva(todos[3], ajustes), false);
  assert.deepEqual(alternarCaja(todos[3], todos, ajustes), { mostrarDiario: true });
});

test('apagar y encender una caja usa ocultas', () => {
  assert.deepEqual(alternarCaja(todos[0], todos, ajustes), { ocultas: ['a'] });
  assert.deepEqual(alternarCaja(todos[0], todos, { ...ajustes, ocultas: ['a'] }), { ocultas: [] });
});

test('la última caja encendida no se apaga', () => {
  const solo = { ocultas: ['b'], mostrarCompletados: false, mostrarDiario: false };
  assert.equal(alternarCaja(todos[0], todos, solo), null);
});
