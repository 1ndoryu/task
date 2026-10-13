/* Contratos de equipos: solicitudes, conexiones, notificaciones, timeline y paginación. La segunda mitad vive en compartidos.mjs para respetar el límite de 300 líneas. */

import { randomUUID } from 'node:crypto';
import { request, runPsql, expectStatus, sql } from './transporte.mjs';
import { registerTemporaryUser } from './contratos.mjs';
import { checkTeamContractsCierre } from './compartidos.mjs';
import { estado } from './estado.mjs';

export async function checkTeamContracts() {
  const secondaryCookies = new Map();
  const secondaryId = await registerTemporaryUser(secondaryCookies, 'secondary');
  estado.cleanupUserIds.add(secondaryId);
  const secondary = await request('/api/teams', { cookieJar: secondaryCookies });
  expectStatus(secondary, 200, 'equipo secundario vacío');

  const secondaryEmail = runPsql(`SELECT email FROM users WHERE id = '${sql(secondaryId)}'::uuid`).trim();
  const invitation = await request('/api/teams/requests', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': estado.cookies.get('csrf_token') },
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
  const acceptedNotifications = await request('/api/notifications?page=1&perPage=20', { cookieJar: estado.cookies });
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
      headers: { 'content-type': 'application/json', 'x-csrf-token': estado.cookies.get('csrf_token') },
      body: JSON.stringify({ ...shareRequest, userId: secondaryId }),
    });
    expectStatus(response, 201, `compartir ${shareRequest.itemType}`);
    shares.push(JSON.parse(response.body));
  }
  const duplicateShare = await request('/api/shared', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': estado.cookies.get('csrf_token') },
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
    headers: { 'x-csrf-token': estado.cookies.get('csrf_token') },
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
    headers: { 'content-type': 'application/json', 'x-csrf-token': estado.cookies.get('csrf_token') },
    body: JSON.stringify({ itemType: 'tarea', itemId: 1, content: 'Mensaje de timeline del propietario' }),
  });
  expectStatus(timelineMessage, 201, 'crear mensaje de timeline');
  const timelineUnread = await request('/api/timeline/unread/tarea/1', { cookieJar: secondaryCookies });
  expectStatus(timelineUnread, 200, 'contar timeline no leído');
  if (JSON.parse(timelineUnread.body).unread !== 1) throw new Error('el mensaje de timeline no incrementó el contador no leído');
  const timelineEvent = await request('/api/timeline/events', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': estado.cookies.get('csrf_token') },
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
  const timelineCount = await request('/api/timeline/count/tarea/1', { cookieJar: estado.cookies });
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
  const participants = await request(`/api/shared/participants/tarea/1/${estado.userId}`, { cookieJar: secondaryCookies });
  expectStatus(participants, 200, 'listar participantes');
  if (JSON.parse(participants.body).participants.length !== 2) throw new Error('los participantes no incluyen propietario y destinatario');
  const accessCollaborator = await request(`/api/shared/access/tarea/1/${estado.userId}`, { cookieJar: secondaryCookies });
  expectStatus(accessCollaborator, 200, 'consultar acceso colaborador');
  if (!JSON.parse(accessCollaborator.body).hasAccess || !JSON.parse(accessCollaborator.body).access.canEdit) throw new Error('el rol colaborador no habilitó edición');
  const accessObserver = await request(`/api/shared/access/proyecto/1/${estado.userId}`, { cookieJar: secondaryCookies });
  expectStatus(accessObserver, 200, 'consultar acceso observador');
  if (JSON.parse(accessObserver.body).access.canEdit) throw new Error('el rol observador habilitó edición');
  const changedRole = await request(`/api/shared/${shares[0].id}/role`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', 'x-csrf-token': estado.cookies.get('csrf_token') },
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
    headers: { 'content-type': 'application/json', 'x-csrf-token': estado.cookies.get('csrf_token') },
    body: JSON.stringify({ role: 'colaborador' }),
  });
  expectStatus(missingRole, 404, 'cambiar rol de compartido inexistente');
  const missingEntityShare = await request('/api/shared', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': estado.cookies.get('csrf_token') },
    body: JSON.stringify({ itemType: 'tarea', itemId: 999999, userId: secondaryId, role: 'colaborador' }),
  });
  expectStatus(missingEntityShare, 404, 'compartir entidad inexistente');
  const outsiderCookies = new Map();
  const outsiderId = await registerTemporaryUser(outsiderCookies, 'shared-outsider');
  estado.cleanupUserIds.add(outsiderId);
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
    headers: { 'content-type': 'application/json', 'x-csrf-token': estado.cookies.get('csrf_token') },
    body: JSON.stringify({ itemType: 'tarea', itemId: 1001, content: 'no debe cruzar propietarios' }),
  });
  expectStatus(outsiderTimeline, 404, 'aislar timeline entre propietarios');
  const outsiderEvent = await request('/api/timeline/events', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': estado.cookies.get('csrf_token') },
    body: JSON.stringify({ itemType: 'tarea', itemId: 1001, action: 'editado' }),
  });
  expectStatus(outsiderEvent, 200, 'omitir evento de timeline sin acceso');
  if (JSON.parse(outsiderEvent.body).created) throw new Error('el evento sin acceso de timeline se creó');
  await checkTeamContractsCierre({
    secondaryCookies, secondary, invitation, invitationId, received, accepted, acceptedNotifications,
    connected, shares, duplicateShare, receivedShared, filteredShared, ownedShared,
    secondaryNotifications, secondaryUnread, markNotification, markAllNotifications, afterAllUnread,
    forbiddenNotificationDelete, removedNotification, removedNotificationAgain, timelineMessage,
    timelineUnread, timelineEvent, timelinePage, timelineUnreadAfterList, secondaryTimelineMessage,
    timelineCount, timelineOverflowMessages, timelineLastPage, participants, accessCollaborator,
    accessObserver, changedRole, forbiddenRole, missingRole, missingEntityShare, outsiderShare,
    outsiderTimeline, outsiderEvent
  });
}
