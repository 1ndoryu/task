# Plan: plugin EXP (gamificación — panel fijo superior, vida y dificultad automática)

- **Fecha:** 2026-08-26
- **Estado:** activo (en curso)
- **Dependencias:** IA disponible (proxy `/api/ai/chat` con envs del proyecto anterior; degrada si no hay key). Sin credenciales externas nuevas.
- **Tipo:** plugin nuevo (feature grande) con carpeta especializada.

## Visión del producto

El usuario quiere gamificar el cumplimiento: un **panel fijo arriba del dashboard**
(una sola columna, siempre visible) que muestra una **barra de vida** y EXP/nivel.

- **Dificultad** por hábito/tarea: se asigna **automáticamente por IA** (solo cuando el
  plugin está activo) en base a nombre, importancia y frecuencia. Sin input manual
  tedioso. La dificultad se guarda como dato del hábito/tarea y perdura (payload).
- **EXP**: completar tareas/hábitos da EXP según `dificultad × importancia`.
- **Vida**: empieza en 100 y **baja cuando no cumples hábitos** (incumplimientos
  según frecuencia vs historial real de cumplimiento). Hecho durable: si borras una
  tarea/hábito, su historial sigue contando (mismo principio que el panel de
  Actividad).
- **Activable/desactivable** en las configuraciones (ModalPlugins / config global),
  como el resto de plugins.

## Arquitectura

### Frontend — carpeta especializada `frontend/src/app/plugins/exp/`

Siguiendo el patrón OCP de plugins (auto-registro), TODO el plugin vive en una carpeta
dedicada; `inicializarPlugins.ts` solo la importa y registra:

```
frontend/src/app/plugins/exp/
  index.ts        # registro del plugin (registrarPlugin + registrarPanel) — side effect
  types.ts        # Dificultad, EstadoExp, ConfigExp, LogExp
  logica.ts       # funciones puras: expPorDificultad×Importancia, vidaPorIncumplimientos,
                  #   niveles, dificultadPorIA (prompt), dedupe/merge de registros
  store.ts        # store Zustand persist (glory-exp): vida, exp, nivel, dificultades,
                  #   registros; se sincroniza vía preferencias/settings como ayuno/déficit
  service.ts      # llamadas: estimar dificultad IA (/ai/chat), sincronizar estado al servidor
  PanelExp.tsx    # panel fijo superior: barra de vida + barra EXP + nivel
  PanelExp.css    # estilos (variables del sistema de diseño, sin specs inline)
```

Puntos de integración (mínimos, sin tocar el grid):
- `config/inicializarPlugins.ts`: importar `plugins/exp` y registrar el plugin `exp`
  con `panelesIds: ['exp']` + `requiereConfiguracion: true`.
- El panel `exp` se registra con flag nuevo `esPanelFijo: true` (barra superior, no
  entra en columnas del grid; se renderiza en `DashboardIsland` entre el encabezado y
  el grid cuando el plugin está activo).
- `DashboardIsland`: renderizar `<PanelExpFijo />` si `usePluginActivo('exp')`, en
  modo grid y sidebar.
- ModalPlugins: el toggle sale automático con el registro; añadir componente de
  configuración (`ConfigExp`) con opciones: dificultad automática on/off, penalización
  por incumplimiento, curva de EXP.

### Datos: dónde vive cada cosa (persistencia multinavegador)

| Dato | Dónde | Por qué |
|---|---|---|
| Dificultad de cada hábito/tarea | **payload** del hábito/tarea (`dificultad: 'Media'`) | el backend ya preserva el payload completo; sobrevive sync, export/import y cambio de navegador |
| Vida / EXP / nivel / registros | store persist `glory-exp` + **sync a preferencias del servidor** (`PUT /dashboard/settings` → preferencias) como ayuno/déficit | coherente entre navegadores; el backup/export v2 lo puede incluir |
| Incumplimientos (para la vida) | **derivado del historial real** (payload `historialCompletados`/`historialPospuestos` + frecuencia) | mismo principio que el panel de Actividad: hecho durable, no depende de eventos |

### Backend

- **Dificultad en payload**: ya funciona (el upsert preserva el payload). No requiere
  cambio de esquema. Verificar con un round-trip.
- **Endpoint IA**: se reutiliza `/api/ai/chat` (admin-only, key en servidor). El prompt
  pide JSON `{dificultad: 'Muy Baja'|'Baja'|'Media'|'Alta'|'Muy Alta'}` a partir de
  nombre+importancia+frecuencia. Degrada con dificultad heurística si la IA no responde
  (no bloquea la creación).
- **Nuevo (opcional, fase 2)**: `GET /api/exp/estado` que calcule vida/EXP en servidor
  desde el historial real, para que dos navegadores siempre coincidan incluso con
  registros locales divergentes. En fase 1 el cálculo vive en `logica.ts` (puro,
  testeable) y se sincroniza el resultado.

## Reglas de juego (base, ajustables en config)

### Dificultad
- Escala: `Muy Baja | Baja | Media | Alta | Muy Alta` (misma escala que importancia).
- Automática por IA (solo plugin activo): prompt con nombre/descripción/importancia/
  frecuencia → dificultad. Fallback heurístico:
  - frecuencia diaria + importancia Muy Alta/Alta → sube un nivel;
  - hábitos con subhábitos/dependencias → sube un nivel;
  - tareas con fecha límite/urgencia bloqueante → sube un nivel.

### EXP
- Base por dificultad: Muy Baja=1, Baja=2, Media=3, Alta=4, Muy Alta=5.
- Multiplicador por importancia: Muy Baja=0.5, Baja=0.75, Media=1, Alta=1.5, Muy Alta=2.
- `EXP = redondear(baseDificultad × multImportancia × multTipo)`; multTipo: hábito=1,
  tarea=1, subhábito=0.5, proyecto/hito=2 (configurable).
- Se registra al completar (con fecha) en el log del store; se persiste.
- Niveles: umbral creciente (p. ej. `nivel N → expNecesaria = 100 × N^1.5`), configurable.

### Vida
- Empieza en 100. Máximo 100 (configurable).
- Penalización por incumplimiento: cada día que un hábito **debía cumplirse** (según
  frecuencia) y **no está** en `historialCompletados` ni `historialPospuestos` ni está
  pausado → resta `(baseDificultad × multImportancia) / 2` (configurable).
- Solo cuentan incumplimientos recientes (ventana, p. ej. últimos 14 días, configurable).
- La vida no baja por debajo de 0. Al llegar a 0: estado "caído" (avisar, no borrar nada).
- Completar hábitos puede **recuperar** vida (p. ej. +1 por hábito completado del día,
  configurable) — fase 2.

### Disparadores
- Al completar una tarea/hábito (toggle/creación rápida/heatmap): si el plugin está
  activo y la entidad tiene dificultad → registrar EXP.
- Al abrir el dashboard / al refrescar: recalcular vida desde historial real (derivado).
- Al crear/editar una entidad con plugin activo y sin dificultad → estimar por IA (en
  segundo plano, sin bloquear; guardar en payload).

## Alcance / no-alcance

- **Fase 1 (esta iteración):**
  1. Carpeta `plugins/exp/` con tipos, lógica pura (exp/vida/niveles/dificultad IA),
     store persist + sync a preferencias, service, PanelExp (barra fija superior).
  2. Registro del plugin + toggle en ModalPlugins + componente de configuración.
  3. Integración en DashboardIsland (panel fijo arriba, grid y sidebar).
  4. Estimación de dificultad por IA al crear/editar (con fallback heurístico).
  5. Registro de EXP al completar (tareas y hábitos) + recálculo de vida al refrescar.
  6. Verificación en vivo (tsc, suite, round-trip de payload con dificultad).
- **No (fases futuras, registradas como pendientes):**
  - `GET /api/exp/estado` server-side (fase 2) para convergencia total entre navegadores
    incluso con logs locales divergentes.
  - Recuperación de vida por completados, rachas/combos, recompensas, niveles con
    perks, toasts de nivel-up, inclusión en export/import v2.
  - No tocar dominios con credenciales externas (la IA usa el proxy existente).

## Definition of Done (fase 1)
- Plugin `exp` aparece en ModalPlugins con toggle; al activarlo se renderiza el panel
  fijo superior con barra de vida (100) y EXP/nivel; al desactivarlo desaparece.
- Dificultad automática: al crear un hábito/tarea con plugin activo, se estima por IA
  (o heurística) y queda en el payload (verificado por round-trip a BD).
- Completar una tarea/hábito suma EXP al log; el panel lo refleja.
- La vida baja al incumplir hábitos (derivado del historial real, sin tocar
  activity_events), persiste y se sincroniza a preferencias.
- `tsc --noEmit` limpio; `cargo test` 11/11; suite `verify-parity.mjs` verde.
- Commit con solo los archivos del plugin + registro.
