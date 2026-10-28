import assert from 'node:assert/strict';
import { test } from 'node:test';
import { alternarDependencia, cierraCiclo, hilosPendientes, leerDependencias, mensajeFalta, requisitosPendientes } from '../src/logica/dependencias.ts';
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

test('requisitosPendientes devuelve solo lo que aún no está hecho', () => {
  // La tarea 1 espera a la 2; la 2 espera al hábito 7.
  assert.deepEqual(requisitosPendientes(datos, { tipo: 'tarea', id: 1 }, () => false), [{ tipo: 'tarea', id: 2 }]);
  // El hábito 7 ya cumplido no bloquea a la 2.
  assert.deepEqual(requisitosPendientes(datos, { tipo: 'tarea', id: 2 }, (r) => r.tipo === 'habito'), []);
  assert.deepEqual(requisitosPendientes(datos, { tipo: 'tarea', id: 2 }, () => false), [{ tipo: 'habito', id: 7 }]);
  // Un requisito que ya no existe no bloquea.
  assert.deepEqual(requisitosPendientes(datos, { tipo: 'tarea', id: 1 }, () => undefined), []);
  // Fila inexistente: nada que esperar.
  assert.deepEqual(requisitosPendientes(datos, { tipo: 'tarea', id: 99 }, () => false), []);
});

test('mensajeFalta nombra lo que falta con su texto o su nombre', () => {
  assert.equal(mensajeFalta(datos, [{ tipo: 'tarea', id: 2 }]), 'Antes hay que hacer: «b».');
  assert.equal(mensajeFalta(datos, [{ tipo: 'tarea', id: 2 }, { tipo: 'habito', id: 7 }]), 'Antes hay que hacer: «b», «h».');
});
