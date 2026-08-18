CREATE TABLE timeline_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_type VARCHAR(16) NOT NULL CHECK (item_type IN ('tarea', 'proyecto', 'habito')),
    item_legacy_id BIGINT NOT NULL CHECK (item_legacy_id > 0),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_type VARCHAR(16) NOT NULL CHECK (message_type IN ('usuario', 'sistema')),
    content VARCHAR(2000) NOT NULL,
    system_action VARCHAR(48),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_timeline_messages_item
    ON timeline_messages (owner_id, item_type, item_legacy_id, created_at ASC, id ASC);

CREATE TABLE timeline_reads (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_type VARCHAR(16) NOT NULL CHECK (item_type IN ('tarea', 'proyecto', 'habito')),
    item_legacy_id BIGINT NOT NULL CHECK (item_legacy_id > 0),
    last_message_created_at TIMESTAMPTZ NOT NULL,
    last_message_id UUID NOT NULL REFERENCES timeline_messages(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, owner_id, item_type, item_legacy_id)
);
