-- [30-08-2026] Config avanzada por conversacion (Fase 5): columna config JSONB
-- con los parametros validados del agente (temperatura, max_tokens, idioma,
-- contexto, permisos, prompt de sistema, limites).
ALTER TABLE agente_conversaciones ADD COLUMN config JSONB NOT NULL DEFAULT '{}'::jsonb;
