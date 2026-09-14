-- [07-09-2026] Desync 069A-4: glory-harness-core amplió `MemoriaEntrada` con
-- metadatos de auditoría (origen, usos, ultimo_uso) y el runtime registra las
-- tools memoria_* que los persisten (proveedor) y leen (curador). La tabla
-- agente_memoria no tenía esas columnas, así que el adaptador no podía ser
-- fiel al contrato. Se añaden con defaults: las filas existentes quedan como
-- origen='', usos=0 y sin último uso (equivalente a MemoriaEntrada::nueva).
ALTER TABLE agente_memoria
    ADD COLUMN origen TEXT NOT NULL DEFAULT '',
    ADD COLUMN usos INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN ultimo_uso TIMESTAMPTZ;
