DROP INDEX IF EXISTS idx_notes_user_folder_created;
DROP INDEX IF EXISTS idx_notes_title_trgm;
DROP INDEX IF EXISTS idx_notes_content_trgm;
DROP INDEX IF EXISTS idx_note_folders_user_id;

ALTER TABLE notes DROP COLUMN IF EXISTS folder_id;
DROP TABLE IF EXISTS note_folders;
