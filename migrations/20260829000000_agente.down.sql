-- [29-08-2026] Rollback de la migración agente (Fase 0).
DROP TABLE IF EXISTS agente_tareas_programadas;
DROP TABLE IF EXISTS agente_memoria;
DROP TABLE IF EXISTS agente_turnos;
DROP TABLE IF EXISTS agente_acciones;
DROP TABLE IF EXISTS agente_mensajes;
DROP TABLE IF EXISTS agente_conversaciones;
