import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetTeam,
  useRemoveConnection,
  useRespondRequest,
  useSendRequest,
} from '../api/generated/teams/teams';

function statusLabel(status: string) {
  return status === 'pending_registration' ? 'Pendiente de registro' : 'Pendiente';
}

export function TeamsPanel() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const team = useGetTeam({ page, perPage: 50 });
  const send = useSendRequest();
  const respond = useRespondRequest();
  const remove = useRemoveConnection();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string>();

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(undefined);
    try {
      const response = await send.mutateAsync({ data: { email } });
      if (response.status !== 201) throw new Error('No se pudo enviar la solicitud');
      setEmail('');
      setMessage('Solicitud enviada.');
      await refresh();
    } catch {
      setMessage('No se pudo enviar la solicitud; revisa el correo o si ya existe una conexión.');
    }
  }

  async function answer(id: string, action: 'accept' | 'reject') {
    setMessage(undefined);
    try {
      const response = await respond.mutateAsync({ id, data: { action } });
      if (response.status !== 200) throw new Error('No se pudo responder');
      await refresh();
    } catch {
      setMessage('La solicitud cambió o ya fue respondida.');
      await refresh();
    }
  }

  async function removeConnection(id: string) {
    setMessage(undefined);
    try {
      const response = await remove.mutateAsync({ id });
      if (response.status !== 204) throw new Error('No se pudo eliminar');
      await refresh();
    } catch {
      setMessage('No se pudo eliminar la conexión.');
    }
  }

  const data = team.data?.status === 200 ? team.data.data : undefined;
  return (
    <section className="teams-panel" aria-labelledby="teams-title">
      <div className="panel-heading"><div><p className="eyebrow">COLABORACIÓN</p><h2 id="teams-title">Equipo</h2></div><span>{data?.counts.members ?? 0} compañeros</span></div>
      <form className="teams-request-form" onSubmit={submit}>
        <label>Invitar por correo<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="persona@ejemplo.com" /></label>
        <button type="submit" disabled={send.isPending}>{send.isPending ? 'Enviando…' : 'Enviar solicitud'}</button>
      </form>
      {message && <p className="status-message" role="status">{message}</p>}
      {team.isLoading && <p className="status-message" role="status">Cargando equipo…</p>}
      {team.isError && <p className="form-error" role="alert">No se pudo cargar el equipo.</p>}
      {data && <div className="teams-groups">
        <div><h3>Solicitudes recibidas ({data.counts.received})</h3>{data.received.length ? data.received.map((request) => <div className="team-row" key={request.id}><span>{request.user?.displayName ?? request.email}</span><span className="team-row-actions"><button type="button" onClick={() => void answer(request.id, 'accept')} disabled={respond.isPending}>Aceptar</button><button type="button" className="text-button" onClick={() => void answer(request.id, 'reject')} disabled={respond.isPending}>Rechazar</button></span></div>) : <p className="empty-message">No hay solicitudes recibidas.</p>}</div>
        <div><h3>Solicitudes enviadas ({data.counts.sent})</h3>{data.sent.length ? data.sent.map((request) => <div className="team-row" key={request.id}><span>{request.user?.displayName ?? request.email}<small>{statusLabel(request.status)}</small></span><button type="button" className="text-button" onClick={() => void removeConnection(request.id)} disabled={remove.isPending}>Cancelar</button></div>) : <p className="empty-message">No hay solicitudes enviadas.</p>}</div>
        <div><h3>Compañeros</h3>{data.members.length ? data.members.map((member) => <div className="team-row" key={member.connectionId}><span>{member.user.displayName}<small>{member.user.email}</small></span><button type="button" className="text-button" onClick={() => void removeConnection(member.connectionId)} disabled={remove.isPending}>Eliminar</button></div>) : <p className="empty-message">Todavía no tienes compañeros.</p>}</div>
        <div className="teams-pagination" aria-label="Paginación del equipo"><button type="button" className="text-button" disabled={page === 1 || team.isFetching} onClick={() => setPage((current) => current - 1)}>Anterior</button><span>Página {data.page}</span><button type="button" className="text-button" disabled={!data.hasMore || team.isFetching} onClick={() => setPage((current) => current + 1)}>Siguiente</button></div>
      </div>}
    </section>
  );
}
