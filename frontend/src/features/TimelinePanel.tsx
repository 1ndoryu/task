import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useListTimeline, useSendTimelineMessage, useUnreadTimeline } from '../api/generated/timeline/timeline';

const LIMIT = 50;

export function TimelinePanel() {
  const queryClient = useQueryClient();
  const [itemType, setItemType] = useState<'tarea' | 'proyecto' | 'habito'>('tarea');
  const [itemId, setItemId] = useState('');
  const [content, setContent] = useState('');
  const [message, setMessage] = useState<string>();
  const [page, setPage] = useState(0);
  const numericItemId = Number(itemId);
  const offset = page * LIMIT;
  const timeline = useListTimeline(itemType, numericItemId, { limit: LIMIT, offset });
  const unread = useUnreadTimeline(itemType, numericItemId);
  const send = useSendTimelineMessage();
  const data = timeline.data?.status === 200 ? timeline.data.data : undefined;
  const unreadData = unread.data?.status === 200 ? unread.data.data : undefined;

  useEffect(() => {
    setPage(0);
  }, [itemType, itemId]);

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: [`/api/timeline/${itemType}/${numericItemId}`] }),
      queryClient.invalidateQueries({ queryKey: [`/api/timeline/unread/${itemType}/${numericItemId}`] }),
    ]);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(undefined);
    try {
      const response = await send.mutateAsync({ data: { itemType, itemId: numericItemId, content } });
      if (response.status !== 201) throw new Error('No se pudo enviar');
      setContent('');
      await refresh();
    } catch {
      setMessage('No se pudo enviar el mensaje. Comprueba el elemento y tus permisos.');
    }
  }

  return (
    <section className="timeline-panel" aria-labelledby="timeline-title">
      <div className="panel-heading"><div><p className="eyebrow">TIMELINE</p><h2 id="timeline-title">Mensajes e historial</h2></div><span>{unreadData?.unread ?? 0} sin leer</span></div>
      <div className="timeline-selector"><label>Tipo<select value={itemType} onChange={(event) => setItemType(event.target.value as typeof itemType)}><option value="tarea">Tarea</option><option value="proyecto">Proyecto</option><option value="habito">Hábito</option></select></label><label>ID legacy<input type="number" min="1" value={itemId} onChange={(event) => setItemId(event.target.value)} placeholder="Ej. 1" /></label></div>
      {itemId && timeline.isLoading && <p className="status-message" role="status">Cargando timeline…</p>}
      {itemId && timeline.isError && <p className="form-error" role="alert">No se pudo cargar el timeline.</p>}
      {itemId && data && !data.items.length && <p className="empty-message">Todavía no hay mensajes ni eventos.</p>}
      {itemId && data && data.items.length > 0 && <ul className="timeline-list">{data.items.map((item) => <li className="timeline-row" key={item.id}><span><strong>{item.userName}</strong><small>{item.messageType === 'sistema' ? item.systemAction : 'mensaje'} · {new Date(item.createdAt).toLocaleString('es')}</small><p>{item.content}</p></span></li>)}</ul>}
      {itemId && data && (page > 0 || data.hasMore) && <nav className="timeline-nav" aria-label="Paginación del timeline">
        <button type="button" className="text-button" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0 || timeline.isFetching}>Anterior</button>
        <span>Página {page + 1} · {data.total} eventos</span>
        <button type="button" className="text-button" onClick={() => setPage((current) => current + 1)} disabled={!data.hasMore || timeline.isFetching}>Siguiente</button>
      </nav>}
      {itemId && <form className="timeline-form" onSubmit={submit}><label>Nuevo mensaje<textarea required maxLength={2000} rows={3} value={content} onChange={(event) => setContent(event.target.value)} /></label><button type="submit" disabled={send.isPending}>{send.isPending ? 'Enviando…' : 'Enviar mensaje'}</button></form>}
      {message && <p className="form-error" role="alert">{message}</p>}
    </section>
  );
}
