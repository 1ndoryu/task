/* Cronómetro de una fila: arranque, pausas, ajuste a mano y formato. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SIN_CRONOMETRO,
  ajustar,
  cerrar,
  cerrarSiMide,
  empezar,
  formatearTiempo,
  mideA,
  pausar,
  reanudar,
  tiempoEfectivo,
} from '../src/logica/cronometro.ts';

const MIN = 60_000;

test('el tiempo corre desde el inicio y se detiene al pausar', () => {
  const c = empezar('tarea', 7, 'Escribir', 0);
  assert.equal(tiempoEfectivo(c.sesion!, 5 * MIN), 5 * MIN);
  const pausado = pausar(c, 5 * MIN);
  // Cinco minutos más tarde sigue en 5: la pausa no suma.
  assert.equal(tiempoEfectivo(pausado.sesion!, 10 * MIN), 5 * MIN);
  const seguido = reanudar(pausado, 10 * MIN);
  assert.equal(tiempoEfectivo(seguido.sesion!, 12 * MIN), 7 * MIN);
});

test('pausar dos veces no abre dos pausas', () => {
  const c = pausar(pausar(empezar('habito', 1, 'Bañarme', 0), MIN), 2 * MIN);
  assert.equal(c.sesion!.pausas.length, 1);
  assert.equal(c.pausado, true);
});

test('reanudar sin pausa no toca la sesión', () => {
  const c = empezar('tarea', 1, 'x', 0);
  assert.equal(reanudar(c, MIN), c);
});

test('cerrar deja el total con la pausa abierta ya cerrada', () => {
  const enPausa = pausar(empezar('tarea', 1, 'x', 0), 3 * MIN);
  const cerrada = cerrar(enPausa, 8 * MIN)!;
  assert.equal(cerrada.fin, 8 * MIN);
  assert.equal(cerrada.pausas[0].fin, 8 * MIN);
  assert.equal(tiempoEfectivo(cerrada, 20 * MIN), 3 * MIN);
});

test('el ajuste a mano suma y resta, sin bajar de cero', () => {
  const c = empezar('tarea', 1, 'x', 0);
  const mas = ajustar(c, 2 * MIN, 4 * MIN);
  assert.equal(tiempoEfectivo(mas.sesion!, 4 * MIN), 6 * MIN);
  // Restar sigue valiendo después, porque el reloj no deja de correr.
  assert.equal(tiempoEfectivo(mas.sesion!, 5 * MIN), 7 * MIN);
  const menos = ajustar(c, -10 * MIN, 4 * MIN);
  assert.equal(tiempoEfectivo(menos.sesion!, 4 * MIN), 0);
});

test('el formato pasa a horas solo cuando hay horas', () => {
  assert.equal(formatearTiempo(0), '00:00');
  assert.equal(formatearTiempo(59_000), '00:59');
  assert.equal(formatearTiempo(59 * MIN + 59_000), '59:59');
  assert.equal(formatearTiempo(61 * MIN), '01:01:00');
  assert.equal(formatearTiempo(3600_000 + 61_000), '01:01:01');
  // Un valor negativo nunca se pinta como «-1:59».
  assert.equal(formatearTiempo(-5000), '00:00');
});

test('una sesión solo mide a su fila', () => {
  const c = empezar('tarea', 7, 'x', 0);
  assert.equal(mideA(c, 'tarea', 7), true);
  assert.equal(mideA(c, 'tarea', 8), false);
  assert.equal(mideA(c, 'habito', 7), false);
  assert.equal(mideA(SIN_CRONOMETRO, 'tarea', 7), false);
});

test('completar otra fila no cierra la sesión en curso', () => {
  const c = empezar('tarea', 7, 'x', 0);
  assert.equal(cerrarSiMide(c, 'tarea', 8, MIN), null);
  assert.equal(cerrarSiMide(c, 'tarea', 7, MIN)!.fin, MIN);
});
