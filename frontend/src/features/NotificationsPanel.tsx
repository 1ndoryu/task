import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListNotifications,
  useMarkAllRead,
  useMarkRead,
  useRemoveNotification,
  useUnreadCount,
} from '../api/generated/notifications/notifications';

const PAGE_SIZE = 20;

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

export function NotificationsPanel() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [message, setMessage] = useState<string>();
  const notifications = useListNotifications({ page, perPage: PAGE_SIZE, unreadOnly });
  const unreadCount = useUnreadCount();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();
  const remove = useRemoveNotification();
  const data = notifications.data?.status === 200 ? notifications.data.data : undefined;
  const count = unreadCount.data?.status === 200 ? unreadCount.data.data.unread : 0;

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] }),
    ]);
  }

  async function read(id: string) {
    setMessage(undefined);
    try {
      const response = await markRead.mutateAsync({ id });
      if (response.status !== 200) throw new Error('No se pudo marcar');
      await refresh();
    } catch {
      setMessage('No se pudo marcar la notificación.');
    }
  }

  async function readAll() {
    setMessage(undefined);
    try {
      const response = await markAllRead.mutateAsync();
      if (response.status !== 200) throw new Error('No se pudo marcar');
      await refresh();
    } catch {
      setMessage('No se pudieron marcar todas las notificaciones.');
    }
  }

  async function removeOne(id: string) {
    setMessage(undefined);
    try {
      const response = await remove.mutateAsync({ id });
      if (response.status !== 204) throw new Error('No se pudo eliminar');
      await refresh();
    } catch {
      setMessage('No se pudo eliminar la notificación.');
    }
  }

  function changeFilter(next: boolean) {
    setUnreadOnly(next);
    setPage(1);
  }

  return (
    <section className="notifications-panel" aria-labelledby="notifications-title">
      <div className="panel-heading">
        <div><p className="eyebrow">BANDEJA</p><h2 id="notifications-title">Notificaciones</h2></div>
        <span aria-label={`${count} notificaciones no leídas`}>{count} no leídas</span>
      </div>
      <div className="notifications-toolbar">
        <label className="notifications-filter"><input type="checkbox" checked={unreadOnly} onChange={(event) => changeFilter(event.target.checked)} /> Solo no leídas</label>
        <button type="button" className="text-button" onClick={() => void readAll()} disabled={!count || markAllRead.isPending}>Marcar todas como leídas</button>
      </div>
      {message && <p className="form-error" role="alert">{message}</p>}
      {(notifications.isLoading || unreadCount.isLoading) && <p className="status-message" role="status">Cargando notificaciones…</p>}
      {(notifications.isError || unreadCount.isError) && <p className="form-error" role="alert">No se pudieron cargar las notificaciones.</p>}
      {!notifications.isLoading && data && !data.items.length && <p className="empty-message">No tienes notificaciones{unreadOnly ? ' no leídas' : ''}.</p>}
      {data && data.items.length > 0 && <ul className="notification-list">
        {data.items.map((notification) => <li className={`notification-row${notification.read ? '' : ' notification-unread'}`} key={notification.id}>
          <div className="notification-copy"><strong>{notification.title}</strong>{notification.content && <p>{notification.content}</p>}<small>{notification.notificationType} · {formatDate(notification.createdAt)}</small></div>
          <div className="notification-actions">
            {!notification.read && <button type="button" className="text-button" onClick={() => void read(notification.id)} disabled={markRead.isPending}>Leer</button>}
            <button type="button" className="text-button notification-delete" onClick={() => void removeOne(notification.id)} disabled={remove.isPending}>Eliminar</button>
          </div>
        </li>)}
      </ul>}
      {data && (data.page > 1 || data.hasMore) && <div className="notifications-pagination" aria-label="Paginación de notificaciones"><button type="button" className="text-button" disabled={data.page === 1 || notifications.isFetching} onClick={() => setPage((current) => current - 1)}>Anterior</button><span>Página {data.page}</span><button type="button" className="text-button" disabled={!data.hasMore || notifications.isFetching} onClick={() => setPage((current) => current + 1)}>Siguiente</button></div>}
    </section>
  );
}
