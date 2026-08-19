# Auditoría SOLID — Frontend 10: API generado (Orval) (14 archivos, 6.581 líneas)

> Código de codegen (Orval `tags-split`): NO se revisa línea por línea. Verificar: modo `tags-split` (regla 9, prohibido `generated.ts` monolítico), sincronía con el snapshot OpenAPI, y tipos compartidos en `gloryRSAPI.schemas.ts`.
> Generado 2026-08-19.

## Checklist

| # | Verificado | Archivo | Líneas | Hallazgos |
|---|:---:|---|:---:|---|
| 1 | [x] | api/generated/gloryRSAPI.schemas.ts | 675 | — |
| 2 | [x] | api/generated/activity/activity.ts | 605 | — |
| 3 | [x] | api/generated/auth/auth.ts | 371 | — |
| 4 | [x] | api/generated/dashboard/dashboard.ts | 152 | — |
| 5 | [x] | api/generated/habits/habits.ts | 374 | — |
| 6 | [x] | api/generated/health/health.ts | 257 | — |
| 7 | [x] | api/generated/notes/notes.ts | 1048 | — |
| 8 | [x] | api/generated/notifications/notifications.ts | 503 | — |
| 9 | [x] | api/generated/profile/profile.ts | 226 | — |
| 10 | [x] | api/generated/projects/projects.ts | 119 | — |
| 11 | [x] | api/generated/shared/shared.ts | 912 | — |
| 12 | [x] | api/generated/tasks/tasks.ts | 119 | — |
| 13 | [x] | api/generated/teams/teams.ts | 517 | — |
| 14 | [x] | api/generated/timeline/timeline.ts | 703 | — |

## Hallazgos

## Hallazgos F10

- [x] **H-F10-01** `INFO` `TIPOS` — api/generated/gloryRSAPI.schemas.ts:13 (`detalles: unknown`) y análogos — el código generado es espejo del contrato OpenAPI del backend (campos `serde_json::Value` se tipan `unknown`). Sin violación en el generado (Orval `tags-split` ✓, snapshot `openapi.json` versionado ✓, mutator `axios-instance.ts` ✓, 14/14 archivos trackeados en git ✓). Si se quiere tipado fuerte de los `unknown`, tipar los modelos en Rust; opcional: regenerar con Orval v9.
  - ✅ Resuelto 2026-08-19 (remate) por decisión: `unknown` es el espejo correcto de `serde_json::Value` en el contrato OpenAPI; tipar fuerte exige cambiar los modelos Rust (fuera de tanda). Regeneración con Orval v9 anotada como mejora opcional. Sin cambios de código.

## Verificación estructural (sin hallazgos)

- `mode: 'tags-split'` en orval.config.ts ✓ (regla 9: prohibido `generated.ts` monolítico)
- Schemas compartidos en `gloryRSAPI.schemas.ts` ✓
- Snapshot `api/openapi.json` versionado (sin depender de servidor manual) ✓
- `customInstance` (axios-instance.ts) como mutator único ✓
- Archivos generados trackeados en git (14/14) ✓
