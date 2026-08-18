CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(64) NOT NULL CHECK (notification_type IN (
        'solicitud_equipo',
        'solicitud_aceptada',
        'tarea_vence_hoy',
        'tarea_asignada',
        'tarea_removida',
        'adjunto_agregado',
        'mensaje_chat',
        'habito_companero',
        'elemento_compartido'
    )),
    title VARCHAR(200) NOT NULL,
    content VARCHAR(2000),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    read_at TIMESTAMPTZ,
    dedupe_key VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_created
    ON notifications (user_id, created_at DESC, id DESC);

CREATE INDEX idx_notifications_user_unread
    ON notifications (user_id, created_at DESC, id DESC)
    WHERE read_at IS NULL;

CREATE UNIQUE INDEX uq_notifications_user_dedupe_key
    ON notifications (user_id, dedupe_key)
    WHERE dedupe_key IS NOT NULL;
