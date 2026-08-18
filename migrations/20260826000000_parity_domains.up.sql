-- Dominios recuperados para paridad con WordPress (18-08-2026):
-- suscripción, adjuntos/almacenamiento, backups, feedback, cifrado E2E,
-- tokens API (MCP) y flag de administrador en users.

ALTER TABLE users
    ADD COLUMN es_admin BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE subscriptions (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    plan VARCHAR(16) NOT NULL DEFAULT 'free',
    estado VARCHAR(16) NOT NULL DEFAULT 'activa',
    trial_inicio TIMESTAMPTZ,
    trial_fin TIMESTAMPTZ,
    fecha_inicio TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_expiracion TIMESTAMPTZ,
    stripe_customer_id TEXT,
    ultimo_pago TIMESTAMPTZ,
    CONSTRAINT subscriptions_plan_check CHECK (plan IN ('free', 'premium')),
    CONSTRAINT subscriptions_estado_check CHECK (estado IN ('activa', 'trial', 'expirada'))
);

CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entity_type VARCHAR(16),
    entity_id BIGINT,
    nombre TEXT NOT NULL,
    tipo VARCHAR(16) NOT NULL,
    mime TEXT NOT NULL,
    tamano BIGINT NOT NULL,
    ruta TEXT NOT NULL,
    thumbnail_ruta TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT attachments_tipo_check CHECK (tipo IN ('imagen', 'audio', 'archivo'))
);
CREATE INDEX idx_attachments_user ON attachments(user_id);
CREATE INDEX idx_attachments_entity ON attachments(entity_type, entity_id);

CREATE TABLE backups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trigger_origen VARCHAR(16) NOT NULL,
    tamano BIGINT NOT NULL,
    hash TEXT NOT NULL,
    datos JSONB NOT NULL,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT backups_trigger_check CHECK (trigger_origen IN ('manual', 'auto', 'sync'))
);
CREATE INDEX idx_backups_user ON backups(user_id, creado_en DESC);

CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tipo VARCHAR(16) NOT NULL,
    mensaje TEXT NOT NULL,
    leido BOOLEAN NOT NULL DEFAULT FALSE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT feedback_tipo_check CHECK (tipo IN ('sugerencia', 'bug', 'otro'))
);
CREATE INDEX idx_feedback_creado ON feedback(creado_en DESC);

CREATE TABLE e2e_keys (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    clave_cifrada TEXT NOT NULL,
    algoritmo TEXT NOT NULL DEFAULT 'AES-GCM',
    derivacion TEXT NOT NULL DEFAULT 'PBKDF2',
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE api_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    nombre VARCHAR(64) NOT NULL DEFAULT 'mcp',
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revocado_en TIMESTAMPTZ
);
CREATE INDEX idx_api_tokens_user ON api_tokens(user_id);
