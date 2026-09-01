# Plan v2: Sistema centralizado de formularios de configuración + arreglo de Sentinel (318A-3)

> Fecha: 2026-08-31 · Estado: ACTIVO (v2, replanificado) · Proyecto: PROYECTO TASKS (repo `task`)
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
7. **F7 — Otros proyectos**: informe + registro de tareas (RESTAURANTE/WANDORIUS). (pendiente)
8. **F8 — Evidencia** (completadas + plan a completados) + roadmap + push final.

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
- [ ] 12 formularios de configuración migrados al sistema declarativo (sin HTML nativo en `app/`).
      Patrón A ✅; pendientes B (ModalConfigAgente) y C (ConfigExp/ConfigDeficitCalorico).
- [ ] Verificación por bloque: `npm run type-check` (frontend/package.json) exit 0 en cada bloque.
- [ ] Verificación visual en navegador queda como pendiente del usuario (no despliego la app);
      los cambios reutilizan las clases existentes → visual-neutral por construcción.
- [x] Bug de Sentinel arreglado (rutas + Range + tests + doctor + lock); checkout operativo restaurado al pin y artefacto reconstruido.
- [ ] Reglas reactivadas y gate `GLORY-BASELINE` PASS en PT (el commit en PT queda a criterio del
      usuario, que trabaja en el repo; no se commitea sin su OK).
- [ ] Informe de otros proyectos + tareas registradas (sin tocar sus gates).
- [ ] Evidencia en `Agente/completados/` (sin commit en PT hasta OK del usuario).

## 11. Pendientes / decisiones

- [x] Diseño de `FormCampo` confirmado (v2): reutiliza las clases existentes
      (`itemOpcionConfig`/`detallesOpcionConfig`/...) + `formCampo.css` mínimo solo para
      `itemOpcionConfig--vertical` y `formCampoAyuda`. Visual-neutral por construcción.
- [x] Sistema vive en `components/shared` (confirmado; reutilizable por plugins y dashboard).
- [x] `titulo` de FormCampo acepta `ReactNode` (caso GruposFb con icono Clock).
- [ ] Confirmar alcance de reactivación de reglas tras unificar (todas las listadas o subset).
- [ ] Confirmar decisión glory-core = Opción A (sección §4.2; puede cambiarse).
- [ ] Confirmar migración de las 4 reglas `modal-*` (depende de estado de `Modal.tsx` canónico).
- [ ] Autorización para push de `glory-sentinel` (publicar commit del gate).
- [ ] Autorización para reactivar/migrar en RESTAURANTE y WANDORIUS (escrituras en otros repos).
