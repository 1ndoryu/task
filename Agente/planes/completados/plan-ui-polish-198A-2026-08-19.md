# Plan: Bloque UI/UX + bugs paridad (198A) — 2026-08-19

> Estado: **completado** (19-08-2026)
> Objetivo: responder cómo se persisten las preferencias, eliminar ruido de UI
> (chips de paneles, footer, bordes del selector de grupos), hacer `seccionAcciones`
> responsive, centralizar iconos de importancia/urgencia, arreglar el selector de
> dependencias (modal vacío + acceso directo en menú contextual).
> Gate: `tsc --noEmit`, suite `.freebuff/verify-parity.mjs`, verificación en vivo en
> preview :5174, commit único al cierre.

## Alcance / No alcance

- **Alcance:** solo lo listado abajo. No tocar dominios con credenciales externas.
- **No alcance:** cambios de comportamiento del sync de preferencias entre navegadores
  (se documenta el contrato actual, no se cambia).

## Tareas (IDs)

### 198A-1 — Explicar cómo se guardan las preferencias (columnas por pestaña)
- Contrato actual (verificado en código): `glory_config_layout` en `localStorage` por
  navegador; `usePreferenciasServidor` sube el blob a `PUT /api/dashboard/settings`
  como backup; `aplicarPreferenciasServidor` restaura SOLO claves ausentes localmente.
  Dos navegadores distintos → cada uno conserva su nº de columnas (por diseño).
  No requiere cambios de código; se responde en el reporte final.

### 198A-2 — Paneles ocultos: quitar chips del header + descripción del modal
- Eliminar `PanelesOcultosEncabezado` (chips junto a botón Layout) y sus props
  (`panelesOcultos`/`onMostrarPanel`) de `EncabezadoAcciones`, `DashboardEncabezado`,
  `DashboardIsland`.
- Eliminar `<p className="gestionPanelesDescripcion">` del `ModalGestionPaneles` y su CSS.

### 198A-3 — `seccionAcciones` responsive: botón de 3 puntos
- Nuevo componente `AccionesPanelResponsivas` (shared): mide ancho de las acciones;
  si desbordan, colapsa a un botón `MoreHorizontal` que abre un popover con las mismas
  acciones en columna (estilo menú contextual). Aplicar en `DashboardPanel` y
  `SeccionEncabezado` donde se renderiza `.seccionAcciones`.

### 198A-4 — Unificar `selectorGrupoCrear` / `selectorGrupoCrearPill`
- Extraer una sola fila "crear grupo" en `SelectorGrupo.tsx` (ambas variantes).
- CSS: input sin borde, botón "+" sin borde, sin margen/separador innecesario.
  Eliminar clases `selectorGrupoInputPill`/`selectorGrupoCrearPill`.

### 198A-5 — Centralizar iconos de importancia/urgencia
- Quitar `fill` de todos los iconos de nivel (`nivelesConfig.tsx`,
  `PropiedadesCompactas.tsx`).
- Corregir `--dashboard-estadoBaja: #000000 0` (valor CSS inválido → iconos invisibles).
- Unificar icono de urgencia: `Clock`/`Hash` → `Zap` en `OpcionesCreacionRapida`,
  `BottomSheetProyecto`, `useBottomSheetProyecto`.

### 198A-6 — Dependencias: modal vacío + acceso directo en menú contextual
- `ModalesTareas.tsx` (editar tarea) y `ModalesHabitos.tsx` (editar hábito) no pasan
  `tareas`/`habitos` → `ModalDependencias` abre sin opciones. Pasar los datos.
- Añadir opción "Dependencias" al menú contextual de tareas y hábitos que abre el
  selector de dependencias directamente (config con flag de auto-apertura).

### 198A-7 — Eliminar `dashboard-footer`
- Quitar `DashboardFooter` del `DashboardIsland`, el componente y su CSS.

## Verificación

1. `npx tsc --noEmit` (frontend) limpio.
2. Suite `.freebuff/verify-parity.mjs` verde (94 asserts actuales).
3. Preview :5174: modal Paneles sin descripción y sin chips; colapsar un panel a lo
   ancho mínimo y ver el botón de 3 puntos; selector de grupo sin bordes; iconos de
   importancia/urgencia sin relleno y con colores coherentes; modal de dependencias
   con opciones desde "Configurar tarea/hábito" y desde el menú contextual; sin footer.
4. Commit único del bloque + actualización de completados y roadmap.
