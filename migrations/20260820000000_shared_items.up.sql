CREATE TABLE shared_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_type VARCHAR(16) NOT NULL,
    item_legacy_id BIGINT NOT NULL CHECK (item_legacy_id > 0),
    role VARCHAR(16) NOT NULL DEFAULT 'colaborador',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT shared_items_type_check CHECK (item_type IN ('tarea', 'proyecto', 'habito')),
    CONSTRAINT shared_items_role_check CHECK (role IN ('colaborador', 'observador')),
    CONSTRAINT shared_items_not_self_check CHECK (owner_id <> recipient_id),
    CONSTRAINT shared_items_unique_target UNIQUE (owner_id, recipient_id, item_type, item_legacy_id)
);

CREATE INDEX shared_items_recipient_idx ON shared_items (recipient_id, created_at DESC);
CREATE INDEX shared_items_owner_idx ON shared_items (owner_id, item_type, item_legacy_id, created_at DESC);
CREATE INDEX shared_items_recipient_type_idx ON shared_items (recipient_id, item_type, created_at DESC);
