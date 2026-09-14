# Plan batch FPs herramientas — single release (119A-4, 2026-09-11)

Origen: triaje 0.7.10/2.2.1 (039A-1 cerrado, 379 ítems, 0 errores).
Objetivo: **un solo release** que corrija en la herramienta todos los FPs verificados,
con re-medición completa posterior. Sin commits de producto en este plan.

## Fuentes
- Sentinel: `area-trabajo/glory-sentinel` (`src/`, `rules.md`, `fixtures/`, `PLAN_V3_*`)
- VarSense: `WANDORIUS/tools/varsense`
- Oráculo (no tocar): `C:\tmp\final-0710-*.json`, `C:\tmp\remedicion-0710-coolify.json`

## Fixes Sentinel (glory-sentinel) — todos verificados contra oráculo 11-09
###(dump lines 0-based; verificado con ql.mjs leyendo la línea exacta)
- **S1 `todo-pendiente` — prosa española.** Evidencia (3 sitios):
  `coolify db_tmp.rs:199` ("todo en el VPS"), harness `context.rs:971`
  ("todo el historial"), REST `bdp_sync.rs:674` ("Pendiente de validación" =
  estado de orden BDP, lenguaje de dominio).
  Root-cause: `defaultRules.ts:211` usa flag `/i` (español "todo"=everything
  casa con TODO) e incluye PENDIENTE (palabra común de dominio).
  Fix: case-sensitive + quitar PENDIENTE:
  `/(?:\/\/|\/\*|#|<!--)\s*(?:TODO|FIXME|HACK|XXX)\b/`.
  (El 4.º sitio citado en triaje, `agente_aprobacion.rs:192`, no existe en
  ningún repo — cita retirada.)
- **S2 `css-hardcoded-value` — máscara de luminancia.** Evidencia (4 sitios):
  AGAPE `Donar.css:118-119`, `Aliados.css:40-41` (`#000` en `mask-image`:
  cualquier opaco vale, convención). Fix: saltar declaraciones `mask-image`.
  CORRECCIÓN al triaje: los 10 `portal.css` coolify son rgba() reales y los
  10 box-shadow AGAPE son sombras reales — deuda, no FP.
- **S3 `menu-contextual-override` — propio componente + hijos.** Evidencia PT:
  `MenuContextual.tsx:67,73` (su PROPIA clase separador dentro del propio
  componente), `EncabezadoPerfil.tsx:110` (div hermano: el tag de apertura
  `<MenuContextual ...>` en una línea nunca cierra el escaneo → lee hijos).
  Fix: (a) skip si basename es `MenuContextual.*`; (b) escanear solo el tag
  de apertura (hasta el primer `>` que lo cierra), no los hijos.
- **S4 `modal-*-no-canonica` — canónica inexistente.** Evidencia AGAPE:
  `ModalEditarMetodo.tsx:207` (react), `PanelAdmin.css:663`,
  `Acciones.css:176` (CSS); `grep modalAcciones|modalFormulario|modalTexto`
  en frontend-v2 = 0. Fix: `proyectoTieneModalCanonico()` (roots globales +
  fs con caché, fail-closed si roots sin configurar) y skip en las 3 reglas
  si la canónica no existe. (Sin anomalía: el "FP-S4" de `9f475d2` era el fix
  Rust de harnesses, colisión de nombres.)
- **S5 `key-index-lista` — slots fijos.** Evidencia AGAPE `VistaHistoria.tsx:223`:
  `useState<string[]>(Array(NUMERO_IMAGENES).fill(''))` (longitud fija, sin
  reorden). Fix: eximir receptores inicializados con `Array(...).fill(`.
- **S6 `window-reference` — strings de documentación.** Evidencia WM
  `etiquetas.ts:78` (`window.location` dentro de un literal). Root-cause:
  `portableRules.ts` solo recorta `//`, no strings. Fix: despojar literales
  antes de testear.
- **S7 exención por ruta framework (decisión usuario P3).** Evidencia: 15
  `html-nativo-en-vez-de-componente` en `glory-core/` (la regla pide
  "Import desde components/ui" al framework — inversión imposible).
  Root-cause: `esRutaGlory` solo casa `/Glory/`. Fix: añadir `/glory-core/`.

## Fixes VarSense (WANDORIUS/tools/varsense)
- **V1 `token-unused` — `@theme inline` Tailwind v4.** Evidencia gloryapi 38
  tokens (consumo en build, invisible al snapshot). Fix: tratar `@theme inline`
  como consumido-por-build.
- **V2 `propiedadProhibida` vs `allowedValues`.** Evidencia PT 88
  (`none`/`var()` marcados pese a estar permitidos). **Primero verificar en
  fuente** (¿ adjoining rule? ¿config?) antes de calificarlo como fix.

## Decisiones de usuario ya tomadas (proyectos, fuera de este batch)
- **P2** helper centralizado estilo PT `obtenerRaizPortales` (WM/REST/coolify).
- **P4** extender canónica (Boton ghost, Modal sin header, tabs/pills, iconos 14px).

## Reclasificados — NO son FP, van a revisión de aceptaciones (pendiente)
- REST `PlanoSala.tsx`: **5 useState reales** (mi "3" era erróneo).
- AGAPE 8 `box-shadow rgb(0 0 0/x)`: sombras reales sin token en frontend-v2.

## Proceso single-release
1. Por fix: reproducir con fixture mínimo + caso real del oráculo.
2. Build+tests de cada herramienta en su repo (`C:\tmp` para artefactos).
3. Un commit certificador por herramienta (evidencia build/test reproducible).
4. Propagar a los 12 consumidores con la herramienta única de propagación
   (`quality:bump` o equivalente — verificar cuál existe); alinear
   gitlink/checkout/lock; regenerar locks con comando oficial.
5. `doctor` por consumidor + re-medición completa 12 proyectos.
6. TABLA post-release: los sitios-oráculo deben dar 0 sin excepciones nuevas.
7. Cierre: commit del plan + evidencia en `Agente/completados/`.

DoD: 0 findings en todos los sitios-oráculo; fixtures existentes en verde;
ningún consumidor con lock desalineado.
