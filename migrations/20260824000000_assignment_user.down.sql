DROP INDEX IF EXISTS dashboard_tasks_asignado_user_idx;
ALTER TABLE dashboard_tasks DROP COLUMN IF EXISTS asignado_user_id;
