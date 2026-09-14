-- [07-09-2026] Rollback de la auditoría de memoria (069A-4). La columna
-- usos era la única con NOT NULL DEFAULT 0 añadida; se elimina junto con las
-- demás. No se tocan filas: los defaults ya cubrían el retroceso.
ALTER TABLE agente_memoria
    DROP COLUMN IF EXISTS ultimo_uso,
    DROP COLUMN IF EXISTS usos,
    DROP COLUMN IF EXISTS origen;
