ALTER TABLE users
    ADD COLUMN display_name VARCHAR(120) NOT NULL DEFAULT '',
    ADD COLUMN avatar_url TEXT;
