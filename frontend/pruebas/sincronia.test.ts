/* Relectura del servidor: una versión más nueva sustituye a la local, salvo que la
 * fila tenga una escritura en curso; una versión igual o más vieja no pisa nada. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esMasNueva, sustituirFilas } from '../src/logica/sincronia.ts';

const fila = (id: number, texto: string, updatedAt?: string) => ({ id, texto, updatedAt });
const ninguna = () => false;

test('una versión más nueva del servidor sustituye a la local', () => {
  const locales = [fila(1, 'vieja', '2026-10-28T10:00:00Z')];
  const servidor = [fila(1, 'nueva', '2026-10-28T10:05:00Z')];
  assert.equal(sustituirFilas(locales, servidor, ninguna)[0].texto, 'nueva');
});

test('una fila con escritura en curso no se sustituye aunque el servidor sea más nuevo', () => {
  const locales = [fila(1, 'mía', '2026-10-28T10:00:00Z')];
  const servidor = [fila(1, 'del servidor', '2026-10-28T10:05:00Z')];
  assert.equal(sustituirFilas(locales, servidor, (id) => id === 1)[0].texto, 'mía');
});

test('una versión igual o más vieja no pisa la local', () => {
  const locales = [fila(1, 'mía', '2026-10-28T10:05:00Z')];
  const servidor = [fila(1, 'vieja del servidor', '2026-10-28T10:00:00Z')];
  assert.equal(sustituirFilas(locales, servidor, ninguna)[0].texto, 'mía');
});

test('sin cambios devuelve la misma lista', () => {
  const locales = [fila(1, 'x', '2026-10-28T10:00:00Z')];
  const servidor = [fila(1, 'x', '2026-10-28T10:00:00Z')];
  assert.equal(sustituirFilas(locales, servidor, ninguna), locales);
});

test('un alta local sin versión no se pisa', () => {
  const locales = [fila(9, 'alta')];
  const servidor = [fila(9, 'del servidor', '2026-10-28T10:00:00Z')];
  assert.equal(sustituirFilas(locales, servidor, ninguna)[0].texto, 'alta');
});

test('esMasNueva compara instantes, no cadenas', () => {
  assert.equal(esMasNueva({ id: 1, updatedAt: '2026-10-28T12:00:00+02:00' }, { id: 1, updatedAt: '2026-10-28T10:30:00Z' }), false);
  assert.equal(esMasNueva({ id: 1, updatedAt: '2026-10-28T10:31:00Z' }, { id: 1, updatedAt: '2026-10-28T10:30:00Z' }), true);
});
