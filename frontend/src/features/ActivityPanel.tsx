import { useActivity } from './useActivity';

function detailTitle(item: { elementoNombre?: string | null; proyectoNombre?: string | null; tipo: string }) {
  return item.elementoNombre || item.proyectoNombre || item.tipo.replace(/_/g, ' ');
}

export function ActivityPanel() {
  const { heatmap, stats, details, selectedDate, loading, loadingDetails, loadingMoreDetails, detailsHasMore, mutatingId, error, load, loadDay, loadMoreDay, remove } = useActivity();
  const days = Object.entries(heatmap).sort(([left], [right]) => right.localeCompare(left));

  return (
    <section className="panel-form activity-panel" aria-labelledby="activity-title">
      <div className="panel-heading">
        <div>
          <h2 id="activity-title">Actividad</h2>
          <p className="panel-caption">Tus últimos 30 días, servidos por Rust.</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading}>{loading ? 'Cargando…' : 'Actualizar'}</button>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {stats && (
        <div className="dashboard-summary" aria-label="Resumen de actividad">
          <span>{stats.diasActivos} días activos</span>
          <span>Racha: {stats.racha}</span>
          <span>{Object.values(stats.totales).reduce((total, value) => total + value, 0)} eventos</span>
        </div>
      )}
      {loading && !days.length && <p className="status-message" role="status">Cargando actividad…</p>}
      {!loading && !days.length && <p className="empty-message">Todavía no hay actividad.</p>}
      {!!days.length && (
        <div className="activity-days" aria-label="Días con actividad">
          {days.map(([date, item]) => (
            <button type="button" className={selectedDate === date ? 'activity-day activity-day-selected' : 'activity-day'} key={date} onClick={() => void loadDay(date)}>
              <span>{date}</span><strong>{item.total}</strong>
            </button>
          ))}
        </div>
      )}
      {selectedDate && (
        <div className="activity-detail" aria-live="polite">
          <h3>Detalle del {selectedDate}</h3>
          {loadingDetails && <p className="status-message">Cargando detalle…</p>}
          {!loadingDetails && !details.length && <p className="empty-message">Sin eventos para este día.</p>}
          {!loadingDetails && !!details.length && (
            <ul className="activity-detail-list">
              {details.map((item) => (
                <li key={item.id}>
                  <span><strong>{detailTitle(item)}</strong><small>{item.hora || 'Sin hora'} · {item.tipo.replace(/_/g, ' ')}</small></span>
                  <button type="button" className="activity-delete" onClick={() => void remove(item.id)} disabled={mutatingId === item.id} aria-label={`Eliminar actividad ${item.id}`}>×</button>
                </li>
              ))}
            </ul>
          )}
          {detailsHasMore && <button type="button" onClick={() => void loadMoreDay()} disabled={loadingMoreDetails}>{loadingMoreDetails ? 'Cargando…' : 'Cargar más actividad'}</button>}
        </div>
      )}
    </section>
  );
}
