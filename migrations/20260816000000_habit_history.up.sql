CREATE TABLE dashboard_habit_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    habit_legacy_id BIGINT NOT NULL CHECK (habit_legacy_id > 0),
    date DATE NOT NULL,
    status VARCHAR(16) NOT NULL CHECK (status IN ('completado', 'pospuesto', 'omitido')),
    notes TEXT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, habit_legacy_id, date)
);

CREATE INDEX idx_habit_history_user_habit_date
    ON dashboard_habit_history(user_id, habit_legacy_id, date DESC);
