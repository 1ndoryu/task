/* Contratos de API: salud, notas, jerarquía de tareas, identidad y CORS. Registra usuarios temporales y siembra el fixture. */

import { randomUUID } from 'node:crypto';
import { request, runPsql, expectStatus, sql } from './transporte.mjs';
import { estado } from './estado.mjs';

export async function checkHttpBasics() {
  const health = await request('/api/health');
  const ready = await request('/api/ready');
  expectStatus(health, 200, 'health');
  expectStatus(ready, 200, 'readiness');
  estado.report.checks.health = health.status;
  estado.report.checks.readiness = ready.status;
}

export async function registerTemporaryUser(cookieJar = estado.cookies, label = 'primary', requestedEmail) {
  const email = requestedEmail || `preflight-${label}-${randomUUID()}@example.test`;
  // Contraseña aleatoria por usuario de prueba: no hay secreto fijo en el repo
  const password = `Pf-${randomUUID()}!A1`;
  const response = await request('/api/auth/register', {
    cookieJar,
    cookie: '',
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  expectStatus(response, 201, 'register');
  const user = JSON.parse(response.body).user;
  if (!user?.id) throw new Error('register no devolvió user.id');
  if (cookieJar === estado.cookies) {
    estado.report.checks.register = response.status;
    estado.report.checks.sessionCookie = response.setCookie.includes('session_id=') && response.setCookie.includes('HttpOnly');
    estado.report.checks.csrfCookie = response.setCookie.includes('csrf_token=') && !/csrf_token=[^;]+;[^,]*HttpOnly/i.test(response.setCookie);
    if (!estado.report.checks.sessionCookie || !estado.report.checks.csrfCookie) throw new Error('cookies de sesión/CSRF no cumplen el contrato');
  }
  return user.id;
}

export async function seedFixture(id) {
  runPsql(`
    INSERT INTO dashboard_projects (user_id, legacy_id, name, sort_order, payload)
    SELECT '${sql(id)}'::uuid, g, 'Preflight project ' || g, g, '{}'::jsonb
    FROM generate_series(1, 600) AS g;
    INSERT INTO dashboard_tasks (user_id, legacy_id, text, sort_order, payload)
    SELECT '${sql(id)}'::uuid, g, 'Preflight task ' || g, g, '{}'::jsonb
    FROM generate_series(1, 600) AS g;
    INSERT INTO dashboard_habits (user_id, legacy_id, name, sort_order, payload)
    SELECT '${sql(id)}'::uuid, g, 'Preflight habit ' || g, g, '{}'::jsonb
    FROM generate_series(1, 600) AS g;
    INSERT INTO notes (user_id, title, content)
    SELECT '${sql(id)}'::uuid, 'Preflight note ' || g, repeat('searchable preflight ', 4)
    FROM generate_series(1, 300) AS g;
    INSERT INTO notes (user_id, title, content)
    VALUES ('${sql(id)}'::uuid, 'Preflight literal_% note', 'literal search fixture');
    INSERT INTO activity_events (user_id, type, element_legacy_id, element_type, date, local_time, details)
    SELECT '${sql(id)}'::uuid, 'nota_creada', g, 'nota', CURRENT_DATE - ((g - 1) % 365),
           make_time((g % 24)::int, (g % 60)::int, 0),
           jsonb_build_object('elementoNombre', 'Preflight event ' || g)
    FROM generate_series(1, 730) AS g;
  `);
  estado.report.checks.fixture = runPsql(`
    SELECT json_build_object(
      'projects', (SELECT COUNT(*) FROM dashboard_projects WHERE user_id = '${sql(id)}'::uuid),
      'tasks', (SELECT COUNT(*) FROM dashboard_tasks WHERE user_id = '${sql(id)}'::uuid),
      'habits', (SELECT COUNT(*) FROM dashboard_habits WHERE user_id = '${sql(id)}'::uuid),
      'notes', (SELECT COUNT(*) FROM notes WHERE user_id = '${sql(id)}'::uuid),
      'activity', (SELECT COUNT(*) FROM activity_events WHERE user_id = '${sql(id)}'::uuid)
    );
  `).trim();
}

export async function checkNoteContracts() {
  const missingFolder = randomUUID();
  const missing = await request(`/api/notes?page=1&per_page=20&folder_id=${missingFolder}`);
  expectStatus(missing, 404, 'folder inexistente');

  const foreignUser = randomUUID();
  const foreignFolder = randomUUID();
  estado.cleanupUserIds.add(foreignUser);
  runPsql(`
    INSERT INTO users (id, email, password_hash)
    VALUES ('${sql(foreignUser)}'::uuid, 'preflight-foreign-${sql(foreignUser)}@example.test', 'fixture-only');
    INSERT INTO note_folders (id, user_id, name)
    VALUES ('${sql(foreignFolder)}'::uuid, '${sql(foreignUser)}'::uuid, 'Foreign fixture folder');
  `);
  const foreign = await request(`/api/notes?page=1&per_page=20&folder_id=${foreignFolder}`);
  expectStatus(foreign, 404, 'folder ajena');

  const name = `Preflight folder ${randomUUID()}`;
  const first = await request('/api/notes/folders', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': estado.cookies.get('csrf_token') },
    body: JSON.stringify({ name }),
  });
  expectStatus(first, 201, 'crear carpeta de conflicto');
  const firstId = JSON.parse(first.body).id;
  const duplicate = await request('/api/notes/folders', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': estado.cookies.get('csrf_token') },
    body: JSON.stringify({ name }),
  });
  expectStatus(duplicate, 409, 'carpeta duplicada');

  const secondName = `Preflight second ${randomUUID()}`;
  const second = await request('/api/notes/folders', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': estado.cookies.get('csrf_token') },
    body: JSON.stringify({ name: secondName }),
  });
  expectStatus(second, 201, 'crear segunda carpeta');
  const secondId = JSON.parse(second.body).id;
  const renameDuplicate = await request(`/api/notes/folders/${secondId}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', 'x-csrf-token': estado.cookies.get('csrf_token') },
    body: JSON.stringify({ name }),
  });
  expectStatus(renameDuplicate, 409, 'renombrado duplicado');

  const note = await request('/api/notes', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': estado.cookies.get('csrf_token') },
    body: JSON.stringify({ title: 'Preflight folder deletion', content: 'must survive', folder_id: firstId }),
  });
  expectStatus(note, 201, 'nota para delete set null');
  const noteId = JSON.parse(note.body).id;
  const deletedFolder = await request(`/api/notes/folders/${firstId}`, {
    method: 'DELETE',
    headers: { 'x-csrf-token': estado.cookies.get('csrf_token') },
  });
  expectStatus(deletedFolder, 204, 'eliminar carpeta con nota');
  const preservedNote = await request(`/api/notes/${noteId}`);
  expectStatus(preservedNote, 200, 'nota preservada');
  if (JSON.parse(preservedNote.body).folder_id !== null) throw new Error('ON DELETE SET NULL no liberó la carpeta de la nota');

  const literalSearch = await request(`/api/notes?page=1&per_page=20&search=${encodeURIComponent('literal_%')}`);
  expectStatus(literalSearch, 200, 'búsqueda literal');
  const literalTotal = JSON.parse(literalSearch.body).total;
  if (literalTotal !== 1) throw new Error(`búsqueda literal esperaba 1 y recibió ${literalTotal}`);
  estado.report.checks.noteContracts = {
    missingFolder: missing.status,
    foreignFolder: foreign.status,
    duplicateFolder: duplicate.status,
    duplicateRename: renameDuplicate.status,
    folderDelete: deletedFolder.status,
    preservedNote: preservedNote.status,
    literalSearch: literalSearch.status,
    literalTotal,
    folderId: firstId,
  };
}

export async function checkTaskHierarchyContracts() {
  const parentId = 900001;
  const childId = 900002;
  const nestedId = 900003;
  const missingParentId = 900004;
  const selfParentId = 900005;
  const csrfHeaders = { 'content-type': 'application/json', 'x-csrf-token': estado.cookies.get('csrf_token') };
  const task = (id, parentIdValue, label, expectedUpdatedAt = null) => request(`/api/tasks/${id}`, {
    method: 'PUT',
    headers: csrfHeaders,
    body: JSON.stringify({ texto: label, parentId: parentIdValue, orden: id - 900001, payload: {}, expectedUpdatedAt }),
  });

  const parent = await task(parentId, null, 'Preflight parent task');
  expectStatus(parent, 200, 'crear tarea principal');
  const child = await task(childId, parentId, 'Preflight child task');
  expectStatus(child, 200, 'crear subtarea');
  if (JSON.parse(child.body).item?.parentId !== parentId) throw new Error('la respuesta de subtarea perdió parentId');
  const nested = await task(nestedId, childId, 'Preflight nested task');
  expectStatus(nested, 422, 'rechazar subtarea de una subtarea');
  const unparented = await task(childId, null, 'Preflight unparented task', JSON.parse(child.body).updatedAt);
  expectStatus(unparented, 200, 'desvincular subtarea');
  if (JSON.parse(unparented.body).item?.parentId !== null) throw new Error('desvincular subtarea no limpió parentId');
  const missing = await task(missingParentId, 999999, 'Preflight missing parent');
  expectStatus(missing, 422, 'rechazar padre inexistente');
  const self = await task(selfParentId, selfParentId, 'Preflight self parent');
  expectStatus(self, 422, 'rechazar auto-parentesco');

  const raceGrandParentId = 900006;
  const raceParentId = 900007;
  const raceChildId = 900008;
  const raceGrandParent = await task(raceGrandParentId, null, 'Preflight race grand parent');
  expectStatus(raceGrandParent, 200, 'crear padre de carrera');
  const raceParent = await task(raceParentId, null, 'Preflight race parent');
  expectStatus(raceParent, 200, 'crear tarea de carrera');
  const raceParentUpdatedAt = JSON.parse(raceParent.body).updatedAt;
  const [reparent, concurrentChild] = await Promise.all([
    task(raceParentId, raceGrandParentId, 'Preflight concurrent reparent', raceParentUpdatedAt),
    task(raceChildId, raceParentId, 'Preflight concurrent child'),
  ]);
  const concurrentStatuses = [reparent.status, concurrentChild.status].sort((left, right) => left - right);
  if (concurrentStatuses.join(',') !== '200,422') {
    throw new Error(`carrera de jerarquía esperaba una escritura 200 y otra 422, recibió ${concurrentStatuses.join(',')}`);
  }

  estado.report.checks.taskHierarchy = {
    parent: parent.status,
    child: child.status,
    unparented: unparented.status,
    nested: nested.status,
    missingParent: missing.status,
    selfParent: self.status,
    concurrentStatuses,
  };
}

export async function checkIdentityContracts() {
  const oversizedEmail = `${'a'.repeat(244)}@example.com`;
  const oversizedRegister = await request('/api/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: oversizedEmail, password: 'preflight-password-123' }),
  });
  expectStatus(oversizedRegister, 422, 'registro con email sobredimensionado');
  const oversizedInvite = await request('/api/teams/requests', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': estado.cookies.get('csrf_token') },
    body: JSON.stringify({ email: oversizedEmail }),
  });
  expectStatus(oversizedInvite, 422, 'invitación con email sobredimensionado');

  const duplicateCookies = new Map();
  const duplicateEmail = `preflight-casefold-${randomUUID()}@example.test`;
  const first = await registerTemporaryUser(duplicateCookies, 'casefold', duplicateEmail.toUpperCase());
  estado.cleanupUserIds.add(first);
  const duplicate = await request('/api/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: duplicateEmail, password: 'preflight-password-123' }),
  });
  expectStatus(duplicate, 409, 'registro duplicado casefold');

  const reciprocal = await request('/api/teams/requests', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': estado.cookies.get('csrf_token') },
    body: JSON.stringify({ email: duplicateEmail }),
  });
  expectStatus(reciprocal, 201, 'solicitud casefold auxiliar');
  const reciprocalResponse = await request('/api/teams/requests', {
    method: 'POST',
    cookieJar: duplicateCookies,
    headers: { 'content-type': 'application/json', 'x-csrf-token': duplicateCookies.get('csrf_token') },
    body: JSON.stringify({ email: runPsql(`SELECT email FROM users WHERE id = '${sql(estado.userId)}'::uuid`).trim() }),
  });
  expectStatus(reciprocalResponse, 409, 'solicitud recíproca');
  estado.report.checks.identityContracts = {
    oversizedRegister: oversizedRegister.status,
    oversizedInvite: oversizedInvite.status,
    duplicateCasefold: duplicate.status,
    reciprocalRequest: reciprocalResponse.status,
  };
}

export async function checkCorsAndCookies() {
  const response = await request('/api/health', {
    method: 'OPTIONS',
    headers: {
      origin: 'http://127.0.0.1:55440',
      'access-control-request-method': 'GET',
    },
  });
  const allowOrigin = response.headers.get('access-control-allow-origin');
  estado.report.checks.cors = { status: response.status, allowOrigin };
  if (allowOrigin !== 'http://127.0.0.1:55440') throw new Error(`CORS inesperado: ${allowOrigin || 'ausente'}`);
}
