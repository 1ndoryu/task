#!/usr/bin/env node

/* Preflight de exposición. Por defecto solo admite loopback y una base
 * explícitamente temporal mediante PREFLIGHT_DATABASE_URL. Un destino no local
 * requiere una bandera CLI y confirmaciones de entorno independientes. */

import { createHash, randomUUID } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import process from 'node:process';
import { findPsql } from './branch-db.mjs';

const args = parseArgs(process.argv.slice(2));
const baseUrl = args.baseUrl.replace(/\/$/, '');
const psql = findPsql();
const database = parseDatabaseUrl(process.env.PREFLIGHT_DATABASE_URL);
validateExposureTargets(baseUrl, database, args);
const reportPath = args.report || `temp/preflight-report-${new Date().toISOString().replaceAll(':', '-')}.json`;
const report = {
  startedAt: new Date().toISOString(),
  baseUrl,
  parameters: { users: args.users, rps: args.rps, durationSeconds: args.durationSeconds },
  checks: {},
  explain: {},
  load: null,
  failures: [],
};

const cookies = new Map();
let userId;
const cleanupUserIds = new Set();

try {
  if (!psql) throw new Error('psql no está disponible en PATH ni en Program Files/PostgreSQL');

  await checkHttpBasics();
  userId = await registerTemporaryUser();
  cleanupUserIds.add(userId);
  await seedFixture(userId);
  await checkNoteContracts();
  await checkTaskHierarchyContracts();
  await checkTeamContracts();
  await checkSharedProjectionContracts();
  await checkIdentityContracts();
  await checkCorsAndCookies();
  await checkExpiredSessionCleanup(userId);
  await checkRateLimit();
  await collectExplain(userId);
  if (process.env.PREFLIGHT_SKIP_TIMEOUT_FIXTURE === 'true') {
    report.checks.requestTimeout = 'skipped by PREFLIGHT_SKIP_TIMEOUT_FIXTURE';
  } else {
    await checkRequestTimeout(userId);
  }
  report.load = await runLoad();
  if (report.load.errors > 0 || report.load.p95Ms >= 300) {
    throw new Error(`carga fuera de umbral: errores=${report.load.errors}, p95=${report.load.p95Ms}ms`);
  }
} catch (error) {
  report.failures.push(error instanceof Error ? error.message : String(error));
} finally {
  if (cleanupUserIds.size > 0) {
    try {
      runPsql(`DELETE FROM users WHERE id IN (${[...cleanupUserIds].map((id) => `'${sql(id)}'::uuid`).join(', ')});`);
      runPsql("DELETE FROM users WHERE email LIKE 'preflight-team-page-%@example.test';");
      report.cleaned = true;
    } catch (error) {
      report.cleaned = false;
      report.failures.push(`cleanup: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  report.finishedAt = new Date().toISOString();
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

if (report.failures.length > 0) {
  console.error(`Preflight FAIL — reporte: ${reportPath}`);
  for (const failure of report.failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Preflight PASS — reporte: ${reportPath}`);
}

async function checkHttpBasics() {
  const health = await request('/api/health');
  const ready = await request('/api/ready');
  expectStatus(health, 200, 'health');
  expectStatus(ready, 200, 'readiness');
  report.checks.health = health.status;
  report.checks.readiness = ready.status;
}

async function registerTemporaryUser(cookieJar = cookies, label = 'primary', requestedEmail) {
  const email = requestedEmail || `preflight-${label}-${randomUUID()}@example.test`;
  const password = 'PreflightPassword123!';
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
  if (cookieJar === cookies) {
    report.checks.register = response.status;
    report.checks.sessionCookie = response.setCookie.includes('session_id=') && response.setCookie.includes('HttpOnly');
    report.checks.csrfCookie = response.setCookie.includes('csrf_token=') && !/csrf_token=[^;]+;[^,]*HttpOnly/i.test(response.setCookie);
    if (!report.checks.sessionCookie || !report.checks.csrfCookie) throw new Error('cookies de sesión/CSRF no cumplen el contrato');
  }
  return user.id;
}

async function seedFixture(id) {
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
  report.checks.fixture = runPsql(`
    SELECT json_build_object(
      'projects', (SELECT COUNT(*) FROM dashboard_projects WHERE user_id = '${sql(id)}'::uuid),
      'tasks', (SELECT COUNT(*) FROM dashboard_tasks WHERE user_id = '${sql(id)}'::uuid),
      'habits', (SELECT COUNT(*) FROM dashboard_habits WHERE user_id = '${sql(id)}'::uuid),
      'notes', (SELECT COUNT(*) FROM notes WHERE user_id = '${sql(id)}'::uuid),
      'activity', (SELECT COUNT(*) FROM activity_events WHERE user_id = '${sql(id)}'::uuid)
    );
  `).trim();
}

async function checkNoteContracts() {
  const missingFolder = randomUUID();
  const missing = await request(`/api/notes?page=1&per_page=20&folder_id=${missingFolder}`);
  expectStatus(missing, 404, 'folder inexistente');

  const foreignUser = randomUUID();
  const foreignFolder = randomUUID();
  cleanupUserIds.add(foreignUser);
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
    headers: { 'content-type': 'application/json', 'x-csrf-token': cookies.get('csrf_token') },
    body: JSON.stringify({ name }),
  });
  expectStatus(first, 201, 'crear carpeta de conflicto');
  const firstId = JSON.parse(first.body).id;
  const duplicate = await request('/api/notes/folders', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': cookies.get('csrf_token') },
    body: JSON.stringify({ name }),
  });
  expectStatus(duplicate, 409, 'carpeta duplicada');

  const secondName = `Preflight second ${randomUUID()}`;
  const second = await request('/api/notes/folders', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': cookies.get('csrf_token') },
    body: JSON.stringify({ name: secondName }),
  });
  expectStatus(second, 201, 'crear segunda carpeta');
  const secondId = JSON.parse(second.body).id;
  const renameDuplicate = await request(`/api/notes/folders/${secondId}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', 'x-csrf-token': cookies.get('csrf_token') },
    body: JSON.stringify({ name }),
  });
  expectStatus(renameDuplicate, 409, 'renombrado duplicado');

  const note = await request('/api/notes', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': cookies.get('csrf_token') },
    body: JSON.stringify({ title: 'Preflight folder deletion', content: 'must survive', folder_id: firstId }),
  });
  expectStatus(note, 201, 'nota para delete set null');
  const noteId = JSON.parse(note.body).id;
  const deletedFolder = await request(`/api/notes/folders/${firstId}`, {
    method: 'DELETE',
    headers: { 'x-csrf-token': cookies.get('csrf_token') },
  });
  expectStatus(deletedFolder, 204, 'eliminar carpeta con nota');
  const preservedNote = await request(`/api/notes/${noteId}`);
  expectStatus(preservedNote, 200, 'nota preservada');
  if (JSON.parse(preservedNote.body).folder_id !== null) throw new Error('ON DELETE SET NULL no liberó la carpeta de la nota');

  const literalSearch = await request(`/api/notes?page=1&per_page=20&search=${encodeURIComponent('literal_%')}`);
  expectStatus(literalSearch, 200, 'búsqueda literal');
  const literalTotal = JSON.parse(literalSearch.body).total;
  if (literalTotal !== 1) throw new Error(`búsqueda literal esperaba 1 y recibió ${literalTotal}`);
  report.checks.noteContracts = {
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

async function checkTaskHierarchyContracts() {
  const parentId = 900001;
  const childId = 900002;
  const nestedId = 900003;
  const missingParentId = 900004;
  const selfParentId = 900005;
  const csrfHeaders = { 'content-type': 'application/json', 'x-csrf-token': cookies.get('csrf_token') };
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

  report.checks.taskHierarchy = {
    parent: parent.status,
    child: child.status,
    unparented: unparented.status,
    nested: nested.status,
    missingParent: missing.status,
    selfParent: self.status,
    concurrentStatuses,
  };
}

async function checkTeamContracts() {
  const secondaryCookies = new Map();
  const secondaryId = await registerTemporaryUser(secondaryCookies, 'secondary');
  cleanupUserIds.add(secondaryId);
  const secondary = await request('/api/teams', { cookieJar: secondaryCookies });
  expectStatus(secondary, 200, 'equipo secundario vacío');

  const secondaryEmail = runPsql(`SELECT email FROM users WHERE id = '${sql(secondaryId)}'::uuid`).trim();
  const invitation = await request('/api/teams/requests', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': cookies.get('csrf_token') },
    body: JSON.stringify({ email: secondaryEmail }),
  });
  expectStatus(invitation, 201, 'enviar solicitud de equipo');
  const invitationId = JSON.parse(invitation.body).id;

  const received = await request('/api/teams', { cookieJar: secondaryCookies });
  expectStatus(received, 200, 'listar solicitud recibida');
  if (JSON.parse(received.body).counts.received !== 1) throw new Error('la solicitud recibida no apareció en el equipo secundario');
  const accepted = await request(`/api/teams/requests/${invitationId}`, {
    method: 'PUT',
    cookieJar: secondaryCookies,
    headers: { 'content-type': 'application/json', 'x-csrf-token': secondaryCookies.get('csrf_token') },
    body: JSON.stringify({ action: 'accept' }),
  });
  expectStatus(accepted, 200, 'aceptar solicitud de equipo');
  const acceptedNotifications = await request('/api/notifications?page=1&perPage=20', { cookieJar: cookies });
  expectStatus(acceptedNotifications, 200, 'notificación de solicitud aceptada');
  if (JSON.parse(acceptedNotifications.body).total !== 1) throw new Error('la aceptación no generó una notificación para el solicitante');

  const connected = await request('/api/teams');
  expectStatus(connected, 200, 'listar compañero conectado');
  if (JSON.parse(connected.body).counts.members !== 1) throw new Error('la conexión aceptada no apareció como compañero');

  const shareRequests = [
    { itemType: 'tarea', itemId: 1, role: 'colaborador' },
    { itemType: 'proyecto', itemId: 1, role: 'observador' },
    { itemType: 'habito', itemId: 1, role: 'observador' },
  ];
  const shares = [];
  for (const shareRequest of shareRequests) {
    const response = await request('/api/shared', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-csrf-token': cookies.get('csrf_token') },
      body: JSON.stringify({ ...shareRequest, userId: secondaryId }),
    });
    expectStatus(response, 201, `compartir ${shareRequest.itemType}`);
    shares.push(JSON.parse(response.body));
  }
  const duplicateShare = await request('/api/shared', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': cookies.get('csrf_token') },
    body: JSON.stringify({ ...shareRequests[0], userId: secondaryId }),
  });
  expectStatus(duplicateShare, 409, 'compartido duplicado');
  const receivedShared = await request('/api/shared', { cookieJar: secondaryCookies });
  expectStatus(receivedShared, 200, 'listar compartidos recibidos');
  if (JSON.parse(receivedShared.body).total !== 3) throw new Error('los tres compartidos no aparecieron en recibidos');
  const filteredShared = await request('/api/shared?itemType=proyecto', { cookieJar: secondaryCookies });
  expectStatus(filteredShared, 200, 'filtrar compartidos por tipo');
  if (JSON.parse(filteredShared.body).total !== 1) throw new Error('el filtro de compartidos devolvió un total incorrecto');
  const ownedShared = await request('/api/shared/mine');
  expectStatus(ownedShared, 200, 'listar compartidos propios');
  if (JSON.parse(ownedShared.body).total !== 3) throw new Error('los compartidos propios no aparecieron');
  const secondaryNotifications = await request('/api/notifications?page=1&perPage=2', { cookieJar: secondaryCookies });
  expectStatus(secondaryNotifications, 200, 'listar notificaciones paginadas');
  const secondaryNotificationData = JSON.parse(secondaryNotifications.body);
  if (secondaryNotificationData.total !== 4 || secondaryNotificationData.items.length !== 2 || !secondaryNotificationData.hasMore) {
    throw new Error(`las notificaciones de colaboración no respetaron total/paginación: ${JSON.stringify({ total: secondaryNotificationData.total, items: secondaryNotificationData.items.length, hasMore: secondaryNotificationData.hasMore })}`);
  }
  const secondaryUnread = await request('/api/notifications/unread-count', { cookieJar: secondaryCookies });
  expectStatus(secondaryUnread, 200, 'contar notificaciones no leídas');
  if (JSON.parse(secondaryUnread.body).unread !== 4) throw new Error('el contador inicial de notificaciones no coincide');
  const notificationId = secondaryNotificationData.items[0].id;
  const markNotification = await request(`/api/notifications/${notificationId}/read`, {
    method: 'PUT',
    cookieJar: secondaryCookies,
    headers: { 'x-csrf-token': secondaryCookies.get('csrf_token') },
  });
  expectStatus(markNotification, 200, 'marcar notificación');
  if (!JSON.parse(markNotification.body).read) throw new Error('la notificación marcada no quedó leída');
  const afterOneUnread = await request('/api/notifications/unread-count', { cookieJar: secondaryCookies });
  expectStatus(afterOneUnread, 200, 'contar después de marcar una');
  if (JSON.parse(afterOneUnread.body).unread !== 3) throw new Error('el contador no descendió tras marcar una notificación');
  const markAllNotifications = await request('/api/notifications/read-all', {
    method: 'PUT',
    cookieJar: secondaryCookies,
    headers: { 'x-csrf-token': secondaryCookies.get('csrf_token') },
  });
  expectStatus(markAllNotifications, 200, 'marcar todas las notificaciones');
  if (JSON.parse(markAllNotifications.body).marked !== 3) throw new Error('marcar todas no devolvió las tres restantes');
  const afterAllUnread = await request('/api/notifications/unread-count', { cookieJar: secondaryCookies });
  expectStatus(afterAllUnread, 200, 'contar después de marcar todas');
  if (JSON.parse(afterAllUnread.body).unread !== 0) throw new Error('quedaron notificaciones no leídas tras marcar todas');
  const forbiddenNotificationDelete = await request(`/api/notifications/${notificationId}`, {
    method: 'DELETE',
    headers: { 'x-csrf-token': cookies.get('csrf_token') },
  });
  expectStatus(forbiddenNotificationDelete, 404, 'borrar notificación ajena');
  const removedNotification = await request(`/api/notifications/${notificationId}`, {
    method: 'DELETE',
    cookieJar: secondaryCookies,
    headers: { 'x-csrf-token': secondaryCookies.get('csrf_token') },
  });
  expectStatus(removedNotification, 204, 'borrar notificación propia');
  const removedNotificationAgain = await request(`/api/notifications/${notificationId}`, {
    method: 'DELETE',
    cookieJar: secondaryCookies,
    headers: { 'x-csrf-token': secondaryCookies.get('csrf_token') },
  });
  expectStatus(removedNotificationAgain, 404, 'repetir borrado de notificación');
  const timelineMessage = await request('/api/timeline', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': cookies.get('csrf_token') },
    body: JSON.stringify({ itemType: 'tarea', itemId: 1, content: 'Mensaje de timeline del propietario' }),
  });
  expectStatus(timelineMessage, 201, 'crear mensaje de timeline');
  const timelineUnread = await request('/api/timeline/unread/tarea/1', { cookieJar: secondaryCookies });
  expectStatus(timelineUnread, 200, 'contar timeline no leído');
  if (JSON.parse(timelineUnread.body).unread !== 1) throw new Error('el mensaje de timeline no incrementó el contador no leído');
  const timelineEvent = await request('/api/timeline/events', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': cookies.get('csrf_token') },
    body: JSON.stringify({ itemType: 'tarea', itemId: 1, action: 'editado', detail: 'desde preflight' }),
  });
  expectStatus(timelineEvent, 200, 'crear evento de timeline');
  if (!JSON.parse(timelineEvent.body).created) throw new Error('el evento válido de timeline no se creó');
  const timelinePage = await request('/api/timeline/tarea/1?limit=1&offset=0', { cookieJar: secondaryCookies });
  expectStatus(timelinePage, 200, 'listar timeline paginado');
  const timelinePageData = JSON.parse(timelinePage.body);
  if (timelinePageData.total !== 2 || timelinePageData.items.length !== 1 || !timelinePageData.hasMore) {
    throw new Error(`el timeline no respetó total/paginación: ${JSON.stringify({ total: timelinePageData.total, items: timelinePageData.items.length, hasMore: timelinePageData.hasMore })}`);
  }
  const timelineUnreadAfterList = await request('/api/timeline/unread/tarea/1', { cookieJar: secondaryCookies });
  expectStatus(timelineUnreadAfterList, 200, 'contar timeline después de listar');
  if (JSON.parse(timelineUnreadAfterList.body).unread !== 0) throw new Error('listar timeline no marcó los mensajes como leídos');
  const secondaryTimelineMessage = await request('/api/timeline', {
    method: 'POST',
    cookieJar: secondaryCookies,
    headers: { 'content-type': 'application/json', 'x-csrf-token': secondaryCookies.get('csrf_token') },
    body: JSON.stringify({ itemType: 'tarea', itemId: 1, content: 'Respuesta de timeline del compañero' }),
  });
  expectStatus(secondaryTimelineMessage, 201, 'crear mensaje de timeline del compañero');
  const timelineCount = await request('/api/timeline/count/tarea/1', { cookieJar: cookies });
  expectStatus(timelineCount, 200, 'contar mensajes de timeline');
  if (JSON.parse(timelineCount.body).total !== 3) throw new Error('el contador de timeline no coincide');
  const timelineOverflowMessages = [];
  for (let index = 0; index < 51; index += 1) {
    const response = await request('/api/timeline', {
      method: 'POST',
      cookieJar: secondaryCookies,
      headers: { 'content-type': 'application/json', 'x-csrf-token': secondaryCookies.get('csrf_token') },
      body: JSON.stringify({ itemType: 'tarea', itemId: 1, content: `Timeline overflow ${index}` }),
    });
    expectStatus(response, 201, `crear mensaje de timeline ${index + 1}`);
    timelineOverflowMessages.push(response.status);
  }
  const timelineLastPage = await request('/api/timeline/tarea/1?limit=50&offset=50', { cookieJar: secondaryCookies });
  expectStatus(timelineLastPage, 200, 'listar última página de timeline');
  const timelineLastPageData = JSON.parse(timelineLastPage.body);
  if (timelineLastPageData.total !== 54 || timelineLastPageData.items.length !== 4 || timelineLastPageData.hasMore || !timelineLastPageData.items.some((item) => item.content === 'Timeline overflow 50')) {
    throw new Error(`la última página de timeline no expuso los mensajes posteriores a 50: ${JSON.stringify({ total: timelineLastPageData.total, items: timelineLastPageData.items.length, hasMore: timelineLastPageData.hasMore })}`);
  }
  const participants = await request(`/api/shared/participants/tarea/1/${userId}`, { cookieJar: secondaryCookies });
  expectStatus(participants, 200, 'listar participantes');
  if (JSON.parse(participants.body).participants.length !== 2) throw new Error('los participantes no incluyen propietario y destinatario');
  const accessCollaborator = await request(`/api/shared/access/tarea/1/${userId}`, { cookieJar: secondaryCookies });
  expectStatus(accessCollaborator, 200, 'consultar acceso colaborador');
  if (!JSON.parse(accessCollaborator.body).hasAccess || !JSON.parse(accessCollaborator.body).access.canEdit) throw new Error('el rol colaborador no habilitó edición');
  const accessObserver = await request(`/api/shared/access/proyecto/1/${userId}`, { cookieJar: secondaryCookies });
  expectStatus(accessObserver, 200, 'consultar acceso observador');
  if (JSON.parse(accessObserver.body).access.canEdit) throw new Error('el rol observador habilitó edición');
  const changedRole = await request(`/api/shared/${shares[0].id}/role`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', 'x-csrf-token': cookies.get('csrf_token') },
    body: JSON.stringify({ role: 'observador' }),
  });
  expectStatus(changedRole, 200, 'cambiar rol del compartido');
  const forbiddenRole = await request(`/api/shared/${shares[0].id}/role`, {
    method: 'PUT',
    cookieJar: secondaryCookies,
    headers: { 'content-type': 'application/json', 'x-csrf-token': secondaryCookies.get('csrf_token') },
    body: JSON.stringify({ role: 'colaborador' }),
  });
  expectStatus(forbiddenRole, 403, 'cambiar rol sin propiedad');
  const missingRole = await request(`/api/shared/${randomUUID()}/role`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', 'x-csrf-token': cookies.get('csrf_token') },
    body: JSON.stringify({ role: 'colaborador' }),
  });
  expectStatus(missingRole, 404, 'cambiar rol de compartido inexistente');
  const missingEntityShare = await request('/api/shared', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': cookies.get('csrf_token') },
    body: JSON.stringify({ itemType: 'tarea', itemId: 999999, userId: secondaryId, role: 'colaborador' }),
  });
  expectStatus(missingEntityShare, 404, 'compartir entidad inexistente');
  const outsiderCookies = new Map();
  const outsiderId = await registerTemporaryUser(outsiderCookies, 'shared-outsider');
  cleanupUserIds.add(outsiderId);
  runPsql(`
    INSERT INTO dashboard_tasks (user_id, legacy_id, text, sort_order, payload)
    VALUES ('${sql(outsiderId)}'::uuid, 1001, 'Outsider sharing fixture', 1001, '{}'::jsonb);
  `);
  const outsiderShare = await request('/api/shared', {
    method: 'POST',
    cookieJar: outsiderCookies,
    headers: { 'content-type': 'application/json', 'x-csrf-token': outsiderCookies.get('csrf_token') },
    body: JSON.stringify({ itemType: 'tarea', itemId: 1001, userId: secondaryId, role: 'colaborador' }),
  });
  expectStatus(outsiderShare, 403, 'compartir sin conexión de equipo');
  const outsiderTimeline = await request('/api/timeline', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': cookies.get('csrf_token') },
    body: JSON.stringify({ itemType: 'tarea', itemId: 1001, content: 'no debe cruzar propietarios' }),
  });
  expectStatus(outsiderTimeline, 404, 'aislar timeline entre propietarios');
  const outsiderEvent = await request('/api/timeline/events', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': cookies.get('csrf_token') },
    body: JSON.stringify({ itemType: 'tarea', itemId: 1001, action: 'editado' }),
  });
  expectStatus(outsiderEvent, 200, 'omitir evento de timeline sin acceso');
  if (JSON.parse(outsiderEvent.body).created) throw new Error('el evento sin acceso de timeline se creó');
  const removedShares = [];
  for (const share of shares) {
    const response = await request(`/api/shared/${share.id}`, {
      method: 'DELETE',
      cookieJar: secondaryCookies,
      headers: { 'x-csrf-token': secondaryCookies.get('csrf_token') },
    });
    expectStatus(response, 204, 'abandonar compartido');
    removedShares.push(response.status);
  }
  const removed = await request(`/api/teams/${invitationId}`, {
    method: 'DELETE',
    headers: { 'x-csrf-token': cookies.get('csrf_token') },
  });
  expectStatus(removed, 204, 'eliminar conexión de equipo');

  const pending = await request('/api/teams/requests', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': cookies.get('csrf_token') },
    body: JSON.stringify({ email: `preflight-unregistered-${randomUUID()}@example.test` }),
  });
  expectStatus(pending, 201, 'solicitud de usuario no registrado');
  if (JSON.parse(pending.body).status !== 'pending_registration') throw new Error('la solicitud no registrada no quedó pending_registration');
  runPsql(`
    INSERT INTO users (id, email, password_hash)
    SELECT uuid_generate_v4(), 'preflight-team-page-' || g || '@example.test', 'fixture-only'
    FROM generate_series(1, 101) AS g;
    INSERT INTO team_connections (requester_id, addressee_id, addressee_email, status)
    SELECT '${sql(userId)}'::uuid, id, email, 'accepted'
    FROM users WHERE email LIKE 'preflight-team-page-%@example.test';
  `);
  const firstPage = await request('/api/teams?perPage=50&page=1');
  expectStatus(firstPage, 200, 'página uno de equipo');
  const firstPageData = JSON.parse(firstPage.body);
  if (!firstPageData.hasMore || firstPageData.members.length !== 50) {
    throw new Error(`la primera página de equipo no indicó truncamiento: ${JSON.stringify({ counts: firstPageData.counts, members: firstPageData.members.length, page: firstPageData.page, perPage: firstPageData.perPage, hasMore: firstPageData.hasMore })}`);
  }
  const secondPage = await request('/api/teams?perPage=50&page=2');
  expectStatus(secondPage, 200, 'página dos de equipo');
  const secondPageData = JSON.parse(secondPage.body);
  if (secondPageData.members.length !== 50 || !secondPageData.hasMore) {
    throw new Error(`la segunda página de equipo no expuso 50 miembros y continuidad: ${JSON.stringify({ counts: secondPageData.counts, members: secondPageData.members.length, page: secondPageData.page, perPage: secondPageData.perPage, hasMore: secondPageData.hasMore })}`);
  }
  const thirdPage = await request('/api/teams?perPage=50&page=3');
  expectStatus(thirdPage, 200, 'página tres de equipo');
  const thirdPageData = JSON.parse(thirdPage.body);
  if (thirdPageData.members.length !== 1 || thirdPageData.hasMore) {
    throw new Error(`la tercera página de equipo no expuso el compañero 101: ${JSON.stringify({ counts: thirdPageData.counts, members: thirdPageData.members.length, page: thirdPageData.page, perPage: thirdPageData.perPage, hasMore: thirdPageData.hasMore })}`);
  }
  const overflowRecipientId = thirdPageData.members[0]?.user.id;
  if (!overflowRecipientId) throw new Error('la paginación de equipo no devolvió el compañero 101');
  const overflowShare = await request('/api/shared', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': cookies.get('csrf_token') },
    body: JSON.stringify({ itemType: 'tarea', itemId: 1, userId: overflowRecipientId, role: 'observador' }),
  });
  expectStatus(overflowShare, 201, 'compartir con compañero de la página 3');
  const overflowShareId = JSON.parse(overflowShare.body).id;
  const overflowRemoved = await request(`/api/shared/${overflowShareId}`, {
    method: 'DELETE',
    headers: { 'x-csrf-token': cookies.get('csrf_token') },
  });
  expectStatus(overflowRemoved, 204, 'retirar compartido del compañero paginado');
  report.checks.teamContracts = {
    secondaryEmpty: secondary.status,
    invitation: invitation.status,
    received: received.status,
    accepted: accepted.status,
    connected: connected.status,
    removed: removed.status,
    pendingRegistration: pending.status,
    pagination: { firstPage: firstPage.status, secondPage: secondPage.status, thirdPage: thirdPage.status, overflowRecipient: overflowShare.status, overflowRemoved: overflowRemoved.status },
  };
  report.checks.sharedContracts = {
    created: shares.map((share) => share.id),
    duplicate: duplicateShare.status,
    received: receivedShared.status,
    filtered: filteredShared.status,
    owned: ownedShared.status,
    notifications: {
      accepted: acceptedNotifications.status,
      paginated: secondaryNotifications.status,
      unread: secondaryUnread.status,
      markedOne: markNotification.status,
      markedAll: markAllNotifications.status,
      unreadAfterAll: afterAllUnread.status,
      forbiddenDelete: forbiddenNotificationDelete.status,
      removed: removedNotification.status,
      repeatedRemove: removedNotificationAgain.status,
    },
    timeline: {
      message: timelineMessage.status,
      unread: timelineUnread.status,
      event: timelineEvent.status,
      paginated: timelinePage.status,
      unreadAfterList: timelineUnreadAfterList.status,
      secondaryMessage: secondaryTimelineMessage.status,
      count: timelineCount.status,
      overflowCreated: timelineOverflowMessages.length,
      lastPage: timelineLastPage.status,
      outsider: outsiderTimeline.status,
      outsiderEvent: outsiderEvent.status,
    },
    participants: participants.status,
    collaboratorAccess: accessCollaborator.status,
    observerAccess: accessObserver.status,
    changedRole: changedRole.status,
    forbiddenRole: forbiddenRole.status,
    missingRole: missingRole.status,
    missingEntity: missingEntityShare.status,
    outsider: outsiderShare.status,
    removed: removedShares,
  };
}

/* Proyección own + shared del dashboard en modelo nativo: un propietario comparte un proyecto
 * conmigo y me asigna tareas por UUID (asignadoA = UUID, sin correlación legacy); el dashboard
 * debe fusionar lo propio con lo compartido con metadata (esCompartido, propietario*, miRol),
 * deduplicar, excluir hábitos y tareas compartidas directas, y solo incluir tareas asignadas
 * a mí, no a terceros. */
async function checkSharedProjectionContracts() {
  const ownerCookies = new Map();
  const ownerId = await registerTemporaryUser(ownerCookies, 'proj-owner');
  const recipientCookies = new Map();
  const recipientId = await registerTemporaryUser(recipientCookies, 'proj-recipient');
  const otherCookies = new Map();
  const otherId = await registerTemporaryUser(otherCookies, 'proj-other');
  cleanupUserIds.add(ownerId);
  cleanupUserIds.add(recipientId);
  cleanupUserIds.add(otherId);
  runPsql(`UPDATE users SET display_name = 'Propietario Proyeccion' WHERE id = '${sql(ownerId)}'::uuid;`);

  // Conexión de equipo aceptada (requisito para compartir).
  const ownerEmail = runPsql(`SELECT email FROM users WHERE id = '${sql(ownerId)}'::uuid`).trim();
  const invitation = await request('/api/teams/requests', {
    method: 'POST',
    cookieJar: recipientCookies,
    headers: { 'content-type': 'application/json', 'x-csrf-token': recipientCookies.get('csrf_token') },
    body: JSON.stringify({ email: ownerEmail }),
  });
  expectStatus(invitation, 201, 'invitacion proyeccion');
  const invitationId = JSON.parse(invitation.body).id;
  const accepted = await request(`/api/teams/requests/${invitationId}`, {
    method: 'PUT',
    cookieJar: ownerCookies,
    headers: { 'content-type': 'application/json', 'x-csrf-token': ownerCookies.get('csrf_token') },
    body: JSON.stringify({ action: 'accept' }),
  });
  expectStatus(accepted, 200, 'aceptar invitacion proyeccion');

  const csrfOwner = { 'content-type': 'application/json', 'x-csrf-token': ownerCookies.get('csrf_token') };
  const upsertTask = (id, body) => request(`/api/tasks/${id}`, {
    method: 'PUT',
    cookieJar: ownerCookies,
    headers: csrfOwner,
    body: JSON.stringify(body),
  });

  const project = await request('/api/projects/5001', {
    method: 'PUT',
    cookieJar: ownerCookies,
    headers: csrfOwner,
    body: JSON.stringify({ nombre: 'Proyecto compartido', estado: 'activo', urgencia: 'normal', orden: 0, payload: {} }),
  });
  expectStatus(project, 200, 'crear proyecto 5001');
  const taskInProjectAssigned = await upsertTask(6001, {
    texto: 'Tarea del proyecto asignada', completado: false, urgencia: 'normal', orden: 0,
    proyectoId: 5001, payload: { asignadoA: recipientId },
  });
  expectStatus(taskInProjectAssigned, 200, 'crear tarea 6001 asignada');
  const taskInProject = await upsertTask(6003, {
    texto: 'Tarea del proyecto sin asignar', completado: false, urgencia: 'normal', orden: 1,
    proyectoId: 5001, payload: {},
  });
  expectStatus(taskInProject, 200, 'crear tarea 6003');
  const assignedDirect = await upsertTask(6002, {
    texto: 'Tarea asignada directa', completado: false, urgencia: 'normal', orden: 2,
    payload: { asignadoA: recipientId },
  });
  expectStatus(assignedDirect, 200, 'crear tarea asignada 6002');
  const assignedOther = await upsertTask(6005, {
    texto: 'Tarea de otro', completado: false, urgencia: 'normal', orden: 3,
    payload: { asignadoA: otherId },
  });
  expectStatus(assignedOther, 200, 'crear tarea asignada a otro 6005');
  const sharedDirect = await upsertTask(6004, {
    texto: 'Tarea compartida directa', completado: false, urgencia: 'normal', orden: 4,
    payload: {},
  });
  expectStatus(sharedDirect, 200, 'crear tarea 6004');

  const shareProject = await request('/api/shared', {
    method: 'POST',
    cookieJar: ownerCookies,
    headers: csrfOwner,
    body: JSON.stringify({ itemType: 'proyecto', itemId: 5001, userId: recipientId, role: 'colaborador' }),
  });
  expectStatus(shareProject, 201, 'compartir proyecto 5001');
  const shareDirectTask = await request('/api/shared', {
    method: 'POST',
    cookieJar: ownerCookies,
    headers: csrfOwner,
    body: JSON.stringify({ itemType: 'tarea', itemId: 6004, userId: recipientId, role: 'observador' }),
  });
  expectStatus(shareDirectTask, 201, 'compartir tarea directa 6004');

  const dashboard = await request('/api/dashboard', { cookieJar: recipientCookies });
  expectStatus(dashboard, 200, 'dashboard con compartidos');
  const body = JSON.parse(dashboard.body);
  if (!body.meta.sharedItemsIncluded) throw new Error('sharedItemsIncluded debe ser true con la proyección own + shared');
  const tareas = body.data.tareas;
  const proyectos = body.data.proyectos;
  const idsTareas = tareas.map((tarea) => tarea.id);
  const idsProyectos = proyectos.map((proyecto) => proyecto.id);
  if (!idsTareas.includes(6001)) throw new Error('falta tarea del proyecto compartido 6001');
  if (!idsTareas.includes(6003)) throw new Error('falta tarea del proyecto compartido 6003');
  if (!idsTareas.includes(6002)) throw new Error('falta tarea asignada directa 6002');
  if (idsTareas.includes(6004)) throw new Error('tarea compartida directa no debe entrar al dashboard');
  if (idsTareas.includes(6005)) throw new Error('tarea asignada a otro no debe entrar al dashboard');
  if (new Set(idsTareas).size !== idsTareas.length) throw new Error('tareas duplicadas en la proyección');
  const shared6001 = tareas.find((tarea) => tarea.id === 6001);
  if (!shared6001.esCompartido || shared6001.propietarioId !== ownerId || shared6001.miRol !== 'colaborador') {
    throw new Error('metadata de tarea compartida incompleta');
  }
  const shared6002 = tareas.find((tarea) => tarea.id === 6002);
  if (!shared6002.esCompartido || shared6002.miRol !== 'colaborador') {
    throw new Error('tarea asignada sin metadata de compartido');
  }
  const proj5001 = proyectos.find((proyecto) => proyecto.id === 5001);
  if (!proj5001 || !proj5001.esCompartido || proj5001.propietarioId !== ownerId) {
    throw new Error('proyecto compartido ausente o sin metadata');
  }
  report.checks.sharedProjection = {
    project: project.status,
    taskInProjectAssigned: taskInProjectAssigned.status,
    taskInProject: taskInProject.status,
    assignedDirect: assignedDirect.status,
    assignedOther: assignedOther.status,
    sharedDirect: sharedDirect.status,
    shareProject: shareProject.status,
    shareDirectTask: shareDirectTask.status,
    sharedItemsIncluded: body.meta.sharedItemsIncluded,
    tareas: idsTareas.sort((left, right) => left - right),
    proyectos: idsProyectos.sort((left, right) => left - right),
    tarea6001: { esCompartido: shared6001.esCompartido, propietarioId: shared6001.propietarioId, miRol: shared6001.miRol },
    tarea6002: { esCompartido: shared6002.esCompartido, miRol: shared6002.miRol },
    proyecto5001: { esCompartido: proj5001.esCompartido, propietarioId: proj5001.propietarioId },
  };
}

async function checkIdentityContracts() {
  const oversizedEmail = `${'a'.repeat(244)}@example.com`;
  const oversizedRegister = await request('/api/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: oversizedEmail, password: 'preflight-password-123' }),
  });
  expectStatus(oversizedRegister, 422, 'registro con email sobredimensionado');
  const oversizedInvite = await request('/api/teams/requests', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': cookies.get('csrf_token') },
    body: JSON.stringify({ email: oversizedEmail }),
  });
  expectStatus(oversizedInvite, 422, 'invitación con email sobredimensionado');

  const duplicateCookies = new Map();
  const duplicateEmail = `preflight-casefold-${randomUUID()}@example.test`;
  const first = await registerTemporaryUser(duplicateCookies, 'casefold', duplicateEmail.toUpperCase());
  cleanupUserIds.add(first);
  const duplicate = await request('/api/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: duplicateEmail, password: 'preflight-password-123' }),
  });
  expectStatus(duplicate, 409, 'registro duplicado casefold');

  const reciprocal = await request('/api/teams/requests', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': cookies.get('csrf_token') },
    body: JSON.stringify({ email: duplicateEmail }),
  });
  expectStatus(reciprocal, 201, 'solicitud casefold auxiliar');
  const reciprocalResponse = await request('/api/teams/requests', {
    method: 'POST',
    cookieJar: duplicateCookies,
    headers: { 'content-type': 'application/json', 'x-csrf-token': duplicateCookies.get('csrf_token') },
    body: JSON.stringify({ email: runPsql(`SELECT email FROM users WHERE id = '${sql(userId)}'::uuid`).trim() }),
  });
  expectStatus(reciprocalResponse, 409, 'solicitud recíproca');
  report.checks.identityContracts = {
    oversizedRegister: oversizedRegister.status,
    oversizedInvite: oversizedInvite.status,
    duplicateCasefold: duplicate.status,
    reciprocalRequest: reciprocalResponse.status,
  };
}

async function checkCorsAndCookies() {
  const response = await request('/api/health', {
    method: 'OPTIONS',
    headers: {
      origin: 'http://127.0.0.1:55440',
      'access-control-request-method': 'GET',
    },
  });
  const allowOrigin = response.headers.get('access-control-allow-origin');
  report.checks.cors = { status: response.status, allowOrigin };
  if (allowOrigin !== 'http://127.0.0.1:55440') throw new Error(`CORS inesperado: ${allowOrigin || 'ausente'}`);
}

async function checkExpiredSessionCleanup(id) {
  const token = `expired-${randomUUID()}`;
  const csrf = `csrf-${randomUUID()}`;
  const hash = (value) => createHash('sha256').update(value).digest('hex');
  runPsql(`
    INSERT INTO auth_sessions (id, user_id, token_hash, csrf_hash, expires_at)
    VALUES ('${randomUUID()}'::uuid, '${sql(id)}'::uuid, '${hash(token)}', '${hash(csrf)}', NOW() - INTERVAL '1 minute');
  `);
  const response = await request('/api/auth/me', { cookie: `session_id=${token}` });
  const remaining = runPsql(`SELECT COUNT(*) FROM auth_sessions WHERE token_hash = '${hash(token)}';`).trim();
  report.checks.expiredSession = { status: response.status, remaining };
  if (response.status !== 401 || remaining !== '0') throw new Error('sesión expirada no fue revocada al validarse');
}

async function checkRateLimit() {
  const statuses = [];
  for (let index = 0; index < 12; index += 1) {
    const response = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: `wrong-${randomUUID()}@example.test`, password: 'wrong-password' }),
      cookie: '',
    });
    statuses.push(response.status);
  }
  report.checks.rateLimit = statuses;
  if (!statuses.includes(429)) throw new Error('rate limit no produjo 429 en single-replica');
}

async function collectExplain(id) {
  const queries = {
    dashboardTasks: `SELECT * FROM dashboard_tasks WHERE user_id = '${sql(id)}'::uuid AND deleted_at IS NULL ORDER BY sort_order, legacy_id LIMIT 501`,
    dashboardProjects: `SELECT * FROM dashboard_projects WHERE user_id = '${sql(id)}'::uuid AND deleted_at IS NULL ORDER BY sort_order, legacy_id LIMIT 501`,
    dashboardHabits: `SELECT * FROM dashboard_habits WHERE user_id = '${sql(id)}'::uuid AND deleted_at IS NULL ORDER BY sort_order, legacy_id LIMIT 501`,
    activity: `SELECT date, type, COUNT(*) FROM activity_events WHERE user_id = '${sql(id)}'::uuid AND date BETWEEN CURRENT_DATE - INTERVAL '364 days' AND CURRENT_DATE GROUP BY date, type ORDER BY date, type`,
    notesSearch: `SELECT * FROM notes WHERE user_id = '${sql(id)}'::uuid AND (title ILIKE '%searchable%' OR content ILIKE '%searchable%') ORDER BY created_at DESC LIMIT 100`,
  };
  for (const [name, query] of Object.entries(queries)) {
    const raw = runPsql(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query};`).trim();
    report.explain[name] = JSON.parse(raw);
  }
}

async function checkRequestTimeout(id) {
  /* El 408 requiere que el lock esté tomado antes del request y que el backend corra
   * con REQUEST_TIMEOUT_SECONDS menor que la duración del lock (por ejemplo 3 < 6).
   * Un sleep fijo no basta: psql puede tardar más en adquirir el lock (Windows/SCRAM),
   * por eso se espera de forma determinista a que el lock aparezca en pg_locks. */
  const lockSql = `BEGIN; LOCK TABLE dashboard_tasks IN ACCESS EXCLUSIVE MODE; SELECT pg_sleep(6); COMMIT;`;
  const child = spawn(psql, psqlArgs(lockSql), { env: database.env, stdio: 'ignore', windowsHide: true });
  if (!(await waitForTableLock('dashboard_tasks', 5000))) {
    child.kill();
    throw new Error('el fixture de timeout no pudo adquirir el lock de dashboard_tasks a tiempo');
  }
  const response = await request('/api/dashboard', { timeoutMs: 10_000 });
  await new Promise((resolve) => child.once('exit', resolve));
  report.checks.requestTimeout = response.status;
  if (response.status !== 408) throw new Error(`request timeout esperaba 408 y recibió ${response.status}`);
  void id;
}

async function waitForTableLock(table, maxMs) {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    const row = runPsql(
      `SELECT COUNT(*) FROM pg_locks l JOIN pg_class c ON c.oid = l.relation
       WHERE c.relname = '${sql(table)}' AND l.mode = 'AccessExclusiveLock'`,
    ).trim();
    if (row === '1') return true;
    await sleep(100);
  }
  return false;
}

async function runLoad() {
  const samples = [];
  const deadline = Date.now() + args.durationSeconds * 1000;
  const intervalMs = (1000 * args.users) / args.rps;
  async function worker() {
    while (Date.now() < deadline) {
      const started = performance.now();
      const response = await request('/api/dashboard', { timeoutMs: 10_000 });
      samples.push({ status: response.status, ms: Number((performance.now() - started).toFixed(2)) });
      await sleep(Math.max(0, intervalMs - (performance.now() - started)));
    }
  }
  await Promise.all(Array.from({ length: args.users }, () => worker()));
  const latencies = samples.map((sample) => sample.ms).sort((left, right) => left - right);
  const percentile = (fraction) => latencies.length === 0 ? 0 : latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * fraction))];
  return {
    samples: samples.length,
    errors: samples.filter((sample) => sample.status !== 200).length,
    p50Ms: percentile(0.5),
    p95Ms: percentile(0.95),
    statuses: Object.fromEntries([...new Set(samples.map((sample) => sample.status))].map((status) => [status, samples.filter((sample) => sample.status === status).length])),
  };
}

function request(path, options = {}) {
  const { cookieJar = cookies, ...fetchOptions } = options;
  const headers = new Headers(fetchOptions.headers || {});
  if (fetchOptions.cookie !== undefined) headers.set('cookie', fetchOptions.cookie);
  else if (cookieJar.size > 0) headers.set('cookie', [...cookieJar].map(([name, value]) => `${name}=${value}`).join('; '));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), fetchOptions.timeoutMs || 10_000);
  return fetch(`${baseUrl}${path}`, { ...fetchOptions, headers, signal: controller.signal })
    .then(async (response) => {
      const setCookie = response.headers.get('set-cookie') || '';
      for (const match of setCookie.matchAll(/(?:^|,\s*)(session_id|csrf_token)=([^;,]+)/g)) cookieJar.set(match[1], match[2]);
      return { status: response.status, body: await response.text(), headers: response.headers, setCookie };
    })
    .finally(() => clearTimeout(timeout));
}

function runPsql(query) {
  const result = spawnSync(psql, psqlArgs(query), { encoding: 'utf8', env: database.env, maxBuffer: 20 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`psql falló: ${result.stderr.trim()}`);
  return result.stdout;
}

function psqlArgs(query) {
  return ['-h', database.host, '-p', String(database.port), '-U', database.user, '-d', database.name, '-v', 'ON_ERROR_STOP=1', '-t', '-A', '-c', query];
}

function parseDatabaseUrl(value) {
  if (!value) throw new Error('PREFLIGHT_DATABASE_URL es obligatorio y debe apuntar a una base temporal');
  const url = new URL(value);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('PREFLIGHT_DATABASE_URL no es PostgreSQL');
  return {
    host: url.hostname,
    port: url.port || '5432',
    user: decodeURIComponent(url.username),
    name: decodeURIComponent(url.pathname.slice(1)),
    env: { ...process.env, PGPASSWORD: decodeURIComponent(url.password) },
  };
}

function parseArgs(values) {
  const result = { baseUrl: 'http://127.0.0.1:3000', users: 20, rps: 10, durationSeconds: 300, report: undefined, allowNonLoopback: false };
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    const next = values[index + 1];
    if (value === '--base-url') result.baseUrl = next;
    else if (value === '--users') result.users = Number(next);
    else if (value === '--rps') result.rps = Number(next);
    else if (value === '--duration-seconds') result.durationSeconds = Number(next);
    else if (value === '--report') result.report = next;
    else if (value === '--allow-non-loopback') result.allowNonLoopback = true;
    else throw new Error(`argumento desconocido: ${value}`);
    if (value !== '--allow-non-loopback') index += 1;
  }
  if (!Number.isInteger(result.users) || result.users < 1 || !Number.isFinite(result.rps) || result.rps <= 0 || !Number.isInteger(result.durationSeconds) || result.durationSeconds < 1) throw new Error('users, rps y duration-seconds deben ser positivos');
  return result;
}

function validateExposureTargets(target, databaseConfig, options) {
  let targetUrl;
  try {
    targetUrl = new URL(target);
  } catch {
    throw new Error('--base-url debe ser una URL absoluta');
  }
  const targetLoopback = isLoopback(targetUrl.hostname);
  const databaseLoopback = isLoopback(databaseConfig.host);
  const explicitNonLoopback = options.allowNonLoopback
    && process.env.PREFLIGHT_ALLOW_NON_LOOPBACK === 'I_UNDERSTAND_NON_LOOPBACK_PREFLIGHT'
    && process.env.PREFLIGHT_CONFIRM_BASE_URL === target
    && process.env.PREFLIGHT_CONFIRM_DATABASE_URL === process.env.PREFLIGHT_DATABASE_URL;
  if ((targetLoopback && databaseLoopback) || explicitNonLoopback) return;
  throw new Error('preflight bloqueado: base y URL deben ser loopback; para un destino no local exige --allow-non-loopback, PREFLIGHT_ALLOW_NON_LOOPBACK=I_UNDERSTAND_NON_LOOPBACK_PREFLIGHT, PREFLIGHT_CONFIRM_BASE_URL y PREFLIGHT_CONFIRM_DATABASE_URL coincidentes');
}

function isLoopback(hostname) {
  const normalized = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1';
}

function expectStatus(response, expected, label) {
  if (response.status !== expected) throw new Error(`${label} esperaba ${expected} y recibió ${response.status}`);
}

function sql(value) {
  return String(value).replaceAll("'", "''");
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
