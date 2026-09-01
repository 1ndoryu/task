# Plan 318A-4: Publicar el tooling y cerrar 318A-3 al 100%

- Fecha: 2026-09-01
- Estado: CERRADO (Fases A–F HECHAS)
- Última actualización: 2026-09-01
- Origen: chequeo 100% del plan 318A-3 (verificado en `planes/completados/plan-reactivar-reglas-visuales-sentinel-2026-08-31.md` — CERRADO con DoD salvo verificación visual, luego completada).

## Objetivo

Cerrar TODO lo pendiente del plan 318A-3 y de su verificación al 100%:

1. **Publicar** los fixes de tooling que quedaron como commits locales no publicados:
   - varsense: fix **J-8** (`303e7f9`, `claseHuerfana` dinámica) — 8 consumidores ya lo fijan, pero el commit **no está en origin** de `1ndoryu/varsense` (origin/main = `88f281f`). Al publicarlo, los pins dejan de ser fantasma.
   - sentinel: fix **F2** (`aa606a8`, workspace roots de components/ui/shared en `reactComponentRules`) — vive solo en la rama local `fix/318A-3-f2-rutas`; no hay release publicado que lo incluya.
2. **Implementar §13/§14 del plan 318A-3**: reactivar la regla `css-hardcoded-value` (hoy comentada en `ruleRegistry.ts`) y crear la regla nueva `formulario-config-sin-sistema-declarativo` (detecta modales/secciones de configuración hechos a mano sin FormCampo/FormularioConfiguracion). Publicarlas juntas con F2 en un release nuevo de sentinel.
3. **Re-pinear** los consumidores al release publicado (sentinel `643353d` (v0.7.5) → nuevo commit; varsense `88f281f`/`303e7f9` según corresponda), regenerar locks y verificar doctores.
4. **PT frontend (coherencia §12.7)**: corregir la incoherencia visual de `ModalConfigAgente` (iconos en títulos de sección, ritmo/gap distinto al sistema declarativo), eliminar los 2 `sentinel-disable-file` (`css-adhoc-button-style`, `css-especificacion-diseno-local`), y migrar con FormCampo donde la forma del campo lo permita.
5. **§12.2/§12.6.2 re-evaluado**: con F2 publicado, el analizador ya sondea `frontend/src/app/components/ui` → los escapes documentados (botones/inputs/labels de modales) pasan a ser hallazgos reales: migrarlos con el patrón twin-class verificado (cero cambio visual).
6. **§12.1**: extender el sistema declarativo a los archivos de config restantes tractables; lo no tractable se registra como tarea explícita en el roadmap (no silencio).
7. Verificación completa (type-check, build, sentinel + varsense antes/después, gate) y cierre documentado.

## Reglas honradas

- Refactors verificados: `npm run type-check` / `tsc --noEmit` exit 0; tests de sentinel/varsense para cambios de analizador.
- Cero alteración visual no justificada; la corrección de coherencia §12.7 SÍ altera visual de forma deliberada y documentada (ese es su objetivo).
- Sin disables nuevos para bajar conteo; se RETIRAN los 2 disable-file de ModalConfigAgente.
- Pushes: a `glory-sentinel` y `varsense` (GitHub) para publicar los fixes; a PT al cerrar el bloque (protocolo §15 de PT: cerrar con commit+push). Autorizado explícitamente por el usuario ("publica y termina sentinel con todo lo necesario... sin esperar mi autorizacion").
- No tocar: freebuff, `.quality-tools` de otros (wrappers sí), cambios ajenos sin commitear.

## Inventario de consumidores (verificado 2026-09-01)

Sentinel `643353d` (v0.7.5) + varsense `303e7f9` (no publicado): GLORYINSPECTOR, GLORYPORT, Glory-Laminal, RESTAURANTE, WANDORIUS, coolify-manager-rs, freebuff-bridge, workspace-manager.
Sentinel `643353d` + varsense `88f281f`: PROYECTO TASKS, ONG AGAPE (TRABAJOS CLIENTES/ONG AGAPE).
Locks actuales de cada uno se regeneran con el comando oficial (`quality:lock`/`quality:config`/`quality:setup` según proyecto; PT usa `quality:setup`+`sentinel.lock.json` legacy vía `scripts/quality/`).

## Estado de ejecución

### ✅ Fase A — HECHA (2026-09-01)

- J-8 (`303e7f9`, fix `claseHuerfana` dinámica + bug `removeComments`) publicado en origin de `varsense` (GitHub `1ndoryu/varsense`): `origin/main` → `303e7f9`.
- Tag: `v2.2.1-j8` (variación documentada: los consumidores fijan versión 2.2.1 + commit; se mantuvo el tag de versión 2.2.1 y se añadió `-j8`, en vez del propuesto v2.2.2, para que pins por versión sigan resolviendo).
- `dist/` del checkout compartido `.quality-tools/varsense` reconstruido desde `303e7f9` (verificado: fix presente, PT baseline re-medido).
- Evidencia: `git ls-remote` de varsense muestra `303e7f9` en main; checkout compartido limpio en `303e7f9`.

### ✅ Fase B — HECHA (2026-09-01, release v0.7.6)

- Rama base: `aa606a8` (F2) cherry-picked sobre `643353d`; regla `css-hardcoded-value` reactivada en `ruleRegistry.ts` + cableada en `staticAnalyzer.ts` (`staticCssRules.verificarCssHardcoded` — estaba muerta).
- Regla nueva `formulario-config-sin-sistema-declarativo` implementada (archivos `(ModalConfig|SeccionConfig|Config)*` sin FormCampo/FormularioConfiguracion y ≥3 controles nativos) + tests en `src/test/suite/formularioConfigSystem.test.ts` (572 tests suite verde).
- Corrección de release: al añadir la regla, `reactComponentRules.ts` superó el budget 950 (965) y `check:core` falló; se extrajo la regla a su módulo propio `src/analyzers/react/formularioConfigSystem.ts` (+ budget module) → `check:core` 912/950.
- Release: `main` → `fbb580f` (fix completo), tag `v0.7.6` (antiguo tag roto `4a4a0f9` superado y re-tageado). `out/` del checkout compartido reconstruido desde `fbb580f`.

### ✅ Fase C — HECHA (2026-09-01)

- 11 consumidores re-pineados a sentinel `fbb580f` (0.7.6); varsense a `303e7f9` donde aplica (PT/ONG AGAPE y los que fijaban `643353d`+varsense).
- Locks regenerados con el mecanismo de cada proyecto (generador oficial / shared minimal por `identitySha256` del `git archive`); hash verificado: `sha256(git archive fbb580f)` = `34dc7739...` coincide con los locks.
- Fix auxiliar real: `WANDORIUS/scripts/quality/setup.mjs` pasaba rutas absolutas a tar (GNU tar las interpretaba como host remoto) → ruta relativa desde staging cwd (commiteado en WANDORIUS).
- Doctores finales (9/9 con doctor): workspace-manager ✅, RESTAURANTE ✅, PT ✅, ONG AGAPE ✅, gloryapi ✅, GLORYPORT ✅, GLORYINSPECTOR ✅, Glory-Laminal ✅, coolify-manager-rs ✅, WANDORIUS ✅ (con `GLORY_SENTINEL_SOURCE_PATH`/`GLORY_VARSENSE_SOURCE_PATH`, ready:true issues:none — desync de env documentado).
- Commits de re-pin por consumidor: workspace-manager `257c5db`, RESTAURANTE `973d6d9`, gloryapi `c670a39`, GLORYPORT `56b29e2`, GLORYINSPECTOR `19dc9ed`, Glory-Laminal `340de25`, coolify-manager-rs `eb9af6a`, ONG AGAPE `687b391`, PT `31d6743` (WANDORIUS ya commiteado con su lock+setup.mjs).

### ✅ Fase D — HECHA (2026-09-01)

- `ModalConfigAgente.tsx` migrado al sistema declarativo: `FormCampo` (6 campos verticales: 2 selects + 4 sliders con `<output>` de valor), `Radio` canónico para `SelectorModo` (3 opciones con descripción), `Boton` para el botón nativo restante y para los botones nativos de skills; iconos eliminados de todos los títulos de sección.
- CSS `modalConfigAgente.css` reescrito: **0 disables** (retirados los 2 `sentinel-disable-file`), clases muertas eliminadas (`modalConfigAgenteCampo/Check/SkillActiva`, `CampoAgente`), estilos de botones ad-hoc eliminados.
- Split natural: `componentes.tsx` (332 líneas) → `catalogoModelos.tsx` (MODELOS_AGENTE + tipo `ModoAgente` + `MODOS_AGENTE`, re-exportados desde `componentes`); `limite-lineas` resuelto.
- `formCampo.css`: color del `<output>` de valor movido aquí (el valor del rango del modal lo usa ahora vía FormCampo).
- Verificación: `npm run type-check` exit 0; sentinel PT 0.7.6 **115 (107w/8h) → 108 (100w/8h)** — −5 `html-nativo` (3 modal + 2 componentes), −1 `formulario-config`, −1 `limite-lineas` (split), 0 hallazgos nuevos, 0 errores (el `dom-access` ×2 solo cambió de archivo, mismo conteo).
- Verificación visual real (island `/agente/formularios318a3`, dev 5176): los 3 tabs del ModalConfigAgente renderizan coherentes — sin iconos en títulos, ritmo/gap FormCampo uniforme, radios con descripción, `Guardar`/`Cerrar` con `Boton` del sistema.

### ✅ Fase E — HECHA (2026-09-01, release v0.7.7)

- Inventario §12.1: los únicos 2 hallazgos `formulario-config-sin-sistema-declarativo` (SeccionConfigPerfil, ConfigDeficitCalorico) resultaron ser **falsos positivos del analizador**: la regla nueva usaba regex con flag `i`, contando los componentes capitalizados del sistema (`<Input`, `<Select`, `<Textarea`, `<Boton`) como campos nativos. Ambos archivos ya usaban el patrón twin-class correcto (componentes del sistema).
- Fix honesto en el analizador (no en los componentes): `formularioConfigSystem.ts` patrón de etiquetas nativas ahora case-sensitive (`[a-z][a-z0-9-]*` sin `i`). Test nuevo que bloquea la regresión (573/573 tests).
- Release **v0.7.7** (`0559576`, commit `fix(formulario-config): patron de campos nativos case-sensitive`): main ff a `0559576` en `glory-sentinel` local + push a GitHub (`git ls-remote` verificado); `out/` del checkout compartido reconstruido desde `0559576`.
- Re-pin de los 11 consumidores a `0559576` (quality-tools.json + locks regenerados) + evidencia de release regenerada (`quality:setup` por consumidor; WANDORIUS con env internos `GLORY_SENTINEL_SOURCE_PATH`→`tools/sentinel`, `GLORY_VARSENSE_SOURCE_PATH`→`tools/varsense` + gitlink `0559576` commiteado `f67c3a18`).
- Resto de archivos del inventario §12.1 sin forma de campo compatible (runtime desktop, glory-rs, Canvas) → documentados como tarea de seguimiento en roadmap de PT (Fase E paso 2), no forzados.

### ✅ Fase F — HECHA (2026-09-01)

- Verificación final PT: `npm run type-check` exit 0; `npm run build` (tsc -b + vite) exit 0; `sentinel analyze` PT **115 → 106 (0e/98w/8h)** sin regresión (familia `html-nativo` del modal resuelta, `formulario-config` ×2 FPs eliminados); varsense **0 errores**; island visual verificada (9+1 formularios + ModalConfigAgente corregido).
- Roadmaps RESTAURANTE/WANDORIUS: entrada F7 actualizada con nota "F2 publicado en v0.7.6/v0.7.7" (solo doc, sin gate).
- Commits por repo con stage explícito (re-pin 0.7.7): GLORYPORT `0deef53`, GLORYINSPECTOR `1b1a667`, gloryapi `738c490`, workspace-manager `a2c5d3f`, RESTAURANTE `8b58345`, ONG AGAPE `2440486`, Glory-Laminal `cbca029`, coolify-manager-rs `a4e3308`, WANDORIUS `f67c3a18`, PT `2876526`. Push PT según protocolo §15.
- Plan movido a `Agente/planes/completados/`; evidencia en `Agente/completados/tareas-2026-09-01.md`.

## Fases

### Fase A — Publicar varsense J-8 (303e7f9)

1. Verificar el contenido del fix: `git show 303e7f9 --stat` (src/core/classIndexBuilder.ts, 113+/6-).
2. En `.quality-tools/varsense`: correr su suite de tests (`npm run smoke:lsp` / `check:core` o equivalente de package.json).
3. Publicar: credencial GitHub de `1ndoryu/varsense`; push del commit a origin/main (ff-only) + tag `v2.2.2`.
4. Reconstruir `dist/` compartido desde el commit publicado (si el layout de consumo lo exige) y verificar que un consumidor (PT) lo usa sin desync.
5. Evidencia: `git ls-remote origin` muestra `303e7f9` en main.

### Fase B — Implementar §13/§14 en sentinel y publicar release

1. Crear rama `fix/318A-4-reglas-config` desde `643353d` en `.quality-tools/sentinel`:
   - cherry-pick `aa606a8` (F2) — ya está en la rama `fix/318A-3-f2-rutas`; rebasar esa rama sobre `643353d` y usarla de base.
   - reactivar `css-hardcoded-value` en `ruleRegistry.ts` (descomentar; severidad warning).
   - nueva regla `formulario-config-sin-sistema-declarativo`:
     - registro en `ruleRegistry.ts` (categoria ReactPatrones, severidad warning).
     - implementación en `reactAnalyzer.ts` (u hook nuevo): para archivos cuyo nombre base matchea `(ModalConfig|SeccionConfig|Config).*\.(tsx|jsx)` y que NO importan `FormCampo`, `FormularioConfiguracion` ni `CampoEspecificacion`, y que contienen ≥3 campos de formulario nativos (`<input|<select|<textarea|<button`) → hallazgo con ruta/mensaje accionable. Excepciones: archivos excluidos por `sentinel-disable-file`, componentes base del propio sistema declarativo, `glory-rs/`.
   - tests: `formularioConfigSystem.test.ts` con casos positivo (modal manual), negativo (modal con FormCampo), y excepción (disable-file).
2. `npm run test:unit` / `npm run check:core` verde.
3. Versionar `0.7.5 → 0.7.6` en package.json, compilar `out/`, commit de release, tag `v0.7.6`, push a `glory-sentinel` (rama main fast-forward + tag).
4. Reconstruir el checkout compartido `.quality-tools/sentinel` al commit publicado.

### Fase C — Re-pinear consumidores (sentinel v0.7.6 + varsense v2.2.2)

1. quality-tools.json de los 10 consumidores: sentinel commit → nuevo commit (v0.7.6); varsense → `303e7f9` para PT y ONG AGAPE (o el commit del tag v2.2.2 si difiere).
2. Regenerar locks con el comando oficial de cada proyecto; `quality:doctor` en verde donde exista.
3. Desyncs preexistentes conocidos se verifican igual (no se fuerzan).
4. Evidencia por proyecto en el plan.

### Fase D — PT: coherencia ModalConfigAgente (§12.7 + §12.2 real)

1. Migrar los `<button>`/`<input>`/`<textarea>`/`<select>` del modal al sistema (`Boton`, `Input`, `Textarea`, `Select`) con patrón twin-class (clase custom aterriza en el elemento nativo interno — verificado en Input/Textarea) manteniendo idéntico layout.
2. Secciones: quitar iconos de los títulos (los títulos del patrón A no usan iconos) o alinearlos al sistema; unificar gap/ritmo con tokens (`FormCampo.css`); quitar los 2 `sentinel-disable-file` de cabecera.
3. Dejar desplegado el modal en la island de verificación y capturar antes/después.
4. `npm run type-check` exit 0, `npm run build` exit 0.
5. Con F2 activo: re-correr sentinel y verificar que los hallazgos de la familia `html-nativo` del modal han desaparecido (migrados), sin disables.

### Fase E — §12.1: extensión del sistema declarativo (tractable subset)

1. Inventario de los ~23 archivos señalados originalmente; migrar los que tengan forma de campo compatible con FormCampo (toggles/select/input con especificación declarable) con el patrón validado (ItemToggle/FormCampo).
2. Los que requieran UI custom (runtime desktop, glory-rs, Canvas) se documentan como tarea de seguimiento en el roadmap de PT con referencia a este plan (no se fuerzan).
3. Verificar por archivo type-check; una sola ronda de sentinel al cierre.

### Fase F — Cierre

1. Verificación final: type-check + build + `sentinel analyze` PT (conteo antes/después, sin regresión) + varsense 0 errores + island visual (9+1 formularios + ModalConfigAgente corregido).
2. Actualizar este plan a CERRADO, mover a `Agente/planes/completados/`, evidencia en `Agente/completados/tareas-2026-09-01.md`, roadmap PT actualizado (retirar entradas resueltas: 318A-3 pendientes y registros F7/F8 si quedan).
3. Roadmaps RESTAURANTE/WANDORIUS: las entradas F7 (reactivar `html-nativo`/`mixed-barrel-logic`) se actualizan con la nota "F2 publicado en v0.7.6" (solo doc, sin gate).
4. Commits por repo con stage explícito y push (PT protocol §15); sin tocar freebuff ni `.quality-tools` ajenos.

## Definition of Done

- `git ls-remote origin` de glory-sentinel y varsense muestran los fixes publicados (tags v0.7.6 / v2.2.2 o commit equivalente).
- Los 10 consumidores tienen quality-tools.json con commits alcanzables y locks regenerados (o desync preexistente verificado, no forzado).
- ModalConfigAgente: sin iconos en títulos (o alineado al sistema), sin disables, migrado al sistema declarativo donde aplicable, type-check/build verdes.
- `sentinel analyze` PT sin regresión y con familia `html-nativo` del modal resuelta; varsense 0 errores.
- Plan CERRADO + movido a completados + roadmap/pendientes actualizados con evidencia.