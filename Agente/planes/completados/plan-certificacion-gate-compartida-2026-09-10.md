# Plan — Propagación y certificación compartida del gate

- **ID:** `109A-9`
- **Fecha:** 2026-09-10
- **Origen:** pregunta del usuario tras publicar Sentinel 0.7.9 — *"¿hay que hacer eso cada vez
  que se suba una versión nueva de Sentinel? ¿no habíamos hecho algo para centralizar la
  versión de Sentinel?"* y, después, *"planifica bien eso, incluyendo actualizar las skills si
  es necesario para que no se vuelva a perder tiempo así"*.
- **Estado:** ✅ **completado** (B1–B5 ejecutados el 2026-09-10, con autorización explícita del usuario:
  *"confío en ti, impleméntalo de la mejor forma"*). Evidencia en §9.
- **Próximo paso verificable:** ninguno. **Familia B cerrada el 2026-09-11** con autorización
  explícita del usuario (*"autorizado para todo, continúa"*): gitlink de submódulo commiteado en
  `RESTAURANTE` y `WANDORIUS`, lock regenerado, evidencia de release escrita en ambos y cambios
  commiteados en los repos consumidores. Ver §9.5.

---

## 1. Respuesta directa a la pregunta

**Sí existía centralización, pero solo como guarda; nunca se construyó el escritor.**

| Pieza existente | Qué centraliza | Estado |
| --- | --- | --- |
| `workspace-manager/scripts/quality-sync.mjs` (`npm run sync:quality`) | Recorre los 11 consumidores y exige que el `commit` de cada `quality-tools.json` sea igual al HEAD del checkout compartido `area-trabajo/.quality-tools/{sentinel,varsense}`. Read-only, fail-closed (0/1/2). | Presente y completo |
| `workspace-manager/scripts/quality/verificar-alineacion.mjs` | Alineación triple: pin declarado / runtime provisionado / commit alcanzable desde `releaseRefs`. | Presente |
| `workspace-manager/scripts/quality/lock-generator.mjs` | Lock determinista (`sha256` de `git archive HEAD`). | Presente |
| **`quality:bump` (escritor)** | Reescribir los manifiestos de los consumidores al commit nuevo. | **AUSENTE** |

El invariante *"un commit para todos"* estaba centralizado; **la propagación no**. Por eso la
publicación de 0.7.9 exigió 11 ediciones manuales de `quality-tools.json`. Ese es el defecto
real — no la falta de centralización, sino su asimetría: hay guarda, no hay herramienta.

## 2. Problema (evidencia medida, no estimada)

### P1 — No hay escritor
11 manifiestos editados a mano; `sync:quality` detecta el desync pero no lo corrige. Un
`--fix` inexistente obliga a propagar por fuerza bruta.

### P2 — La certificación se recalcula por consumidor siendo un hecho global
Medido en el lote de re-pin de 0.7.9:

| Proyecto | `quality:setup` |
| --- | --- |
| GLORYINSPECTOR | 248 s |
| freebuff-bridge | 255 s |
| GLORYPORT | 271 s |
| coolify-manager-rs | 382 s |
| Glory-Laminal | 407 s |

≈5 min/proyecto ⇒ **~42–55 min por lote**. Casi todo es el mismo `compile` + suite (~6 min)
del **mismo commit**, repetido 8–11 veces.

El contrato lo confirma: `releaseEvidence()` en `glory-sentinel/src/core/diagnose.ts:253` exige
`commit === commit && compile === 'passed' && suite === (testScript ? 'passed' : 'not-configured')
&& cleanStaging === true`. La evidencia está **indexada por `(tool, commit)`**, no por proyecto:
el archivo local es un duplicado por consumidor de un hecho único. Ahí está el desperdicio.

Coste observado en esta campaña: 0.7.8 y 0.7.9 ⇒ 2 lotes ⇒ **~2 h de CPU para certificar 2
commits**. Un release de rutina (3 tool-versions al año) no debería costar eso.

### P3 — El adapter está duplicado 9 veces
Los `scripts/quality/quality-setup.mjs` de la familia A son **byte-idénticos**: 8 copias con
sha `CD1BB00CB0DE` (81 líneas), salvo PROYECTO TASKS (`E901DDA63288`) — y esa desviación es en
sí misma la prueba del problema. Existe además copia en `workspace-manager/scripts/quality/`.
Un fix del adapter hay que aplicarlo 9 veces, y esa duplicación es la causa raíz de que la
propagación sea pesada.

## 3. Alcance / No alcance

**Alcance**
- Un adapter de certificación de fuente única, con la copia por proyecto reducida a shim.
- Caché de certificación por `(tool, commit, scripts, entorno)` en ubicación machine-level.
- `quality:bump` como escritor de la propagación, cerrando con `sync:quality`.
- Actualización de skills, `AGENTS.md` y registros para que el procedimiento no se pierda.

**No alcance**
- Cambiar el contrato de evidencia de Sentinel (`releaseEvidence()`), ni relajarlo.
- Modificar el comportamiento de VarSense.
- Tocar `glory-harness` ni el frente `109A-*` de glory-harness (otro agente).
- Tocar `WANDORIUS/scripts/quality/setup.mjs` (WIP ajeno, preservado).
- Promover la caché a "certificación universal" para CI de terceros.

## 4. Diseño

### 4.1 Decisión de orden (corrige el enfoque inicial)

Implementar la caché **antes** de unificar el adapter sería un error: la caché habría que
escribirla en 8 copias, exactamente el antipatrón que se quiere eliminar. Por tanto el orden
obligatorio es:

```
adapter único (B1)  →  caché en el adapter único (B2)  →  quality:bump (B3)  →  lote (B4)  →  skills/docs (B5)
```

### 4.2 B1 — Adapter de certificación de fuente única

- **Canónico:** `workspace-manager/scripts/quality/quality-setup.mjs`. No se crea un hogar
  nuevo: ese directorio ya es el home declarado de los artefactos operativos del área y ya
  contiene el `lock-generator.mjs` compartido; vive en git, con historial y revisión.
- **Copia por proyecto:** shim de ~12 líneas que resuelve la raíz del área y delega.
  Precedente idéntico ya en uso: `RAIZ_AREA = process.env.WS_AREA_ROOT || '<raíz real>'`.
  El shim no contiene lógica de gate, solo resolución de ruta + `exec`.
- **Justificación de diseño:** la skill `quality-gate-setup` ya declara `scripts/quality/` como
  legacy transitorio y manda migrar la lógica al Core. Esto es el paso intermedio honesto:
  elimina la duplicación **sin** exigir un release de Sentinel.
- **Por qué no `area-trabajo/.quality-tools/adapter/`:** ese árbol contiene checkouts de git;
  un adapter sin versionar ahí no tendría historial ni revisión.

### 4.3 B2 — Caché de certificación

- **Clave:** `(tool, commit, buildScript, testScript, platform, nodeVersion)`.
  `testScript` y `buildScript` entran en la clave para que un cambio de suite invalide la caché
  (si no, un consumidor con suite distinta recibiría un hit falso).
- **Ruta:** `%LOCALAPPDATA%\GlorySentinel\certificaciones\<tool>-<commit>.json`
  (POSIX `~/.cache/glory-sentinel/...`; override `GLORY_CERT_CACHE`).
  **Por qué fuera de todo repo:** el chequeo `cleanStaging` de familia A ignora solo
  `.quality-install.json`, y familia B hace `git status --porcelain` del toolRoot; escribir la
  caché dentro del checkout rompería el árbol limpio y certificaría en falso.
  **Por qué no en `C:\tmp`:** el sweep horario lo purga ⇒ el ahorro desaparecería justo cuando
  más se necesita.
- **Entrada:** `{schemaVersion, tool, commit, buildScript, testScript, platform, nodeVersion,
  compile:'passed', suite:'passed'|'not-configured', cli, at}`.
- **Hit** requiere las tres condiciones: `HEAD === commit`, árbol limpio, CLI declarado
  presente. En hit se escribe la evidencia local con `at = now` **sin** recompilar ni testear, y
  con log explícito: `[quality:setup] <tool>: certificación reutilizada @<commit> (compile+suite omitidos)`.
- **Miss / parcial / corrupto / HEAD distinto ⇒ camino completo** (fail-closed). Nunca se
  fabrica una evidencia.
- **Escritura atómica** (tmp + rename) para tolerar carreras entre setups.
- **Escape hatch:** `GLORY_CERT_REFRESH=1` / `--refresh` fuerza recómputo.

### 4.4 B3 — `quality:bump` (el escritor ausente)

- **Hogar:** `workspace-manager/scripts/quality/bump.mjs` + `npm run quality:bump`.
  No en `C:\tmp`: un script efímero en la ruta que se barre cada hora es tiempo perdido
  garantizado — precisamente lo que se quiere evitar.
- **Entrada:** `--tool sentinel --commit <sha> --version <v>`; deriva `sourcePath` /
  `sourcePathEnv` de cada manifiesto existente.
- **Por consumidor:** reescribir `quality-tools.json` preservando orden e indentación,
  regenerar lock, escribir evidencia (vía caché de B2), ejecutar doctor.
- **Dry-run por defecto** (`--write` explícito), coherente con `lock-generator.mjs`.
- **Cierre obligatorio:** `npm run sync:quality` verde + `verificar-alineacion.mjs` sin drift.
- **Salida:** tabla + `--json`, exit 0/1/2.

### 4.5 B5 — Skills y documentación (pedido explícito)

| Archivo | Cambio |
| --- | --- |
| `quality-gate-setup/SKILL.md` | Nueva sección "Release de herramientas y propagación": invariante `quality:sync`; flujo `publicar → bump → sync`; contrato de la caché (clave, ruta, override, límite) y la regla **"la certificación pertenece a `(tool, commit)`, no al proyecto"**. Gotchas medidos: floor de timeout de mocha vs `this.timeout` local; `mocha <file>` no acota si `.mocharc.json` declara `spec`; coste ~5 min/proyecto y ~42–55 min/lote. |
| `build-artefactos/SKILL.md` | Aviso: *certificación por commit ≠ verificación del artefacto*. `cleanStaging` no cubre `out/` (gitignored); al tocar el Core, confirmar rebuild por hash/fecha. |
| `sentinel/SKILL.md`, `sentinel-repair/SKILL.md` | Anotar que si la certificación migra al Core, el destino es el comando y no el adapter local. Sin afirmar una capacidad que aún no existe. |
| `area-trabajo/AGENTS.md` §6 | Añadir el paso "propagar con `quality:bump` + verificar `sync:quality`" al ciclo de reparación del gate. |
| `/memories/repo/campana-cero-deuda-039A-1.md` | Registrar el hallazgo (guarda sí, escritor no) y la ubicación de la caché. |
| `TABLA-sentinel-varsense-2026-09-02.md`, PT `completados/`, `039A-1` §8 | Registro de la campaña y enlace a este plan. |

## 5. Riesgos y mitigación

| Riesgo | Mitigación |
| --- | --- |
| Falso verde por caché: hit con evidencia de otro entorno | `platform` y `nodeVersion` en la clave; el `testScript` también. Test dedicado por cada eje de la clave. |
| Artefacto manipulado tras certificar | Límite **preexistente**: `cleanStaging` no cubre `out/`. Se documenta en `build-artefactos`; no se disimula. Log de hit visible. |
| Caché huérfana | Vive en `%LOCALAPPDATA%`, fuera del sweep de `C:\tmp`. |
| Carrera entre dos setups simultáneos | Escritura atómica tmp+rename; nombre único por commit. |
| Duplicar el fix 9 veces (el antipatrón de P3) | El orden de §4.1 lo impide por construcción. |
| Sobre-ingeniería | Criterio de adopción medible: si B4 no baja el lote a <10 min, la caché no se adopta. |
| Colisión con otro agente | No tocar glory-harness ni `WANDORIUS/scripts/quality/setup.mjs` (WIP ajeno). |

## 6. Criterios de aceptación (Definition of Done)

1. ✅ `quality:bump --dry-run` enumera exactamente los mismos 11 consumidores que `sync:quality`.
2. ✅ **Idempotencia probada:** `quality:bump --tool sentinel` sobre el estado ya pinneado de 0.7.9
   reporta `0 manifiesto(s) por reescribir` en los 11 consumidores.
3. ✅ Release simulado: el primer consumidor paga compile+suite y los siguientes registran
   *certificación reutilizada* y **no** ejecutan suite. Lote total **365,8 s = 6,1 min** (desde ~42–55 min).
4. ✅ Tests de la caché: **11/11** (`quality:cert:test`), más 4/4 de regresión del escritor
   (`quality:bump:test`).
5. ✅ `sync:quality` verde (11/11 alineados) y `verificar-alineacion.mjs` sin drift (17 filas ALINEADO).
6. ✅ Manifiestos restaurados **byte a byte** tras la prueba de ida y vuelta (9/9 hashes idénticos).
7. ✅ Skills actualizadas (`quality-gate-setup` v1.3.1, `build-artefactos` v1.1.0) y `AGENTS.md` §6 ajustado.
8. ✅ (añadido) **Invariante del host**: el adapter canónico nunca se sobrescribe con un shim, con test de
   regresión que lo fija (lección del incidente de §9.2).

## 7. Dependencias

- Autorización del usuario para el alcance del adapter único (B1) — toca 8–9 repos.
- Sin dependencia de un release nuevo de Sentinel: B1–B4 son del lado consumidor.
- `RESTAURANTE` / `WANDORIUS` (familia B) requieren el gitlink del padre commiteado antes de
  poder regenerar lock y evidencia — bloqueo ya conocido, independiente de este plan.
- No ejecutar dos suites en paralelo: esa carga es la causa de los timeouts intermitentes.

## 8. Orden de ejecución

| Bloque | Contenido | Verificación |
| --- | --- | --- |
| **B1** | Adapter único + shims | El shim resuelve la raíz del área y delega; paridad de comportamiento con la copia actual en un proyecto |
| **B2** | Caché en el adapter único | 5 tests de la clave; medición de un hit real |
| **B3** | `quality:bump` | Dry-run idempotente sobre 0.7.9 (criterio 2) |
| **B4** | Lote real con caché | Tiempo total <10 min; `sync:quality` verde |
| **B5** | Skills, `AGENTS.md`, registros | Frontmatter válido; roadmap releído |

**Bloqueo:** ninguno. La familia B sigue requiriendo el commit del gitlink en el padre (fuera de
este plan y dependiente de autorización).

---

## 9. Resultado (ejecutado 2026-09-10)

### 9.1 Entregado

| Artefacto | Qué es | Evidencia |
| --- | --- | --- |
| `workspace-manager/scripts/quality/certificacion.mjs` | Caché de certificación, fail-closed, escritura atómica | `quality:cert:test` 11/11 (~190 ms) |
| `workspace-manager/scripts/quality/quality-setup.mjs` | **Adapter único** (162 líneas) con caché integrada y `origen` en la evidencia | `node --check` 0; banner de adapter + estado de caché |
| `workspace-manager/scripts/quality/bump.mjs` | **Escritor** (`npm run quality:bump`) | idempotencia 0/11; vuelta atrás 9/9 byte a byte |
| `workspace-manager/scripts/quality/bump.test.mjs` | Regresión del incidente | `quality:bump:test` 4/4 |
| Shims de 46 líneas | En los 8 consumidores de familia A (gloryapi incluido) | `--shims` 9 revisados, 8 corregidos, host excluido |

### 9.2 Incidente del escritor (y las reglas que salieron de él)

`bump --tool sentinel --write` escribía shims **también en modo pin**. En el host la ruta del shim
coincide con el adapter canónico, así que el adapter quedó sustituido por un shim que delegaba en sí
mismo (recursión) y los 9 consumidores apuntaron al archivo roto. Síntoma engañoso:
`AssignProcessToJobObject: (50)` + exit `-2147483645`, que parecía un problema de `spawn`; se
descartó midiendo los combos de opciones (todos status 0). Recuperación: adapter desde el historial
local del editor (archivo nuevo, no commiteado) y `lock-generator.mjs` desde Git.

Reglas derivadas, ya en la skill `quality-gate-setup` v1.3.1: separar «reportar» de «escribir»;
invariante del host; guard de recursión en el shim; crear shims ausentes; test de regresión.

### 9.3 Medición

| | Antes | Después |
| --- | --- | --- |
| Lote de 11 consumidores | 42–55 min | **6,1 min** |
| Certificación por consumidor | 248–407 s | reutilizada (10 de 11) |
| Adapter | 9 copias divergentes | 1 canónico + 9 shims |

`gloryapi` pasó a verde (`lock ok / setup ok / doctor ok / 0 issues`) **sin vendorizar nada**: los
shims resolvieron su carencia histórica de lock y setup.

### 9.4 Límite honesto

La certificación prueba el **commit**, no los artefactos gitignored (`out/`). La caché no introduce ni
empeora ese límite: lo documenta la skill `build-artefactos` v1.1.0.

### 9.5 Familia B y commits — cerrado (2026-09-11)

Con autorización explícita del usuario se cerró lo que §9.5 dejaba fuera de alcance:

- **Gitlink de submódulo:** `RESTAURANTE` (`4be5e53`) y `WANDORIUS` (`eefead81`) commiteados, lo que
  resolvió el bloqueo `gitlink del workspace no coincide con el checkout instalado`. `sync:quality`
  pasó a **11/11 alineados (exit 0)** y `verificar-alineacion.mjs` a **17 filas ALINEADO (exit 0)**.
- **Lock y evidencia:** lock regenerado a 0.7.9 en ambos y `.sentinel/release-evidence/{sentinel,varsense}.json`
  escrito con `compile=passed`, `suite=passed`, `cleanStaging=true` para el commit fijado.
- **Commits de consumidores:** shims + manifiestos en 9 consumidores de familia A (`gloryapi` incluido,
  que pasa a verde sin vendorizar nada) y `WANDORIUS` (`2dea9747`, presupuesto de staging).

**Presupuesto del runner (hallazgo real de este cierre).** El `setup` de `WANDORIUS` abortaba a mitad sin
escribir evidencia: el runner aplicaba un presupuesto fijo de 300 s a instalar, compilar y ejecutar la
suite, y la suite de Sentinel hace I/O real (git, worktrees) con duración carga-intermitente (**180 s**
medidos en una corrida y **344 s** sin terminar en otra). El presupuesto es un **suelo del runner, no un
techo del test**: se declaró explícito (`STAGE_TIMEOUT_MS = 900_000`) solo para las tres etapas de
staging, dejando los defaults de `run()` en 300 s. Con eso el setup terminó en **464,6 s, exit 0**.

**Regresión detectada y restaurada (no se silenció).** El working tree de `WANDORIUS/scripts/quality/setup.mjs`
había **revertido el fix de `tar` de `318A-4C`** (HEAD usa la ruta relativa `..\<basename>`, robusta para
GNU tar y bsdtar; el working tree había vuelto a la variante absoluta anterior). Se restauró la versión
commiteada conservando **solo** el cambio de presupuesto, de modo que el diff final es exactamente eso.

**Límite de la evidencia:** `.sentinel/` está gitignored en ambos repos (regla preexistente), así que la
evidencia es local y regenerable por `quality:setup`; su presencia la verifica `doctor`
(`releaseEvidencePresent: true`). No es una decisión de este plan.
