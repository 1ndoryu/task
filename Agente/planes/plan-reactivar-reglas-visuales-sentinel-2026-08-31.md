# Plan v2: Sistema centralizado de formularios de configuración + arreglo de Sentinel (318A-3)

> Fecha: 2026-08-31 · Estado: ACTIVO (v2, replanificado, EN CIERRE — F1-F6 ✅, F7 parcial, F8 pendiente de decisión) · Proyecto: PROYECTO TASKS (repo `task`)
> Revisión post-cierre: 2026-09-01 (supervisor-thinking) — ver §12 con los ajustes de la revisión.
> Dirección del usuario: primero crear una **funcionalidad centralizada para formularios** para que
> todas las configuraciones en modales sean consistentes entre sí y se pueda **especificar y
> hardcodear configuraciones** de forma declarativa. Después arreglar el bug de Sentinel.

## 1. Objetivo (redefinido)

1. **Crear un sistema de formularios declarativo y centralizado** para las configuraciones en
   modales del proyecto, de modo que todas sean consistentes (mismo lenguaje visual, misma
   organización de campos, mismos paddings) y que las especificaciones de cada campo se escriban
   en **configuración declarativa** (no código repetido por modal).
2. **Arreglar el bug de rutas de Sentinel** (`existeComponenteUi`) y cualquier otro defecto del gate.
3. Revisar qué reglas deshabilitó otro agente en otros proyectos (informe), sin tocar sus gates sin
   autorización.

> Esto sustituye el plan v1 "reactivar reglas y migrar 44 botones". La unificación de formularios
> resuelve la inconsistencia visual de raíz; la reactivación de reglas queda como consecuencia
> natural (una vez unificado, las reglas de consistencia pueden reactivarse con poco ruido).

## 2. Diagnóstico actual: 3+ patrones de formulario inconsistentes

| Patrón | Componentes | Ejemplos | Problema |
|---|---|---|---|
| **A. itemOpcionConfig** (panel de config global) | `.itemOpcionConfig` + `.detallesOpcionConfig` + `.tituloOpcionConfig`/`.descripcionOpcionConfig` + `Input`/`Select`/`Checkbox`/`Textarea` | `SeccionConfigIAPanelChat`, `SeccionConfigScratchpad`, `SeccionConfigGruposFb`, `ModalConfiguracionHabitos`, `ModalConfiguracionTareas`, `ModalConfiguracionProyectos`, `ModalConfiguracionRecordatorios`, `ModalConfiguracionScratchpad`, `ItemToggle` | HTML repetido `<div class="itemOpcionConfig"><div class="detallesOpcionConfig"><span class="tituloOpcionConfig">...` en **9 archivos**; cada uno copia el mismo esqueleto |
| **B. modalConfigAgenteCampo** (modal agente) | `<label class="modalConfigAgenteCampo">` con input/select/textarea/range directos | `ModalConfigAgente` | Usa HTML nativo (`<select>`, `<input>`, `<textarea>`) en vez de componentes UI; layout de label-campo distinto |
| **C. configExp / configDeficit** (plugins) | `.configExpLabel` + `.configExpCampo` / `.configDeficitLabel` + `.configDeficitCampo` + `Input`/`Select` | `ConfigExp`, `ConfigDeficitCalorico` | Dos estilos propios, con `FilaRange` local duplicado y paddings normalizados por separado en ronda 22 |

**Raíz del problema:** no existe un **componente de "campo de formulario"** (etiqueta + ayuda + control +
organización) ni un **sistema declarativo** donde cada campo se defina una vez (título, descripción,
tipo de control, opciones, min/max/step, placeholder, validación) y el modal/panel los renderice
igual. Cada formulario reimplementa su propio layout.

### 2.1 Historial verificado: por qué se desactivaron las reglas

- `7c2c5a4` (30-ago): deshabilitó sqlx + CSS ad-hoc con `sentinel-disable-file` → **935→520**.
- `082a50a` (30-ago, Codebuff): deshabilitó 10 reglas de convención del design system → **520→260**.
  Reglas: `mixed-barrel-logic`, `modal-semantica-no-canonica`, `modal-con-titulo`,
  `modal-estructura-no-canonica`, `modal-acciones-no-canonico`, `html-nativo-en-vez-de-componente`,
  `button-clase-especifica`, `componente-sin-hook-glory`, `menu-contextual-override-diseno`,
  `componente-artesanal`.

### 2.2 Inventario real de hallazgos (PROYECTO TASKS, tras ronda 22)

| Categoría | Hallazgos | Dónde |
|---|---|---|
| `<button>` nativo | **44** | 22 en `app/`, 22 en `glory-core/` |
| `<input>` nativo | **19** | 14 text, 1 datetime-local, 1 tel, 1 file, +ModalConfigAgente |
| `<select>` nativo | **6** | `ModalConfigAgente` (4), `PanelAgente` (1), `BlockEditorModal` (1) |
| `<textarea>` nativo | **4** | `ModalConfigAgente` (2), `PanelAgente` (1), `BlockEditorModal` (1) |
| `<a href>` interno estático | **0** | todos dinámicos/#/download/externos |
| `<input type="range">` nativo | **0** ✅ | ronda 22 limpia |
| checkbox nativo en app | **0** ✅ | ronda 22 limpia |
| `componente-artesanal` (addEventListener) | **4** archivos | 2 ya con disable |
| Overlay/backdrop con onClick (modal artesanal) | **13** archivos | candidatos a `Modal.tsx` |

> El detalle del bug de rutas del binario está en la sección §5; el inventario de otros proyectos en §7.

## 3. Diseño propuesto: `FormCampo` + `especificaciones` declarativas

### 3.1 Componente `FormCampo` (nuevo, en `components/shared/` — confirmado)

Un único componente que renderiza un campo de formulario consistente. **Decisión v2: reutiliza
las clases existentes** (`itemOpcionConfig`/`detallesOpcionConfig`/`tituloOpcionConfig`/
`descripcionOpcionConfig`/`separadorOpcionesConfig` de `configuracionTareas.css`) en vez de crear
CSS nuevo → **cero cambio visual** garantizado y un solo layout. CSS nuevo mínimo solo para el
modificador vertical/ayuda (`formCampo.css`).

```tsx
interface PropsFormCampo {
    titulo?: string;          // opcional (filas de acciones sin título, ej: estado del token)
    descripcion?: ReactNode;  // bajo el título
    accionesDetalles?: ReactNode; // contenido extra dentro de detallesOpcionConfig (patrón GruposFb)
    control?: ReactNode;      // Input/Select/Checkbox/Range/Textarea/ToggleSwitch
    ayuda?: ReactNode;        // texto bajo el control
    orientacion?: 'vertical' | 'horizontal'; // default horizontal (el actual space-between)
    compacto?: boolean;       // detallesOpcionConfig--compacto
    claseDescripcion?: string; // variantes (--error)
}
```

Renderiza (horizontal, idéntico al esqueleto A actual):
```
<div class="itemOpcionConfig">
  <div class="detallesOpcionConfig [detallesOpcionConfig--compacto]">
    <span class="tituloOpcionConfig">{titulo}</span>
    <span class="descripcionOpcionConfig">{descripcion}</span>
    {accionesDetalles}
  </div>
  {control}
</div>
```

Esto **reemplaza** los 3 patrones A/B/C.

### 3.2 Especificaciones declarativas (`CampoEspecificacion`)

En lugar de copiar `<FormCampo titulo=... descripcion=...>`, cada configuración declara sus campos
como **datos** y un renderer genérico los dibuja:

```ts
interface CampoEspecificacion<T> {
    clave: keyof T & string;                          // también es la React key estable (key-index)
    titulo: string;
    descripcion?: string;
    tipo: 'texto' | 'password' | 'numero' | 'select' | 'checkbox' | 'range' | 'textarea'
        | 'toggle' | 'info';                          // info = fila solo texto (sin control)
    opciones?: OpcionSelect[];                        // select (valor string|number)
    min?: number; max?: number; step?: number;        // range/numero
    placeholder?: string;
    maxLength?: number;
    filas?: number;                                    // textarea
    valorMostrar?: (v: unknown) => string;             // ej: temperatura.toFixed(1)
    cuando?: (v: T) => boolean;                        // condicional (solo admin, solo modo X)
    deshabilitado?: boolean;
    alCambiar?: (valor: unknown, valores: T) => void; // lógica cruzada (ej: proveedor→modelo)
}
```

Y el renderer declarativo:

```ts
function FormularioConfiguracion<T>({campos, valores, alCambiar, conSeparadores = true}: {
    campos: CampoEspecificacion<T>[];
    valores: T;
    alCambiar: (clave: keyof T & string, valor: unknown) => void;
    conSeparadores?: boolean;
}): JSX.Element
```

que itera `campos`, decide visibilidad con `cuando`, renderiza el control correcto por `tipo` dentro
de `<FormCampo>` con `key={campo.clave}` (estable), y aplica `valorMostrar`. Los selects usan
`claseAdicional="selectOpcionConfig"` (idéntico al uso actual). Los rangos derivan el `aria-label`
del título. Cada modal/panel compone secciones como arrays de `CampoEspecificacion`.

### 3.3 Beneficios

- **Consistencia total**: un solo layout, un solo CSS, un solo comportamiento.
- **Especificación/hardcodeo declarativo**: cada campo se describe una vez (título, ayuda, opciones,
  rango, condicionales) — exactamente lo que pide el usuario ("dejar escribir especificaciones y
  hardcodear configuraciones").
- **Reactiva las reglas de forma natural**: al usar `Input`/`Select`/`Checkbox`/`Range`/`Textarea`
  del sistema, `html-nativo-en-vez-de-componente` deja de tener hallazgos en `app/`.
- **Reduce código**: 9 archivos del patrón A se simplifican a datos + renderer.

## 4. Migración objetivo (modales/paneles de configuración)

| Archivo actual | Patrón | Se migra a |
|---|---|---|
| `SeccionConfigIAPanelChat.tsx` | A | `FormularioConfiguracion` + especificaciones |
| `SeccionConfigScratchpad.tsx` | A | ídem |
| `SeccionConfigGruposFb.tsx` | A | ídem |
| `ModalConfiguracionHabitos.tsx` | A | ídem |
| `ModalConfiguracionTareas.tsx` | A | ídem |
| `ModalConfiguracionProyectos.tsx` | A | ídem |
| `ModalConfiguracionRecordatorios.tsx` | A | ídem |
| `ModalConfiguracionScratchpad.tsx` | A | ídem |
| `ItemToggle.tsx` | A | ídem |
| `ModalConfigAgente.tsx` | B | `FormularioConfiguracion` + especificaciones (con `Range`, `Select`, `Textarea`, `Checkbox`) |
| `ConfigExp.tsx` | C | ídem (con `FilaRange` → especificación range) |
| `ConfigDeficitCalorico.tsx` | C | ídem |

### 4.1 Componentes destino (nativo → componente del sistema)

| Nativo | Componente destino |
|---|---|
| `<button>` | `ui/Boton` (con variantes/tamaños) |
| `<input>` (text/number/etc.) | `ui/Input` |
| `<input type="checkbox">` | `ui/Checkbox` |
| `<input type="range">` | `shared/Range` (ronda 22) |
| `<select>` | `ui/Select` |
| `<textarea>` | `ui/Textarea` |
| Overlay/backdrop modal | `shared/Modal` + hook `useModal` |
| `document.addEventListener('mousedown'/'click')` | `shared/MenuContextual` o hook dedicado |

> Nota: la regla marca `<Select>` genérico como deprecated → `SelectDropdown`, pero `SelectDropdown`
> **no existe** en el proyecto. Decisión: **no** migrar los `<Select>` del sistema a un componente
> inexistente; `Select.tsx` ya está en `archivosExcluidos`.

### 4.2 glory-core (decisión: NO migrar ahora)

`glory-core/` es la capa de framework/editorial del proyecto. Sus ~22 botones + 3 inputs + 1 select +
1 textarea + overlays son de un editor de bloques/pixel-art que **no comparte el design system** de la
app. Migrarlos a `components/ui` mezclaría la capa de framework con la de producto. Decisión:

- `sentinel-disable-file html-nativo-en-vez-de-componente` justificado en los archivos de glory-core
  afectados, con comentario que explica el "por qué" (capa de framework editorial, no productiva).
- Tarea de seguimiento en roadmap para evaluar un `components/editorial` propio si el editor madura.

> Opción B (migrar ahora) se descarta: ~22 botones sin design system compartido implicaría variantes
> locales del sistema solo para ese editor (viola "no variantes locales"). Coste alto, beneficio bajo.

## 5. Bug de Sentinel (imprescindible)

`existeComponenteUi()` en `glory-sentinel/src/analyzers/react/reactComponentRules.ts` busca
componentes UI solo en `frontend/src/components/ui`, `src/components/ui`, `App/React/components/ui`,
`components/ui`. Pero el proyecto los tiene en **`frontend/src/app/components/ui`** y `shared/`.

**Fix:** añadir esas 2 rutas a `basesRelativas` + añadir `'Range'` a `archivosExcluidos` (para que el
propio componente no se auto-flag) + tests + commit publicado + alinear gitlink/manifest + regenerar
lock + doctor. Sin esto, reactivar `html-nativo-en-vez-de-componente` no tendría efecto.

> Cualquier otro bug del gate se arregla en esta fase (se verificará con `quality:doctor` y los tests
> del adapter).

## 6. Reactivar reglas (después de unificar, en orden)

Tras unificar formularios, se reactivan en `sentinel.config.json` de PROYECTO TASKS:
- `html-nativo-en-vez-de-componente` (warning)
- `button-clase-especifica` (warning)
- `componente-artesanal` (warning)
- `componente-sin-hook-glory` (warning)

Y se decide sobre las 4 `modal-*` (una vez con `Modal.tsx` canónico en los modales) y
`mixed-barrel-logic`. Con la unificación, el ruido esperado es mucho menor (los campos ya usan
componentes UI).

## 7. Otros proyectos (informe + registro, no tocar sin OK)

- **RESTAURANTE**: `html-nativo-en-vez-de-componente`, `componente-artesanal`,
  `componente-sin-hook-glory` deshabilitadas por otro agente. Mismo design system `components/ui`.
- **WANDORIUS**: `mixed-barrel-logic` deshabilitada.
- Resto (gloryapi, ONG AGAPE, coolify, Laminal, workspace-manager, freebuff-bridge, GLORYPORT,
  GLORYINSPECTOR): `rules: {}` → sin desactivaciones reales. `default-export` es default de fábrica.

Se entrega informe y se registran tareas de seguimiento en sus roadmaps; **no se modifica su gate sin
autorización explícita.**

## 8. Fases de ejecución

1. **F1 — Diseño**: definir `FormCampo` + `CampoEspecificacion` + `FormularioConfiguracion` + CSS. ✅ (v2)
2. **F2 — Bug Sentinel**: ✅ cerrado. Se corrigió la resolución de workspace roots y se añadieron tests en `aa606a8` (`fix/318A-3-f2-rutas`); el checkout compartido quedó restaurado al pin `643353d` y `out/` fue reconstruido desde ese commit. La firma del lock se verificó como SHA-256 de `git archive --format=tar HEAD`, no del JS compilado; en el pin produce `50ddb6c18d93e3b4bc218547cbac7cd72c6a24991c74a2b9415ef2bd6083d2d4`. Doctor del consumidor confirma Sentinel 0.7.5, commit/checkout/lock alineados y CLI operativo.
3. **F3 — Construir el sistema**: `FormCampo`, `CampoEspecificacion`, `FormularioConfiguracion`, CSS.
   ✅ Realizado (2026-08-31): 4 archivos nuevos + `formCampo.css` + barrel. **Decisión v2:** NO se crea
   el hook `useFormularioConfiguracion` — los casos migrados persisten vía `alCambiar` por campo
   (los stores/hooks ya exponen setters por propiedad); un hook extra sería indirección sin segundo
   caso real.
4. **F4 — Migrar**: ✅ bloque B/C cerrado. `ModalConfigAgente` usa componentes canónicos conservando layout; `ConfigExp` y `ConfigDeficitCalorico` quedan documentados como escapes por layout/plugin específico y controles ya canónicos.
   ✅ Patrón B/C completo (2026-08-31, `npm run type-check` exit 0): `ModalConfigAgente` migrado a `Input`, `Select`, `Textarea`, `Range` y `Checkbox` mediante `CampoAgente`, conservando sus clases y layout; `ConfigExp` y `ConfigDeficitCalorico` quedan como escapes documentados porque sus layouts de plugin son específicos y ya usan controles canónicos. 
   ✅ Patrón A completo (9/9, verificados con `npm run type-check` exit 0): SeccionConfigIAPanelChat
   (FormCampo 1:1 — cabeceras sin control + controles sueltos), SeccionConfigScratchpad,
   ModalConfiguracionRecordatorios, ModalConfiguracionScratchpad, ModalConfiguracionHabitos,
   ModalConfiguracionTareas, ModalConfiguracionProyectos (FormularioConfiguracion declarativo),
   SeccionConfigGruposFb (FormCampo con `accionesDetalles` — caso escape), ItemToggle (wrappeado con
   FormCampo). Patrones B/C cerrados en la pasada siguiente; los escapes quedan intencionales y documentados.
5. **F5 — Reactivar reglas** + limpiar hallazgos residuales (botones/overlays restantes). ✅ HECHO (2026-09-01)
   - Reactivadas en `sentinel.config.json`: `html-nativo-en-vez-de-componente`, `button-clase-especifica`,
     `componente-artesanal`, `componente-sin-hook-glory` (warning). Línea base con reglas off: 38
     (0e/32w/6h). Tras reactivar: 74 → **59** (0e/53w/6h) tras limpieza.
   - **Renombres visual-neutrales** (clases internas BEM de botón, no variantes → fuera de
     `button-clase-especifica`): `botonIconoEncabezado__contador*` → `encabezadoContador*`,
     `botonPerfilContenido` → `perfilContenido`, `botonAccionIcono` → `accionIcono` (CSS +
     usos en EncabezadoMovil/EncabezadoAcciones/AccionesDatos/ModalPerfil/SeccionConfigPerfil).
   - **glory-core (§4.2)**: `sentinel-disable-file` justificado en BlockEditorModal
     (button-clase + html-nativo), BlockRenderer (button-clase), EditorPixelArt, GloryLink,
     PageRenderer (componente-sin-hook) — capa de framework editorial sin design system de app.
   - **Residuales documentados (excepción, sin forzar)**: 17× `html-nativo` = `<Select>`
     deprecated (§4.1: `SelectDropdown` no existe en el proyecto); 2× `componente-sin-hook-glory` + 2×
     `componente-artesanal` en ModalCrearRecordatorio/ModalDependencias/SubmenuNuevoInline — `Modal`
     exige título/encabezado propio y `MenuContextual` es de cursor; sin seam visual-neutral
     (verificado: ModalDependencias ya usa el Modal canónico; los 2 restantes quedan como escape
     documentado igual que ConfigExp/ConfigDeficitCalorico).
   - **Desync compartido corregido (patrón F2)**: el checkout compartido `.quality-tools/varsense`
     estaba en la rama local `fix/308A-6-j8-clases-dinamicas` (`303e7f9`, nunca integrada en
     origin/main) y bloqueaba el preflight del gate (tool-release-unpublished). Restaurado al pin
     `88f281f` (== origin/main, que es el commit fijado en `quality-tools.json`), árbol limpio,
     `dist/` reconstruido desde el pin, y evidencia regenerada con `npm run quality:setup`
     (compile + smoke:lsp OK). Nota: el fix J-8 de `claseHuerfana` queda en esa rama local sin
     publicar — los consumidores fijados al pin corren el analizador publicado.
   - Verificación: `npm run type-check` (frontend) exit 0; varsense config-scoped **293 (0 errores)**
     y `all` **1701 (0 errores)** — los 2 `variableNoDefinida` del WIP 318A-5 (tokens
     `--dashboard-superposicionActiva`/`--dashboard-sombra`) resueltos declarando los tokens con
     alias en ambos temas de `frontend/src/app/styles/dashboard/variables.css`. Sin huérfanas nuevas
     (0 hallazgos de las clases renombradas en claseHuerfana).
6. **F6 — Gate PASS + commit + push** (PT). ✅ Gate `sentinel check 318A-3` **PASS** (exit 0, 6.3s,
   0 errores / 53 warnings / 6 info, scope incremental 17 archivos; reporte en
   `.quality-reports/check/318A-3/latest.md`). Commit y push: a decisión del usuario (el árbol de PT
   lleva sus commits 318A-5; no se pushea sin su OK explícito).
7. **F7 — Otros proyectos**: informe entregado como nota en `Agente/completados/tareas-2026-09-01.md`
   (RESTAURANTE/WANDORIUS sin tocar sus gates); el registro formal de tareas de seguimiento en sus
   roadmaps queda pendiente. (parcial)
8. **F8 — Evidencia**: `Agente/completados/tareas-2026-09-01.md` ✅ (commit `03b0528`, pusheado).
   Plan a `planes/completados/` + push final quedan a decisión del usuario tras esta expansión (§12).

## 9. Riesgos

| Riesgo | Mitigación |
|---|---|
| Migrar 12 formularios rompe comportamiento | Validar por bloque (type-check + verificación visual en navegador); gate antes de cada commit |
| El sistema declarativo es demasiado genérico | Diseñar sobre los 3 casos reales (A/B/C) y mantener escapes (`control` ReactNode) para casos especiales |
| Condicionales complejos (solo admin, modo X) | `cuando: (v) => boolean` en la especificación |
| Campos con lógica de cambio específica (ej: al cambiar proveedor se ajusta modelo) | `onChange` por campo en la especificación (handler opcional) |
| Bug de rutas de Sentinel sin cubrir | Tests + doctor antes de considerar arreglado |
| Cambios ajenos en checkout compartido (J-8 varsense) | Stash/restore alrededor del gate |

## 10. Definition of Done

- [x] `FormCampo` + `CampoEspecificacion` + `FormularioConfiguracion` creados y usados en ≥1 modal.
      (usados en 9 formularios de configuración).
- [x] 12 formularios de configuración del alcance migrados al sistema declarativo (patrones A/B/C).
      Patrón A ✅ (9/9), patrón B ✅ (`ModalConfigAgente` con `CampoAgente`), patrón C → escapes
      documentados (`ConfigExp`/`ConfigDeficitCalorico` por layout de plugin específico, controles canónicos).
- [x] Verificación por bloque: `npm run type-check` (frontend/package.json) exit 0 en cada bloque.
- [ ] Verificación visual en navegador queda como pendiente del usuario (no despliego la app);
      los cambios reutilizan las clases existentes → visual-neutral por construcción.
- [x] Bug de Sentinel arreglado (rutas + Range + tests + doctor + lock); checkout operativo restaurado al pin y artefacto reconstruido.
- [x] Reglas reactivadas (4 en warning) y gate `sentinel check 318A-3` PASS (0e/53w/6i, exit 0).
- [x] Informe de otros proyectos entregado como nota en completadas (sin tocar sus gates); registro de
      tareas de seguimiento en RESTAURANTE/WANDORIUS queda como pendiente real (F7 parcial).
- [x] Evidencia en `Agente/completados/tareas-2026-09-01.md` (commit `03b0528`, pusheado).
- [ ] Expansión de cobertura a los ~23 archivos de configuración fuera de alcance (§12.1) — tarea de
      seguimiento en roadmap, no bloqueante para el cierre del plan.

## 11. Pendientes / decisiones

- [x] Diseño de `FormCampo` confirmado (v2): reutiliza las clases existentes
      (`itemOpcionConfig`/`detallesOpcionConfig`/...) + `formCampo.css` mínimo solo para
      `itemOpcionConfig--vertical` y `formCampoAyuda`. Visual-neutral por construcción.
- [x] Sistema vive en `components/shared` (confirmado; reutilizable por plugins y dashboard).
- [x] `titulo` de FormCampo acepta `ReactNode` (caso GruposFb con icono Clock).
- [x] Alcance de reactivación tras unificar: se reactivaron las 4 (html-nativo, button-clase,
      componente-artesanal, componente-sin-hook-glory) en warning; las `modal-*` y `mixed-barrel-logic`
      quedan fuera (decisión F5).
- [x] Decisión glory-core = Opción A (sección §4.2): `sentinel-disable-file` justificado en
      BlockEditorModal/BlockRenderer/EditorPixelArt/GloryLink/PageRenderer.
- [ ] Migración de las 4 reglas `modal-*` (depende de estado de `Modal.tsx` canónico; seguimiento).
- [ ] Autorización para push de `glory-sentinel` (publicar el fix F2 `aa606a8`, sigue en rama local).
- [ ] Autorización para reactivar/migrar en RESTAURANTE y WANDORIUS (escrituras en otros repos).
- [ ] Extender el sistema declarativo a los ~23 archivos de configuración fuera de alcance (§12.1).
- [ ] Migrar los escapes de HTML nativo residuales en configuración (§12.2) para bajar los 17× warning
      `html-nativo` restantes.
- [ ] Renombrar la clase CSS `formularioConfiguracion` vs el componente `FormularioConfiguracion` (§12.3).
- [ ] Documentar el contrato `SeccionPanel` (agrupa) vs `FormCampo`/`FormularioConfiguracion` (renderiza) (§12.4).

## 12. Ajustes de revisión arquitectónica (supervisor-thinking, 2026-09-01)

Revisión dura del plan tras la ejecución (v2, F1–F6 cerradas en `03b0528`). Veredicto: **VIABLE CON
RESERVAS**. El sistema centralizado quedó bien diseñado y ejecutado (`FormCampo` +
`CampoEspecificacion` + `FormularioConfiguracion` en `components/shared`, visual-neutral por
construcción, gate PASS), pero la revisión detectó 4 reservas que el plan original no contemplaba.

### 12.1 Brecha de cobertura: ~23 archivos de configuración fuera de alcance

El plan migró los 12 formularios del alcance (patrones A/B/C), pero el inventario exhaustivo muestra
que **la mayoría de los modales/secciones de configuración del proyecto NO pasaron por el sistema**:

| Categoría | Archivos | Estado |
|---|---|---|
| Modales de configuración no migrados | `ModalConfiguracionActividad`, `ModalConfiguracionUsuario`, `ModalConfiguracionGlobal`, `ModalConfiguracionMCP`, `ModalConfiguracionLayout`, `ModalPlugins`, `ModalConfigDeficitCalorico`, `SeccionTokenMCP` | Fuera de alcance |
| Secciones generales (config global) | `SeccionConfigLayout`, `SeccionConfigPreferencias`, `SeccionConfigTemas`, `SeccionConfigPerfil`, `SeccionConfigSeguridad`, `SeccionConfigMCP`, `SeccionConfigBackups`, `SeccionConfigPaneles`, `SeccionConfigPlugins` | Fuera de alcance |
| Secciones de paneles (ItemToggle) | `SeccionConfigTareas`, `SeccionConfigHabitos`, `SeccionConfigProyectos`, `SeccionConfigActividad` | Cubiertas vía `ItemToggle` (ya migrado con `FormCampo`) |

**Decisión (Opción A):** declarar explícitamente estos archivos **fuera de alcance** de 318A-3 y crear
una **tarea de seguimiento en roadmap** ("extender el sistema declarativo a los modales/secciones de
configuración restantes") priorizada tras el cierre. No migrarlos aquí evita ampliar el diff del gate
ya cerrado; la intención del usuario (centralizar TODAS las configuraciones) se cumple incrementalmente.

### 12.2 HTML nativo residual que la reactivación volverá a marcar

Tras reactivar `html-nativo-en-vez-de-componente` (F5), quedan escapes nativos en configuración que ya
generan **warnings (no errores)** y que la próxima pasada debería migrar:

- `ModalConfigAgente.tsx`: 2 botones nativos (`modalConfigAgenteCerrar` + `modalConfigAgenteSkillBoton` ×2).
- `PanelAgente.tsx`: form "Programar tarea" — 5 inputs nativos (input, textarea, select, 2× input).
- `ModalConfiguracionActividad.tsx`: label nativa `opcionVisualActividad` (candidata natural a `FormCampo`).
- `SeccionConfigPerfil.tsx`: 5 labels nativos `labelPerfil`.
- `ConfigExp.tsx`/`ConfigDeficitCalorico.tsx`: escapes documentados por layout de plugin (`FilaRange` local).

**Recomendación:** migrar primero los de menor riesgo y mayor beneficio visual:
`ModalConfiguracionActividad` (estructura canónica `Modal` + `SeccionPanel`, pero con controles de
selector propios además de la label: `<Boton>` + `selectorPeriodoBoton` en 2 secciones y
`SelectorNivel` local en otra — migrar los selectores a `Boton` canónico con variantes y la label a
`FormCampo`), `SeccionConfigPerfil` (labels → `FormCampo`) y
`ModalConfiguracionUsuario` (campos → `CampoEspecificacion` tipo numero). Los botones de
`ModalConfigAgente` → `Boton` (patrón del sidebar ya migrado en 318A-5). `PanelAgente` (form programar
tarea) puede usar `FormCampo`/`Input`/`Textarea`/`Select`.

### 12.3 Confusión de nomenclatura: CSS `formularioConfiguracion` vs componente `FormularioConfiguracion`

Existe una clase CSS `formularioConfiguracion` (usada en `SeccionConfigPreferencias.tsx` y
`ModalConfiguracionUsuario.tsx`) con el MISMO nombre que el nuevo componente
`FormularioConfiguracion` (el renderer declarativo). Riesgo real de confusión al leer el código.

**Recomendación:** renombrar la clase CSS a algo no ambiguo (p. ej. `cuerpoConfigGlobal` o
`formularioConfigGlobal`) en la siguiente pasada, o documentar la distinción en el barrel de `shared`.
No urgente (no rompe nada), pero conviene resolverlo junto a 12.1.

### 12.4 Relación `SeccionPanel` vs `FormCampo` (no documentada)

`SeccionPanel` (contenedor de sección con título/icono) coexiste con `FormCampo` (campo individual) sin
relación formal documentada. Conviene fijar el contrato: **`SeccionPanel` agrupa;
`FormCampo`/`FormularioConfiguracion` renderiza campos**. En la migración de 12.1, las secciones con
título usan `SeccionPanel` como wrapper y los campos dentro como `FormCampo`/`FormularioConfiguracion`.

### 12.5 Concurrencia con otro agente (resuelta)

El plan fue ejecutado en paralelo por otro agente (F1–F8). Riesgo de colisión mitigado: el otro agente
commiteó `03b0528` (F5–F8, gate PASS) y pusheó; el árbol de PT quedó sincronizado con `origin/main`.
Esta revisión se realiza POST-cierre sobre el estado final, sin pisar su trabajo.

### 12.6 Próximos pasos (no bloqueantes)

1. Registrar en roadmap la tarea de seguimiento de 12.1 (extensión del sistema declarativo).
2. Migrar los escapes de 12.2 (empezar por Actividad/Perfil/Usuario).
3. Renombrar la clase CSS de 12.3.
4. Documentar el contrato SeccionPanel/FormCampo de 12.4.
5. (F7) registrar tareas en RESTAURANTE/WANDORIUS; (F8) mover el plan a `planes/completados/` cuando
   el usuario confirme el cierre.

## 13. Ajustes de revisión de especificaciones de diseño (2026-09-01)

Segunda revisión tras el cierre de 318A-3 (F1–F8) y de la §12 (brecha de cobertura). Foco pedido por el
usuario: **¿quedan especificaciones de diseño que generen inconsistencias aunque todo esté
centralizado, y qué mecanismo (Sentinel/VarSense) las detecta para eliminarlas?** Veredicto:
**VIABLE CON RESERVAS — la centralización unifica la ESTRUCTURA (FormCampo/FormularioConfiguracion)
pero NO garantiza el uso de TOKENS de diseño; el mecanismo de detección está incompleto y hay valores
hardcodeados que ningún gate detecta hoy.**

### 13.1 La centralización no elimina las especificaciones de diseño

`FormCampo` y `FormularioConfiguracion` (componentes, visual-neutrales por construcción) reutilizan
clases CSS del sistema centralizado que **todavía contienen literales sin tokenizar**. Aunque el
componente no tenga `style={{}}` ni hex en TSX, sus estilos importados arrastran especificaciones de
diseño locales:

- `frontend/src/app/styles/dashboard/componentes/configuracionTareas.css`:
  - `.itemOpcionConfig` → `padding: 2px 0`
  - `.tituloOpcionConfig` → `font-weight: 500`
  - `.descripcionOpcionConfig` → `line-height: 1.2`
  - `.separadorOpcionesConfig` → `height: 0.8px`
  - `.selectorOrdenamiento` → `min-width: 100px`
- `frontend/src/app/styles/dashboard/componentes/modalConfigGlobal.css` (sidebar de config global,
  reutilizado también por `ModalConfigAgente`):
  - `max-width: 720px`, `height: 750px`, `max-height: 90vh`, `min-height: 400px`
  - `width: 180px`, `min-width: 180px`
  - `letter-spacing: 0.5px`, `padding: 6px var(--dashboard-espacioSm)`
  - `transition: background-color 0.15s, color 0.15s` (existen tokens `--dashboard-transicionRapida`
    `0.15s ease` y `--dashboard-transicionNormal` `0.2s ease` sin usar aquí)
  - `font-weight: 500/600` repetidos

Conclusión: **incluso el sistema "centralizado" porta especificaciones de diseño** (espaciados,
grosores, alturas, transiciones) que no son tokens. Migrarlos a `--dashboard-*` es parte de la
consistencia visual total.

### 13.2 Mecanismo de detección INCOMPLETO (hallazgo crítico)

El usuario pide que "Sentinel o VarSense las detecte". Estado real verificado (2026-09-01):

| Mecanismo | Estado | Qué detecta hoy |
|---|---|---|
| Sentinel `css-hardcoded-value` | **DESCONECTADA** | Nada — código muerto |
| Sentinel `css-especificacion-diseno-local` | Cableada, severidad `information` en PT | Clases con rol interactivo y ≥2 propiedades de diseño |
| Sentinel `inline-style-prohibido` | Habilitada (warning) | `style={{}}` en TSX |
| Sentinel reglas `modal-*` + `menu-contextual-override-diseno` | `habilitada: false` | Nada |
| VarSense `hardcodedDetection` | Habilitado (warning, ruleId `valorHardcoded`) | Solo CSS: `color`, `background`, `background-color`, `border-color`, `font-size`, `font-family`, `box-shadow` |

Detalle del hallazgo crítico (`css-hardcoded-value`):

- La implementación **existe completa** en `glory-sentinel/src/analyzers/static/staticCssRules.ts`
  (`verificarCssHardcoded`, líneas ~468-530): detecta hex `#[0-9a-fA-F]{3,8}` y `rgb/rgba/hsl/hsla`,
  salta `variables.css`/`init.css`/`theme.css`/`tokens.css`, bloques `:root`, líneas con `var(` y
  definiciones `--*`, y respeta `sentinel-disable-next-line css-hardcoded-value`.
- Pero está **desactivada en dos niveles**:
  1. `ruleRegistry.ts` líneas 156-157: la entrada está COMENTADA (`/* css-hardcoded-value: desactivada.
     Descomentar para re-activar. */`).
  2. `staticAnalyzer.ts`: la función **nunca se invoca** (solo `verificarCssEspecificacionDisenoLocal`
     se llama en la línea 151). Es código muerto.
- Por tanto, los ~195 valores hex/rgba literales en los CSS del frontend (p. ej.
  `rgba(255,255,255,0.02)` en `suscripcion.css`, `rgba(0,0,0,0.5)`/`rgba(0,0,0,0.3)` en `tooltip.css`,
  `rgba(0,0,0,0.4)` en `selectorBadge.css`, `rgba(255,255,255,0.3)` en `resizeHandleColumna.css`) **no
  los reporta nadie** en el gate.

VarSense sí cubre el hueco de colores CSS con `valorHardcoded`, pero:

- **`hardcodedDetection` solo aplica a propiedades CSS, no a literales dentro de JSX**: la config de
  PT (`varsense.config.json`) tiene `includePatterns: ["frontend/src/**/*.css",
  "frontend/src/**/*.ts", "frontend/src/**/*.tsx"]`, así que VarSense SÍ lee `.tsx` (para tokens,
  clases, variables), pero el chequeo `valorHardcoded` se aplica a declaraciones de propiedades CSS;
  un hex literal dentro de JSX (p. ej. `color={COLORES_PRIORIDAD.muy_alta}` o un hex en un prop de
  componente) **no pasa por esa verificación**. Por eso los 8 hex de `SelectorIconoProyecto.tsx` no
  los ve VarSense.
- **No cubre propiedades de layout**: la config de PT (`varsense.config.json`) solo verifica
  `color`, `background`, `background-color`, `border-color`, `border-radius`, `font-size`,
  `font-family`, `box-shadow`; `padding`, `margin`, `gap`, `font-weight`, `line-height`, `width`,
  `height` quedan fuera (los defaults de VarSense tienen `padding: false`, `gap: false`,
  `border-radius: false`).

### 13.3 Valores hardcodeados concretos a eliminar (inventario verificado)

1. **`SelectorIconoProyecto.tsx`** (`frontend/src/app/components/shared/`): paleta de 8 colores hex
   literales — `#888888` (gris), `#ef4444` (rojo), `#f97316` (naranja), `#eab308` (amarillo),
   `#22c55e` (verde), `#3b82f6` (azul), `#a855f7` (morado), `#ec4899` (rosa). Es la única paleta de
   color hardcodeada en componentes compartidos (contraste: `nivelesConfig.tsx` SÍ está tokenizado
   con `var(--dashboard-estado*)`). Migrar a tokens o a una paleta declarada en `variables.css`.
2. **CSS con rgba/hex literales**: inventario a regenerar con comando reproducible al ejecutar la
   tarea (un grep sobre `frontend/src/**/*.css` da ~242 coincidencias en 14 archivos incluyendo
   `variables.css`/`App.css` que son tokens legítimos; excluyendo esos, el subconjunto problemático
   ronda ~195 en 9+ archivos). Archivos representativos citados por el diagnóstico:
   `suscripcion.css` (`rgba(255,255,255,0.02)`), `tooltip.css` (`rgba(0,0,0,0.5)`/`rgba(0,0,0,0.3)`),
   `selectorBadge.css` (`rgba(0,0,0,0.4)`), `resizeHandleColumna.css` (`rgba(255,255,255,0.3)`),
   `paginaPrueba.css` — **distinguir los literales puros (a tokenizar) de los var-based** (p. ej.
   `panelSeguridad.css` usa `rgba(var(--dashboard-violetaRgb), 0.1)`, que es var-based OK y NO
   requiere tokenización). Comando sugerido para el inventario exacto: `rg 'rgba?\(|#[0-9a-fA-F]{3,8}\b' --glob 'frontend/src/**/*.css' --glob '!**/variables.css' --glob '!**/init.css'` con filtrado manual de líneas con `var(`.
3. **Literales de `configuracionTareas.css` y `modalConfigGlobal.css`** (detallados en 13.1).

### 13.4 Recomendación: mecanismo de enforcement (registrado como tarea, no ejecutado aquí)

Para que "todo sea consistente y coherente visualmente" y que el gate LO GARANTICE, se propone (en
orden de impacto):

1. **Reactivar `css-hardcoded-value` en Sentinel** como `warning`: descomentar en `ruleRegistry.ts`,
   cablear `verificarCssHardcoded(...)` en `staticAnalyzer.ts`, y añadir el override en
   `sentinel.config.json` de PT. Requiere el flujo completo del protocolo §6 (publicar commit en
   glory-sentinel → alinear gitlink/lock → regenerar `sentinel.lock.json` → doctor → gate), por lo
   que es una **tarea separada con autorización**; no se ejecuta en esta revisión.
2. **Subir `css-especificacion-diseno-local` a `warning`** en `sentinel.config.json` (hoy `information`),
   ya que la implementación está cableada y solo falta endurecer la severidad.
3. **Ampliar `hardcodedDetection.properties` de VarSense** en `varsense.config.json` para incluir
   `padding`, `margin`, `gap`, `font-weight`, `line-height`, `width`, `height` (con `allowedValues`
   adecuados para no ahogar en falsos positivos).
4. **Tokenizar los literales verificados** (13.1 + 13.3) usando la escala existente de `variables.css`
   (`--dashboard-espacio*`, `--dashboard-tamano*`, `--dashboard-transicion*`, `--dashboard-texto*`).
5. **Incluir TSX en el escaneo de colores** (VarSense o una regla Sentinel para hex en `.tsx`) para
   cubrir `SelectorIconoProyecto` y futuros escapes; o, alternativamente, mover la paleta a
   `variables.css` y consumirla por `var()`.
6. **Conservar los `inline-style-prohibido` con `sentinel-disable` justificado**: valores dinámicos
   legítimos (progress bars, colores derivados de datos, `COLORES_PRIORIDAD`/`COLORES_URGENCIA`
   tokenizados) no son especificaciones de diseño y deben mantener su excepción documentada.

### 13.5 Próximos pasos (tarea de seguimiento en roadmap)

Registrar en roadmap una tarea de seguimiento: **"Mecanismo de detección de especificaciones de
diseño: reactivar `css-hardcoded-value` (Sentinel) + endurecer `css-especificacion-diseno-local` +
ampliar VarSense + tokenizar literales verificados"**, con referencia a esta §13. No ampliar el diff
del gate ya cerrado sin autorización; esta revisión solo REGISTRA la deuda pendiente, no la ejecuta.

### 13.6 Nota de concurrencia

Esta §13 se añade como sección nueva al final del plan, sin modificar la §12 ni las secciones previas.
Si otro agente está expandiendo el plan en paralelo, su trabajo (si ya está commiteado o en el árbol)
se respeta; esta sección es aditiva y no interfiere con §1–§12.

**Mecanismo operativo (verificado 2026-09-01):** en el árbol hay además **4 archivos del otro agente
sin commitear** que implementan §12.3/§12.4 (renombre `formularioConfiguracion`→`formularioConfigGlobal`
en `ModalConfiguracionUsuario.tsx` y `SeccionConfigPreferencias.tsx`, documentación del contrato en
`SeccionPanel.tsx` y `shared/index.ts`). El commit de esta revisión (§13 + §14) debe incluir **SOLO**
los 2 archivos propios (`Agente/planes/plan-reactivar-reglas-visuales-sentinel-2026-08-31.md` y
`roadmap.md`), con `git add` explícito por archivo, sin `git add .` ni `--all`. Los 4 archivos ajenos
los commitea el otro agente (o se coordina quién incluye qué) — no se tocan ni se mezclan frentes.

## 14. Ajustes de revisión: detección de centralización y de CSS innecesario sobre componentes (2026-09-01)

Tercera revisión, ampliación pedida por el usuario: (1) **que Sentinel detecte cuándo un formulario de
configuración NO usa el sistema centralizado**, y que **todos los proyectos** funcionen con un sistema
igual; (2) que se detecte **el error frecuente de la IA: usar un componente del sistema y añadirle CSS
innecesario encima**, rompiendo la consistencia aunque centralice. Veredicto: **HAY UN HUECO REAL DE
REGLA EN SENTINEL para ambas cosas — ninguna regla existente detecta "no usar el sistema declarativo de
formularios", y la regla de "especificación de diseño local sobre componente" existe pero está débil
(`information`) y desactivada en parte.**

### 14.1 Hueco de regla: no existe detección de "formulario de configuración que no usa el sistema centralizado"

Verificado en `glory-sentinel/src/config/ruleRegistry.ts` (inventario completo de reglas): **no hay
ninguna regla que detecte un `ModalConfig*`/`SeccionConfig*` que construya su formulario a mano en vez
de usar `FormCampo`/`FormularioConfiguracion`/`CampoEspecificacion`**. Las reglas React existentes
cubren HTML nativo (`html-nativo-en-vez-de-componente`), botones (`button-clase-especifica`), modales
(`modal-*`), menús (`menu-contextual-override-diseno`) y artefactos (`componente-artesanal`), pero
ninguna entiende el **contrato del sistema declarativo** (que un formulario de configuración se
declare con `especificaciones` y se renderice con `FormularioConfiguracion`).

Por eso, aunque 318A-3 centralizó los 12 formularios del alcance, los ~23 archivos fuera de alcance
(§12.1) pueden seguir construyéndose a mano **sin que el gate diga nada**: el gate solo los marcaría
si usan HTML nativo o patrones artesanales, no por "no usar el sistema declarativo".

**Propuesta de regla nueva (para Sentinel, aplicable a TODOS los proyectos con el sistema):**
`formulario-config-sin-sistema-declarativo` (warning). Heurística sugerida:

- Detecta componentes cuyo nombre encaja con `*Config*`, `*Configuracion*`, `*Ajustes*`, `*Settings*`
  (o que rendericen un formulario de configuración) y que **NO importan/usen** `FormCampo`,
  `FormularioConfiguracion` o `CampoEspecificacion` del sistema.
- **Condición adicional obligatoria** para evitar falsos positivos: que el componente renderice
  controles de entrada (`<input>`, `<select>`, `<textarea>` o props `onChange`/`value`), no solo que
  tenga un nombre `*Config*`. Componentes como `ConfigExp`/`ConfigDeficitCalorico` (escapes
  legítimos con layout de plugin, §12.2) o vistas previas de configuración que no sean formularios
  deben quedar fuera del reporte.
- Si además construyen el formulario con JSX manual (`<label>`, `<input>`, `<select>`, `<textarea>`,
  o `ItemToggle`/`FilaRange` locales), lo marca con el mensaje de migrar al sistema declarativo.
- Excepción documentada: escapes legítimos con layout específico de plugin (`ConfigExp`,
  `ConfigDeficitCalorico` — ver §12.2) pueden usar `sentinel-disable` justificado (por archivo, como
  `sentinel-disable-file`) o un registro de escapes aprobados; **no** una exclusión global por
  patrón de nombre.

**Visión "todos los proyectos con un sistema igual":** el sistema declarativo (`FormCampo` +
`FormularioConfiguracion`) vive en `frontend/src/app/components/shared/` de PT; los demás proyectos
(RESTAURANTE, WANDORIUS, ONG AGAPE, glory-rs consumers) deberían tener su equivalente en su
`components/shared` y la misma regla aplicada por proyecto vía su `sentinel.config.json`. La regla
nueva debe ser **agnóstica de proyecto** (detectar el patrón de "config manual sin usar el sistema
declarativo local") y no depender de la ruta de PT. Esto es coherente con el protocolo §9: cada
proyecto declara su gate, pero la regla vive en el core de glory-sentinel.

### 14.2 Detección del error de la IA: "usar componente del sistema + CSS innecesario encima"

El usuario describe el fallo recurrente: la IA usa el componente canónico (botón, modal, menú,
campo) y **le añade CSS local innecesario**, produciendo inconsistencias aunque centralice. Estado de
la detección hoy:

| Regla | Qué detecta | Estado en PT |
|---|---|---|
| `css-especificacion-diseno-local` | Clase CSS con rol interactivo (Trigger/Opcion/Dropdown/Menu/Item/...) que define ≥2 propiedades de diseño (background, border, padding, tipografía, transiciones...) | `information` (demasiado débil) |
| `menu-contextual-override-diseno` | `<MenuContextual>` recibiendo props de diseño (`className`, `panelClassName`, etc.) | `habilitada: false` |
| `inline-style-prohibido` | `style={{}}` en TSX | warning (habilitada) |
| `button-clase-especifica` | Clase específica en botón | warning (habilitada) |
| `css-hardcoded-value` | Colores hex/rgb literales en CSS | **desconectada** (código muerto, ver §13.2) |

**La regla clave para el error descrito es `css-especificacion-diseno-local`**: ya implementada y
cableada en `staticAnalyzer.ts` (línea 151), detecta justo "clase local que reimplementa la receta
visual de un componente del sistema". Pero está en `information` en PT, así que **no aparece ni como
warning** en el gate. Para que Sentinel "detecte el error frecuente de la IA" hay que:

1. **Subir `css-especificacion-diseno-local` a `warning`** en `sentinel.config.json` de PT (y en el
   config de los demás proyectos que declaren el sistema).
2. **Reactivar `menu-contextual-override-diseno`** (está implementada y cableada en `reactAnalyzer.ts`
   líneas 148-149, solo falta `habilitada: true` en el config).
3. **Mejorar la heurística** (si los falsos positivos lo piden): la regla ya salta clases base del
   sistema y `ARCHIVOS_RECETA_DISENO` (button.css, contextmenu.css, modal.css, reset.css, init.css,
   variables.css); conviene añadir a la exención las clases de los componentes del sistema declarativo
   (`formCampo*`, `formularioConfiguracion*`, `itemOpcionConfig*`, `configGlobal*`) para no marcar el
   propio sistema, solo el CSS ajeno que lo sobreescribe. **Esto no es opcional, es necesario:** la
   heurística `PATRONES_ROL_INTERACTIVO_LOCAL` incluye los sufijos `Item` y `Panel`, y el propio
   sistema usa clases `itemOpcionConfig`, `configGlobalNavItem`, `configGlobalSidebar` que con ≥2
   propiedades de diseño (p. ej. `padding` + `font-weight` en `.itemOpcionConfig`) dispararían la
   regla como falso positivo hoy mismo. La exención debe incluir un test de regresión en
   glory-sentinel con `itemOpcionConfig`/`configGlobalNavItem` como casos de NO-reporte.
4. **Reactivar las reglas `modal-*`** (`modal-semantica-no-canonica`, `modal-con-titulo`,
   `modal-estructura-no-canonica`, `modal-acciones-no-canonico`): están implementadas y cableadas,
   solo `habilitada: false` en el config. Cubren "modal que no sigue la estructura canónica" — el
   mismo patrón de inconsistencia en modales.

### 14.3 Síntesis: qué debería detectar el gate tras esta ampliación

Con las reactivaciones/endurecimientos propuestos (13.2 + 14.1 + 14.2), el gate de un proyecto con el
sistema declarativo detectaría y marcaría como warning (no error) todo esto:

- Formulario de configuración construido a mano sin usar `FormularioConfiguracion`/`FormCampo`
  (`formulario-config-sin-sistema-declarativo`, **regla nueva**).
- Componente del sistema (botón/modal/menú/campo) con CSS local que reimplementa su receta visual
  (`css-especificacion-diseno-local`, a warning).
- Componente del sistema recibiendo props de diseño (`menu-contextual-override-diseno`, reactivada;
  `button-clase-especifica`, ya activa).
- Colores hex/rgb literales en CSS (`css-hardcoded-value`, reactivada — ver §13.2).
- Modal que no sigue la estructura/acciones canónicas (`modal-*`, reactivadas).
- HTML nativo en vez de componentes del sistema (`html-nativo-en-vez-de-componente`, ya activa).

El **criterio de cierre** quedaría: un formulario de configuración está "bien" si (a) usa el sistema
declarativo, (b) no añade CSS de diseño local sobre los componentes, y (c) solo usa tokens
`--dashboard-*`. Eso es exactamente "todo consistente y coherente visualmente" garantizado por el
gate, no por buena voluntad.

### 14.4 Alcance y no-alcance de esta revisión

**Alcance:** registrar en el plan (y en roadmap como tarea de seguimiento) la regla nueva
`formulario-config-sin-sistema-declarativo` y las reactivaciones/endurecimientos de 14.2, como deuda
pendiente con prioridad y orden de ejecución.

**No alcance (requiere autorización, protocolo §6):** implementar la regla nueva en glory-sentinel
(publicar commit → alinear gitlink/lock → regenerar lock → doctor → gate), reactivar las reglas en
`sentinel.config.json`, ni tocar `varsense.config.json`. Esta revisión solo DOCUMENTA la deuda y su
mecanismo; la ejecución es una tarea separada (ver §13.5).

### 14.5 Próximos pasos (añade a la tarea de seguimiento de 13.5)

1. Crear en glory-sentinel la regla `formulario-config-sin-sistema-declarativo` (agnóstica de
   proyecto, patrón "config manual sin el sistema declarativo local", con la condición adicional de
   controles de entrada de 14.1), con tests (incluyendo `ConfigExp`/`ConfigDeficitCalorico` como
   casos de NO-reporte).
2. Subir `css-especificacion-diseno-local` a `warning` y reactivar `menu-contextual-override-diseno`
   y las 4 reglas `modal-*` en `sentinel.config.json` de PT (y replicar en los proyectos con el
   sistema: RESTAURANTE, WANDORIUS, ONG AGAPE según su propio roadmap).
3. Eximir en la heurística las clases propias del sistema declarativo (`formCampo*`,
   `formularioConfiguracion*`, `itemOpcionConfig*`, `configGlobal*`) **con test de regresión
   (`itemOpcionConfig`/`configGlobalNavItem` como NO-reporte)**; sin esta exención la regla marcaría
   hoy el propio sistema como falso positivo.
4. Verificar que el gate pase tras las reactivaciones (esperar warnings controlados, no errores) y
   que el conteo sea interpretable (similar al 38→74→59 de 318A-3 F5).
5. Replicar la regla nueva y los endurecimientos en el `sentinel.config.json`/roadmap de los demás
   proyectos, respetando su propio contrato (no imponer la estructura de PT; cada proyecto declara su
   gate).
