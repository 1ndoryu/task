-- Archivar una nota sin perderla: la fecha en que se guardó, `NULL` si sigue
-- viva. El listado normal la ignora; una vista de archivadas la pedirá aparte.
ALTER TABLE notes ADD COLUMN archived_at TIMESTAMPTZ;

-- El listado siempre filtra por las vivas de un usuario: el índice parcial
-- deja esa consulta en un recorrido de solo lo que se pinta.
CREATE INDEX idx_notes_vivas ON notes(user_id, created_at DESC) WHERE archived_at IS NULL;
