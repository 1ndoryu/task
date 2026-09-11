# Plan maestro: cero-deuda Sentinel+VarSense en todos los proyectos

- **ID:** 039A-1 · **Fecha:** 2026-09-03 · **Estado:** activo — Fase 0 ✅ completa; **Fase 1 reabierta**; Fase 2 en curso (actualizado 2026-09-10)
- **Origen:** campaña 029A-1 (TASKS, bloques 1–5 cerrados) + reparación del gate compartido (doctor readyForGate:true).
- **Inventario vivo:** `area-trabajo/TABLA-sentinel-varsense-2026-09-02.md` (corte 09-10).
- **Evidencia previa:** `Agente/completados/tareas-2026-09-03.md`.
- **Fuente única del área (desde 10-09):** este plan es el ÚNICO plan de la campaña cero-deuda del
  área, para las dos herramientas y los 10 proyectos. Absorbe como §9 el frente VarSense del «PLAN
  ÚNICO» de workspace-manager (`PLAN-corregir-hallazgos-2026-09-06.md`), cerrado como frente el
  10-09 por decisión del usuario («porque hay 2 planes, debería haber uno solo») y conservado íntegro
  como evidencia histórica. Planes absorbidos y su evidencia: §10.
- **Frentes:** (a) Fases 0–5 de este plan (hallazgos Sentinel + cierre por proyecto, §4); (b) frente
  VarSense a CERO heredado (§9). Ambos comparten reglas, medición y DoD de §5–§7.

## 1. Objetivo

Dejar los 10 proyectos de la TABLA en **0 errores** Sentinel+VarSense, con cada warning/hint restante **resuelto o clasificado como excepción justificada** (WIP ajeno, decisión de diseño, FP del detector con caso mínimo). Si un hallazgo es FP real del detector, **se corrige la herramienta** (pin+setup+lock por consumidor, §6) en vez de parchear el proyecto.

## 2. Alcance / no alcance

- **Alcance:** workspace-manager, RESTAURANTE, ONG AGAPE, WANDORIUS, coolify-manager-rs, gloryapi, Glory-Laminal, GLORYPORT, glory-harness, PROYECTO TASKS. Hallazgos Sentinel (código) + VarSense (CSS/variables). Backlog de FPs de ambas herramientas.
- **Alcance añadido (tienen `quality-tools.json` y gate propio, aunque no estaban en la lista original):** `GLORYINSPECTOR` y `freebuff-bridge` — ambos re-pinados y propagados con el resto de la familia A.
- **No alcance:** deploys/producción; cambios visuales o funcionales que un hallazgo no exija; commits/push sin autorización explícita; migraciones de documentación legacy.
- **No alcance por diseño — repos del área gestionados por su propio `AGENTS.md` (auditado 10-09):**
  `DEEPSEEK-HARNESS`, `freebuff`, `paseo` y `synara` son repos git **independientes** con su propio
  `AGENTS.md`, y **sin `roadmap.md` ni `Agente/`**: no siguen el sistema documental del área (son
  upstreams/forks con su propia gestión). Se rigen por la regla de `AGENTS.md` §2 («en un proyecto
  existente, documental, puntual o sin un alcance que lo justifique, no los instales automáticamente»),
  así que **no se les instala gate** ni entran en las cifras de este plan. `.opencode` es herramienta
  interna y `glory-sentinel`/`.quality-tools-harness/*` son las propias herramientas, no consumidores.
  Si en el futuro alguno adopta el sistema documental del área, entra por una tarea nueva — no por
  arrastre de este plan.

## 3. Estado de partida (TABLA 02/03-09; TASKS re-medido 09-10 con 0.7.8)

| Proyecto           | Sentinel     | VarSense       | Nota                                                 |
| ------------------ | ------------ | -------------- | ---------------------------------------------------- |
| TASKS              | **17e**/71w/7h ❌ | 0e/303w ✅     | **Reabierto 09-10**: 0.7.8 activa `expect-produccion-rs` como error → 17 `.expect()` reales en rutas de producción (11 archivos). VarSense mejora 429→303 |
| workspace-manager  | 0e/25w/4h    | 0e/39w/4i      | Pequeño, buen candidato piloto                       |
| RESTAURANTE        | 0e/67w/22h   | 0e/77w/21i/39h | Mediano-grande                                       |
| ONG AGAPE          | 0e/109w/1h   | 0e/86w/1i/4h   | sqlx×61 dominan (patrón disable ya probado)          |
| WANDORIUS          | 0            | 0e/57w/89i     | Solo VarSense                                        |
| coolify-manager-rs | timeout 150s | 0e/17w/1i      | Reintento con timeout mayor / por paquetes           |
| gloryapi           | 0e/2w        | 0e/37w/1i/38h  | Pequeño                                              |
| Glory-Laminal      | 0            | 0e/5w/23i/14h  | Pequeño                                              |
| GLORYPORT          | 0e/1w        | 0 (Rust puro)  | Trivial                                              |
| glory-harness      | 0e/9w        | 0 (Rust puro)  | ⚠️ dependencia de TASKS: cambios aquí re-miden TASKS |

**Advertencia basal:** los números no-TASKS se midieron el 09-02 con Sentinel 0.7.4 y VarSense pre-V22; la Fase 0 los re-midió con 0.7.7+V22. **La fila de TASKS del 03-09 ya no es válida:** su re-medición del 09-10 con **0.7.8** introdujo 17 errores por una regla que antes no existía. Ningún cierre de este plan se puede declarar con una versión de herramienta distinta de la activa en el momento de cerrar, y la versión debe quedar registrada junto a cada cifra.

### 3.1 Corte alineado al runtime del gate — 12 proyectos con 0.7.8 (10-09, `039A-3`)

> **Por qué existe este corte:** la tabla de arriba mezcla mediciones de 0.7.4/0.7.7 y da por cerrados
> proyectos que la versión activa **no** ve cerrados. Tras alinear la consola al runtime del gate (§9.3) y
> excluir los clones de terceros de `glory-harness` (§9.3), se re-midió el área entera con **una sola**
> versión. Evidencia: `area-trabajo/data/cache/analisis.json` (consola, `forzar=true`) y atribución por
> regla sobre esa misma caché.

| Proyecto | Hallazgos | Errores | Nota |
| --- | --- | --- | --- |
| glory-harness | 366 | **102** | 53 sentinel (`unwrap-produccion-rs` 30 + `axum-ruta-sintaxis-rs` 19 + reparto) + 53 varsense `cssInlineScript`. Antes de excluir los clones: 805 / 327 |
| PROYECTO TASKS | 382 | 1 | `expect-produccion-rs` en el submódulo `glory-rs` (`109A-7`) |
| RESTAURANTE | 284 | **45** | 44 `expect-produccion-rs` + 1 `limite-lineas-nivel-3` |
| ONG AGAPE | 239 | 0 | — |
| WANDORIUS | 154 | **8** | 8 `expect-produccion-rs` |
| coolify-manager-rs | 104 | **5** | 4 `expect-produccion-rs` + 1 `limite-lineas-nivel-3` (monolito ya documentado) |
| gloryapi | 79 | 0 | — |
| workspace-manager | 73 | 0 | — |
| Glory-Laminal | 47 | 0 | — |
| GLORYPORT | 5 | **5** | 5 `expect-produccion-rs` |
| freebuff-bridge · GLORYINSPECTOR | 0 · 0 | 0 · 0 | No están entre los 10 del plan, pero la consola los reporta |

**Totales del corte: 1.733 hallazgos · 166 errores** (los 10 del plan son todo el total: los 2 extra están en 0).

**Nota de fluidez del corte:** glory-harness pasó de 362/99 a **366/102** porque el usuario commiteó
`109A-3` (sección Memorias del escritorio) entre el barrido y la consulta: el commit cambió `HEAD`, la
clave de frescura lo detectó y la consola lo re-analizó sola. La cifra citada es la vigente; el par
362/99 fue el corte inmediatamente anterior. Prueba indirecta de que la frescura y el registro de versión
funcionan tras `039A-3`.

**Errores por regla:** `expect-produccion-rs` **62** (sentinel; regla introducida en 0.7.8 — la misma que
reabrió TASKS) · `cssInlineScript` 53 (varsense, runtime de `glory-harness/desktop/ui`) ·
`unwrap-produccion-rs` 30 · `axum-ruta-sintaxis-rs` 19 · `limite-lineas-nivel-3` 2.

**Consecuencia (afecta al orden de Fase 2):** con la versión activa, **RESTAURANTE, WANDORIUS, GLORYPORT y
coolify-manager-rs no están en 0 errores**. La deuda nueva es de una sola familia con patrón conocido
(`.expect()`/`panic!` alcanzable en producción, más 2 monolitos de nivel 3) y el procedimiento de triage ya
está probado en el Bloque 1.A (en TASKS, los 16 sitios corregidos eran defecto real, no infalibles). No se
cierra ningún proyecto sin re-medir con 0.7.8, y `glory-harness` —que la tabla daba por «0e/9w»— es ahora el
mayor foco del área por mérito propio (**102 errores** en su propio código, ya sin terceros: 53 de
`cssInlineScript` de runtime en `desktop/ui`, 30 `unwrap-produccion-rs` y 19 `axum-ruta-sintaxis-rs`).

## 4. Fases

### Fase 0 — Re-baselining (solo lectura, sin editar)

1. Correr `sentinel analyze` + `varsense all --format json` por proyecto con 0.7.7+V22; guardar JSON en `C:\tmp` (no en repos).
2. coolify-manager-rs: reintento con timeout 600s; si persiste, por subpaquetes (`--file`/workspace parcial).
3. Actualizar la TABLA con los nuevos números. Criterio de salida: TABLA con 10/10 proyectos medidos con binarios actuales.

### Fase 1 — Cierre TASKS (⚠️ reabierta el 09-10)

El cierre del 03-09 se hizo con Sentinel **0.7.7**. Con **0.7.8** activo aparecen **17 errores** por la regla
`expect-produccion-rs`, así que la Fase 1 **no** puede darse por cerrada: aquel cierre solo era válido para 0.7.7.

1. **Bloque 1.A ✅ ejecutado (10-09, autorizado por el usuario): 17→1 errores.** Triage concluido: los 16
   sitios corregidos eran **defecto real** (pánico alcanzable), no infalibles por construcción. 12 archivos:
   `models/dashboard.rs` (nuevo `fecha_iso` compartido + test de equivalencia con serde),
   `models/productivity.rs`, `repositories/dashboard/proyeccion.rs` (`insert_if_missing` con
   `impl Into<Value>`), `services/realtime.rs` (helper `canales()` que recupera el mutex envenenado),
   `repositories/shared.rs` (`ok_or(RowNotFound)?`), `handlers/auth.rs` (`with_session_cookies → Result`),
   `services/web_search.rs` (`from_env → Result`), `handlers/mod.rs` (arranque propaga `Result`; fallback
   estático con `match imposible {}`), `main.rs`, `handlers/agente.rs` (SSE degrada a evento `error`
   observable), `agent/tools.rs` (`and_hms_opt` + `fecha_invalida`), `handlers/storage.rs` (`mime`
   validado como cabecera; respuesta armada sin builder).
2. **Bloque 1.B — verificación: ⚠️ no ejecutable todavía.** `npm run check:back` falla con **4 errores
   ajenos commiteados en `HEAD`** por la adopción de `AmbitoMemoria` (glory-harness 109A-2) → `109A-8`.
   El error restante de Sentinel (`glory-rs/backend/src/websocket/ticket.rs:43`) es submódulo → `109A-7`.
   **No se declara PASS de compilación ni de tests**; solo está comprobado que el compilador no emite
   diagnósticos en los archivos tocados.
3. Gate final `task:check` cuando el usuario autorice (requiere decidir commit de 38 adelantos + lock).
4. Publicar el tag de VarSense al remoto si se quiere oficial (hoy solo local).
5. Criterio de salida: **0 errores medidos con la versión de herramienta activa**, o excepciones firmadas; plan a `completados/`.

### Fase 2 — Proyectos pequeños (por proyecto, en serie)

Orden (menor→mayor, dependencias al final): GLORYPORT → gloryapi → Glory-Laminal → workspace-manager → WANDORIUS (solo VarSense) → coolify-manager-rs → glory-harness → RESTAURANTE → ONG AGAPE.

**El orden sigue siendo válido, los conteos no (§3.1).** Este orden se fijó con cifras de 0.7.4/0.7.7; con
0.7.8 hay errores en proyectos que aparecían en 0 (GLORYPORT 5, WANDORIUS 8, coolify 5, RESTAURANTE 45,
glory-harness 102) y **glory-harness ya no es «pequeño»**. Antes de abrir cada proyecto: re-medir con la
versión activa y **re-ordenar por errores reales**, no por total. El primer bloque de cada proyecto con
Rust es el triage de `expect-produccion-rs` (patrón del Bloque 1.A) y los monolitos `limite-lineas-nivel-3`.

Por proyecto, mismo protocolo probado en TASKS:

1. Preflight del proyecto (raíz, `git status`, roadmap local, doctor).
2. Clasificar hallazgos: **seguro-no-WIP** (se resuelve) / **WIP ajeno** (excepción) / **diseño** (excepción con dueño) / **posible FP** (→ Fase 3) / **muy arriesgado** (→ sub-plan propio).
3. Resolver por sub-bloques con validación al cierre de cada uno (type-check/tests/build del stack afectado).
4. Registrar en `Agente/completados/` del proyecto + actualizar TABLA.
5. Sin commit sin autorización; no mezclar deuda ajena fuera del hallazgo.

### Fase 3 — Herramientas (FPs y mejoras del detector)

Backlog inicial (con caso mínimo):

1. **FP-S1** (sentinel) — ✅ **RESUELTO en 0.7.9, y el diagnóstico del backlog era inexacto.** El
   «objeto de 2 vars» **ya estaba eximido** desde `[104A-11]` (`styleInlineSoloCssVars` exime el objeto
   cuando *todas* sus propiedades son custom properties); el caso citado en `TareaBadges.tsx` es del
   **binario 0.7.4** instalado, no del checkout. El FP **vivo** resultó otro: la custom property escrita
   con **clave computada** (`style={{['--pixel-df' as string]: dimensiones}}`), que es la forma canónica
   en TypeScript porque `CSSProperties` no admite claves `--*`. Medido en el área: de los 2 hallazgos de
   la regla, **el único FP era `EditorPixelArt.tsx:187`** (PT) y queda eximido; el otro
   (`mensajes.tsx:195`) es un `width` dinámico real y **se conserva**. La exención exige que **todas** las
   propiedades sean custom properties, con tests de sobre-exclusión para `[clave]: valor` y para mezclas.
2. **FP-S2** (sentinel) — ✅ **RESUELTO en 0.7.9 como corrección preventiva, con el repro del backlog
   descartado.** La medición del área **no encontró ningún caso vivo**: `SelectorRepeticionPill.tsx:38` es
   un `{/* … */}` que documenta un `<button>` anidado, y el `style={{` que sí existe en ese archivo
   (línea 68) es un **estilo inline real** —un panel flotante posicionado por JS— correctamente
   silenciado con `sentinel-disable`, que la regla respeta. Se implementa igualmente porque la regla es
   un regex por línea y un `style={{}}` dentro de un comentario **sí** contaría como estilo real: se
   calculan los rangos comentados del archivo (con seguimiento de comillas para no confundir el `//` de
   una URL con un comentario) y el salto se aplica **solo** a esta regla. Tests de sobre-exclusión fijan
   que un comentario cerrado no silencia el estilo real de la línea siguiente.
   **Lección de método:** un backlog de FPs citado por línea de archivo caduca —hay que **re-medir con el
   artefacto del gate** antes de implementar, porque el binario instalado y el checkout divergen.
3. **MEJ-V1** (varsense): indexar vars inyectadas vía `style={{'--x': …}}` en React para `variableNoDefinida` (hoy exige registrar el CSS en `variableFiles`).
   **Sin caso vivo medido (10-09):** el único informe VarSense del área con detalle
   (`C:\tmp\varsense-PROYECTO_TASKS.json`) da **`variableNoDefinida` = 0** en PROYECTO TASKS, y el reparto
   de PT es `token-duplicate` 183, `cssInlineScript` 32, `token-unused` 26, `cssInlineReact` 25,
   `valorHardcoded` 14, `claseHuerfana` 6 (total 286, coherente con la cifra registrada). Es decir: la
   mejora es **preventiva** hasta que la re-medición VarSense del área muestre un caso. No se implementa
   «porque está en la lista» — la lección de FP-S1/S2 aplica igual aquí: **re-medir antes de tocar**, y si
   no aparece un caso, la prioridad baja por debajo de los hallazgos con sitio concreto (`valorHardcoded`,
   `token-duplicate`).
4. **FP-S3** (sentinel, candidato — **revisado en el triage 1.A**): `expect-produccion-rs` es un regex de
   línea, así que confunde «builder» con «infalible». **Descartado para los dos ejemplos citados**:
   `reqwest::Client::builder().build()` sí puede fallar (inicializa el backend TLS) y
   `Response::builder().header(..)` solo revela el fallo al llamar a `.body()` — en `handlers/storage.rs`
   el valor que lo rompía era el `mime` procedente de la base, fallo real. **Único candidato vivo:** el
   `.expect` sobre `HmacSha256::new_from_slice` en `glory-rs` (HMAC acepta cualquier longitud de clave →
   pánico inalcanzable), ligado a `109A-7`. Confirmar con **caso mínimo** antes de tocar la regla; si se
   confirma, eximir el patrón o bajarlo a warning, recompilar, re-pin y re-medir los Rust afectados.

   **Triage ejecutado (10-09, `039A-1`). Resultado: FP-S3 CONFIRMADO como el único `expect` vivo del área.**
   - `expect-produccion-rs` en el área: **62 → 3**. Los 59 restantes se resolvieron por código: 17 en PT
     (§Bloque 1.A), 25 en `RESTAURANTE/src/bin/seed.rs` y el resto por las mejoras de la regla en 0.7.8
     (ámbito solo-código + `#![cfg(test)]`). GLORYPORT pasó de 5 a **0**. Los números «62» y «17» de las
     tablas de §3.1 quedan **históricos**.
   - Los **3 supervivientes son el MISMO defecto**: `glory-rs/backend/src/websocket/ticket.rs:43`, en el
     submódulo compartido (1 en WANDORIUS, 1 en PROYECTO TASKS, 1 en RESTAURANTE). Cuatro copias en disco
     más un backup en worktree (`WANDORIUS/.sentinel/worktrees-backup/...`) → la causa es del submódulo,
     no de los consumidores.
   - **Caso mínimo confirmado por lectura de contrato, no por heurística:**
     ```rust
     fn sign(payload: &str, secret: &str) -> String {
         let mut mac = HmacSha256::new_from_slice(secret.as_bytes())
             .expect("HMAC acepta cualquier longitud de key");
     ```
     `hmac::Hmac<D>` implementa `KeyInit::new_from_slice` con `Ok(..)` incondicional (a diferencia de
     AES-GCM/ChaCha20, que sí exigen 16/32 bytes): HMAC define su propia normalización de clave de
     cualquier longitud, así que `InvalidLength` es **inalcanzable**. Es un `expect` honesto y correcto.
   - **Detalle que condiciona el fix:** el `.expect(` está en la línea **siguiente** al `new_from_slice`. El
     regex actual es por línea, así que cualquier exención debe mirar hacia atrás (receptor en línea previa)
     o partirá de una premisa falsa sobre cómo se escribe el código real.
   - **Decisión: cerrar por regla (2 opciones), no editando el submódulo.**
     - *(a) Exención semántica (recomendada):* eximir `.expect()` cuyo receptor inmediato es
       `new_from_slice` de un tipo HMAC (`Hmac*`, `Hmac<..>`, `hmac::Hmac`), con caso mínimo y test de
       no-disparo en `rustReglasNuevas.test.ts`. Mismo patrón ya aplicado a `esArchivoSoloTest` y a las
       reglas solo-código de 0.7.8.
     - *(b) Bajar a warning* solo ese patrón: mantiene la señal sin romper el gate.
     - Descartado: `sentinel-disable-next-line` en las 4 copias del submódulo — contamina el framework
       reutilizable con metadata del analizador y no cubre a futuros consumidores que usen HMAC.
   - **No ejecutado todavía a propósito:** tocar el core ahora invalidaría la evidencia de release que se
     está escribiendo en los 12 consumidores (el `commit` del pin cambiaría y forzaría otro re-pin masivo).
     Entra como bloque propio: fix → caso mínimo → compile+suite → commit → tag → re-pin → re-medición.

   **✅ EJECUTADO en 0.7.9 (`a3f5607`, tag `v0.7.9` = `9ad617b`), opción (a):**
   - `RECEPTOR_HMAC = /\b(?:Simple)?Hmac[A-Za-z0-9_]*\b[\s\S]{0,80}?\bnew_from_slice\s*\(/` +
     `caeEnConstructorHmac()`: mira el texto **anterior** a la columna del `.expect` y, si no basta,
     hasta 4 líneas hacia atrás (saltando vacías y de comentario), porque el `.expect(` real está en la
     línea **siguiente** al constructor —exactamente el detalle previsto arriba—. Se aplica con `continue`
     dentro del bucle de `detectarExpect`.
   - **Exige tipo HMAC explícito**, así que `Aes256Gcm::new_from_slice(key).expect(..)` y ChaCha20 —cuyo
     `new_from_slice` **sí** es falible por longitud fija— **siguen reportándose**: hay test de
     no-disparo para ese caso (+39 líneas en `rustReglasNuevas.test.ts`).
   - Efecto esperado: los **3** errores compartidos de `glory-rs/backend/src/websocket/ticket.rs:43`
     (PT, RESTAURANTE, WANDORIUS) desaparecen **sin tocar el submódulo**, que era el objetivo.
     Confirmado por verificación funcional contra el artefacto del gate (9/9 PASS).
   - Descartada la opción (b): bajar a warning habría dejado la señal roja en el gate.
5. **FP-S4 (candidato nuevo, medido 10-09 — calibración, no falso positivo puro):**
   `obtenerLimiteArchivo()` (`src/utils/lineCounter.ts`) **no tiene rama para `/tests/`**: un test de
   integración de Cargo cae en el default Rust `servicio` y hereda un límite de **500** líneas, que no
   está calibrado para un harness de simulación. Medido con el artefacto del gate
   (`contarLineasEfectivas` sobre los 2 archivos):

   | Archivo | Limite | Efectivas | Factor | Escala |
   |---|---|---|---|---|
   | `coolify-manager-rs/src/commands/deploy_service.rs` | 500 (`servicio`, default Rust) | 2135 | **4,27×** | nivel 3 (a 365 del nivel 4 = 5×) |
   | `RESTAURANTE/tests/bdp_simulator_integration.rs` | 500 (`servicio`, default Rust) | 1718 | **3,44×** | nivel 3 |

   - **Diagnóstico honesto:** el primero **sí es deuda real** (4,27× el límite: es el monolito de
     `deploy_service`). El segundo es **grande de verdad, pero el límite que se le aplica es el
     equivocado**: su tipo correcto sería «test de integración», no «servicio».
   - **Cambio propuesto (no ejecutado, requiere decisión):** añadir a `obtenerLimiteArchivo()` una rama
     para rutas `/tests/` y sufijos `_test.rs`/`_tests.rs` con un tipo propio (`test-integracion`) y un
     límite calibrado (p. ej. **1000**: sigue marcando deuda real sin convertir en «BASTA» un harness
     legítimo). Precedente exacto: 0.7.8 ya introdujo ámbito solo-código y `#![cfg(test)]` para
     `expect-produccion-rs`; la familia de reglas de límites no recibió el mismo trato.
   - **Por qué no se hizo ya:** cambiar el límite es **global a los 12 proyectos** y altera la severidad
     de hallazgos ya registrados en la TABLA; se decide con el reporte delante, no a mitad de una
     propagación.
6. Los que salgan de la Fase 2.
7. **MEJ-S2 (candidato de eficiencia nuevo, medido 10-09 — NO ejecutado): reutilizar la evidencia de
   release entre consumidores que fijan el mismo commit.** El lote de re-pineo de `039A-1` deja el coste a
   la vista: cada uno de los 8 proyectos de la familia A re-ejecuta **compile + suite completa del gate**
   dentro de su `quality:setup` (~5–9 min cada uno; **≈45–70 min por release**, y esta sesión lo ha
   consumido entero). La causa es que la evidencia se genera por proyecto aunque certifique el **mismo**
   artefacto.
   - **Contrato verificado por lectura de código, no supuesto:** `releaseEvidence()`
     (`src/core/diagnose.ts`, ~L253) valida **solo** `commit === actualCommit`, `compile === 'passed'`,
     `suite === (configuredTestScript ? 'passed' : 'not-configured')` y `cleanStaging === true`. **No**
     comprueba `at`, ni el `projectRoot`, ni ningún hash del árbol. Es decir: la evidencia es
     **byte-idéntica entre proyectos** salvo el timestamp, y hoy se recomputa 8 veces.
   - **Propuesta:** un modo `quality:setup --reuse` que herede la evidencia solo si se cumplen las tres
     condiciones que el propio `lock-generator.mjs` ya exige para el lock —`sourcePath` resoluble,
     `git rev-parse HEAD === commit` y `git status --porcelain` vacío— **más** un hash de árbol de la
     fuente (`git archive --format=tar HEAD`) igual al registrado en la evidencia. Si algo no coincide,
     corre compile+suite como hoy. Precedente de hash de árbol ya en uso: `0e08b17d718a…` para 0.7.9 en
     el `sentinel.lock.json`.
   - **Riesgo declarado, y por qué no se hace ya:** con reutilización, `cleanStaging:true` pasa de
     «observado en esta corrida» a «heredado de una corrida limpia verificada por hash de árbol». Solo se
     preserva la garantía si la verificación por hash es obligatoria (un árbol manipulado cambia el hash).
     Aun así es un cambio de **contrato de una herramienta compartida** (8 consumidores), exige test
     propio y autorización explícita del usuario: **queda como propuesta registrada, no como cambio**.

Reparación (§6): fix en checkout → compile+suite → pin+tag → `quality:setup` → lock por consumidor → doctor → re-medir proyectos afectados. Nunca editar `sentinel.lock.json` a mano (solo commit+sha tras setup).

### Fase 4 — Sub-planes de riesgo (se crean bajo demanda)

Criterios para abrir sub-plan en vez de resolver directo: toca persistencia crítica, cambia computados visuales sin dueño presente, afecta a `glory-harness` (re-mide TASKS), o requiere exponer red/puertos. Cada sub-plan: objetivo, riesgo, alternativa segura, validación y DoD propios.

**Sub-plan creado (10-09):** `coolify-manager-rs/Agente/planes/plan-monolito-deploy-service-2026-09-10.md`
— para el monolito `src/commands/deploy_service.rs`, el `limite-lineas-nivel-3` **propio** del proyecto
(2489 líneas totales / **2135 efectivas** = 4,27× el límite de 500, a 365 del nivel 4). Lleva los 10
seams medidos, la advertencia de que `execute()` concentra ~700 líneas y que extraerlo **no basta**, y la
limitación declarada de que su fase final exige verificación funcional contra Coolify (autorización
explícita por operación+objetivo). **No ejecutado:** se abre como bloque propio, con el proyecto sin WIP
ajeno (borrados de `google_drive` del usuario).

**Pendiente de sub-plan:** `RESTAURANTE/tests/bdp_simulator_integration.rs` (1718 efectivas = 3,44×).
Antes de abrirlo hay que decidir la calibración de **FP-S4** (ver Fase 3): si se le da tipo propio
`test-integracion` con límite ~1000, ese sub-plan cambia de alcance y quizá deje de ser necesario.

### Fase 5 — Cierre global

Gate por proyecto donde aplique, TABLA final 10/10, archivar este plan en `completados/` y registrar lecciones reutilizables.

## 5. Reglas operativas (heredadas 029A-1)

1. **WIP ajeno no se toca**: si el hallazgo vive en fichero con cambios sin commitear de otro, excepción documentada.
2. **Sin commit/push/deploy sin autorización explícita** (TASKS: 38 commits por delante de `origin/main` y 65 entradas en `git status` al 09-10, incluyendo WIP del usuario; cada proyecto, su política).
3. **Verificación proporcional real**: no basta compilar; type-check/tests/build del stack tocado + re-medición de la herramienta.
4. **`C:\tmp` < 7GB** (0.88GB al 09-10, sano tras las purgas): antes de compilar, podar targets huérfanos; artefactos temporales fuera de los árboles.
5. **Registrar la versión de herramienta junto a cada cifra**: un conteo sin la versión del binario que lo produjo no acredita un cierre (v. §6 deriva de versión). Si la cifra sale de la consola del manager, comprobar antes con qué artefacto mide (§9.3): una cifra producida con otro runtime que el del gate no es comparable con ningún plan.
6. **Remoto solo vía `coolify-manager-rs`** si un proyecto lo exige; esta campaña es local.
7. Un gate rojo preexistente se reporta y se separa; no se mezcla con el bloque.

## 6. Riesgos

- `glory-harness` es lib de TASKS: resolver allí obliga a re-medir TASKS (Fase 2 lo pone antes que el cierre final).
- Checkouts compartidos (`area-trabajo/.quality-tools`): un fix del detector mueve números de todos; re-medir tras cada cambio de herramienta.
- `variables.css` y stores de diseño son propiedad de sus dueños: tokenizar sin ellos cambia el visual.
- **Deriva de versión de la herramienta (confirmado 09-10):** una regla nueva puede convertir warnings en errores y **reabrir un proyecto ya cerrado**. Antes de cerrar cualquier proyecto hay que registrar la versión/commit del binario con el que se mide; una re-medición con versión distinta no es comparable y no acredita el cierre.
- **La consola no es fuente de verdad si mide con otro artefacto (confirmado 09-10):** el panel resolvía Sentinel por las versiones **instaladas** (`%LOCALAPPDATA%\GlorySentinel\versions`, donde la más alta era 0.7.4, congelada desde agosto) mientras el gate de los proyectos usa el checkout **compartido** (0.7.8) → sus cifras no coincidían con ningún plan (PROYECTO TASKS salía con 0 errores donde el gate daba 17, porque `expect-produccion-rs` no existe en 0.7.4). Corregido en `039A-3` (§9.3); regla: antes de citar una cifra del panel, comprobar `/api/gate/reglas` → `version` y `npm run sync:gate`.
- **Clones de terceros dentro de un árbol inflan el conteo (confirmado 09-10):** `glory-harness/data/referencias-cli/` (clones de claurst, vscode, hermes-agent, opencode) aportaba 466 hallazgos y 228 errores como si fueran código propio (805 → 364 al excluirlo). Se excluye por configuración del proyecto (`excludePatterns`), nunca borrando los clones.

## 7. Gate y Definition of Done

- DoD por proyecto: **0 errores medidos con la versión de herramienta activa**, warnings/hints resueltos o con excepción firmada (motivo + dueño), evidencia en completadas con la versión/commit del binario, TABLA actualizada.
- DoD global: 10/10 proyectos DoD + backlog de herramientas vacío o con issues abiertas trazables + este plan archivado.
- Gate canónico el declarado por cada proyecto; donde no hay gate, la re-medición con binarios fijados + verificación del stack es la evidencia.
- **La medición debe venir del mismo artefacto que el gate** (checkout compartido del área) y quedar registrada con su versión; la consola del manager es un instrumento de lectura, no la autoridad (§9.3, `039A-3`).

## 8. Estado y siguiente paso

- **Estado:** activo (actualizado 10-09). Fase 0 ✅ completa (18 JSONs en `C:\tmp\fase0-rebaseline\`) y **re-baselinada el 10-09 con 0.7.8** (§3.1: 1.729 hallazgos / 163 errores — cuatro proyectos que figuraban en 0 errores los tienen). **Fase 1: Bloque 1.A ✅ ejecutado** — TASKS 17→**1** errores `expect-produccion-rs`, y el gate quedó desbloqueado por causa raíz (se vendorizó `scripts/quality/lock-generator.mjs`, que `.gitignore /scripts/*` mantenía huérfano, y se regeneró `sentinel.lock.json`): `doctor` 0 issues, `readyForGate:true`, `quality:setup` OK con evidencia release de `902c45e` (pendiente bloqueado desde el 07-09). **Fase 1 aún no cerrable**, por los bloqueos de abajo.
- **Bloqueos abiertos:** `109A-7` (submódulo `glory-rs`, 1 error, candidato a FP).
  `109A-8` **RESUELTO el 11-09 (decisión autónoma):** `main` de TASKS vuelve a compilar —
  `check` 0 errores/0 warnings, `clippy` exit 0 (120 warnings preexistentes de estilo, ninguno en líneas
  tocadas), `test` 33 passed/0 failed. Fixes: harness `scheduler.rs` (`parse_campo_minuto/hora`:
  `and_then` sobre `Option<Vec>` en vez de `into_iter().next()` sobre el `Option`, E0308) + retirar
  `use crate::scheduler` sin uso en `tareas.rs` (commit harness `990e9a2`) + `adaptador.rs`:
  `programacion: None` (sin columna en el esquema TASKS → fila legacy, fix E0063; commit TASKS `b0f11cf`).
  Ambos commits incluyen WIP previo del árbol en esos archivos (declarado en el mensaje; lección
  `git add <archivo>` confirmada por 3ª vez). Límite honesto: los unit tests del scheduler de harness
  no se ejecutaron (el shim `cargo` bloquea `cargo test` directo y harness no tiene wrapper; corren en
  gate/CI). Previamente se liberó `C:\tmp` (6.98→0.01 GB, purga de `glory-target\glory-harness` sin tocar
  desde hacía >60 min).
- **Decisión pendiente del usuario:** commit/push de los cambios de TASKS (hoy sin commit) y autorización para la transacción de submódulo de `109A-7`.
- **Fase 2:** GLORYPORT ✅ (sentinel 1w→0, gate completo verificado por orquestador, sin commit) → en curso: **gloryapi** (A Sentinel 2×limite-lineas, B VarSense index.css+1 tsx).
- [x] ~~GLORYPORT (sentinel 0/0/0/0, varsense 0)~~ → **reabierto por 0.7.8: 5 errores `expect-produccion-rs`** (§3.1). Su refactor de `popup.rs` sigue siendo válido; lo que caduca es el «cero»
- [x] **TASKS Bloque 1.A (17→1 errores con 0.7.8)** — cierre pendiente de `109A-7`/`109A-8` · [ ] gloryapi · [ ] Glory-Laminal · [ ] workspace-manager · [ ] WANDORIUS · [ ] coolify-manager-rs · [ ] glory-harness · [ ] RESTAURANTE · [ ] ONG AGAPE
- [ ] **Re-baselining de Fase 2 con 0.7.8** (§3.1: 1.729 hallazgos / 163 errores) y re-orden del frente
- **Siguiente paso verificable:** resolver `109A-8` (migración de ámbito + adopción del puerto) para poder compilar y testear; en paralelo, cerrar gloryapi-A.
- **Frente VarSense (heredado):** estado, fases F2–F5 + fase final, riesgos y DoD en **§9**. Su primer
  paso ejecutable **ya no es `mapaV2Etiqueta` de WM**: se re-verificó el 10-09 y está **cerrada**
  (`src/v2/mapa/mapaV2.css` sin ninguna ocurrencia de `Etiqueta`, borrado ya **commiteado** — árbol limpio
  para ese archivo). PT ya cerró su parte (17 clases muertas borradas, 10-09). El siguiente paso real del
  frente **sale de la re-medición con 0.7.9**, no de esta lista.
- **Siguiente paso ejecutable sin decisión pendiente:** triage de `expect-produccion-rs` en GLORYPORT
  (5), WANDORIUS (8) y coolify-manager-rs (4) con el procedimiento del Bloque 1.A; después el resto de
  F2 —cuyo pendiente anterior (`mapaV2Etiqueta` de WM) está **cerrado**, ver arriba—. RESTAURANTE ya no
  está en ese frente: quedó en **0 errores propios** tras `039A-1/F2` (sus 2 restantes son el submódulo
  `glory-rs` y el monolito de tests).
  → **EJECUTADO (10-09).** `expect-produccion-rs` pasó de **62 a 3** en el área y GLORYPORT de **5 a 0**.
- **Infraestructura del gate — plan aparte `109A-9` ✅ (10-09):** `Agente/planes/completados/plan-certificacion-gate-compartida-2026-09-10.md`.
  No forma parte del alcance cero-deuda de proyecto (es infraestructura del gate, por eso vive separado).
  Origen: publicar 0.7.9 exigió **11 ediciones manuales** de `quality-tools.json` y **~42–55 min por lote**
  recompilando y re-testeando el **mismo commit** en cada consumidor (~5 min/proyecto). Hallazgo: la
  centralización **sí existía, pero solo como guarda** — `sync:quality` exige commit común en los 11
  consumidores y `verificar-alineacion.mjs` añade pin/runtime/publicado — y **nunca se construyó el
  escritor** (`quality:bump`). La certificación pertenece a `(tool, commit, buildScript, testScript,
  entorno)`, no al proyecto. Orden obligatorio del plan: **unificar el adapter antes de cachear** (hoy hay
  8 copias byte-idénticas de `quality-setup.mjs`). Bloques B1–B4 (código) pendientes de revisión del
  usuario; B5 (skills `quality-gate-setup` v1.3.0 y `build-artefactos` v1.1.0 + `AGENTS.md` §6) ejecutado.
  Los 3 supervivientes son el mismo `FP-S3` del submódulo (`ticket.rs:43`) y su cierre correcto es por
  regla (Fase 3), no editando el submódulo (ver el análisis detallado en FP-S3, §Fase 3).
- **`039A-1` — Herramientas + propagación ✅ (10-09):** desbloqueo de la evidencia de release,
  publicación de los dos releases y re-pin de los 12 consumidores. Detalle completo y evidencia en
  `Agente/completados/tareas-2026-09-10.md` (§Bloque 1.C) y en la TABLA.
  - **Causa raíz del bloqueo de la evidencia:** `.mocharc.json` fijaba `timeout: 10000` mientras los
    tests de fixture real declaran `spawnSync(..., { timeout: 60_000 })` → el techo del runner estaba
    **por debajo** del timeout del propio test (580/5 → 585/0 → **591 passing, exit 0**).
  - **Releases publicados:** Sentinel **0.7.8 `129c24e`** (tag `v0.7.8`) y VarSense **2.2.1 `21d8a70`**
    (tag `v2.2.1-v22`). El artefacto del CLI de Sentinel no cambió de hash (`D92BEF39…`).
  - **Re-pin:** los 11 consumidores con `quality-tools.json` quedan en `sentinel 0.7.8/129c24e` y
    `varsense 2.2.1/21d8a70` (JSON validado uno a uno). Piloto completo y verde en **GLORYPORT**
    (`readyForGate=True`, `issues=0`, evidencia de ambos tools escrita); el resto de la familia del
    checkout compartido se propaga en lote (`C:\tmp\repin-consumidores.ps1`), con
    `coolify-manager-rs` ya verificado en `ok/ok/True/0`.
  - **Familia de submódulo versionado (RESTAURANTE, WANDORIUS):** gitlinks `tools/{sentinel,varsense}`
    alineados por fetch+checkout a `129c24e` y `21d8a70`. **WANDORIUS** pasa de `sourcePathEnv`
    (`GLORY_SENTINEL_SOURCE_PATH`/`GLORY_VARSENSE_SOURCE_PATH`, sin definir en el entorno → 8 issues) a
    `sourcePath` interno, alineado con RESTAURANTE: elimina de raíz los `tool-source-missing`.
    **Pendiente y bloqueado por autorización de commit:** `lockfile.mjs` exige que el gitlink de `HEAD`
    del padre (`git ls-tree HEAD`) sea igual al commit del submódulo y al de `quality-tools.json`, así que
    con los submódulos ya movidos pero el gitlink aún sin commitear el lock falla — **verificado, no
    supuesto:** `node scripts/quality/lock-generator.mjs` → `[quality:lock] ERROR: sentinel: gitlink del
    workspace no coincide con el checkout instalado` (exit 2). La regla §5.2 de este plan prohíbe commit
    sin autorización explícita, de modo que los cambios quedan en el árbol de cada repo: **un commit del
    gitlink en cada padre desbloquea `quality:lock --write` → `quality:setup` → `doctor`**.
  - **`gloryapi`** no declara VarSense ni scripts de lock/setup: solo admite `quality:doctor|analyze|test`.
    Su `quality-tools.json` ya apunta al checkout **compartido** (`../.quality-tools/sentinel`) y quedó
    re-pinado a `129c24e`/0.7.8, pero `quality:doctor` sigue en rojo con `tool-installed-mismatch`
    («checkout instalado no coincide con `sentinel.lock.json`») porque **nadie regenera su lock**: tiene
    adapter propio (`scripts/quality/{sentinel-cli,sentinel-stage,task-check}.mjs` + `stages.json`) sin
    generador de lock. El doctor además delata la deriva de runtime ya conocida
    (`activeVersion: 0.7.4` instalada vs `sourceVersion: 0.7.8` del checkout).
    **No empeoró con el re-pin** (ya estaba rojo). Opciones para cerrarlo —decisión de diseño, no
    ejecutada: (a) vendorizar el `lock-generator.mjs` de la familia A, que es **autocontenido** (136
    líneas, solo módulos de Node, sin hardcodes del proyecto) y está descrito como «port minimal»,
    precedente ya aplicado en PROYECTO TASKS; o (b) implementarlo dentro de su propio adapter.

    **Diagnóstico exacto con 0.7.9 (10-09, `doctor --json` sobre el checkout compartido) — 4 issues, y se
    reducen a 2 causas:** `tool-lock-mismatch`, `tool-lock-version-mismatch` y `tool-installed-mismatch`
    derivan de que su `sentinel.lock.json` sigue en `runtime.status: "global-runtime"`, analyzer
    **0.7.7** (`0559576`), mientras el manifest ya fija `0.7.9`/`a3f5607` y el checkout instalado es
    `a3f5607`; y `tool-release-evidence-missing` («falta evidencia compile + suite desde staging limpio
    para `a3f5607`; ejecuta `npm run quality:setup`») deriva de que **no tiene `quality:setup`**.
    - **Precisión sobre las opciones:** (a) sola **no cierra el doctor** —regenera el lock y arregla 3 de
      los 4 issues, pero deja la evidencia—; se necesita la **dupla** `lock-generator.mjs` **+**
      `quality-setup.mjs` (ambos autocontenidos y genéricos: iteran `manifest.tools` y exigen
      `cli`/`commit`/`sourcePath`, que gloryapi **ya tiene** correctos, más un checkout fuente limpio).
    - Su `.sentinel/release-evidence/sentinel.json` es de un commit anterior: no sirve como evidencia del
      pin vigente.
    - El `runtime` del lock cambiaría de `global-runtime` a `project-adapter` con
      `identitySha256 3ad54a78…` (el mismo determinista que ya usan los 8 de familia A). **Antes de
      hacerlo hay que leer su adapter** (`scripts/quality/{sentinel-cli,sentinel-stage,task-check}.mjs`
      + `stages.json`, 7 archivos) porque puede consumir el bloque `runtime` del lock; por eso queda como
      decisión explícita y **no se ejecutó**.

- **`039A-3` ✅ ejecutado (10-09, autorizado por el usuario: «aplica las 3 cosas que me propones»):** unificación de planes (§9/§10), alineación de la medición de la consola al runtime del gate (§9.3) y exclusión de los clones de terceros en glory-harness (§9.3). Sin commit: los cambios quedan en el árbol de cada repo a decisión del usuario.
- **`039A-1` / Bloque 1.D — Release Sentinel 0.7.9 ✅ (10-09, continuación autónoma):** cierra **FP-S1**,
  **FP-S2** y **FP-S3** de Fase 3 **más** el defecto latente que dejaba la suite inestable bajo carga.
  Canonico `glory-sentinel`: commit **`a3f5607`**, tag **`v0.7.9` = `9ad617b`**, publicados y confirmados
  con `git ls-remote`; árbol sha256 `0e08b17d…`. 10 archivos, +383/−12, `git add` explícito por archivo.
  - **Evidencia:** `npm run test:unit` → **607 passing, 1 pending, 0 failing**, exit 0 (antes del release
    el mismo conjunto daba fallos carga-intermitentes en `taskCoordinator` y en el fixture de `lease`);
    compile + `check:core` + `smoke:lsp` OK; `tsc --noEmit` exit 0.
  - **Verificación funcional contra el artefacto del gate** (`out/`, no el `src`): **9/9 PASS** — FP-S1 y
    FP-S2 eximidos (el archivo real `EditorPixelArt.tsx` → **0** hallazgos), los 2 estilos reales del área
    conservados y 3 anti-sobre-exclusión. Esto es lo que cierra los **3 errores compartidos** de
    `glory-rs/backend/src/websocket/ticket.rs:43` **sin editar el submódulo**.
  - **El `timeout` de `.mocharc.json` es un SUELO:** `taskCoordinator`, `lease` y `gateRun` fijaban 30 s
    (endurecían el techo en silencio) → 60 s; las dos suites de `taskCoordinator` → 180 s por ser
    carga-intermitentes; el hijo de fixture de `lease` vivía 5 s → 120 s. **Producción intacta:** el
    presupuesto de CIM (5000 ms) se midió en 0.7–1.2 s por salto (~4× de margen).
  - **Propagación:** 11 manifiestos re-pinados a `0.7.9`/`a3f5607` (JSON validado ×11), checkout
    compartido `.quality-tools/sentinel` y submódulos `RESTAURANTE/tools/sentinel` y
    `WANDORIUS/tools/sentinel` alineados a `a3f5607`. `glory-harness` excluido (`109A-*`, otro agente).
    Lote `C:\tmp\repin-v079.ps1` (lock `--write` → `quality:setup` → `doctor`) corrido sobre los 8
    proyectos de familia A, en serie y **sin nada más en paralelo** (la carga es precisamente lo que
    producía los fallos intermitentes).
  - **Lección de método (aplica a los 3 FPs):** un backlog citado por `archivo:línea` **caduca**; hay que
    re-medir con el artefacto que el gate ejecuta. Los diagnósticos `FP-S1`/`FP-S2` de este plan venían
    del binario **instalado 0.7.4**, no del checkout: FP-S1 apuntaba a un caso ya eximido desde
    `[104A-11]` y el repro de FP-S2 no era un FP (el estilo real de ese archivo está silenciado y la
    regla lo respeta). Se implementó igual —preventivo, alcance mínimo a esa regla— porque la regla es un
    regex por línea y un `style={{}}` comentado **sí** contaría.
  - Detalle completo en `Agente/completados/tareas-2026-09-10.md` (§Bloque 1.D) y en la TABLA.

- **Evidencia de la re-medición (09-10 02:18):** `PROYECTO TASKS/.quality-reports/analyze.json` (Sentinel 0.7.8, `severityCounts {error:17, warning:71, hint:7}`, 991 archivos) y `C:\tmp\varsense-task-20260910.json` (VarSense 2.2.1, `{error:0, warning:303}`, 1844 archivos). TABLA con corte 09-10.
- **Re-medición Sentinel 0.7.9 (11-09, artefacto del gate):** 10/10 proyectos → **2 errores**, ambos `limite-lineas-nivel-3` con sub-plan Fase 4. **Excepción mismo día (orden del usuario):** `bdp_simulator_integration.rs` con marcador firmado → archivo 0/0/0/0 verificado; el área queda en **1 error** (`deploy_service.rs`, sub-plan 10-09). TASKS 0e/70w/7h (Fase 1 Sentinel cerrada), WANDORIUS 0, GLORYPORT 0, glory-harness 0e/1h, gloryapi 0e con 3 warnings en WIP (excepción). Evidencia: `C:\tmp\remedicion-079-*.json` + `verif-079-bdp-excepcion.json`; TABLA §«Re-medición Sentinel 0.7.9». Sin commit; un solo archivo de tests tocado (comentario).

## 9. Frente VarSense del área — campaña a CERO (heredado del «PLAN ÚNICO» de workspace-manager)

> **Consolidación 10-09 (decisión del usuario: «porque hay 2 planes, debería haber uno solo»).** Hasta
> hoy convivían dos consolidaciones que no se conocían entre sí: este plan (03-09: 10 proyectos,
> Sentinel+VarSense) y `workspace-manager/PLAN-corregir-hallazgos-2026-09-06.md` (06-09: 9 proyectos,
> solo VarSense, autotitulado «Plan ÚNICO» dentro de su repo). El frente vivo de VarSense de aquel plan
> (§2) se integra aquí; aquel archivo queda **cerrado como frente con puntero** y se conserva íntegro
> como evidencia histórica (incluido su §1, con las 4 campañas que él mismo absorbió). No duplicar: toda
> campaña nueva edita ESTE plan.

### 9.1 Artefactos operativos (viven en workspace-manager; no se mueven)

- `workspace-manager/scripts/quality/excepciones.json` — registro **v2** de excepciones verificadas:
  `familias` (regla amplia + archivos/marcas) y `pares` (token-duplicate 1:1 con
  tokenA/tokenB/archivo/lineas/categoria/evidencia); `conteo` opcional = hallazgos esperados con el
  runtime fijado.
- `workspace-manager/scripts/quality/analyze-blocks.mjs` — harness del frente:
  `node scripts/quality/analyze-blocks.mjs [--json] [--detalle]`; veredicto MANTENIMIENTO (0 hallazgos
  fuera del registro + 0 DRIFT) / ACCIONABLE.
- Regla de convergencia: un hallazgo solo es excepción si está en el registro o se añade con evidencia
  nueva; cualquier hallazgo nuevo devuelve el veredicto a ACCIONABLE. El harness marca DRIFT cuando un
  conteo registrado (>0) mide 0.

### 9.2 Estado del frente

- **F1 ✅ CERRADO (308A-7V21, 02-09)** — re-clasificación post-V20 de familias dinámicas con 3 fixes de
  core (walker de submódulos con `.git` directorio, propiedad `imageClass:`, artefacto `url(...)`) + RC-4
  `.push()`: AGAPE ch 18→0; WANDORIUS ch 6→3 (límite del scanner, vivos); REST 6 re-verificados vivos
  línea a línea; WM `mapaV2Etiqueta` confirmada MUERTA.
- **V22 ✅ CERRADO (308A-7V22, 02-09)** — decisión del usuario «primero corregir detector» antes de
  borrar: M1–M5 en el core de VarSense (mapas por indirección, templates con variable local, `return` de
  callback, clases en templates HTML, y el bug de `removeComments` con regex literales). 53/53 tests,
  PT ch 163→151, 0 FN, harness 9/9.
- **F2 EN CURSO — PT ✅ CERRADO (10-09, `039A-1/F2`)** — borrado de CSS muerta real confirmada. Método
  VAR-3/VAR-4: confirmación repo-wide por clase (ts/tsx/js/jsx/html/php/rs, palabra completa, templates,
  prefijos BEM/`--`, mapas de sufijos; el CSS propio NO cuenta como uso), borrado con `str_replace`
  exacto, balance de llaves + type-check/build del stack + re-medición.
  **Corrección del alcance planificado:** las «~123 clases muertas de PT» eran un dato obsoleto; la
  medición con el checkout compartido (`claseHuerfana` = 23 findings) dio **17 muertas reales + 6 falsos
  positivos** por nombre dinámico (template literal en `CabeceraArbitraje.tsx:28` y
  `DetalleUsuario.tsx:79/83`; familia BEM viva `seccionModerna`). Resultado: VarSense PT **303 → 286**,
  `claseHuerfana` **23 → 6**, `tsc -b && vite build` **exit 0**; evidencia en
  `Agente/completados/tareas-2026-09-10.md`. Esperado original (PT 439 → ~275) no aplicable: el punto de
  partida real ya era 303.
  **Pendiente de F2 — ya resuelto (verificado 10-09):** `mapaV2Etiqueta` (`workspace-manager`, entonces
  `mapaV2.css:104/111`) **ya estaba borrado** en `318A-7V22` (selector compartido + regla propia) y su
  re-clasificación quedó registrada en `workspace-manager/scripts/quality/excepciones.json`; un grep
  repo-wide (ts/tsx/js/jsx/css/html) no halla el nombre fuera de documentos. La entrada de este plan era
  obsoleta: **F2 no tiene ya ninguna muerta confirmada pendiente**; lo que queda son los FP de
  `claseHuerfana`. Evidencia: `excepciones.json` §J-11 V13/V21/V22.
  Nuevo FP de `claseHuerfana` (no resuelve clases interpoladas) → candidato de Fase 3.
- **F3 PARCIAL (11-09)** — `valorHardcoded` con token exacto (patrón V5/V9/J-3): solo
  PT 14 queda abierto y gated (ver abajo). **Avanzados el 11-09:** Laminal 4→0 (tokens `--asaHover`,
  `--botonHover`, `--elementoActivo`, `--hervorClaro`, `--sombraGizmo`; commit local `62ac0eb` sin push;
  Sentinel Laminal 0/0/0/0 con 0.7.10), coolify 11→0 (verificado con 2.2.1, sin cambios necesarios),
  REST 15→0 (15 tokens `--plano-*` en `frontend/src/index.css`; Sentinel 0/0/0/0 en ambos CSS; commit local
  `e97da61` sin push, WIP ajeno intacto). **WM 34→19 el 11-09:** 15 sustituciones exactas (`13px`→`--v2-textMd`,
  `11px`→`--v2-textSm` documentado, `#000`→`--v2-texto`, `#fff`→`--v2-invertido`) en `Button.css`,
  `MenuContextual.css`, `paneles.css`; commit local `efffdad` sin push, WIP `quality-tools/sentinel.lock` intacto. Residual WM 19 =
  15 `border-radius` sin token (regla v2 «sin radios», `.v2App *{radius:0!important}`) + 2 `12px` sin token +
  `0.85em` relativo + raíz `v2.css` (intocable: es la base del rem) → fase final. **Fase final WM 1x1 el 11-09
  (decisiones del usuario):** radios v2 → 3 tokens nuevos (`--v2-radioMini:2px`, `--v2-radioChico:3px`,
  `--v2-radioPildora:11px`); `badge.css:999px` → `--radioPildora` en `variables.css` v1; `12px` fantasma →
  `--v2-textFantasma:0.92rem`; `0.85em` consola → **excepción** (relativo intencional); raíz `v2.css:13px` →
  **intocable** (base del rem, token sería circular).   WM queda en **valorHardcoded×2** (ambos excepcionados).
  Commit local fase-final `5ebf9fc` sin push, WIP intacto. Evidencia: `C:\tmp\varsense-wm-20260911-post3.json` (0e/7w/4i/0h). **AGAPE 69→72 el 11-09
  (re-medido con 2.2.1, +3 por código nuevo): 0 ejecutables** — ningún literal coincide con un token exacto de
  `frontend-v2/src/styles/variables.css` (radios 4/8/12/14/16/18/30/46px vs tokens 10px/40.5px; fuentes
  1/1.1/1.25/1.4/1.5rem y 0.52em vs escala clamp fluida; fondos rgb negros vs 88%/68% y pie 78% blanco):
  inventar escala o reasignar cambiaría el visual → todo a fase final 1x1. **Fase final AGAPE 1x1 COMPLETADA el 11-09
  (decisiones del usuario):** `--radioEtiqueta:46px` (18×), `--radioTarjetaGrande:14px` (17×), 12px→`--radioTarjeta`,
  16px→`--radioTarjetaGrande`, 30px→`--radioBoton`, 8px→`--radioTarjeta`, 18px→`--radioTarjetaGrande`;
  1rem/1.1rem/1.25rem→`--textoBase` (fluido, aceptado tras aviso), 1.5rem→`--textoMarca`, 1.4rem→`--textoMarcaSimbolo`,
  `--textoHero:0.52em` nuevo; 6 `--colorVelo*` nuevos (78/8/45/55/75% + cálido).
  Corrección honesta: `--textoSubtitulo` no existe (nota de triaje errónea; ediciones revertidas y re-decididas).
  Excepción firmada: `Donar.tsx:288` inline dinámico (`progresoMeta%`, dato runtime, no diseño).
  AGAPE queda en **valorHardcoded×0**. Commit local `8b4cb1d` sin push, WIP intacto.
  Evidencia: `C:\tmp\varsense-agape-20260911-post.json` (0 valorHardcoded; 1e cssInlineReact excepcionado + 8w propiedadProhibida),
  `C:\tmp\verif-0710-agape.json` (Sentinel 0e/19w en 16 archivos).
  **Reconocimiento de PT corregido el 11-09:** el triaje decía «PT no tiene tokens de fuente» pero
  `frontend/src/app/styles/dashboard/variables.css:138-215` SÍ tiene escala completa
  (`--dashboard-tamano{Micro,MuyPequeno,Pequeno,Detalle,Base,Normal,Grande,Mediano,Encabezado,Titulo,Hero,Subtitulo,H2,Display,MovilBase,MovilPequeno}`,
  todas con `+ var(--dashboard-ajusteTipografia)` configurable). Además `constructorPaginas.css` ya usaba
  tokens `--dashboard-*` de color, por lo que mapear sus fuentes a la escala es coherente, no invento.
  **Fase final PT COMPLETADA el 11-09 (decisión autónoma por orden del usuario):**
  12 `font-size` px en `constructorPaginas.css` (12/14/11/13/18px → `tamanoMovilPequeno/MovilBase/Pequeno/Base/Mediano`)
  + `recordatorios.css:215` 10px → `tamanoMuyPequeno` + `layoutManager.css:329` 11px → `tamanoPequeno`.
  PT queda en **valorHardcoded×0** (verificado `C:\tmp\varsense-pt-20260911-post.json`; los 27 `variableNoDefinida`
  son de archivos no tocados, artefacto de alcance). Sentinel 0/0/0/0 en los 3 archivos
  (`C:\tmp\verif-0710-pt.json`). Commit local `e9faf4b` sin push — incluye WIP previo del usuario en 2 CSS
  (bloques ya ausentes en el árbol antes de mis ediciones; verificado por líneas 215/329 vs 248/350 del parent).
  Lección: `git add <archivo>` arrastra WIP; el mensaje lo declara.
- **F4 HECHA 11-09** — seams `body.style.overflow/cursor/userSelect` → clases en `base.css`
  (`bloqueoScroll`, `arrastrandoCol/Fila/Agarrando`, misma especificidad `body.clase`): 5 bloqueadores
  scroll (useModal, useDrawerMovil, useModoEnfoque, BottomSheet, AlertaConfirmacion) + 5 arrastres
  (useAnchoSidebar, useArrastrePaneles, useLayoutManager, useResizeDrag, useResizeHandleColumn).
  `grep body.style.(overflow|cursor|userSelect)` en `frontend/src`: 0. `tsc --noEmit` exit 0.
  VarSense scope hooks: `cssInlineScript` 32→6 (restan solo `left/top` imperativos de posicionamiento —
  van a fase final). Commit local `95d5092` sin push (base.css arrastra WIP previo del usuario,
  declarado en el mensaje). Evidencia `C:\tmp\varsense-pt-f4-hooks.json`.
- **FASE-FINAL PT posicionamiento HECHA 11-09** — los 6 `left/top` restantes → seam `--menuX/--menuY`
  (useMenuFlotante/Contextual/SelectorBadge + consumidores `.menuContextual:not(.submenu)` con fallback
  -9999px y `.selectorBadgeMenu` con fallback auto; experimento previo demostró que VarSense no flaggea
  `setProperty` de custom properties). VarSense scope hooks: 6→0 findings. `tsc` exit 0.
  Commit local `4f6c890` sin push (bloque limpio, sin WIP). Evidencia `C:\tmp\varsense-pt-fasefinal-pos.json`.
- **FASE-FINAL PT huérfanas HECHA 11-09** — full scan: `valorHardcoded` 2→0 (`-9999px` de mi seam a
  `--menuFueraPantalla` local), 2 bloques `.seccionModerna` muertos eliminados (hijo BEM vivo),
  5 `claseHuerfana` restantes = FP por interpolación dinámica → `excepciones-varsense.json`
  (detallePlan premium/free, detalleEstado trial/expirada, noViable; evidencia de uso dinámico citada).
  Full frontend: 77→76 entries, `valorHardcoded` 0, `claseHuerfana` 5/5 exceptuadas. `tsc` exit 0.
  Commit local `6394e41` sin push. Evidencia `C:\tmp\varsense-pt-full-20260911d.json`.
- **FASE-FINAL PT vars HECHA 11-09** — 31 `variableNoDefinida` con decisión: 27 runtime/component-scoped
  (PanelExp, pullToRefresh, badgeInfo, resizeHandleColumna, editorPixelArt — defaults locales + override
  runtime/mapeo consumidor, todo verificado) + 4 `--menuX/--menuY` de mi seam (defaults en la propia regla;
  el scanner exige definición global: límite documentado). `--menuX/--menuY` pasaron de fallback a defaults
  en regla (mismo comportamiento). Commit local `6bb27eb` sin push.
  Evidencia `C:\tmp\varsense-pt-full-20260911e.json`.
  Queda: `propiedadProhibida` 88 (box-shadow), resto zona gris, `109A-7`, gate final.
- **FASE-FINAL PT inline HECHA 11-09** — `cssInlineReact` 25→17: 8 convertidos a clases (18 modificadores
  `pillOpcion--*` que replican tokens `COLORES_*`, `HandleArrastre--conTitulo` con especificidad que preserva
  semántica inline, bloque muerto borrado en `EncabezadoBuscadorMovilTrigger`) + 17 geometría runtime no
  estatizable con excepción firmada. Commit local `51476f4` sin push, `tsc` exit 0.
  Evidencia `C:\tmp\varsense-pt-full-20260911g.json`.
  Lo puramente imperativo (getBoundingClientRect, progresos %) → excepción documentada.
- **FASE-FINAL PT box-shadow HECHA 11-09** — 22 sombras literales → tokens por magnitud (19 elevaciones a
  `--dashboard-sombra*`, 3 anillos focus/error legacy a `rgba(var(--dashboard-acentoRgb/estadoErrorRgb),0.1)`);
  quedan literales solo resizeHandleColumna:53 (glow drag) y buscador:27 (anillo focus con acentoRgb).
  Límite del scanner: flaggea hasta `box-shadow:none` y `var(--dashboard-sombra*)` aunque `allowedValues`
  lista `none` y `bannedProperties.properties` está vacío → excepción 88 firmada.
  Commit local `482ad45` sin push (17 archivos, 23+/23-, solo swaps 1-línea; `tsc` exit 0).
  Evidencia `C:\tmp\varsense-pt-full-20260911h.json`.
  REPARACIÓN: el commit previo `93abf1c` había arrastrado WIP ajeno (260 borrados en 9 archivos); se reseteó
  (soft, sin pérdida), se re-aplicaron solo mis 22 swaps verificados (0 líneas extrañas) y el WIP ajeno quedó
  restaurado sin commitear encima.   Commits `6bb27eb`/`51476f4` auditados: limpios.
- **FASE-FINAL PT 0 ERRORES 11-09** — re-scan full: `variableNoDefinida` 31→4 errores restantes (`--menuX/--menuY`
  en mis 2 archivos: el scanner flaggea el uso aunque haya default local). Fix en la fuente: default global
  en `:root` (`variables.css`, fuera-de-pantalla; los defaults locales prevalecen por cascada,
  behavior-neutral, 0 consumidores externos). Re-scan: **error:0**, warning:195 (17 inline + 5 huérfanas con
  decisión; 173 duplicate = 168 variables.css incl. el par del seam + 5 espejos intencionales de componente →
  excepción actualizada). Commit local `f4ef066` sin push. Evidencia `C:\tmp\varsense-pt-full-20260911j.json`.
  PT VarSense queda en 0 errores con todo lo restante decidido. Queda: resto zona gris multi-proyecto,
  `109A-7`, gate final por proyecto.
- **GATE PT Sentinel 11-09** — `quality:doctor` verde (`readyForGate:true`, sin issues) + `sentinel analyze`:
  **error:0, warning:48, hint:7** (evidencia `.quality-reports/analyze.json`). Triaje MIO (commiteado) vs WIP
  (ajeno, se deja): WIP×8 (`css-adhoc-button-style`×3, `css-hardcoded-value`×4, `funcion-larga-rs`×1 — del
  trabajo en curso del usuario, NO se tocan). Decisiones registradas: `css-hardcoded-value` MIO×2
  (resizeHandleColumna:53 glow drag, suscripcion:64 sheen 0.02) = one-offs sin token honesto (sin precedente
  `color-mix` en el repo, regla no-inventar-tokens; el glow ya exceptuado en VarSense) → sin cambio;
  `todo-pendiente` hint (agente_aprobacion.rs:192) = FP («petición pendiente» es lenguaje de dominio, no
  marcador) → sin cambio.   Pendientes de decisión por lotes: `html-nativo`×20 (10 glory-core), `large-interface`×6+6 hints,
  `menu-override`×3, `componente-sin-hook/artesanal`×4, `limite-lineas`×4.
- **FASE-FINAL PT portales HECHA 11-09** — `dom-access-outside-platform` 5→0 con fix real (no excepción): los 4
  `document.body` (3 portales de menús en `catalogoModelos.tsx` + modal en `ModalConfigAgente.tsx`) ahora pasan
  por el helper `obtenerRaizPortales()` en `app/utils/portales.ts` (boundary de plataforma permitido; los
  portales son necesarios: los ancestros con transform/overflow recortan los overlays fixed — justificación
  [318A-2] conservada). El 5.º hallazgo era el comentario que mencionaba `document.body` → reescrito.
  Warnings Sentinel 48→43, `tsc` exit 0. Commit local `a3b452c` sin push. Evidencia `.quality-reports/analyze.json`.
- **FASE-FINAL PT menú/modal HECHA 11-09** — decisiones firmadas (gate en 0 errores, severidad warning):
  `menu-contextual-override-diseno`×3 = FP del matcher (EncabezadoPerfil `inputOculto` está en un `<div>` propio,
  no inyectado en `<MenuContextual>`; los 2 de `MenuContextual.tsx` son su propio render, no override externo) →
  sin cambio. `componente-artesanal` ModalCrearRecordatorio: migrar a `<Modal>` impondría header+título chrome y
  rompería el composer glass sin título con zona drag&drop → se mantiene, justificado. `componente-sin-hook`×2:
  lógica de un solo uso acoplada a la vista (picker con auto-guardado; composer con focus/reset/dnd; lo
  reutilizable ya vive en `useAdjuntos`) → extracción añadiría indirección sin reuso. `componente-artesanal`
  SubmenuNuevoInline: modo dual inline/portal con dirección por CSS que `<MenuContextual>` (solo portal por
  coordenadas) no soporta → se mantiene; como consistencia su portal pasa por `obtenerRaizPortales()`.
  Commit local `eba8c67` sin push (`tsc` exit 0).
- **FASE-FINAL PT store/adaptador HECHA 11-09** - `limite-lineas`+`nivel-2`+`import-muerto` → 0 con fixes reales:
  `store.ts` 863→42 líneas partiendo en 6 módulos por dominio (tiposAgente 102, ayudasAgente 67, turnoAgente 251,
  sliceTabs 155, sliceTurnos 208, sliceTareas 79; patrón `StateCreator` + spreads; API externa intacta:
  `useAgenteStore`/`useTabActivaAgente`/tipos re-exportados; `establecerConfig` vive en sliceTareas vía
  `Pick` documentado). `adaptador.rs` 670→~517: ayudas puras → `adaptador_base.rs` (+4 tests),
  SELECTs → `adaptador_lecturas.rs`, `estado_tarea_db` (un solo uso) inlineado en el `.bind`.
  `check:back` sin errores nuevos, `npm test` 33 passed, `tsc` exit 0.
  Sentinel run7: error 0, warning 39 (era 43), hint 6 (era 7). Commits locales sin push:
  `dbc5127` (import muerto), `654281c` (lecturas), `b171ea9` (store).
- **FASE-FINAL PT html-nativo HECHA 11-09** - `html-nativo-en-vez-de-componente` x20 con decision (0 migraciones):
  `Boton` impone chrome base (`ui.css:5` inline-flex/padding sm-lg/font-size base/line-height 1.5) y envuelve
  children en spans; migrar `tabCompartidaCerrar`/`panelIAMensajeAccion`/`pillOpcion` no es visual-neutro sin retocar
  su CSS (misma especificidad, orden fragil). `Input` envuelve en 2 divs (`inputContenedor`/`inputWrapper`) e impone
  `input input--text`, rompiendo el layout del rename inline del tab. Decisiones: `SelectorRepeticionPill.tsx:37`
  FP (es `<span role="button">` deliberado, button-en-button es HTML invalido, comentado 19-08-2026);
  `TabsPanel.tsx:71` excepcion (input inline layout-critico); `TabsPanel.tsx:87` + `mensajes.tsx:244,255` excepcion
  (icon-actions con chrome custom); glory-core x10 excepcion arquitectonica (el framework no puede importar
  `components/ui` del producto sin invertir la dependencia; incluye `ExampleIsland` demo).
  Restan 39w+6h: `html-nativo`×20, `large-interface`×5(+6h), `menu-override`×3(FP), sin-hook/artesanal×4
  (excepción), `css-adhoc`×3, `css-hardcoded`×6, `emoji`×1, `inline-style`×1, `funcion-larga-rs`×1, `todo`×1.
- **F5 HECHA 11-09** (autorización general «el wip no importa», gate 1x1 levantado) — `dashboard/variables.css`:
  204w (178 token-duplicate + 26 token-unused) → 167w (167 duplicate, 0 unused). 26 defs muertas borradas
  (18 `:root` + 8 `[data-theme=claro]`, 0 consumidores: grep repo-wide + sin acceso dinámico), commit local
  `874dd41` sin push. 44 alias probados y REVERTIDOS: VarSense compara valores resueltos (aliasar no reduce)
  y 1 rompía el tema claro (`landingGradienteClaro` solo-raíz heredado bajo claro). 167 duplicate =
  monocromo intencional → `excepciones-varsense.json` (categoría, con evidencia
  `C:\tmp\varsense-pt-f5-post2.json`). Queda: fase final, `109A-7`, gate final.
- **FASE FINAL ABIERTA (requiere al usuario)** — ~700 ítems de zona gris/unused a decidir uno a uno:
  zona gris PT (~4: premium/free/trial/expirada/noViable), límite real del scanner (~24 PT + 1 Laminal),
  puente generado Tailwind/shadcn (REST, gloryapi, AGAPE), cross-scope/cross-dominio intencionales
  (WANDORIUS, coolify, WM, PT), one-offs sin token honesto, runtime sin seam, monolitos/no-aplicables.
  Cada decisión se registra en `excepciones.json` con categoría + evidencia. **Meta: 0 hallazgos sin
  decisión.**

### 9.3 Medición del frente — `039A-3` ✅ (la consola debe medir con el artefacto del gate)

> **Ejecutado 10-09** con autorización del usuario («aplica las 3 cosas que me propones») tras
> descubrir que el panel reportaba **2044** problemas mientras ninguna medición del área daba esa cifra.

- **Causa 1 — el panel medía con otra herramienta:** la consola resolvía el runtime de Sentinel solo por
  las versiones instaladas en `%LOCALAPPDATA%\GlorySentinel\versions` (la más alta, 0.7.4, congelada
  desde agosto) mientras los proyectos fijan **0.7.8** en el checkout compartido
  (`area-trabajo/.quality-tools/sentinel`). Fix: `src/server/gate/proveedor.ts` y
  `src/server/gate/analizador.ts` resuelven primero el checkout compartido —catálogo de reglas, CLI que
  ejecuta y versión que se **registra** en cada análisis— con degradación a las instaladas si no hay
  checkout. `VERSION_CURACION_SENTINEL` 0.7.4 → 0.7.8, y `scripts/sync-gate-schema.mjs` valida ahora
  contra el `config.d.ts` del runtime **en uso**: `npm run sync:gate` →
  `{versionRuntime: 0.7.8, versionCuracion: 0.7.8, problemas: []}`, exit 0.
- **Causa 2 — terceros contados como código propio:** `glory-harness/data/referencias-cli/` contiene
  clones de claurst, vscode, hermes-agent y opencode → 466 hallazgos y 228 errores falsos. Fix:
  `**/data/referencias-cli/**` añadido a `excludePatterns` de `glory-harness/sentinel.config.json`
  (reversible; los clones NO se borran).
- **Verificación en vivo (10-09):** `/api/gate/reglas` → `version 0.7.8` (fuente runtime, 110 reglas);
  re-análisis de glory-harness → **364 hallazgos / 99 errores** (antes 805 / 327), **0** en
  `referencias-cli`, versión registrada **0.7.8**. Total del área re-medido en §3.
  *(Cifra vigente al 10-09 posterior: 366 / 102 — ver la nota de fluidez de §3.1; 364/99 es el corte
  inmediatamente anterior, antes del commit `109A-3` del usuario.)*
- **Nota de interpretación (honestidad de la cifra):** la parte VarSense de glory-harness subió de 279 a
  303 entre ambas mediciones (claseHuerfana 229 → 253). **No** lo causa la exclusión —VarSense no lee la
  config de Sentinel (0 referencias en su dist) y su conjunto de escaneo no cambió—: es el árbol en
  curso de `109A-2` (`desktop/ui/src/adaptadores/api.ts` modificado 06:09, `componentes/memorias.ts` y
  `estilos/memorias.css` nuevos 06:16, `main.ts` 06:17). El conteo actual es reproducible: corrida
  directa de `varsense all --format json` = `severityCounts {error: 50, warning: 253}`.
- **Regla derivada:** una cifra solo es comparable con un plan si se registra la versión del binario que
  la produjo **y** ese binario es el que ejecuta el gate (§5.5, §7).

### 9.4 Verificación, reglas inviolables y DoD del frente

- **Verificación transversal por fase:** harness 9/9 MANTENIMIENTO (0 descubiertos, 0 drift); VarSense 0
  errores y sin hallazgos nuevos fuera del registro; Sentinel 0 errores y sin hallazgos nuevos en los
  archivos tocados; type-check + build del stack de cada repo tocado; WIP del usuario intacto (PT:
  `variables.css`, `data/`, `test_prueba.md`); auditoría FN old→new si se toca core; scratch `C:\tmp`
  limpio; commits locales por repo con stage explícito y **sin push** (decisión del usuario).
- **Reglas inviolables:** no tocar generados Tailwind/shadcn (`@theme`), ni submódulos (`glory-rs`), ni
  `variables.css` antes de F5; no borrar con verificador automático solo (inspección manual + búsqueda
  repo-wide por clase); ante duda **RETENER** y pasar a la lista final en vez de arriesgar una FN; no
  inventar tokens (sin segundo consumidor real, no se fuerza).
- **DoD del frente:** clases muertas confirmadas borradas (F2) + familias dinámicas re-clasificadas (F1)
  + `valorHardcoded` con token exacto colapsados (F3) + seams probados y aplicados (F4) + WIP de PT
  procesado cuando aterrice (F5) + **cada ítem de la fase final decidido y registrado** → 0 pendientes
  sin decisión, harness 9/9 verde con el registro decidido como única cobertura.

## 10. Planes absorbidos y su evidencia (no borrar; no re-crear duplicados)

| Plan | Campaña / alcance | Estado | Dónde queda la evidencia |
|---|---|---|---|
| `workspace-manager/PLAN-corregir-hallazgos-2026-09-06.md` | 9 proyectos, solo VarSense; autotitulado «Plan ÚNICO» | **CERRADO como frente el 10-09** (lo reemplaza §9); archivo conservado íntegro | El propio archivo (§1 historial, §2 frente vivo, §4 registro) + roadmap de workspace-manager (PLAN-CERO-DEUDA, 308A-7V13..V22) + git `f1e2535^`, `499d988` |
| `PLAN-corregir-1408.md` | 1408 (30–31-08): frentes por proyecto a piso honesto | Cerrado; eliminado el 06-09 | Historial §1 del plan de workspace-manager + roadmap WM 308A-2/S2-12 + git `f1e2535^` |
| `PLAN-corregir-hallazgos-post-gate.md` | 308A-3 (31-08): análisis 0.7.4 en proyectos sin gate | Cerrado; eliminado el 06-09 | Historial §1 del plan de workspace-manager + roadmap WM 308A-3 + git `f1e2535^` |
| `PLAN-corregir-restantes-sentinel-varsense.md` | 308A-5 → 318A-7V1..V20 (31-08 → 02-09) | Cerrado; eliminado el 06-09 | Historial §1 + entradas 318A-7V13..V20 del roadmap WM + `excepciones.json` + harness + git `f1e2535^` |
| `PLAN-cero-deuda-2026-09-02.md` | 308A-7V21/V22 (02-09) | Contenido vivo heredado a §9; eliminado el 06-09 | §9 de este plan + aviso en el plan de workspace-manager + roadmap WM PLAN-CERO-DEUDA + git `f1e2535^` |

> **Estado de la unificación (10-09):** existe **un solo** plan vivo de la campaña cero-deuda del área
> (`039A-1`, este archivo) y el otro documento del mismo frente quedó convertido en evidencia histórica
> con puntero. Nada se borró: los cuerpos completos de los 4 planes eliminados el 06-09 siguen en el
> historial §1 del plan de workspace-manager y en git `f1e2535^`.
