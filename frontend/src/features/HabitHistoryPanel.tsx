import { useEffect, useState } from 'react';
import { localDate } from './useActivity';
import { useHabitHistory } from './useHabitHistory';

type HabitItem = { id: number } & Record<string, unknown>;

function habitName(habit: HabitItem) {
  for (const key of ['nombre', 'texto', 'name', 'title']) {
    const value = habit[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return `Hábito #${habit.id}`;
}

export function HabitHistoryPanel({ habits }: { habits: HabitItem[] }) {
  const [selectedId, setSelectedId] = useState<number>();
  const selectedHabit = habits.find((habit) => habit.id === selectedId) ?? habits[0];
  const activeId = selectedHabit?.id;
  const { data, loading, mutating, error, load, mark, remove } = useHabitHistory(activeId);

  useEffect(() => {
    if (activeId && selectedId !== activeId) setSelectedId(activeId);
  }, [activeId, selectedId]);

  if (!habits.length) return null;

  const today = localDate();
  const todayEntry = data?.history.find((entry) => entry.date === today);

  return (
    <section className="habit-history-panel" aria-labelledby="habit-history-title">
      <div className="panel-heading">
        <div>
          <h3 id="habit-history-title">Historial de hábitos</h3>
          <p className="panel-caption">Seguimiento propio desde Rust.</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading || mutating}>Actualizar</button>
      </div>
      <label className="habit-picker">Hábito
        <select aria-label="Hábito para consultar" value={activeId ?? ''} onChange={(event) => setSelectedId(Number(event.target.value))}>
          {habits.map((habit) => <option key={habit.id} value={habit.id}>{habitName(habit)}</option>)}
        </select>
      </label>
      {loading && <p className="status-message" role="status">Cargando historial…</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {!loading && data && (
        <>
          <div className="dashboard-summary" aria-label="Resumen del hábito">
            <span>{data.stats.completionRate}% completado</span>
            <span>{data.stats.total} registros</span>
            <span>{data.stats.completed} completados</span>
          </div>
          <div className="habit-history-days" aria-label="Últimos siete días">
            {data.summary7Days.map((day) => (
              <span className={`habit-day habit-day-${day.status ?? 'sin-registro'}`} key={day.date} title={day.status ?? 'Sin registro'}>
                <strong>{day.date.slice(5)}</strong>
                <small>{day.status ? day.status.slice(0, 4) : '—'}</small>
              </span>
            ))}
          </div>
          <div className="habit-history-actions">
            <button type="button" onClick={() => void mark(today, 'completado')} disabled={mutating || todayEntry?.status === 'completado'}>Marcar hoy</button>
            <button type="button" onClick={() => void mark(today, 'pospuesto')} disabled={mutating || todayEntry?.status === 'pospuesto'}>Posponer hoy</button>
            <button type="button" onClick={() => void mark(today, 'omitido')} disabled={mutating || todayEntry?.status === 'omitido'}>Omitir hoy</button>
            <button type="button" onClick={() => void remove(today)} disabled={mutating || !todayEntry}>Eliminar registro de hoy</button>
          </div>
          {data.history.length === 0 ? <p className="empty-message">Todavía no hay registros.</p> : (
            <ul className="habit-history-list">
              {data.history.slice(0, 30).map((entry) => (
                <li key={entry.date}>
                  <span><strong>{entry.date}</strong> · {entry.status}{entry.notes ? ` · ${entry.notes}` : ''}</span>
                  <button type="button" onClick={() => void remove(entry.date)} disabled={mutating}>Eliminar</button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
