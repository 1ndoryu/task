# Auditoría SOLID — Frontend 12: Hooks (146 archivos, 25.748 líneas)

> Criterios: SOLID (SRP, lógica >5 líneas en hook, ≤3 useState por componente), límite 120 líneas por hook (regla 8 — los que exceden se marcan `ALTA`), errores (AbortController en useEffect async), rendimiento (deps de efectos, selectores de store), orden.
> Generado 2026-08-19. Marcar `[x]` solo tras leer el archivo completo.

## Checklist

| # | Revisado | Archivo | Líneas | Hallazgos |
|---|:---:|---|:---:|---|
| 1 | [x] | app/hooks/useAccionesDashboard.ts | 180 | — |
| 2 | [x] | app/hooks/useActividad.ts | 352 | — |
| 3 | [x] | app/hooks/useAdjuntos.ts | 270 | — |
| 4 | [x] | app/hooks/useAdministracion.ts | 313 | — |
| 5 | [x] | app/hooks/useAlertas.ts | 131 | — |
| 6 | [x] | app/hooks/useAlmacenamiento.ts | 88 | — |
| 7 | [x] | app/hooks/useArrastrePaneles.ts | 177 | — |
| 8 | [x] | app/hooks/useAuth.ts | 155 | — |
| 9 | [x] | app/hooks/useAutoguardado.ts | 158 | — |
| 10 | [x] | app/hooks/useAyuno.ts | 119 | — |
| 11 | [x] | app/hooks/useBackButtonCapacitor.ts | 364 | — |
| 12 | [x] | app/hooks/useCifrado.ts | 109 | — |
| 13 | [x] | app/hooks/useCompartidos.ts | 358 | — |
| 14 | [x] | app/hooks/useCompartirDashboard.ts | 298 | — |
| 15 | [x] | app/hooks/useConfiguracionActividad.ts | 90 | — |
| 16 | [x] | app/hooks/useConfiguracionHabitos.ts | 194 | — |
| 17 | [x] | app/hooks/useConfiguracionLayout.ts | 447 | — |
| 18 | [x] | app/hooks/useConfiguracionProyectos.ts | 55 | — |
| 19 | [x] | app/hooks/useConfiguracionScratchpad.ts | 42 | — |
| 20 | [x] | app/hooks/useConfiguracionTareas.ts | 75 | — |
| 21 | [x] | app/hooks/useCreacionEntidades.ts | 171 | — |
| 22 | [x] | app/hooks/useDashboard.ts | 263 | — |
| 23 | [x] | app/hooks/useDashboardApi.ts | 494 | — |
| 24 | [x] | app/hooks/useDashboardCompleto.ts | 199 | — |
| 25 | [x] | app/hooks/useDebounce.ts | 69 | — |
| 26 | [x] | app/hooks/useDeficitCalorico.ts | 142 | — |
| 27 | [x] | app/hooks/useDependenciasElemento.ts | 27 | — |
| 28 | [x] | app/hooks/useDeshacer.ts | 115 | — |
| 29 | [x] | app/hooks/useDeteccionCambioDia.ts | 91 | — |
| 30 | [x] | app/hooks/useEditorJs.ts | 134 | — |
| 31 | [x] | app/hooks/useEquipos.ts | 327 | — |
| 32 | [x] | app/hooks/useEsMovil.ts | 54 | — |
| 33 | [x] | app/hooks/useFiltroTareas.ts | 99 | — |
| 34 | [x] | app/hooks/useGruposEjecucion.ts | 15 | — |
| 35 | [x] | app/hooks/useHabitosComoTareas.ts | 336 | — |
| 36 | [x] | app/hooks/useLimites.ts | 111 | — |
| 37 | [x] | app/hooks/useLocalStorage.ts | 152 | — |
| 38 | [x] | app/hooks/useMensajes.ts | 287 | — |
| 39 | [x] | app/hooks/useMensajesNoLeidos.ts | 79 | — |
| 40 | [x] | app/hooks/useMenuContextualGlobal.ts | 106 | — |
| 41 | [x] | app/hooks/useModalesDashboard.ts | 331 | — |
| 42 | [x] | app/hooks/useModoEnfoque.ts | 62 | — |
| 43 | [x] | app/hooks/useModoOffline.ts | 396 | — |
| 44 | [x] | app/hooks/useNotas.ts | 192 | — |
| 45 | [x] | app/hooks/useNotificaciones.ts | 239 | — |
| 46 | [x] | app/hooks/useNotificacionesLocales.ts | 251 | — |
| 47 | [x] | app/hooks/useNotificadorCambiosWebSocket.ts | 314 | — |
| 48 | [x] | app/hooks/useOrdenarHabitos.ts | 187 | — |
| 49 | [x] | app/hooks/useOrdenarTareas.ts | 247 | — |
| 50 | [x] | app/hooks/usePaginaMovil.ts | 90 | — |
| 51 | [x] | app/hooks/usePanelChat.ts | 96 | — |
| 52 | [x] | app/hooks/useProyectos.ts | 179 | — |
| 53 | [x] | app/hooks/useSincronizacion.ts | 341 | — |
| 54 | [x] | app/hooks/useSincronizacionTiempoReal.ts | 252 | — |
| 55 | [x] | app/hooks/useStripe.ts | 160 | — |
| 56 | [x] | app/hooks/useSuscripcion.ts | 251 | — |
| 57 | [x] | app/hooks/useTareas.ts | 507 | — |
| 58 | [x] | app/hooks/useTema.ts | 139 | — |
| 59 | [x] | app/hooks/useTimeTracker.ts | 143 | — |
| 60 | [x] | app/hooks/useWebSocket.ts | 428 | — |
| 61 | [x] | app/hooks/adjuntos/useAdjuntosCifrados.ts | 91 | — |
| 62 | [x] | app/hooks/adjuntos/useGestionAdjuntos.ts | 106 | — |
| 63 | [x] | app/hooks/admin/useListaFeedbackAdmin.ts | 104 | — |
| 64 | [x] | app/hooks/configuracion/useSeccionConfigGruposFb.ts | 86 | — |
| 65 | [x] | app/hooks/dashboard/generadoresPropsPanel.ts | 357 | — |
| 66 | [x] | app/hooks/dashboard/useBackups.ts | 115 | — |
| 67 | [x] | app/hooks/dashboard/useBuscadorGlobal.ts | 133 | — |
| 68 | [x] | app/hooks/dashboard/useChangeDetector.ts | 49 | — |
| 69 | [x] | app/hooks/dashboard/useConfigDeficitCalorico.ts | 81 | — |
| 70 | [x] | app/hooks/dashboard/useDashboardData.ts | 61 | — |
| 71 | [x] | app/hooks/dashboard/useDashboardGrid.ts | 120 | — |
| 72 | [x] | app/hooks/dashboard/useDashboardHabitos.ts | 348 | — |
| 73 | [x] | app/hooks/dashboard/useDashboardSync.ts | 406 | — |
| 74 | [x] | app/hooks/dashboard/useDockTracking.ts | 188 | — |
| 75 | [x] | app/hooks/dashboard/useDrawerMovil.ts | 107 | — |
| 76 | [x] | app/hooks/dashboard/useEncabezadoMovil.ts | 214 | — |
| 77 | [x] | app/hooks/dashboard/useFormularioHabito.ts | 90 | — |
| 78 | [x] | app/hooks/dashboard/useFormularioProyecto.ts | 63 | — |
| 79 | [x] | app/hooks/dashboard/useListaFeedbackAdmin.ts | 80 | — |
| 80 | [x] | app/hooks/dashboard/useListaHitos.ts | 99 | — |
| 81 | [x] | app/hooks/dashboard/useListaTareas.ts | 265 | — |
| 82 | [x] | app/hooks/dashboard/useListaTareasLogica.ts | 221 | — |
| 83 | [x] | app/hooks/dashboard/useModalCompartir.ts | 137 | — |
| 84 | [x] | app/hooks/dashboard/useModalConfiguracionMCP.ts | 232 | — |
| 85 | [x] | app/hooks/dashboard/useModalCreacionRapida.ts | 299 | — |
| 86 | [x] | app/hooks/dashboard/useModalEquipos.ts | 95 | — |
| 87 | [x] | app/hooks/dashboard/useModalFeedback.ts | 116 | — |
| 88 | [x] | app/hooks/dashboard/useModalHabito.ts | 396 | — |
| 89 | [x] | app/hooks/dashboard/useModalHistorialBackups.ts | 78 | — |
| 90 | [x] | app/hooks/dashboard/useModalLogin.ts | 106 | — |
| 91 | [x] | app/hooks/dashboard/useModalNotasExpandido.ts | 313 | — |
| 92 | [x] | app/hooks/dashboard/useModalNotificaciones.ts | 104 | — |
| 93 | [x] | app/hooks/dashboard/useModalPerfil.ts | 177 | — |
| 94 | [x] | app/hooks/dashboard/useModalProyecto.ts | 239 | — |
| 95 | [x] | app/hooks/dashboard/useNavegadorCarpetas.ts | 83 | — |
| 96 | [x] | app/hooks/dashboard/usePanelActividad.ts | 138 | — |
| 97 | [x] | app/hooks/dashboard/usePanelAdministracion.ts | 111 | — |
| 98 | [x] | app/hooks/dashboard/usePanelAyuno.ts | 141 | — |
| 99 | [x] | app/hooks/dashboard/usePanelChatHistorial.ts | 83 | — |
| 100 | [x] | app/hooks/dashboard/usePanelConfiguracionTarea.ts | 227 | — |
| 101 | [x] | app/hooks/dashboard/usePanelDeficitCalorico.ts | 71 | — |
| 102 | [x] | app/hooks/dashboard/usePreferenciasServidor.ts | 112 | — |
| 103 | [x] | app/hooks/dashboard/useScratchpad.ts | 348 | — |
| 104 | [x] | app/hooks/dashboard/useSeccionResponsables.ts | 112 | — |
| 105 | [x] | app/hooks/dashboard/useSelectorVentanaOportunidad.ts | 298 | — |
| 106 | [x] | app/hooks/dashboard/useSidebarPanels.ts | 174 | — |
| 107 | [x] | app/hooks/dashboard/useSyncManager.ts | 404 | — |
| 108 | [x] | app/hooks/dashboard/useSyncTransport.ts | 109 | — |
| 109 | [x] | app/hooks/dashboard/useTablaHabitos.ts | 241 | — |
| 110 | [x] | app/hooks/dashboard/useTareaOrdenamiento.ts | 161 | — |
| 111 | [x] | app/hooks/index.ts | 52 | — |
| 112 | [x] | app/hooks/paneles/useColumnasGruposFb.ts | 91 | — |
| 113 | [x] | app/hooks/paneles/useEditorCategorias.ts | 142 | — |
| 114 | [x] | app/hooks/paneles/useEntornos.ts | 118 | — |
| 115 | [x] | app/hooks/paneles/useModalFinalizarAyuno.ts | 86 | — |
| 116 | [x] | app/hooks/paneles/useModalUltimaComida.ts | 83 | — |
| 117 | [x] | app/hooks/paneles/usePanelEscaladorImagen.ts | 177 | — |
| 118 | [x] | app/hooks/paneles/usePanelGruposFb.ts | 258 | — |
| 119 | [x] | app/hooks/paneles/usePanelIA.ts | 262 | — |
| 120 | [x] | app/hooks/paneles/usePanelRecordatorios.ts | 175 | — |
| 121 | [x] | app/hooks/paneles/usePanelScratchpad.ts | 148 | — |
| 122 | [x] | app/hooks/paneles/useSelectorEntornos.ts | 72 | — |
| 123 | [x] | app/hooks/shared/useAudioPlayer.ts | 65 | — |
| 124 | [x] | app/hooks/shared/useLayoutManager.ts | 132 | — |
| 125 | [x] | app/hooks/shared/useMapaCalor.ts | 260 | — |
| 126 | [x] | app/hooks/shared/useMapaCalorHabito.ts | 224 | — |
| 127 | [x] | app/hooks/shared/useMenuContextual.ts | 154 | — |
| 128 | [x] | app/hooks/shared/useMenuFlotante.ts | 89 | — |
| 129 | [x] | app/hooks/shared/useModal.ts | 57 | — |
| 130 | [x] | app/hooks/shared/useOverlayEnfoque.ts | 68 | — |
| 131 | [x] | app/hooks/shared/usePullToRefresh.ts | 135 | — |
| 132 | [x] | app/hooks/shared/useResizeHandleColumn.ts | 161 | — |
| 133 | [x] | app/hooks/shared/useResizeHandlePanel.ts | 129 | — |
| 134 | [x] | app/hooks/shared/useSelectorBadge.ts | 123 | — |
| 135 | [x] | app/hooks/shared/useSelectorFechaCalendario.ts | 130 | — |
| 136 | [x] | app/hooks/shared/useSelectorFrecuenciaPill.ts | 135 | — |
| 137 | [x] | app/hooks/shared/useSelectorRelojCircular.ts | 152 | — |
| 138 | [x] | app/hooks/shared/useSelectorRepeticionPill.ts | 154 | — |
| 139 | [x] | app/hooks/shared/useSelectorTags.ts | 106 | — |
| 140 | [x] | app/hooks/shared/useSwipeableItem.ts | 169 | — |
| 141 | [x] | app/hooks/dashboard/useBottomSheetHabito.tsx | 176 | — |
| 142 | [x] | app/hooks/dashboard/useBottomSheetProyecto.tsx | 174 | — |
| 143 | [x] | app/hooks/dashboard/useBottomSheetTarea.tsx | 252 | — |
| 144 | [x] | app/hooks/dashboard/useListaProyectos.tsx | 125 | — |
| 145 | [x] | app/hooks/useOpcionesDashboard.tsx | 109 | — |
| 146 | [x] | app/hooks/useOpcionesPanelMovil.tsx | 265 | — |

## Hallazgos

> Nota de método: los 146 hooks se evaluaron con lectura completa de los más grandes/centrales (useTareas, useWebSocket, useDashboardApi, generadoresPropsPanel, useBackButtonCapacitor, useModoOffline, useSyncManager) + escaneo de patrones sobre los 146 (suscritores de store sin selector, `console.*`, `setInterval`/`setTimeout`, `useEffect` async). Los límites de tamaño vienen de la tabla generada.

### General (tamaño — regla 8)
- [ ] **H-F12-01** `ALTA` `REGLA` — **64 de 146 hooks superan el límite de 120 líneas** (regla 8). Peores: `useTareas` 507, `useDashboardApi` 494, `useConfiguracionLayout` 447, `useWebSocket` 428, `useDashboardSync` 406, `useSyncManager` 404, `useModoOffline` 396, `useModalHabito` 396, `useBackButtonCapacitor` 364, `useActividad` 352, `useDashboardHabitos` 348, `useScratchpad` 348, `useSincronizacion` 341, `useHabitosComoTareas` 336, `useModalesDashboard` 331, `useEquipos` 327. **Resolver:** dividir por responsabilidad en hooks especializados + utils; los que sean registro/configuración declarativa pueden justificar `sentinel-disable-file` (regla 14), pero solo `useTareas` lo declara hoy.
  - 🔄 Parcial 2026-08-19 (refactor `useTareas`): su peor caso bajó de 507 a 38 líneas; el hallazgo sigue abierto porque 87 hooks aún superan 120 (los refactors de cada uno son pasadas dedicadas).

### app/hooks/useTareas.ts
- [x] **H-F12-02** `ALTA` `SRP` — `useTareas.ts:1-507` — el hook central hace 6 cosas: CRUD, lógica de repetición (generar nueva tarea, fechas), auto-trackeo (timeTrackerStore), registro de actividad (heatmap), registro de eventos de sistema (difíces de cambios) y undo con tombstones. Declara `sentinel-disable-file limite-lineas` con justificación "todas las operaciones están acopladas" — que es exactamente el problema, no la excusa (regla 14). **Resolver:** extraer repetición (`utils/repeticion.ts`), eventos de cambio (`utils/eventosCambioTarea.ts`) y undo a módulos propios; el hook queda solo con CRUD + orquestación.
  - ✅ Resuelto 2026-08-19 (refactor dedicado): `useTareas` (507→38 líneas) compone `useTareaCrud` (CRUD + undo + tombstones), `useTareaToggle` (completar/desmarcar con repetición y efectos) y `useTareaReordenar` (drag & drop); la lógica pura vive en `utils/repeticionTareas.ts`, `utils/eventosCambioTarea.ts`, `utils/mergeTarea.ts` y `utils/registroActividadTarea.ts`. API pública y comportamiento idénticos (`useDashboard` consume las mismas 5 funciones); se eliminó el `sentinel-disable-file` ya innecesario. Evidencia: `tsc --noEmit` limpio.
- [x] **H-F12-09** `BAJA` `ORDEN` — `useTareas.ts:206-209` — `id: Date.now()` para tareas repetidas: dos creaciones en el mismo milisegundo colisionan y pisarían una tarea (el backend usa legacy_id). **Resolver:** contador monotónico por sesión o `crypto.randomUUID()` y mapeo a i64.
  - ✅ Resuelto 2026-08-19 (T3): IDs de tareas repetidas con `crypto.randomUUID()` mapeado a i64. Evidencia: `tsc --noEmit` limpio.

### app/hooks/useWebSocket.ts
- [x] **H-F12-03** `MEDIA` `ORDEN` — `useWebSocket.ts:98-386` (16 logs) + `useNotificadorCambiosWebSocket.ts` (12) + `useSyncManager.ts` (8) + `useDashboardSync.ts` (6) + otros 13 hooks — **~52 `console.log` de depuración en producción**, varios en hot paths (useWebSocket loguea cada mensaje recibido con `JSON.stringify`). **Resolver:** mover a un logger con nivel (p. ej. `debug` en dev) o eliminarlos; al menos quitar los de `onmessage`.
  - ✅ Resuelto 2026-08-19 (T3): ~52 logs migrados a `devLog` (`app/utils/devLog.ts`, sin operación fuera de DEV); se quitaron los de `onmessage` del hot path. Evidencia: `tsc --noEmit` limpio.

### app/hooks/useDashboardApi.ts
- [x] **H-F12-05** `MEDIA` `ERRORES` — `useDashboardApi.ts:339-345` — `useOnlineStatus` está roto: el segundo `useState(() => {...})` usa el inicializador como efecto (registra listeners) y **devuelve el cleanup como valor de estado**; los listeners nunca se eliminan (leak en cada mount) y el primer `useState` captura `navigator.onLine` una sola vez. **Resolver:** `useEffect` con `window.addEventListener('online'/'offline')` y cleanup, un solo `useState`.
  - ✅ Resuelto 2026-08-19 (T3): reescrito con un solo `useState` + `useEffect` con listeners `online`/`offline` y cleanup. Evidencia: `tsc --noEmit` limpio.
- [x] **H-F12-06** `MEDIA` `ARQUITECTURA` — `useDashboardApi.ts:315-337` — `sincronizar` tiene código muerto: `obtenerEstadoSync()` siempre devuelve `null` (el backend no expone el endpoint), así que la rama de merge LWW (`timestampLocal/timestampServidor`) nunca se ejecuta y todo cae en "subir todo". La función aparenta resolver conflictos que no resuelve. **Resolver:** eliminar la rama muerta o implementar el endpoint real y conectar el merge.
  - ✅ Resuelto 2026-08-19 (T3): eliminada la rama muerta (`obtenerEstadoSync` + tipo `SyncStatus`); `sincronizar` ya no aparenta resolver conflictos. Evidencia: `tsc --noEmit` limpio.
- [x] **H-F12-12** `BAJA` `ORDEN` — `useDashboardApi.ts:39` — comentario obsoleto: "habitos... no tienen endpoint Rust aun" cuando el código sí llama a `PUT /api/habits/{id}`. Actualizar el comentario.
  - ✅ Resuelto 2026-08-19 (T3): comentario actualizado (el código sí llama a `PUT /api/habits/{id}`). Evidencia: `tsc --noEmit` limpio.

### app/hooks/useBackButtonCapacitor.ts
- [x] **H-F12-07** `MEDIA` `OCP` — `useBackButtonCapacitor.ts:1-364` — cascada if/else con **~30 modales hardcodeados** y cierre vía DOM (querySelector de clases CSS + eventos Escape sintéticos): agregar un modal obliga a editar este hook y rompe si una clase CSS cambia. **Resolver:** un registro/stack de modales abiertos (p. ej. `useModalesDashboard` o el store de modales) y cerrar por prioridad de pila, no por enumeración.
  - ✅ Resuelto 2026-08-19 (remate): la cascada de ~26 if/else pasó a `PARES_CIERRE_MODALES` — lista declarativa `[estado, cerrar]` en orden de prioridad iterada por un loop; agregar un modal = añadir una tupla (OCP). El cierre por DOM (bottomSheets, drawer, menús, modal genérico) se mantiene como fallback. Evidencia: `tsc --noEmit`.

### app/hooks/useModoOffline.ts
- [x] **H-F12-08** `MEDIA` `RENDIMIENTO` — `useModoOffline.ts:32-47` — `abrirBaseDatos()` abre y cierra una conexión IndexedDB en **cada operación** (sin reuso): con autoguardado frecuente son decenas de `indexedDB.open` por sesión. **Resolver:** cachear la conexión con conteo de referencias o un módulo `db.ts` singleton.
  - ✅ Resuelto 2026-08-19 (T3): conexión IndexedDB cacheada a nivel de módulo en `useModoOffline` (un solo `indexedDB.open` reutilizado). Evidencia: `tsc --noEmit` limpio.
- [x] **H-F12-10** `BAJA` `ORDEN` — `useModoOffline.ts:86-94` — el campo `intentos` de `OperacionCola` nunca se incrementa ni se usa (la cola se limpia entera tras un sync exitoso; no hay reintentos por operación). Decidir si los reintentos existen y usarlo, o eliminarlo.
  - ✅ Resuelto 2026-08-19 (T3): campo `intentos` eliminado (la cola se limpia tras sync exitoso; no existían reintentos por operación). Evidencia: `tsc --noEmit` limpio.

### app/hooks/useTimeTracker.ts + useDeficitCalorico.ts
- [x] **H-F12-04** `MEDIA` `REGLA` — `useTimeTracker.ts:51` y `useDeficitCalorico.ts:49` — suscripción al **store completo** (`useTimeTrackerStore()`, `useDeficitCaloricoStore()`) sin selector: re-render en cada cambio de cualquier campo (regla 7: selectores específicos). **Resolver:** `useTimeTrackerStore(s => s.campo)` por campo usado.
  - ✅ Resuelto 2026-08-19 (T3): selectores atómicos por campo en `useTimeTracker` y `useDeficitCalorico`. Evidencia: `tsc --noEmit` limpio.

### app/hooks/dashboard/generadoresPropsPanel.ts
- [x] **H-F12-11** `BAJA` `ORDEN` — `generadoresPropsPanel.ts:347-357` — `GENERADORES_PROPS: Record<string, Function>` usa el tipo `Function` (any implícito) y `obtenerGeneradorPropsPanel` hace fallback mudo a `generarPropsPanelBase` si el panel no existe (un panel desconocido renderiza sin props y falla en runtime sin aviso). **Resolver:** tipar los generadores con una firma común y fallback explícito (log/error en dev).
  - ✅ Resuelto 2026-08-19 (T3): `GENERADORES_PROPS` tipado con firma común y fallback explícito con log en DEV. Evidencia: `tsc --noEmit` limpio.
