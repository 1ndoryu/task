-- [27-08-2026] Recordatorios con fecha/hora (plan-ia-esencial-y-migracion-legacy):
-- contrato autenticado por user_id, validación de fechas y idempotencia de
-- creación (el frontend genera la idempotency_key en la propuesta y la reenvía
-- al confirmar; repetir la confirmación no duplica el recordatorio).
CREATE TABLE reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    titulo VARCHAR(255) NOT NULL,
    mensaje TEXT NOT NULL DEFAULT '',
    programado_para TIMESTAMPTZ NOT NULL,
    estado VARCHAR(16) NOT NULL DEFAULT 'pendiente',
    idempotency_key VARCHAR(64),
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT reminders_estado_check CHECK (estado IN ('pendiente', 'completado', 'cancelado')),
    CONSTRAINT reminders_idempotency_unique UNIQUE (user_id, idempotency_key)
);
CREATE INDEX idx_reminders_user_fecha ON reminders(user_id, programado_para);
