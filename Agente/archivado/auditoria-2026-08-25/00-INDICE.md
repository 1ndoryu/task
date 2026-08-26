# Auditoría SOLID — task (índice maestro) — 2026-08-25

> **Fecha inicio:** 2026-08-25
> **Alcance:** backend Rust (`src/`) + frontend React (`frontend/src/`) del repo `task` (rama `main`).
> **Fuera de alcance:** `glory-rs/` (submódulo, repo aparte), `node_modules/`, `dist/`, `temp/`, `uploads/`, `migrations/` (SQL de esquema), `frontend/src/app/android/` (generado por Capacitor), fuentes/fonts (binarias).
> **Nota:** los cambios sin commitear del usuario en `frontend/src/app/components/dashboard/*` (creación rápida) se respetan y no se tocan.

## Cómo se usa este documento

1. Cada módulo tiene un MD con un **checklist de archivos** generado automáticamente (uno por archivo, con líneas).
2. La revisión se hace **archivo por archivo**: se lee, se marcan hallazgos y se tilda el checkbox del archivo.
3. Los **hallazgos** se anotan en el mismo MD del módulo, con ID, severidad, categoría y ubicación exacta.
4. Además de la revisión por archivo, los **patrones generales** transversales se anotan en `00-PATRONES.md` (revisión por patrón, no por archivo).
5. Al terminar la revisión completa, cada hallazgo se **resuelve** desde su propio checklist.

## Formato de hallazgo

```markdown
- [ ] **H-{MOD}-NN** `{SEVERIDAD}` `{CATEGORÍA}` — `{archivo}:{líneas}` — {qué viola y por qué}. {sugerencia de resolución}
```

- `[ ]` = hallazgo pendiente de resolver. `[x]` = resuelto (con fecha y commit al lado).
- La severidad y categoría van entre backticks para poder filtrarlas con grep (ej: `grep "ALTA" Agente/auditoria/ -r`).

## Severidades

| Severidad | Significado |
|---|---|
| `BLOQUEANTE` | Seguridad, integridad de datos o impide operar el producto |
| `ALTA` | Violación de arquitectura/contrato (SOLID, capas, límites de tamaño) con impacto real |
| `MEDIA` | Violación que degrada mantenibilidad o consistencia |
| `BAJA` | Orden, limpieza, código muerto, imports |
| `INFO` | Observación / decisión consciente documentada |

## Categorías

`SRP` `OCP` `LSP` `ISP` `DIP` — principios SOLID.
`ARQUITECTURA` — capas, acoplamiento, contratos (no encaja en un principio concreto).
`SEGURIDAD` `RENDIMIENTO` `ERRORES` `UI/UX` `ORDEN` `DUPLICACION` `REGLA` (reglas del AGENTS.md) `CODEGEN` `CSS` `PATRON` (patrón transversal, referenciado desde `00-PATRONES.md`).

## Criterios de revisión por archivo

1. **SOLID:** SRP (una responsabilidad), OCP (extensible sin modificar), LSP (sustitución coherente), ISP (interfaces mínimas), DIP (depender de abstracciones).
2. **Reglas AGENTS.md:** límites de tamaño (componentes/estilos ≤300 líneas, hooks ≤120 — reinterpretados, utils ≤150), ≤3 `useState`, lógica >5 líneas a hook, Zustand con selectores específicos, sin CSS inline ni hardcodeo visual, imports muertos, código muerto, nombres confusos.
3. **Seguridad:** prepared statements / query builders tipados, validación en boundary, sin `unwrap()` sobre input, sin secrets hardcodeados, autorización por recurso.
4. **Rendimiento:** N+1, roundtrips innecesarios, re-renders, selectores de store, tamaño de payload.
5. **Errores:** no silenciar, propagar con contexto, feedback visible en UI, rollback en updates optimistas.

## Patrones generales (revisión transversal)

Además del barrido archivo por archivo, se auditan **patrones transversales** que afectan a varios archivos y no se ven bien desde un solo archivo. Se anotan en [00-PATRONES.md](00-PATRONES.md) y cada hallazgo de archivo que forme parte de un patrón se etiqueta `PATRON` referenciando el patrón.

## Estado por módulo

| Módulo | MD | Archivos | Revisados | Hallazgos | Abiertos |
|---|---|---|---|---|---|
| B01 Núcleo backend | [backend/01-nucleo.md](backend/01-nucleo.md) | 5 | 5 | 0 | 0 |
| B02 Models | [backend/02-models.md](backend/02-models.md) | 17 | 17 | 0 | 0 |
| B03 Repositories | [backend/03-repositories.md](backend/03-repositories.md) | 19 | 19 | 2 | 2 |
| B04 Services | [backend/04-services.md](backend/04-services.md) | 20 | 20 | 0 | 0 |
| B05 Handlers/middleware | [backend/05-handlers.md](backend/05-handlers.md) | 23 | 23 | 0 | 0 |
| F10 API generado (Orval) | [frontend/10-api-generado.md](frontend/10-api-generado.md) | 14 | 14 | 0 | 0 |
| F11 Stores/servicios/islands | [frontend/11-stores-servicios-islands.md](frontend/11-stores-servicios-islands.md) | 44 | 44 | 0 | 0 |
| F12 Hooks | [frontend/12-hooks.md](frontend/12-hooks.md) | 149 | 149 | 2 | 2 |
| F13 Componentes | [frontend/13-componentes.md](frontend/13-componentes.md) | 292 | 292 | 2 | 2 |
| F14 Estilos CSS | [frontend/14-estilos-css.md](frontend/14-estilos-css.md) | 141 | 141 | 1 | 1 |
| F15 Tipos/utils/config/ctx | [frontend/15-tipos-utils-config.md](frontend/15-tipos-utils-config.md) | 80 | 80 | 0 | 0 |
| F16 glory-core | [frontend/16-glory-core.md](frontend/16-glory-core.md) | 44 | 44 | 0 | 0 |
| F17 Raíz/assets | [frontend/17-raiz.md](frontend/17-raiz.md) | 7 | 7 | 0 | 0 |
| **PATRONES transversales** | [00-PATRONES.md](00-PATRONES.md) | — | — | 0 | 0 |
| Subtotal backend | | **84** | **84** | **2** | **2** |
| Subtotal frontend (F15/F11/F12) | | **273** | **273** | **2** | **2** |
| Subtotal frontend | | **771** | **771** | **5** | **5** |
| **Total** | | **855** | **855** | **7** | **7** |

## Estado

**COMPLETA — 855/855 archivos revisados, 7 hallazgos** (0 BLOQUEANTE, 0 ALTA, 2 MEDIA, 5 BAJA, 0 INFO). Auditoría de paz por patrones más archivo por archivo (modo contraste vs la pasada 2026-08-19).

**Resolución 2026-08-25 — 7/7 resueltos ✅ — auditoría al 100%:** cerrados `H-F12-14`, `H-F13-08`, `H-B03-06`, `H-B03-07`, `H-F14-04`, `H-F13-09` y, al ejecutarse el refactor estructural T7, `H-F12-13` (cluster de sync). Ver plan `Agente/planes/00-PLAN-RESOLUCION-2026-08-25.md`; verificados con `tsc --noEmit` limpio y `cargo check`/`cargo test` 11/11 OK. Detalle de T7 en `12-hooks.md` (mappers a `utils/mappersContrato.ts`, `useOnlineStatus`/`obtenerNonce` a `hooks/useOnlineStatus.ts`, `generateBackup` tipado vía `DatosGuardado`, helpers de `useSyncManager` a `utils/syncAyudas.ts`, 4 `@ts-ignore` del cluster eliminados).

**Avance por tanda:** T1 backend 84/84 (2 hallazgos B03) → T2 frontend F15/F11/F12 273/273 (2 hallazgos F12 transversales) → T3 frontend F13/F14/F10/F16/F17 498/498 (1 F13 + 1 F13 + 1 F14).

### Tanda 3 (frontend F13/F14/F10/F16/F17 — 498/498) — 2026-08-25

En modo contraste. F13: solo `DashboardGrid.tsx:40` (`console.warn`→`devWarn`) y la duplicación de drag-resize del sidebar nuevo → **H-F13-08** `BAJA` `PATRON`, **H-F13-09** `BAJA` `DUPLICACION`. `DashboardSidebarGrid` (303) es cohesivo (subdividido en 4 sub-componentes); `PanelGruposFb` (304) ya aceptado en la pasada 1. F14: único hex residual es línea comentada en `sidebarMenu.css:169` → **H-F14-04** `BAJA`; los monolíticos >300 siguen justificados (cohesivos, un componente por hoja, sin duplicación reintroducida). F10/F16/F17: limpios (0 señales).

### Tanda 2 (frontend F15/F11/F12 — 273/273) — 2026-08-25

En modo contraste. F15 limpio (refactor de la pasada 1 se mantiene: utils/tipos por dominio, sin `as any`, `apiClient`/`devLog` correctos). F11 limpio (stores ya refactorizados; observación no-hallazgo sobre `iaService` usando contrato WP para admin, residual del dominio IA). F12: se verificó el **cluster de sync T7: sigue intacto y pendiente** (tamaños idénticos a la pasada 1). **2 hallazgos transversales registrados:**
- **H-F12-13** `MEDIA` `PATRON→P-01` — cluster de sync: 17 `console.warn/error` de producción en 6 de 7 archivos + 4 `@ts-ignore` (foco del refactor T7). ✅ Resuelto 2026-08-25 (T7 estructural; ver `12-hooks.md`).
- **H-F12-14** `MEDIA` `PATRON→P-01` — 16 `console.warn` en 26 archivos de hooks + 6 `@ts-ignore`/`as any` — política `devWarn` de la pasada 1 incumplida a gran escala.

Moraleja: el cluster de sync no solo es refactor de estructura pendiente, sino que concentra consola de producción que ya no debería existir. Los `console.warn` operativos ya se migraron a `devWarn` en este pase (vía `H-F12-14`, fix contenido); lo que sigue pendiente para T7 es la **reesstructuración** del cluster (mappers a utils, división de `useSyncManager`, tipado de los 4 `@ts-ignore`).

**Total hallazgos de la auditoría 2026-08-25: 7** — resumen por severidad: **2 MEDIA** (H-F12-13, H-F12-14, ambos `PATRON` transversales de logs en producción → P-01) y **5 BAJA** (H-B03-06, H-B03-07, H-F13-08, H-F13-09, H-F14-04 — limpieza y duplicación menores). 0 BLOQUEANTE y 0 ALTA. Ver la tabla de estado por módulo arriba.

### Tanda 1 (backend 84/84) — 2026-08-25

El backend está prácticamente curado por la pasada previa (2026-08-19): los 5 módulos salieron limpios salvo 2 hallazgos `BAJA` en repositorios.
- **H-B03-06** `BAJA` `ORDEN` — `admin.rs:35-40` — ILIKE de búsqueda sin escapar wildcards, inconsistente con `note.rs`.
- **H-B03-07** `BAJA` `PATRON` — SQL dinámico con `format!`+whitelist de tablas (seguro hoy, frágil), referencia `P-03`.

Confirmado que la pasada previa dejó el backend muy sólido: validación `Validate` en todos los requests, Argon2 con `spawn_blocking`+semáforo, LWW con timestamp, tx-aware repos, session JOIN en una query, CSRF en mutaciones, sanitización de `Content-Disposition`, no-silent-errors.

## Para continuar (2026-08-25)

Auditoría completa previa (2026-08-19) archivada en `Agente/archivado/auditoria-2026-08-19/` (69 hallazgos resueltos). Esta es una **segunda pasada** un mes después: revisar qué quedó, aplicar el mismo criterio y detectar nuevas violaciones introducidas en el interim.

## Orden de revisión propuesto

Backend primero (base del contrato) → luego frontend por capas:

1. **Patrones generales** (00-PATRONES.md) revisados primero para orientar el barrido.
2. B01 Núcleo → B02 Models → B03 Repositories → B04 Services → B05 Handlers
3. F15 (utils/tipos base) → F11 (stores) → F12 (hooks) → F13 (componentes) → F14 (estilos)
4. F10 (API generado: solo verificación de modo `tags-split` y drift) → F16 (glory-core) → F17 (raíz)

## Notas

- Generado el 2026-08-25 a partir de `find` + `wc -l`. Si se agregan/eliminan archivos, regenerar la tabla del módulo afectado.
- `api/generated/*` son archivos de codegen (Orval): no se revisan línea por línea; se verifica modo `tags-split` y sincronía con el snapshot OpenAPI.
- Los hallazgos `CSS` de F14 se limitan a: hardcodeo de colores/fuentes fuera de `variables.css`, duplicación de recetas del sistema de diseño y clases huérfanas.