# CHANGELOG — tasks-core

## 0.1.0 (2026-10-07, 07AA-1 F1b)

- Núcleo inicial: `tipos`, `validaciones` (topes 1–200 espejo del bulk), `cliente`
  (`GET /api/projects/:legacy_id/tasks`, `POST /api/tasks/reordenar`, errores
  `no-autenticado/no-encontrado/validacion/lote-duplicado/cuota/red/servidor`),
  `operaciones` (bulk por posición, fusión, `kanban.v1`) y `jerarquia` (migra desde
  `frontend/src/app/utils/jerarquiaTareas.ts`, que queda como fachada).
- Puerta `check-agnostico.mjs`: veto de imports + type-check + tests.
