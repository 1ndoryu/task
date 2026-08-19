# Auditoría SOLID — Frontend 16: glory-core (46 archivos, 4.122 líneas)

> Núcleo agnóstico reutilizable (regla 17). Criterios: SOLID, agnosticismo (sin lógica específica de task/WP), reglas AGENTS, errores, orden.
> Generado 2026-08-19. Marcar `[x]` solo tras leer el archivo completo.

## Checklist

| # | Revisado | Archivo | Líneas | Hallazgos |
|---|:---:|---|:---:|---|
| 1 | [x] | glory-core/main.tsx | 81 | — |
| 2 | [x] | glory-core/vite-env.d.ts | 10 | — |
| 3 | [x] | glory-core/components/ui/index.ts | 11 | — |
| 4 | [x] | glory-core/core/DevOverlay.tsx | 44 | — |
| 5 | [x] | glory-core/core/ErrorBoundary.tsx | 134 | — |
| 6 | [x] | glory-core/core/GloryProvider.tsx | 17 | — |
| 7 | [x] | glory-core/core/IslandRegistry.ts | 93 | — |
| 8 | [x] | glory-core/core/gloryContext.ts | 25 | — |
| 9 | [x] | glory-core/core/hydration.tsx | 257 | — |
| 10 | [x] | glory-core/core/index.ts | 18 | — |
| 11 | [x] | glory-core/core/router/GloryLink.tsx | 102 | — |
| 12 | [x] | glory-core/core/router/PageRenderer.tsx | 166 | — |
| 13 | [x] | glory-core/core/router/index.ts | 9 | — |
| 14 | [x] | glory-core/core/router/navigationStore.ts | 239 | — |
| 15 | [x] | glory-core/core/useGloryProvider.ts | 11 | — |
| 16 | [x] | glory-core/hooks/index.ts | 13 | — |
| 17 | [x] | glory-core/hooks/useGloryContent.ts | 89 | — |
| 18 | [x] | glory-core/hooks/useGloryContext.ts | 36 | — |
| 19 | [x] | glory-core/hooks/useGloryMedia.ts | 53 | — |
| 20 | [x] | glory-core/hooks/useGloryOptions.ts | 40 | — |
| 21 | [x] | glory-core/hooks/useIslandProps.ts | 16 | — |
| 22 | [x] | glory-core/hooks/useNavigation.ts | 51 | — |
| 23 | [x] | glory-core/hooks/useWordPressApi.ts | 137 | — |
| 24 | [x] | glory-core/islands/ExampleIsland.tsx | 43 | — |
| 25 | [x] | glory-core/pageBuilder/BlockEditorModal.tsx | 262 | — |
| 26 | [x] | glory-core/pageBuilder/BlockRegistry.ts | 101 | — |
| 27 | [x] | glory-core/pageBuilder/BlockRenderer.tsx | 184 | — |
| 28 | [x] | glory-core/pageBuilder/components/AddBlockPanel.tsx | 97 | — |
| 29 | [x] | glory-core/pageBuilder/components/EditModeToggle.tsx | 56 | — |
| 30 | [x] | glory-core/pageBuilder/components/PageBuilder.tsx | 111 | — |
| 31 | [x] | glory-core/pageBuilder/components/PageBuilderToolbar.tsx | 105 | — |
| 32 | [x] | glory-core/pageBuilder/components/index.ts | 12 | — |
| 33 | [x] | glory-core/pageBuilder/hooks/usePageBuilder.ts | 155 | — |
| 34 | [x] | glory-core/pageBuilder/index.ts | 41 | — |
| 35 | [x] | glory-core/pageBuilder/layouts/PageLayout.tsx | 213 | — |
| 36 | [x] | glory-core/pageBuilder/layouts/index.ts | 6 | — |
| 37 | [x] | glory-core/pageBuilder/types.ts | 115 | — |
| 38 | [x] | glory-core/types/api.ts | 87 | — |
| 39 | [x] | glory-core/types/glory.ts | 106 | — |
| 40 | [x] | glory-core/types/index.ts | 51 | — |
| 41 | [x] | glory-core/types/pageBuilder.ts | 35 | — |
| 42 | [x] | glory-core/types/wordpress.ts | 117 | — |
| 43 | [x] | glory-core/utils/apiCache.ts | 50 | — |
| 44 | [x] | glory-core/utils/wpCredentials.ts | 49 | — |
| 45 | [x] | glory-core/index.css | 177 | — |
| 46 | [x] | glory-core/pageBuilder/styles/constructorPaginas.css | 297 | — |

## Hallazgos

## Hallazgos F16

- [x] **H-F16-01** `BAJA` `RENDIMIENTO` — core/router/navigationStore.ts:165 — `window.addEventListener('popstate', ...)` se registra dentro de `inicializar` sin `removeEventListener`; si el store se re-inicializa (HMR, remount) se acumulan listeners duplicados con efectos dobles y fuga de memoria. Sugerencia: registrar el listener una sola vez (guard de instancia o fuera del store) y devolver/limpiar en unmount.
  - ✅ Resuelto 2026-08-19 (T5): registro único a nivel de módulo (`popstateRegistrado` + `registrarListenerPopstate`); el closure lee el estado actual vía `get()`, así que sigue correcto con re-inicializaciones. Evidencia: `tsc --noEmit`.
- [x] **H-F16-02** `INFO` `TIPOS` — pageBuilder/BlockRenderer.tsx:69 y pageBuilder/components/PageBuilder.tsx:100 — casts `as any` con `sentinel-disable` justificados (tipos JSX de React 19 rompen `ComponentType`). Correcto hoy, pero candidato a tipado propio (`BlockComponentProps`) para recuperar seguridad de tipos.
  - ✅ Resuelto 2026-08-19 (T5): los casts eran heredados — `BlockDefinition.component` ya está tipado como `ComponentType<BlockComponentProps<T>>` y `children` como `(blocks, isEditMode) => ReactNode`; se eliminaron ambos `as any` sin romper el typecheck. Evidencia: `tsc --noEmit`.
- [x] **H-F16-03** `INFO` `REGLAS` — hex hardcodeados y estilos inline con `sentinel-disable` justificados en UI dev/admin del framework (ErrorBoundary.tsx, DevOverlay.tsx, hydration.tsx, PageRenderer.tsx, EditModeToggle.tsx, PageBuilderToolbar.tsx, AddBlockPanel.tsx, PageLayout.tsx:151,180 y constructorPaginas.css). Por diseño en un framework agnóstico (no puede depender de variables del anfitrión); opcional centralizar en variables CSS propias del glory-core.
  - ✅ Resuelto 2026-08-19 (T5) por decisión: se mantiene el diseño actual — un framework agnóstico no puede depender de variables CSS del anfitrión; los `sentinel-disable` documentan la excepción. Centralizar en variables propias del glory-core queda como mejora opcional futura (no es un defecto).
