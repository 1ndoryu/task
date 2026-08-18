-- Asignación de tareas nativa (sin correlación legacy): el destinatario se referencia
-- por su UUID de Rust y la columna tipada es la fuente consultable del campo `asignadoA`
-- que envía el front (valor UUID). El arranque es con datos vacíos; no hay tabla de
-- mapeo de usuarios legacy.
ALTER TABLE dashboard_tasks ADD COLUMN asignado_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX dashboard_tasks_asignado_user_idx
    ON dashboard_tasks (asignado_user_id, deleted_at)
    WHERE asignado_user_id IS NOT NULL;
