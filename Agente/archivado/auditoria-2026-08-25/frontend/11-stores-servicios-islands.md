# Auditoría SOLID — task — Stores, servicios e islands (checklist archivos)

> Módulo: `F11` · Revisar archivo por archivo y anotar violaciones (SOLID, reglas, rendimiento, seguridad, errores) con formato `- [ ] **H-F11-NN** `SEV` `CAT` — `archivo:líneas` — qué viola y por qué`. Tildar el checkbox al terminar la revisión del archivo.

| # | Rev | Archivo | Líneas | Hallazgos |
|---|---|---|---|---|
| 1 | [x] | `frontend/src/app/stores/ayunoStore.ts` | 161 | — |
| 2 | [x] | `frontend/src/app/stores/carpetasNotasStore.ts` | 212 | — |
| 3 | [x] | `frontend/src/app/stores/configuracionUsuarioStore.ts` | 71 | — |
| 4 | [x] | `frontend/src/app/stores/deficitCaloricoStore.ts` | 157 | — |
| 5 | [x] | `frontend/src/app/stores/dependenciasUIStore.ts` | 60 | — |
| 6 | [x] | `frontend/src/app/stores/gruposEjecucionStore.ts` | 122 | — |
| 7 | [x] | `frontend/src/app/stores/gruposFbStore.ts` | 251 | — |
| 8 | [x] | `frontend/src/app/stores/gruposTareasStore.ts` | 190 | — |
| 9 | [x] | `frontend/src/app/stores/habitos/dedupSubhabitos.ts` | 81 | — |
| 10 | [x] | `frontend/src/app/stores/habitos/normalizarHabitos.ts` | 79 | — |
| 11 | [x] | `frontend/src/app/stores/habitos/sliceCrud.ts` | 141 | — |
| 12 | [x] | `frontend/src/app/stores/habitos/sliceHistorial.ts` | 179 | — |
| 13 | [x] | `frontend/src/app/stores/habitos/sliceOrden.ts` | 81 | — |
| 14 | [x] | `frontend/src/app/stores/habitos/sliceSubHabitos.ts` | 320 | — |
| 15 | [x] | `frontend/src/app/stores/habitos/sliceToggle.ts` | 180 | — |
| 16 | [x] | `frontend/src/app/stores/habitos/tipos.ts` | 81 | — |
| 17 | [x] | `frontend/src/app/stores/habitosHistorialStore.ts` | 163 | — |
| 18 | [x] | `frontend/src/app/stores/habitosStore.ts` | 191 | — |
| 19 | [x] | `frontend/src/app/stores/iaStore.ts` | 154 | — |
| 20 | [x] | `frontend/src/app/stores/menuContextualStore.ts` | 71 | — |
| 21 | [x] | `frontend/src/app/stores/navegacionMovilStore.ts` | 51 | — |
| 22 | [x] | `frontend/src/app/stores/notasStore.ts` | 334 | — |
| 23 | [x] | `frontend/src/app/stores/pluginsStore.ts` | 73 | — |
| 24 | [x] | `frontend/src/app/stores/recordatoriosStore.ts` | 176 | — |
| 25 | [x] | `frontend/src/app/stores/seleccionMultipleStore.ts` | 144 | — |
| 26 | [x] | `frontend/src/app/stores/suscripcionStore.ts` | 256 | — |
| 27 | [x] | `frontend/src/app/stores/timeTrackerStore.ts` | 217 | — |
| 28 | [x] | `frontend/src/app/stores/whatsappStore.ts` | 96 | — |
| 29 | [x] | `frontend/src/app/services/actividadService.ts` | 262 | — |
| 30 | [x] | `frontend/src/app/services/actividadStore.ts` | 239 | — |
| 31 | [x] | `frontend/src/app/services/agentActionsService.ts` | 166 | — |
| 32 | [x] | `frontend/src/app/services/dataService.ts` | 307 | — |
| 33 | [x] | `frontend/src/app/services/geminiCaloriasService.ts` | 137 | — |
| 34 | [x] | `frontend/src/app/services/gruposFbService.ts` | 183 | — |
| 35 | [x] | `frontend/src/app/services/habitosService.ts` | 110 | — |
| 36 | [x] | `frontend/src/app/services/iaService.ts` | 295 | — |
| 37 | [x] | `frontend/src/app/services/magnificService.ts` | 103 | — |
| 38 | [x] | `frontend/src/app/services/notasService.ts` | 162 | — |
| 39 | [x] | `frontend/src/app/services/whatsappService.ts` | 153 | — |
| 40 | [x] | `frontend/src/app/islands/ArbitrajeIsland.tsx` | 90 | — |
| 41 | [x] | `frontend/src/app/islands/DashboardIsland.tsx` | 337 | — |
| 42 | [x] | `frontend/src/app/islands/PaginaPruebaIsland.tsx` | 76 | — |
| 43 | [x] | `frontend/src/app/islands/PoliticaPrivacidadIsland.tsx` | 207 | — |
| 44 | [x] | `frontend/src/app/islands/TerminosServicioIsland.tsx` | 235 | — |

## Hallazgos

- **F11 sin hallazgos nuevos (2026-08-25, modo contraste):** stores ya refactorizados (habitosStore 191 con 5 slices cohesivos; `notasStore` 334 es store de un dominio con optimistic delete+rollback y nota-activa-multi-panel — complejidad legítima, registrado como observación, no god-store). `sliceSubHabitos` (320) es slice cohesivo del refactor de `habitosStore` (H-F11-01). `dataService` con límite 10 MB + validación profunda (H-F11-06).
- **Observación (no hallazgo nuevo):** `iaService.ts:104-110` — el camino admin usa contrato WordPress obsoleto (`obtenerApiUrlWP()`/`obtenerNonceWP()` → `POST /ai/chat` con `X-WP-Nonce`), residual del dominio IA que aún no tiene proxy backend Rust. Es el servicio legacy deliberado documentado en la pasada 1 (F-11-08) y listado en `roadmap.md` bajo «dominios con credenciales externas». Se conserva como observación vinculada al roadmap; cuando se implemente el proxy IA en Rust, este camino debe migrarse a `/api` con CSRF.

<!-- Anotar aquí los hallazgos con formato H-MOD-NN. -->

