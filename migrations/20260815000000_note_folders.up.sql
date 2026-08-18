CREATE TABLE note_folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, name)
);

ALTER TABLE notes
    ADD COLUMN folder_id UUID REFERENCES note_folders(id) ON DELETE SET NULL;

CREATE INDEX idx_note_folders_user_id ON note_folders(user_id);
CREATE INDEX idx_notes_user_folder_created ON notes(user_id, folder_id, created_at DESC);

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_notes_title_trgm ON notes USING GIN (title gin_trgm_ops);
CREATE INDEX idx_notes_content_trgm ON notes USING GIN (content gin_trgm_ops);
