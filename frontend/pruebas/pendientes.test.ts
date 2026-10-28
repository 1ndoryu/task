/* Cruce de pendientes con el servidor al cargar: una copia solo sobrevive si la
 * fila del servidor sigue en la versión sobre la que se hizo. Así una copia vieja
 * no pisa lo que otra pestaña, la app local o el agente ya cambiaron. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fusionarFilas, type Pendiente } from '../src/logica/store.ts';
import type { Tarea } from '../src/logica/tipos.ts';

const tarea = (id: number, texto: string, updatedAt: string) =>
  ({ id, texto, completado: false, configuracion: {}, updatedAt }) as Tarea;

test('una copia sobre la versión vigente reemplaza a la fila del servidor', () => {
  const servidor = [tarea(1, 'vieja', 'v1')];
  const pendientes: Record<number, Pendiente<Tarea>> = {
    1: { copia: tarea(1, 'nueva', 'v1'), baseUpdatedAt: 'v1' },
  };
  const fusion = fusionarFilas(servidor, pendientes);
  assert.equal(fusion.filas[0].texto, 'nueva');
  assert.equal(fusion.descartados, 0);
});

test('una copia sobre una versión anterior no pisa la fila del servidor', () => {
  const servidor = [tarea(1, 'de la app local', 'v2')];
  const pendientes: Record<number, Pendiente<Tarea>> = {
    1: { copia: tarea(1, 'copia vieja', 'v1'), baseUpdatedAt: 'v1' },
  };
  const fusion = fusionarFilas(servidor, pendientes);
  assert.equal(fusion.filas[0].texto, 'de la app local');
  assert.equal(fusion.descartados, 1);
  assert.deepEqual(fusion.vigentes, {});
});

test('un alta sin fila en el servidor se conserva al final', () => {
  const servidor = [tarea(1, 'existente', 'v1')];
  const pendientes: Record<number, Pendiente<Tarea>> = {
    9: { copia: tarea(9, 'alta', 'v0') },
  };
  const fusion = fusionarFilas(servidor, pendientes);
  assert.deepEqual(
    fusion.filas.map((t) => t.id),
    [1, 9],
  );
  assert.equal(fusion.descartados, 0);
});

test('un pendiente del formato anterior (sin copia) se descarta', () => {
  const servidor = [tarea(1, 'x', 'v1')];
  // Formato viejo: la entrada era la tarea misma, sin envoltorio `copia`.
  const legado = { 1: tarea(1, 'legado', 'v1') } as unknown as Record<number, Pendiente<Tarea>>;
  const fusion = fusionarFilas(servidor, legado);
  assert.equal(fusion.descartados, 1);
  assert.equal(fusion.filas[0].texto, 'x');
});

test('un alta cuya fila ya existe en el servidor se descarta', () => {
  const servidor = [tarea(9, 'ya creada', 'v1')];
  const pendientes: Record<number, Pendiente<Tarea>> = {
    9: { copia: tarea(9, 'alta', 'v0') },
  };
  const fusion = fusionarFilas(servidor, pendientes);
  assert.equal(fusion.filas[0].texto, 'ya creada');
  assert.equal(fusion.descartados, 1);
});
