# Auditoría SOLID — task — API generado (Orval) (checklist archivos)

> Módulo: `F10` · Revisar archivo por archivo y anotar violaciones (SOLID, reglas, rendimiento, seguridad, errores) con formato `- [ ] **H-F10-NN** `SEV` `CAT` — `archivo:líneas` — qué viola y por qué`. Tildar el checkbox al terminar la revisión del archivo.

| # | Rev | Archivo | Líneas | Hallazgos |
|---|---|---|---|---|
| 1 | [x] | `frontend/src/api/generated/activity/activity.ts` | 605 | — |
| 2 | [x] | `frontend/src/api/generated/auth/auth.ts` | 371 | — |
| 3 | [x] | `frontend/src/api/generated/dashboard/dashboard.ts` | 152 | — |
| 4 | [x] | `frontend/src/api/generated/gloryRSAPI.schemas.ts` | 675 | — |
| 5 | [x] | `frontend/src/api/generated/habits/habits.ts` | 374 | — |
| 6 | [x] | `frontend/src/api/generated/health/health.ts` | 257 | — |
| 7 | [x] | `frontend/src/api/generated/notes/notes.ts` | 1048 | — |
| 8 | [x] | `frontend/src/api/generated/notifications/notifications.ts` | 503 | — |
| 9 | [x] | `frontend/src/api/generated/profile/profile.ts` | 226 | — |
| 10 | [x] | `frontend/src/api/generated/projects/projects.ts` | 119 | — |
| 11 | [x] | `frontend/src/api/generated/shared/shared.ts` | 912 | — |
| 12 | [x] | `frontend/src/api/generated/tasks/tasks.ts` | 119 | — |
| 13 | [x] | `frontend/src/api/generated/teams/teams.ts` | 517 | — |
| 14 | [x] | `frontend/src/api/generated/timeline/timeline.ts` | 703 | — |

## Hallazgos

- **F10 sin hallazgos nuevos (2026-08-25, contraste ligero):** código generado por Orval sin señales de contaminación (`0 @ts-ignore`/`as any`); el snapshot (`gloryRSAPI.schemas.ts`) sigue presente y no se detectó drift en el grep. La pasada 1 ya confirmó el modo tags-split y la decisión de contrato `unknown` espejo. Sin regresión — se mantiene el requisito de `openapi:export` + `codegen` sin drift del roadmap.

<!-- Anotar aquí los hallazgos con formato H-MOD-NN. -->

