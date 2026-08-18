-- Modelo de lectura inicial del dashboard.
-- No contiene compartidos ni habilita escrituras bulk/LWW.

CREATE TABLE dashboard_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    notes TEXT NOT NULL DEFAULT '',
    config JSONB NOT NULL DEFAULT '{"notificaciones":{"email":false,"frecuenciaResumen":"nunca","horaPreferida":"09:00","tareasPorVencer":true,"rachaEnPeligro":true},"cifradoE2E":false,"tema":"terminal","ordenHabitos":"inteligente"}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE dashboard_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    legacy_id BIGINT NOT NULL CHECK (legacy_id > 0),
    name VARCHAR(255) NOT NULL DEFAULT '',
    status VARCHAR(32) NOT NULL DEFAULT 'activo',
    priority VARCHAR(32),
    urgency VARCHAR(32) NOT NULL DEFAULT 'normal',
    due_at TIMESTAMPTZ,
    sort_order INTEGER NOT NULL DEFAULT 0,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE (user_id, legacy_id)
);

CREATE TABLE dashboard_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    legacy_id BIGINT NOT NULL CHECK (legacy_id > 0),
    project_legacy_id BIGINT,
    parent_legacy_id BIGINT,
    text TEXT NOT NULL DEFAULT '',
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    priority VARCHAR(32),
    urgency VARCHAR(32) NOT NULL DEFAULT 'normal',
    sort_order INTEGER NOT NULL DEFAULT 0,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE (user_id, legacy_id)
);

CREATE TABLE dashboard_habits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    legacy_id BIGINT NOT NULL CHECK (legacy_id > 0),
    name VARCHAR(255) NOT NULL DEFAULT '',
    importance VARCHAR(32) NOT NULL DEFAULT 'Media',
    frequency_type VARCHAR(50) NOT NULL DEFAULT 'diario',
    sort_order INTEGER NOT NULL DEFAULT 0,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE (user_id, legacy_id)
);

CREATE INDEX idx_dashboard_projects_user_order
    ON dashboard_projects(user_id, sort_order, legacy_id)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_dashboard_tasks_user_order
    ON dashboard_tasks(user_id, sort_order, legacy_id)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_dashboard_habits_user_order
    ON dashboard_habits(user_id, sort_order, legacy_id)
    WHERE deleted_at IS NULL;
