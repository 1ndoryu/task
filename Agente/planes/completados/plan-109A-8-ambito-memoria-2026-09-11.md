# Plan 109A-8 — Adopción de `AmbitoMemoria` (glory-harness 109A-2) en TASKS

**Estado:** CERRADA 11-09 (Global temporal; gate `quality:check` PASS; sin commit por WIP mixto)
**Fase actual:** — (F4 documental hecha; aislamiento real = fase futura)
**Origen:** `039A-1` · **Rama:** `main` (`ahead 41`, WIP 1.A+F2 sin commit — no tocar)
**Causa:** `glory-harness` cerró `109A-2` (memoria estrictamente por proyecto) y cambió el
contrato; TASKS consume por ruta (`Cargo.toml:57` → `../glory-harness/core`, sin versión) y
`main` ya no compila: 4 errores ajenos commiteados (verificados por lectura + `git show HEAD`).

## Alcance / no alcance

- **Sí:** adaptar los 4 sitios, migración Postgres con ámbito, pruebas de aislamiento, gate y cierre.
- **No:** cambiar la semántica de `AmbitoMemoria` (vive en el harness); tocar el WIP 1.A/F2;
  commitear el WIP ajeno ni propio sin autorización separada.

## Fases

- **F0 — Decisión de producto (DECIDIDA 11-09: Global temporal).** TASKS usa
  `AmbitoMemoria::Global` en todas las llamadas; el aislamiento real por proyecto queda
  para una fase posterior. Consecuencia: F1 se reduce a compatibilidad (sin columna de ámbito
  por ahora; `UNIQUE(user_id, clave)` sigue válido con un solo ámbito) y F2 pasa `Global`
  explícito en los 4 sitios.
- **F1 — Migración Postgres:** `ALTER agente_memoria ADD proyecto_id UUID NULL` (o
  `workspace_id TEXT DEFAULT ''` como el harness), backfill legacy → global, unicidad
  `(user_id, clave)` → `(user_id, proyecto_id, clave)` (ojo: `NULL` no colisiona en Postgres;
  usar centinela o índice parcial). Base actual: `migrations/20260829000000_agente.up.sql:73-82`
  + `20260907000000_agente_memoria_auditoria.up.sql:7-10`. Verificable: `sqlx migrate run` up/down
  en local limpio.
- **F2 — Adopción del puerto** (contrato nuevo en `glory-harness/core/src/contrato/ports.rs:242-258,305-308`):
  1. `src/agent/adaptador.rs:406` `memoria_listar` +1 param `ambito` (+ importar `AmbitoMemoria`;
     hoy ni se importa, `adaptador.rs:18-21`),
  2. `adaptador.rs:437` `memoria_upsert` +1 param,
  3. `adaptador.rs:469` `memoria_borrar` +1 param,
  4. `src/handlers/agente_config.rs:17` fijar `TurnoConfig.ambito_memoria`
     (campo nuevo `runtime/mod.rs:90`, default `Global` en `:130`; revisar también
     `scheduler.rs:54` que usa `TurnoConfig::default()`),
  5. implementar `memoria_ambitos` + `WHERE` por ámbito desde el área activa de la conversación.
  Verificable: diff acotado a esos ficheros.
- **F3 — Pruebas de aislamiento:** portar casos del harness (`memoria_aislada_entre_global_y_proyectos`,
  `upsert_repite_clave_solo_en_su_ambito`) a test sqlx de TASKS. Verificable: `npm run check:back`
  (canónico `package.json:9`: requiere Postgres + `cargo check`) + `npm test` en verde.
- **F4 — Cierre:** `task:check`, archivar en `Agente/completados/`, commit explícito (sin `git add .`).

## Referencias

- Contrato: `../glory-harness/core/src/contrato/ports.rs:69-110,242-258,305-308`
- Diseño harness: `../glory-harness/Agente/planes/completados/plan-109A-memorias-por-proyecto-2026-09-10.md:54-70`
- Evidencia previa: `Agente/completados/tareas-2026-09-10.md:70-84`
