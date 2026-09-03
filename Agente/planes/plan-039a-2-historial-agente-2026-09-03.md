# 039A-2 — Historial del agente: tarjetas y contexto sobreviven a recargar + diff acotado

Fecha: 2026-09-03. Origen: reporte del usuario (conversación del plugin pierde las
tarjetas `file_search/file_read/file_patch` y la barra CONTX al recargar la pestaña;
el diff del parche muestra el archivo completo).

## Objetivo

1. Al reabrir una conversación, las burbujas del asistente recuperan sus tarjetas de
   tools (tool, ok, resumen, argumentos) y su barra de contexto (tokens, provider/modelo).
2. El diff de `file_write/file_patch` muestra hunks acotados (±3 líneas de contexto +
   `… N líneas sin cambios …`) en vez del archivo completo.

## No alcance

- Persistir el `diff` histórico: `agente_acciones` no tiene columna de diff y los
  turnos ya ejecutados nunca lo guardaron. Tras recargar, las tarjetas restauradas
  muestran resumen + argumentos (que para `file_patch` contienen el cambio específico
  `buscar → reemplazar`). Persistir diffs hacia adelante requiere migración
  (`resultado_diff TEXT`) y es un bloque aparte si el usuario lo pide.
- `file_read` nunca tuvo contenido visible (el texto va solo al LLM): su tarjeta
  restaurada muestra resumen + `{"ruta"}` como en vivo. No se cambia ese contrato.

## Fases

1. **Core (`glory-harness/core/src/diff.rs`)**: `diff_lineas` emite hunks con
   `CONTEXTO=3`, cabeceras `@@ -a,n +b,m @@` y placeholders de elisión.
   Tests: colapso real, ventana de contexto, conteo de elididas, idénticos → None.
2. **Backend (task, sin migración)**: `AgenteRepository::listar_turnos_con_acciones`
   (JOIN `agente_turnos` + `agente_acciones`, orden turno.creado_en/acción.id);
   `MensajeConversacionResponse` gana `herramientas[]` y `contexto?`; helper
   `enriquecer_historial` empareja mensajes assistant ↔ turnos por orden temporal
   (secuencial, robusto a turnos fallidos sin burbuja). Se aplica en
   listar/rebobinar/compactar (incluidos los early-returns de compactar).
3. **Frontend**: `service.ts` tipos nuevos; `store.ts` mapper `aMensajeTab` en
   abrir/rebobinar/compactar + fix del mapping en vivo (misma tool ×N actualizaba
   todas las tarjetas; ahora solo la última pendiente); `mensajes.tsx` cabecera de
   diff con conteo de líneas/cambios (el CSS ya capa a 120px con scroll).

## Gate / DoD

- `cargo test -p glory-harness-core` verde (diff tests nuevos incluidos).
- `cargo check` + `cargo test` de task verdes.
- `tsc --noEmit` + `npm run build` (frontend) verdes; `galeria-visual.mjs` sin regresión.
- Verificación real: turno con `file_search` + `file_patch`, recargar, las tarjetas
  y el CONTX siguen visibles; el diff en vivo muestra hunks, no el archivo entero.
- Sin commits (decisión de push del usuario); cambios propios distinguibles y
  reportados archivo por archivo. WIP ajeno intacto.
