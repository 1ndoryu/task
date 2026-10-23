DROP INDEX IF EXISTS idx_notes_vivas;
ALTER TABLE notes DROP COLUMN IF EXISTS archived_at;
