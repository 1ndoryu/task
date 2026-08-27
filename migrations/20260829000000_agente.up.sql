-- [29-08-2026] Plugin de agente de IA (plan-agente-ia-plugin-2026-08-27.md, Fase 0).
-- Tablas de conversaciones, mensajes, acciones (auditoría), turnos (recuperación
-- de fallos), memoria por sesión/proyecto y tareas programadas (cron).
-- Contrato: todo autenticado por user_id; nunca se confía en el front.
CREATE TABLE agente_conversaciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    titulo VARCHAR(255) NOT NULL DEFAULT 'Nueva conversación',
    modo VARCHAR(16) NOT NULL DEFAULT 'predeterminado',
    workspace_id VARCHAR(64),
    tab_id VARCHAR(64),
    proveedor VARCHAR(32),
    modelo VARCHAR(128),
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT agente_conversaciones_modo_check
        CHECK (modo IN ('predeterminado', 'meta', 'autonomo'))
);
CREATE INDEX idx_agente_conversaciones_user ON agente_conversaciones(user_id, actualizado_en DESC);

CREATE TABLE agente_mensajes (
    id BIGSERIAL PRIMARY KEY,
    conversacion_id UUID NOT NULL REFERENCES agente_conversaciones(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rol VARCHAR(16) NOT NULL,
    contenido TEXT NOT NULL,
    compactado BOOLEAN NOT NULL DEFAULT FALSE,
    tokens_estimados INTEGER NOT NULL DEFAULT 0,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT agente_mensajes_rol_check CHECK (rol IN ('system', 'user', 'assistant', 'tool'))
);
CREATE INDEX idx_agente_mensajes_conversacion ON agente_mensajes(conversacion_id, id);

-- Auditoría de acciones ejecutadas por el agente (tool, args sin secretos,
-- resultado resumido). Visible en el chat y consultable.
CREATE TABLE agente_acciones (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    turno_id UUID,
    tool_id VARCHAR(64) NOT NULL,
    argumentos JSONB NOT NULL DEFAULT '{}'::jsonb,
    resultado_resumen TEXT NOT NULL DEFAULT '',
    estado VARCHAR(16) NOT NULL DEFAULT 'ok',
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_agente_acciones_user ON agente_acciones(user_id, creado_en DESC);

-- Turno del agente: persistencia para observabilidad y recuperación de fallos
-- (estado 'pendiente' + prompt reconstruido para retomar tras fallo de proveedor).
CREATE TABLE agente_turnos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversacion_id UUID REFERENCES agente_conversaciones(id) ON DELETE SET NULL,
    estado VARCHAR(16) NOT NULL DEFAULT 'pendiente',
    prompt TEXT NOT NULL,
    proveedor VARCHAR(32),
    modelo VARCHAR(128),
    tokens_prompt INTEGER NOT NULL DEFAULT 0,
    tokens_complecion INTEGER NOT NULL DEFAULT 0,
    tools_ejecutadas INTEGER NOT NULL DEFAULT 0,
    duracion_ms INTEGER NOT NULL DEFAULT 0,
    error TEXT,
    retryable BOOLEAN NOT NULL DEFAULT FALSE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT agente_turnos_estado_check
        CHECK (estado IN ('pendiente', 'ejecutando', 'completado', 'fallido'))
);
CREATE INDEX idx_agente_turnos_user ON agente_turnos(user_id, creado_en DESC);

-- Memoria por sesión/proyecto (estilo Hermes: archivos MD en disco para local;
-- esta tabla es el índice/almacén portable). `clave` es único por usuario.
CREATE TABLE agente_memoria (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    clave VARCHAR(128) NOT NULL,
    contenido TEXT NOT NULL,
    sesion_id UUID,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT agente_memoria_user_clave_unique UNIQUE (user_id, clave)
);

-- Tareas programadas (cron): el usuario programa, el agente ejecuta como turno.
CREATE TABLE agente_tareas_programadas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    prompt TEXT NOT NULL,
    tipo VARCHAR(16) NOT NULL DEFAULT 'una_vez',
    cron_expr VARCHAR(128),
    ejecutar_en TIMESTAMPTZ,
    estado VARCHAR(16) NOT NULL DEFAULT 'pendiente',
    ultima_ejecucion TIMESTAMPTZ,
    proxima_ejecucion TIMESTAMPTZ,
    result_summary TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT agente_tareas_programadas_tipo_check
        CHECK (tipo IN ('una_vez', 'recurrente')),
    CONSTRAINT agente_tareas_programadas_estado_check
        CHECK (estado IN ('pendiente', 'ejecutando', 'completada', 'fallida', 'cancelada'))
);
CREATE INDEX idx_agente_tareas_user_prox ON agente_tareas_programadas(user_id, proxima_ejecucion);
