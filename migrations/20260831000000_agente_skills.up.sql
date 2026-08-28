-- [31-08-2026] Fase 3 (skills v1): skills persistentes del agente.
-- Contrato mínimo: una skill es conocimiento/instrucciones con nombre,
-- descripcion y estado activa; las activas se inyectan como contexto system
-- en el stream cuando la config de la conversacion tiene incluir_skills.
CREATE TABLE agente_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nombre VARCHAR(128) NOT NULL,
    descripcion TEXT NOT NULL,
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT agente_skills_user_nombre_unique UNIQUE (user_id, nombre)
);

CREATE INDEX idx_agente_skills_user ON agente_skills(user_id);
