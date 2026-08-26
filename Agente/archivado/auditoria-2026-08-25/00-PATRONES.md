# Auditoría SOLID — task — Patrones generales transversales (2026-08-25)

> Revisión **por patrón**, no por archivo. Detecta dinámicas cross-cutting que afectan a varios archivos y que no se ven bien desde un solo archivo. Cada hallazgo de archivo que forme parte de un patrón se etiqueta `PATRON` con referencia a su ID aquí (`P-01`, `P-02`, …).
> Las celdas `Archivo:líneas` listan **ejemplos** de dónde se manifiesta el patrón, no el universo completo.

## Cómo se usa

1. Al auditar cada módulo se contrasta contra los patrones ya abiertos aquí; si un hallazgo es instancia de un patrón, se referencia en el MD del módulo con `PATRON` → `P-NN`.
2. Al detectar un patrón nuevo transversal, se abre aquí y se tilda un checkbox.
3. Un patrón se cierra cuando **todas** sus instancias conocidas quedan reflejadas como hallazgos (aunque la resolución sea posterior por plan).

---

## Checklist de patrones

- [ ] **P-01** `ERRORES` — Manejo de errores silenciosos / `catch` vacíos / logs muertos en el frontend.
- [ ] **P-02** `RENDIMIENTO` — Roundtrips / queries N+1 en el backend (repositories que consultan en bucle).
- [ ) **P-03** `SEGURIDAD` — Validación de entrada en boundary faltante o `unwrap()`/`expect()` sobre input externo en Rust.
  - Confirmado 2026-08-25: los 84 archivos Rust usan `Validate` + bindings; el único patrón residual de dinamismo SQL es el de **whitelist de tablas** con `format!` (seguro hoy, frágil) → `H-B03-07`.
- [ ] **P-04** `SRP` — God-components / god-hooks / god-stores (multi-responsabilidad), tras los refactors de 2026-08-19.
- [ ] **P-05** `DUPLICACION` — Lógica duplicada entre módulos (helpers que deberían compartir un único origen).
- [ ] **P-06** `DIP` — Dependencia de implementaciones concretas en vez de abstracciones (servicios/hooks acoplados a fetch directo o a otro servicio).
- [ ] **P-07** `REGLA` — Violación sistemática de los límites de tamaño del AGENTS.md (componentes >300, hooks >120, utils >150) no justificada.
- [ ] **P-08** `ERRORES` — Errores de red/API sin reintento, sin feedback al usuario o degradación silenciosa a un estado vacío confuso.
- [ ] **P-09** `RENDIMIENTO` — Re-renders / selectores de Zustand no atómicos / suscripciones anchas al store.
- [ ] **P-10** `CSS` — Hardcodeo de colores/fuentes fuera de `variables.css` o duplicación de recetas del sistema de diseño.

---

## Detalle

### P-01 — Errores silenciosos / logs muertos en el frontend
**Ejemplos:** confirmado 2026-08-25 en la Tanda 2 en modo contraste — a pesar de la creación de `devWarn`/`devLog` (H-F12-03/H-F11-07), **26 archivos de hooks usan `console.warn` crudo (16 ocurrencias) y `console.error` (36) que salen a producción**. El cluster de sync T7 concentra 17 de ellos. → `H-F12-13`, `H-F12-14`. Los `console.error` reales pueden ser canal nativo legítimo; los `console.warn` operativos son los que violan la política.
_Los hooks concentran la mayoría (H-F12-13/H-F12-14); en componentes solo queda `DashboardGrid.tsx:40` (`console.warn`→`devWarn`) → `H-F13-08`, y 3 `console.error` de excepciones reales (clipboard, descifrado E2E) que se conservan como canal nativo legítimo._

### P-02 — Roundtrips / N+1 en el backend
**Ejemplos:**
_nota: la auditoría previa (sesión 5) corrigió los principales (active_row, ADMIN_USER_SELECT con JOIN, summary en una pasada). Verificar si reaparecieron en dominios nuevos._

### P-03 — Validación de entrada / unwrap en Rust
**Ejemplos:**
_nota: la previa añadió `Validate` a los 3 Upsert*Request y topes de payload; verificar los handlers nuevos/paridad._

### P-04 — God-components / hooks / stores
**Ejemplos:**
_nota: la previa refactorizó useTareas, habitosStore, TablaHabitos, 6 componentes >300, utils/types del F15 y el cluster de sync quedó en T7. Esta pasada verifica si el cluster de sync sigue pendiente o introdujo nuevos monolitos._

### P-05 — Lógica duplicada entre módulos
**Ejemplos:** confirmado 2026-08-25 en la Tanda 3 — `DashboardSidebarGrid.tsx` duplica la lógica de drag-resize entre sus 2 handles (idénticos salvo eje) → `H-F13-09`. El resto de duplicados detectados por grep son one-liners normales de CSS/JS, no lógica sustancial.
_nota: detectable con grep de firmas/helpers repetidos (p. ej. formateo de fechas, mappers de contrato WP↔Rust). La pasada 1 ya consolidó el cluster de sync y TI11; en esta pasada solo aparece el caso de los handles de sidebar.

### P-06 — Dependencia de implementaciones concretas (DIP)
**Ejemplos:**
_nota: buscar fetch directo a `/api` disperso en hooks/servicios en vez de un apiClient único; servicios Rust acoplados a otro servicio._

### P-07 — Límites de tamaño del AGENTS.md
**Ejemplos:**
_nota: la previa reinterpretó hooks a ~300 single-responsability; verificar componentes >300 nuevos y utils >150._

### P-08 — Errores de red/API sin feedback ni reintento
**Ejemplos:**
_nota: contrastar con `useModoOffline` (reintentos) e `apiClient` (error global)._

### P-09 — Selectores de Zustand no atómicos
**Ejemplos:**
_nota: la previa corrigió useTimeTracker/useDeficitCalorico; revisar los stores nuevos._

### P-10 — Hardcodeo visual fuera de variables.css
**Ejemplos:**
_nota: la previa migró hex a tokens en 9 archivos; verificar el CSS nuevo del interim._

---

## Patrones pendientes de abrir

_(cargar aquí patrones detectados que no encajen en P-01..P-10, p. ej. `PATRON` de sanidad de CSRF, sesión, etc.)_