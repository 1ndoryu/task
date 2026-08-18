import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useCreate,
  useOwned,
  useReceived,
  useRemove,
  useUpdateRole,
} from '../api/generated/shared/shared';
import { useGetTeam } from '../api/generated/teams/teams';
import type { TeamMember } from '../api/generated/gloryRSAPI.schemas';

const PAGE_SIZE = 50;
const TEAM_RECIPIENT_LIMIT = 100;

export function SharedPanel() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [recipientPage, setRecipientPage] = useState(1);
  const [recipientOptions, setRecipientOptions] = useState<TeamMember[]>([]);
  const received = useReceived({ page, perPage: PAGE_SIZE });
  const owned = useOwned({ page, perPage: PAGE_SIZE });
  const team = useGetTeam({ page: recipientPage, perPage: TEAM_RECIPIENT_LIMIT });
  const create = useCreate();
  const updateRole = useUpdateRole();
  const remove = useRemove();
  const [itemType, setItemType] = useState<'tarea' | 'proyecto' | 'habito'>('tarea');
  const [itemId, setItemId] = useState('');
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState<'colaborador' | 'observador'>('colaborador');
  const [message, setMessage] = useState<string>();

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['/api/shared'] });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(undefined);
    try {
      const response = await create.mutateAsync({ data: { itemType, itemId: Number(itemId), userId, role } });
      if (response.status !== 201) throw new Error('No se pudo compartir');
      setItemId('');
      setUserId('');
      setMessage('Elemento compartido.');
      await refresh();
    } catch {
      setMessage('No se pudo compartir: comprueba el elemento, el UUID y que sean compañeros aceptados.');
    }
  }

  async function changeRole(id: string, nextRole: 'colaborador' | 'observador') {
    setMessage(undefined);
    try {
      const response = await updateRole.mutateAsync({ id, data: { role: nextRole } });
      if (response.status !== 200) throw new Error('No se pudo cambiar el rol');
      await refresh();
    } catch {
      setMessage('Solo el propietario puede cambiar el rol.');
    }
  }

  async function removeShare(id: string) {
    setMessage(undefined);
    try {
      const response = await remove.mutateAsync({ id });
      if (response.status !== 204) throw new Error('No se pudo revocar');
      await refresh();
    } catch {
      setMessage('No se pudo retirar el compartido.');
    }
  }

  const receivedData = received.data?.status === 200 ? received.data.data : undefined;
  const ownedData = owned.data?.status === 200 ? owned.data.data : undefined;
  const teamData = team.data?.status === 200 ? team.data.data : undefined;

  useEffect(() => {
    if (!teamData) return;
    setRecipientOptions((current) => recipientPage === 1 ? teamData.members : [...current, ...teamData.members]);
  }, [recipientPage, teamData]);

  return (
    <section className="shared-panel" aria-labelledby="shared-title">
      <div className="panel-heading">
        <div><p className="eyebrow">PERMISOS</p><h2 id="shared-title">Compartidos</h2></div>
        <span>{receivedData?.total ?? 0} recibidos</span>
      </div>
      <form className="shared-request-form" onSubmit={submit}>
        <label>Tipo<select value={itemType} onChange={(event) => setItemType(event.target.value as typeof itemType)}><option value="tarea">Tarea</option><option value="proyecto">Proyecto</option><option value="habito">Hábito</option></select></label>
        <label>ID legacy<input required min="1" type="number" value={itemId} onChange={(event) => setItemId(event.target.value)} /></label>
        <label>Compañero<select required value={userId} onChange={(event) => setUserId(event.target.value)} disabled={!recipientOptions.length || team.isFetching}><option value="">Selecciona un compañero</option>{recipientOptions.map((member) => <option key={member.connectionId} value={member.user.id}>{member.user.displayName || member.user.email}</option>)}</select></label>
        <label>Rol<select value={role} onChange={(event) => setRole(event.target.value as typeof role)}><option value="colaborador">Colaborador</option><option value="observador">Observador</option></select></label>
        <button type="submit" disabled={create.isPending}>{create.isPending ? 'Compartiendo…' : 'Compartir'}</button>
      </form>
      {message && <p className="status-message" role="status">{message}</p>}
      {(received.isLoading || owned.isLoading) && <p className="status-message" role="status">Cargando permisos…</p>}
      {(received.isError || owned.isError) && <p className="form-error" role="alert">No se pudieron cargar los compartidos.</p>}
      {team.isError && <p className="form-error" role="alert">No se pudo cargar la lista de compañeros.</p>}
      {teamData && !recipientOptions.length && <p className="empty-message">Acepta una conexión de equipo para poder compartir elementos.</p>}
      {teamData?.hasMore && <button type="button" className="text-button" onClick={() => setRecipientPage((current) => current + 1)} disabled={team.isFetching}>Cargar más compañeros</button>}
      {(receivedData || ownedData) && <div className="shared-groups">
        <div><h3>Recibidos ({receivedData?.total ?? 0})</h3>{receivedData?.items.length ? receivedData.items.map((item) => <div className="shared-row" key={item.id}><span><strong>{item.itemType} #{item.itemId}</strong><small>De {item.owner.displayName || item.owner.email} · {item.role}</small></span><button type="button" className="text-button" onClick={() => void removeShare(item.id)} disabled={remove.isPending}>Abandonar</button></div>) : <p className="empty-message">No tienes elementos compartidos.</p>}</div>
        <div><h3>Propios compartidos ({ownedData?.total ?? 0})</h3>{ownedData?.items.length ? ownedData.items.map((item) => <div className="shared-row" key={item.id}><span><strong>{item.itemType} #{item.itemId}</strong><small>Con {item.recipient.displayName || item.recipient.email}</small></span><span className="shared-row-actions"><select aria-label={`Rol de ${item.recipient.email}`} value={item.role} onChange={(event) => void changeRole(item.id, event.target.value as typeof role)} disabled={updateRole.isPending}><option value="colaborador">Colaborador</option><option value="observador">Observador</option></select><button type="button" className="text-button" onClick={() => void removeShare(item.id)} disabled={remove.isPending}>Revocar</button></span></div>) : <p className="empty-message">Aún no compartes elementos.</p>}</div>
        <div className="shared-pagination" aria-label="Paginación de compartidos"><button type="button" className="text-button" disabled={page === 1 || received.isFetching || owned.isFetching} onClick={() => setPage((current) => current - 1)}>Anterior</button><span>Página {page}</span><button type="button" className="text-button" disabled={(!(receivedData?.hasMore || ownedData?.hasMore)) || received.isFetching || owned.isFetching} onClick={() => setPage((current) => current + 1)}>Siguiente</button></div>
      </div>}
    </section>
  );
}
