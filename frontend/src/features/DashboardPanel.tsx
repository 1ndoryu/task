import { useState } from 'react';
import { useDashboard } from './useDashboard';
import { orderTasksWithHierarchy, type TaskHierarchyRow } from './taskHierarchy';
import { useUpsertTask } from '../api/generated/tasks/tasks';
import { useUpsertProject } from '../api/generated/projects/projects';
import { record as recordActivity } from '../api/generated/activity/activity';
import { localDate } from './useActivity';
import { HabitHistoryPanel } from './HabitHistoryPanel';

type DashboardItem = Record<string, unknown> & { id: number; parentId?: number | null };

function dashboardItems(items: unknown[]): DashboardItem[] {
  return items.filter((item): item is DashboardItem => (
    typeof item === 'object' && item !== null && 'id' in item && typeof item.id === 'number'
  ));
}

function textOf(item: DashboardItem, ...keys: string[]) {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return `Elemento #${item.id}`;
}

function ItemList({ items, emptyLabel, keys, onToggle, pendingId, actionText, onSaveEdit, hierarchy, parentOptions }: {
  items: DashboardItem[];
  emptyLabel: string;
  keys: string[];
  onToggle?: (item: DashboardItem) => void;
  pendingId?: number;
  actionText?: (item: DashboardItem) => string;
  onSaveEdit?: (item: DashboardItem, value: string, parentId?: number | null) => Promise<boolean>;
  hierarchy?: boolean;
  parentOptions?: DashboardItem[];
}) {
  const [editingId, setEditingId] = useState<number>();
  const [draft, setDraft] = useState('');
  const [draftParentId, setDraftParentId] = useState<number | null>(null);

  if (!items.length) return <p className="empty-message">{emptyLabel}</p>;

  function beginEdit(item: DashboardItem) {
    setEditingId(item.id);
    setDraft(textOf(item, ...keys));
    setDraftParentId(typeof item.parentId === 'number' ? item.parentId : null);
  }

  async function saveEdit(item: DashboardItem) {
    if (!onSaveEdit || !draft.trim()) return;
    const saved = await onSaveEdit(item, draft.trim(), draftParentId);
    if (saved) {
      setEditingId(undefined);
      setDraft('');
      setDraftParentId(null);
    }
  }

  const rows: TaskHierarchyRow<DashboardItem>[] = hierarchy
    ? orderTasksWithHierarchy(items)
    : items.map((item) => ({ item, depth: 0, hasChildren: false }));

  return (
    <ul className="dashboard-list">
      {rows.slice(0, 5).map(({ item, depth, hasChildren }) => (
        <li key={item.id} className={hierarchy ? 'dashboard-task-row' : undefined} data-task-depth={depth}>
          {editingId === item.id ? (
            <span className="dashboard-edit-row">
              <input aria-label={`Editar ${textOf(item, ...keys)}`} value={draft} onChange={(event) => setDraft(event.target.value)} autoFocus />
              {parentOptions && <label className="task-parent-editor">Padre
                <select aria-label={`Padre de ${textOf(item, ...keys)}`} aria-describedby={hasChildren ? `task-parent-help-${item.id}` : undefined} title={hasChildren ? 'Una tarea con subtareas debe permanecer como tarea principal' : undefined} disabled={hasChildren} value={draftParentId ?? ''} onChange={(event) => setDraftParentId(event.target.value ? Number(event.target.value) : null)}>
                  <option value="">Sin padre</option>
                  {parentOptions.filter((parent) => parent.id !== item.id).map((parent) => <option key={parent.id} value={parent.id}>{textOf(parent, ...keys)}</option>)}
                </select>
                {hasChildren && <span id={`task-parent-help-${item.id}`} className="task-parent-help">Tiene subtareas; mueve o desvincula primero las hijas.</span>}
              </label>}
              <button type="button" className="dashboard-item-action" onClick={() => void saveEdit(item)} disabled={pendingId === item.id || !draft.trim()}>Guardar</button>
              <button type="button" className="text-button" onClick={() => { setEditingId(undefined); setDraft(''); setDraftParentId(null); }} disabled={pendingId === item.id}>Cancelar</button>
            </span>
          ) : (
            <>
              <span title={hasChildren ? 'Tarea principal con subtareas' : undefined}>{textOf(item, ...keys)}</span>
              {onSaveEdit && <button type="button" className="text-button" onClick={() => beginEdit(item)} disabled={pendingId === item.id}>Editar</button>}
              {onToggle && (
                <button type="button" className="dashboard-item-action" onClick={() => onToggle(item)} disabled={pendingId === item.id}>
                  {pendingId === item.id ? 'Guardando…' : actionText ? actionText(item) : item.completado === true ? 'Reabrir' : 'Completar'}
                </button>
              )}
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

export function DashboardPanel() {
  const { data, loading, error, reload } = useDashboard();
  const taskMutation = useUpsertTask();
  const projectMutation = useUpsertProject();
  const [activityWarning, setActivityWarning] = useState(false);
  const tasks = data ? dashboardItems(data.data.tareas) : [];
  const habits = data ? dashboardItems(data.data.habitos) : [];
  const projects = data ? dashboardItems(data.data.proyectos) : [];
  const taskParentOptions = tasks.filter((task) => task.parentId == null);

  async function toggleTask(item: DashboardItem) {
    setActivityWarning(false);
    try {
      const response = await taskMutation.mutateAsync({
        legacyId: item.id,
        data: {
          texto: textOf(item, 'texto', 'nombre'),
          completado: item.completado !== true,
          prioridad: typeof item.prioridad === 'string' ? item.prioridad : null,
          urgencia: typeof item.urgencia === 'string' ? item.urgencia : 'normal',
          proyectoId: typeof item.proyectoId === 'number' ? item.proyectoId : null,
          parentId: typeof item.parentId === 'number' ? item.parentId : null,
          orden: typeof item.orden === 'number' ? item.orden : 0,
          payload: item,
          expectedUpdatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : null,
        },
      });
      if (response.status === 200) {
        try {
          const activity = await recordActivity({
            tipo: item.completado === true ? 'tarea_desmarcada' : 'tarea_completada',
            elementoId: item.id,
            elementoTipo: 'tarea',
            proyectoId: typeof item.proyectoId === 'number' ? item.proyectoId : null,
            fecha: localDate(),
            detalles: { elementoNombre: textOf(item, 'texto', 'nombre') },
          });
          if (activity.status === 200) {
            window.dispatchEvent(new Event('glory:activity-changed'));
          } else {
            setActivityWarning(true);
          }
        } catch {
          // La tarea se conserva, pero el usuario debe saber que la proyección falló.
          setActivityWarning(true);
        }
        await reload();
      }
    } catch {
      // Un 409 requiere recargar el token actualizado antes de volver a intentar.
      await reload();
    }
  }

  async function toggleProject(item: DashboardItem) {
    try {
      const response = await projectMutation.mutateAsync({
        legacyId: item.id,
        data: {
          nombre: textOf(item, 'nombre', 'texto'),
          estado: item.estado === 'archivado' ? 'activo' : 'archivado',
          prioridad: typeof item.prioridad === 'string' ? item.prioridad : null,
          urgencia: typeof item.urgencia === 'string' ? item.urgencia : 'normal',
          fechaLimite: typeof item.fechaLimite === 'string' ? item.fechaLimite : null,
          orden: typeof item.orden === 'number' ? item.orden : 0,
          payload: item,
          expectedUpdatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : null,
        },
      });
      if (response.status === 200) await reload();
    } catch {
      await reload();
    }
  }

  async function saveTask(item: DashboardItem, text: string, parentId: number | null = typeof item.parentId === 'number' ? item.parentId : null) {
    try {
      const response = await taskMutation.mutateAsync({
        legacyId: item.id,
        data: {
          texto: text,
          completado: item.completado === true,
          prioridad: typeof item.prioridad === 'string' ? item.prioridad : null,
          urgencia: typeof item.urgencia === 'string' ? item.urgencia : 'normal',
          proyectoId: typeof item.proyectoId === 'number' ? item.proyectoId : null,
          parentId,
          orden: typeof item.orden === 'number' ? item.orden : 0,
          payload: { ...item, texto: text },
          expectedUpdatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : null,
        },
      });
      if (response.status !== 200) throw new Error('Tarea no guardada');
      return await reload();
    } catch {
      await reload();
      return false;
    }
  }

  return (
    <section className="panel-form dashboard-panel" aria-labelledby="dashboard-title">
      <div className="panel-heading">
        <div>
          <h2 id="dashboard-title">Dashboard</h2>
          <p className="panel-caption">Lectura propia desde Rust; sincronización y compartidos se incorporarán por contrato.</p>
        </div>
        <button type="button" onClick={() => void reload()} disabled={loading}>{loading ? 'Cargando…' : 'Actualizar'}</button>
      </div>
      {loading && !data && <p className="status-message" role="status">Cargando tus datos…</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {taskMutation.isError && <p className="form-error" role="alert">No se pudo guardar la tarea; puede haber cambiado en otra sesión.</p>}
      {projectMutation.isError && <p className="form-error" role="alert">No se pudo guardar el proyecto; puede haber cambiado en otra sesión.</p>}
      {activityWarning && <p className="status-message" role="status">Tarea guardada; no se pudo actualizar la actividad.</p>}
      {data && (
        <>
          {data.meta.truncated && <p className="status-message" role="status">Se muestran los primeros 500 elementos por dominio.</p>}
          <div className="dashboard-summary" aria-label="Resumen del dashboard">
            <span>{tasks.length} tareas</span>
            <span>{habits.length} hábitos</span>
            <span>{projects.length} proyectos</span>
          </div>
          <div className="dashboard-columns">
            <div><h3>Tareas</h3><ItemList items={tasks} keys={['texto', 'nombre']} emptyLabel="No hay tareas todavía." onToggle={(item) => void toggleTask(item)} onSaveEdit={saveTask} pendingId={taskMutation.isPending ? taskMutation.variables?.legacyId : undefined} hierarchy parentOptions={taskParentOptions} /></div>
            <div><h3>Hábitos</h3><ItemList items={habits} keys={['nombre', 'texto']} emptyLabel="No hay hábitos todavía." /></div>
            <div><h3>Proyectos</h3><ItemList items={projects} keys={['nombre', 'texto']} emptyLabel="No hay proyectos todavía." onToggle={(item) => void toggleProject(item)} actionText={(item) => item.estado === 'archivado' ? 'Activar' : 'Archivar'} pendingId={projectMutation.isPending ? projectMutation.variables?.legacyId : undefined} /></div>
          </div>
          <HabitHistoryPanel habits={habits} />
        </>
      )}
    </section>
  );
}
