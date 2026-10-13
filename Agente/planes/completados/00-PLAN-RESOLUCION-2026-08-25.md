# Plan de resolución — Auditoría SOLID 2026-08-25

> **Fuente:** `Agente/archivado/auditoria-2026-08-25/` (índice `00-INDICE.md`, patrones `00-PATRONES.md`).
> **Total:** 7 hallazgos (0 BLOQUEANTE, 0 ALTA, 2 MEDIA, 5 BAJA).
> **Estrategia:** resolver en este pase todos los fixes concretos de bajo riesgo y dejar para **T7** el refactor estructural del clúster de sincronización.
> **No se tocan:** los 5 archivos preexistentes del usuario (creación rápida) ni el refactor estructural de T7.
> **Verificación:** `tsc --noEmit` (frontend) + `cargo check`/`cargo test` (backend).

## Checklist

### Fixes concretos (este pase)

- [x] **H-F12-14** `MEDIA` `PATRON→P-01` — migrar los **16 `console.warn` operativos** de hooks a `devWarn` (la política P-01). Los `console.error` de excepciones reales (IndexedDB, fetch, clipboard, descifrado E2E) **se dejan** como canal nativo. ✅ Resuelto 2026-08-25: 16 `console.warn` → `devWarn` en 9 hooks + `DashboardGrid` (los 4 del clúster ya importaban `devLog`, el resto añadió `import {devWarn}`). Los `console.error` de excepciones reales se conservan como canal nativo. Verificado `tsc --noEmit` limpio.
  - Archivos: 26 hooks con `console.*` — solo migrar los `console.warn` cuando el warning es operativo del runtime; leer cada ocurrencia antes de decidir.
- [x] **H-F13-08** `BAJA` `PATRON→P-01` — `dashboard/DashboardGrid.tsx:40` `console.warn` → `devWarn` (fallback panel inexistente). ✅ Resuelto: migrado a `devWarn` con import `../../utils/devLog`.
- [x] **H-B03-06** `BAJA` `ORDEN` — `repositories/admin.rs` escapar wildcards ILIKE reutilizando una util **compartida** `escape_like_literal` (hoy privada en `repositories/note.rs`). ✅ Resuelto: creado `src/repositories/escape.rs`, reutilizado en `note.rs` y aplicado en `admin.rs:list_users`. 11/11 tests OK.
- [x] **H-B03-07** `BAJA` `PATRON` — endurecer/documentar el whitelist de `format!` en `repositories/shared.rs` (+ nota de referencia a `P-03`). Sin sobre-ingeniería: es SQL dinámico seguro por construcción; bastan los `#[allow]`/comentarios de invariante o, si es trivial, tipificar la tabla por `match` cerrado ya existente. ✅ Resuelto: notas de invariante en los `format!` de `shared.rs` (tabla/columna de `match` cerrado, nunca input).
- [x] **H-F14-04** `BAJA` `ORDEN` — `styles/dashboard/componentes/sidebarMenu.css:169` eliminar (no comentar) el hex muerto en la regla comentada. ✅ Resuelto: eliminada la regla comentada y el bloque vacío que dejaba.
- [x] **H-F13-09** `BAJA` `DUPLICACION→P-05` — `dashboard/DashboardSidebarGrid.tsx`: unificar el drag-resize de `ResizeHandleSidebar` y `ResizeHandleRow` en un hook `useResizeDrag(eje)` **si el refactor es pequeño y seguro**; si resulta complejo, documentar la decisión en el MD y dejarlo como deuda. ✅ Resuelto: creado `hooks/useResizeDrag.ts` (`useResizeDrag(axis, valorActual, onAjustar)`) y ambos handles refactorizados para usarlo; imports react sin uso limpiados. Refactor pequeño y seguro.

### Refactor estructural — T7 (se planifica aquí, NO se ejecuta en este pase)

- [x] **H-F12-13** `MEDIA` `PATRON→P-01` — clúster de sincronización T7 resuelto. ✅ **2026-08-25 (T7 estructural):** 1) mappers extraídos de `useDashboardApi` → `utils/mappersContrato.ts`; 2) `useOnlineStatus` + `obtenerNonce` → `hooks/useOnlineStatus.ts` (re-exportados); 3) `@ts-ignore` del cluster (4/4) eliminados: `generateBackup` tipado con `DatosGuardado extends Partial<DashboardData>`, el de Capacitor en `useWebSocket` eliminado por tener tipos; 4) `useSyncManager` (405→322) con helpers puros de bienvenida/guards → `utils/syncAyudas.ts`. La máquina init/auto-save NO se partió en hooks (comparten `syncMeta`/`hasChanges`/`isInitialized` y guards anti-loop/anti-wipeout/WS-absorb) — decisión documentada. Consolas: los `console.warn` operativos migrados a `devWarn` vía H-F12-14; los `console.error` de excepciones reales se conservan. Evidencia: `npx tsc --noEmit` EXIT 0.

## Estado

Completado — 2026-08-25. **7/7 hallazgos resueltos y verificados** (`tsc --noEmit` limpio; `cargo check` + `cargo test` 11/11 OK; target temporal de compilación limpiado de C:/tmp). Los 7 hallazgos tildados en sus MDs de auditoría (`03-repositories.md`, `12-hooks.md`, `13-componentes.md`, `14-estilos-css.md`) y en el `00-INDICE.md`. El refactor estructural del cluster de sync (T7/H-F12-13) se ejecutó en este pase.

**2026-08-25 (T7 ejecutado):** **H-F12-13 resuelto ✅** — con ello **7/7 hallazgos cerrados** y la auditoría SOLID 2026-08-25 queda **al 100%**. Evidencia en `12-hooks.md` y `00-INDICE.md`.