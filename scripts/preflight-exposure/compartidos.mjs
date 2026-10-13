/* Cierre de contratos de equipo (compartidos, timeline y acceso) y proyección own + shared del dashboard. */

import { randomUUID } from 'node:crypto';
import { request, runPsql, expectStatus, sql } from './transporte.mjs';
import { registerTemporaryUser } from './contratos.mjs';
import { estado } from './estado.mjs';

export async function checkTeamContractsCierre({
  secondaryCookies, secondary, invitation, invitationId, received, accepted, acceptedNotifications,
  connected, shares, duplicateShare, receivedShared, filteredShared, ownedShared,
  secondaryNotifications, secondaryUnread, markNotification, markAllNotifications, afterAllUnread,
  forbiddenNotificationDelete, removedNotification, removedNotificationAgain, timelineMessage,
  timelineUnread, timelineEvent, timelinePage, timelineUnreadAfterList, secondaryTimelineMessage,
  timelineCount, timelineOverflowMessages, timelineLastPage, participants, accessCollaborator,
  accessObserver, changedRole, forbiddenRole, missingRole, missingEntityShare, outsiderShare,
  outsiderTimeline, outsiderEvent
}) {
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
    headers: { 'x-csrf-token': estado.cookies.get('csrf_token') },
  });
  expectStatus(removed, 204, 'eliminar conexión de equipo');

  const pending = await request('/api/teams/requests', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': estado.cookies.get('csrf_token') },
    body: JSON.stringify({ email: `preflight-unregistered-${randomUUID()}@example.test` }),
  });
  expectStatus(pending, 201, 'solicitud de usuario no registrado');
  if (JSON.parse(pending.body).status !== 'pending_registration') throw new Error('la solicitud no registrada no quedó pending_registration');
  runPsql(`
    INSERT INTO users (id, email, password_hash)
    SELECT uuid_generate_v4(), 'preflight-team-page-' || g || '@example.test', 'fixture-only'
    FROM generate_series(1, 101) AS g;
    INSERT INTO team_connections (requester_id, addressee_id, addressee_email, status)
    SELECT '${sql(estado.userId)}'::uuid, id, email, 'accepted'
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
    headers: { 'content-type': 'application/json', 'x-csrf-token': estado.cookies.get('csrf_token') },
    body: JSON.stringify({ itemType: 'tarea', itemId: 1, userId: overflowRecipientId, role: 'observador' }),
  });
  expectStatus(overflowShare, 201, 'compartir con compañero de la página 3');
  const overflowShareId = JSON.parse(overflowShare.body).id;
  const overflowRemoved = await request(`/api/shared/${overflowShareId}`, {
    method: 'DELETE',
    headers: { 'x-csrf-token': estado.cookies.get('csrf_token') },
  });
  expectStatus(overflowRemoved, 204, 'retirar compartido del compañero paginado');
  estado.report.checks.teamContracts = {
    secondaryEmpty: secondary.status,
    invitation: invitation.status,
    received: received.status,
    accepted: accepted.status,
    connected: connected.status,
    removed: removed.status,
    pendingRegistration: pending.status,
    pagination: { firstPage: firstPage.status, secondPage: secondPage.status, thirdPage: thirdPage.status, overflowRecipient: overflowShare.status, overflowRemoved: overflowRemoved.status },
  };
  estado.report.checks.sharedContracts = {
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
export async function checkSharedProjectionContracts() {
  const ownerCookies = new Map();
  const ownerId = await registerTemporaryUser(ownerCookies, 'proj-owner');
  const recipientCookies = new Map();
  const recipientId = await registerTemporaryUser(recipientCookies, 'proj-recipient');
  const otherCookies = new Map();
  const otherId = await registerTemporaryUser(otherCookies, 'proj-other');
  estado.cleanupUserIds.add(ownerId);
  estado.cleanupUserIds.add(recipientId);
  estado.cleanupUserIds.add(otherId);
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
  estado.report.checks.sharedProjection = {
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
