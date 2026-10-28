// El modo invitado contesta como el backend y no necesita servidor ni IndexedDB.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pedirInvitado } from '../src/logica/invitado.ts';

const json = (valor: unknown) => JSON.stringify(valor);

test('una tarea escrita aparece en el dashboard y se borra', async () => {
  await pedirInvitado('/tasks/7', 'PUT', json({ payload: { id: 7, texto: 'a', completado: false } }));
  const { data } = await pedirInvitado<{ data: { tareas: { id: number }[] } }>('/dashboard', 'GET');
  assert.deepEqual(data.tareas.map((t) => t.id), [7]);
  await pedirInvitado('/tasks/7', 'DELETE');
  const vacio = await pedirInvitado<{ data: { tareas: unknown[] } }>('/dashboard', 'GET');
  assert.equal(vacio.data.tareas.length, 0);
});

test('marcar un día de un hábito lo mueve entre completado y desmarcado', async () => {
  await pedirInvitado('/habits/3', 'PUT', json({ payload: { id: 3, nombre: 'h' } }));
  await pedirInvitado('/habits/3/history', 'PUT', json({ date: '2026-10-28', status: 'completado' }));
  const { data } = await pedirInvitado<{ data: { habitos: { historialCompletados: string[] }[] } }>('/dashboard', 'GET');
  assert.deepEqual(data.habitos[0].historialCompletados, ['2026-10-28']);
  await pedirInvitado('/habits/3/history/2026-10-28', 'DELETE');
  const luego = await pedirInvitado<{ data: { habitos: { historialCompletados: string[] }[] } }>('/dashboard', 'GET');
  assert.deepEqual(luego.data.habitos[0].historialCompletados, []);
});

test('las notas se crean, archivan y listan por separado', async () => {
  const nota = await pedirInvitado<{ id: string }>('/notes', 'POST', json({ title: 'x', content: '' }));
  await pedirInvitado(`/notes/${nota.id}/archivo`, 'PUT', json({ archivada: true }));
  const vivas = await pedirInvitado<{ total: number }>('/notes?page=1&per_page=100&archivadas=false', 'GET');
  const archivadas = await pedirInvitado<{ total: number }>('/notes?page=1&per_page=100&archivadas=true', 'GET');
  assert.equal(vivas.total, 0);
  assert.equal(archivadas.total, 1);
});

test('una ruta desconocida da 404', async () => {
  await assert.rejects(pedirInvitado('/nada', 'GET'), { estado: 404 });
});
