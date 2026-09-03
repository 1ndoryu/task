# Plan maestro: cero-deuda Sentinel+VarSense en todos los proyectos

- **ID:** 039A-1 · **Fecha:** 2026-09-03 · **Estado:** activo (Fase 0 pendiente)
- **Origen:** campaña 029A-1 (TASKS, bloques 1–5 cerrados) + reparación del gate compartido (doctor readyForGate:true).
- **Inventario vivo:** `area-trabajo/TABLA-sentinel-varsense-2026-09-02.md` (actualizada 09-03 para TASKS).
- **Evidencia previa:** `Agente/completados/tareas-2026-09-03.md`.

## 1. Objetivo

Dejar los 10 proyectos de la TABLA en **0 errores** Sentinel+VarSense, con cada warning/hint restante **resuelto o clasificado como excepción justificada** (WIP ajeno, decisión de diseño, FP del detector con caso mínimo). Si un hallazgo es FP real del detector, **se corrige la herramienta** (pin+setup+lock por consumidor, §6) en vez de parchear el proyecto.

## 2. Alcance / no alcance

- **Alcance:** workspace-manager, RESTAURANTE, ONG AGAPE, WANDORIUS, coolify-manager-rs, gloryapi, Glory-Laminal, GLORYPORT, glory-harness, PROYECTO TASKS. Hallazgos Sentinel (código) + VarSense (CSS/variables). Backlog de FPs de ambas herramientas.
- **No alcance:** deploys/producción; cambios visuales o funcionales que un hallazgo no exija; commits/push sin autorización explícita; migraciones de documentación legacy.

## 3. Estado inicial (TABLA 09-02; TASKS re-medido 09-03 con 0.7.7+V22)

| Proyecto | Sentinel | VarSense | Nota |
|---|---|---|---|
| TASKS | 0e/66w/6h ✅ | 0e/429w ✅ | Clasificado entero; quimeras en WIP usuario |
| workspace-manager | 0e/25w/4h | 0e/39w/4i | Pequeño, buen candidato piloto |
| RESTAURANTE | 0e/67w/22h | 0e/77w/21i/39h | Mediano-grande |
| ONG AGAPE | 0e/109w/1h | 0e/86w/1i/4h | sqlx×61 dominan (patrón disable ya probado) |
| WANDORIUS | 0 | 0e/57w/89i | Solo VarSense |
| coolify-manager-rs | timeout 150s | 0e/17w/1i | Reintento con timeout mayor / por paquetes |
| gloryapi | 0e/2w | 0e/37w/1i/38h | Pequeño |
| Glory-Laminal | 0 | 0e/5w/23i/14h | Pequeño |
| GLORYPORT | 0e/1w | 0 (Rust puro) | Trivial |
| glory-harness | 0e/9w | 0 (Rust puro) | ⚠️ dependencia de TASKS: cambios aquí re-miden TASKS |

**Advertencia basal:** los números no-TASKS se midieron el 09-02 con Sentinel 0.7.4 y VarSense pre-V22. La Fase 0 los re-mide con los binarios actuales antes de clasificar.

## 4. Fases

### Fase 0 — Re-baselining (solo lectura, sin editar)

1. Correr `sentinel analyze` + `varsense all --format json` por proyecto con 0.7.7+V22; guardar JSON en `C:\tmp` (no en repos).
2. coolify-manager-rs: reintento con timeout 600s; si persiste, por subpaquetes (`--file`/workspace parcial).
3. Actualizar la TABLA con los nuevos números. Criterio de salida: TABLA con 10/10 proyectos medidos con binarios actuales.

### Fase 1 — Cierre TASKS (casi hecha)

1. Gate final `task:check` cuando el usuario autorice (requiere decidir commit de 28+adelantos + lock).
2. Publicar tag `v2.2.1-v22` al remoto de varsense si se quiere oficial (hoy solo local).
3. Criterio de salida: gate PASS o excepciones firmadas; plan a `completados/`.

### Fase 2 — Proyectos pequeños (por proyecto, en serie)

Orden (menor→mayor, dependencias al final): GLORYPORT → gloryapi → Glory-Laminal → workspace-manager → WANDORIUS (solo VarSense) → coolify-manager-rs → glory-harness → RESTAURANTE → ONG AGAPE.

Por proyecto, mismo protocolo probado en TASKS:

1. Preflight del proyecto (raíz, `git status`, roadmap local, doctor).
2. Clasificar hallazgos: **seguro-no-WIP** (se resuelve) / **WIP ajeno** (excepción) / **diseño** (excepción con dueño) / **posible FP** (→ Fase 3) / **muy arriesgado** (→ sub-plan propio).
3. Resolver por sub-bloques con validación al cierre de cada uno (type-check/tests/build del stack afectado).
4. Registrar en `Agente/completados/` del proyecto + actualizar TABLA.
5. Sin commit sin autorización; no mezclar deuda ajena fuera del hallazgo.

### Fase 3 — Herramientas (FPs y mejoras del detector)

Backlog inicial (con caso mínimo):

1. **FP-S1** (sentinel): el binario solo exime `style` de 1 var autocerrado; el checkout contempla más (documentado en `TareaBadges.tsx:69`). Repro: objeto de 2 vars + disable.
2. **FP-S2** (sentinel): la regla no salta comentarios `{/* */}` (`SelectorRepeticionPill:38`).
3. **MEJ-V1** (varsense): indexar vars inyectadas vía `style={{'--x': …}}` en React para `variableNoDefinida` (hoy exige registrar el CSS en `variableFiles`).
4. Los que salgan de la Fase 2.

Reparación (§6): fix en checkout → compile+suite → pin+tag → `quality:setup` → lock por consumidor → doctor → re-medir proyectos afectados. Nunca editar `sentinel.lock.json` a mano (solo commit+sha tras setup).

### Fase 4 — Sub-planes de riesgo (se crean bajo demanda)

Criterios para abrir sub-plan en vez de resolver directo: toca persistencia crítica, cambia computados visuales sin dueño presente, afecta a `glory-harness` (re-mide TASKS), o requiere exponer red/puertos. Cada sub-plan: objetivo, riesgo, alternativa segura, validación y DoD propios.

### Fase 5 — Cierre global

Gate por proyecto donde aplique, TABLA final 10/10, archivar este plan en `completados/` y registrar lecciones reutilizables.

## 5. Reglas operativas (heredadas 029A-1)

1. **WIP ajeno no se toca**: si el hallazgo vive en fichero con cambios sin commitear de otro, excepción documentada.
2. **Sin commit/push/deploy sin autorización explícita** (TASKS: 28 por delante de origin; cada proyecto, su política).
3. **Verificación proporcional real**: no basta compilar; type-check/tests/build del stack tocado + re-medición de la herramienta.
4. **`C:\tmp` < 7GB** (hoy 6.45GB): antes de compilar, podar targets huérfanos; artefactos temporales fuera de los árboles.
5. **Remoto solo vía `coolify-manager-rs`** si un proyecto lo exige; esta campaña es local.
6. Un gate rojo preexistente se reporta y se separa; no se mezcla con el bloque.

## 6. Riesgos

- `glory-harness` es lib de TASKS: resolver allí obliga a re-medir TASKS (Fase 2 lo pone antes que el cierre final).
- Checkouts compartidos (`area-trabajo/.quality-tools`): un fix del detector mueve números de todos; re-medir tras cada cambio de herramienta.
- `variables.css` y stores de diseño son propiedad de sus dueños: tokenizar sin ellos cambia el visual.

## 7. Gate y Definition of Done

- DoD por proyecto: 0 errores, warnings/hints resueltos o con excepción firmada (motivo + dueño), evidencia en completadas, TABLA actualizada.
- DoD global: 10/10 proyectos DoD + backlog de herramientas vacío o con issues abiertas trazables + este plan archivado.
- Gate canónico el declarado por cada proyecto; donde no hay gate, la re-medición con binarios fijados + verificación del stack es la evidencia.

## 8. Estado y siguiente paso

- **Estado:** activo. Fase 0 ✅ completa (18 JSONs en `C:\tmp\fase0-rebaseline\`, TABLA actualizada). Fase 1 parcial (TASKS medido, gate pendiente de autorización).
- **Fase 2:** GLORYPORT ✅ (sentinel 1w→0, gate completo verificado por orquestador, sin commit) → en curso: **gloryapi** (partido en 2 misiones: A Sentinel 2×limite-lineas, B VarSense index.css+1 tsx).
- [x] GLORYPORT (sentinel 0/0/0/0, varsense 0)
- [ ] gloryapi · [ ] Glory-Laminal · [ ] workspace-manager · [ ] WANDORIUS · [ ] coolify-manager-rs · [ ] glory-harness · [ ] RESTAURANTE · [ ] ONG AGAPE
- **Siguiente paso verificable:** cerrar gloryapi-A.
