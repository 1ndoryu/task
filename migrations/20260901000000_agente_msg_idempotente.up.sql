-- [01-09-2026] Fase 4: idempotencia del mensaje de usuario para reintentar.
-- Clave opcional del cliente (UUID). Misma clave => misma fila (ON CONFLICT DO
-- NOTHING), de modo que un reintento del mismo turno no duplique el mensaje.
-- NULL (clientes antiguos / scheduler) => insert normal sin deduplicar.
ALTER TABLE agente_mensajes ADD COLUMN clave_idempotencia UUID;
CREATE UNIQUE INDEX uq_agente_mensajes_idempotencia
    ON agente_mensajes (conversacion_id, user_id, clave_idempotencia)
    WHERE clave_idempotencia IS NOT NULL;