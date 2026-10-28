import assert from 'node:assert/strict';
import { test } from 'node:test';
import { alternarDependencia, cierraCiclo, hilosPendientes, leerDependencias } from '../src/logica/dependencias.ts';
import type { Dashboard } from '../src/logica/tipos.ts';

const datos = {
  tareas: [
    { id: 1, texto: 'a', completado: false, dependencias: [{ tipo: 'tarea', id: 2 }] },
    { id: 2, texto: 'b', completado: false, dependencias: [{ tipo: 'habito', id: 7 }] },
    { id: 3, texto: 'c', completado: true, dependencias: [{ tipo: 'tarea', id: 2 }] },
  ],
  habitos: [{ id: 7, nombre: 'h' }],
  proyectos: [],
} as unknown as Dashboard;

test('leerDependencias descarta lo roto y los duplicados', () => {
  const r = leerDependencias([{ tipo: 'tarea', id: 1, modo: 'suave' }, { tipo: 'tarea', id: 1 }, { tipo: 'otro', id: 2 }, null, { tipo: 'habito' }]);
  assert.deepEqual(r, [{ tipo: 'tarea', id: 1 }]);
  assert.deepEqual(leerDependencias(undefined), []);
});

test('alternarDependencia añade y quita', () => {
  const uno = alternarDependencia([], { tipo: 'tarea', id: 4 });
  assert.equal(uno.length, 1);
  assert.deepEqual(alternarDependencia(uno, { tipo: 'tarea', id: 4 }), []);
});

test('cierraCiclo detecta ciclos directos, indirectos y a sí mismo', () => {
  // 1 depende de 2 y 2 de h7: que h7 dependa de 1 cerraría el ciclo.
  assert.equal(cierraCiclo(datos, { tipo: 'habito', id: 7 }, { tipo: 'tarea', id: 1 }), true);
  assert.equal(cierraCiclo(datos, { tipo: 'tarea', id: 2 }, { tipo: 'tarea', id: 1 }), true);
  assert.equal(cierraCiclo(datos, { tipo: 'tarea', id: 1 }, { tipo: 'tarea', id: 1 }), true);
  assert.equal(cierraCiclo(datos, { tipo: 'tarea', id: 1 }, { tipo: 'habito', id: 7 }), false);
});

test('hilosPendientes solo cuenta requisitos sin hacer y filas sin completar', () => {
  const hilos = hilosPendientes(datos, (r) => (r.tipo === 'habito' ? false : r.id === 2 ? false : undefined));
  // La tarea 3 está completada: no pinta hilo. La 1 → 2 y la 2 → h7 sí.
  assert.equal(hilos.length, 2);
  assert.deepEqual(hilosPendientes(datos, () => true), []);
  assert.deepEqual(hilosPendientes(datos, () => undefined), []);
});
