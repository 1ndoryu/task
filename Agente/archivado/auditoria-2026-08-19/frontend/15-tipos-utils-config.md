# Auditoría SOLID — Frontend 15: Tipos / utils / config / raíz (64 archivos, 6.905 líneas)

> Criterios: SOLID (SRP por utilidad, DIP hacia `apiClient`), reglas AGENTS (utils ≤150 líneas, sin lógica de negocio en componentes), errores, orden.
> Generado 2026-08-19. Marcar `[x]` solo tras leer el archivo completo.

## Checklist

| # | Revisado | Archivo | Líneas | Hallazgos |
|---|:---:|---|:---:|---|
| 1 | [x] | main.tsx | 72 | — |
| 2 | [x] | App.css | 187 | — |
| 3 | [x] | vite-env.d.ts | 1 | — |
| 4 | [x] | api/axios-instance.ts | 53 | — |
| 5 | [x] | app/types/assets.d.ts | 34 | — |
| 6 | [x] | app/types/ayuno.ts | 56 | — |
| 7 | [x] | app/types/creacionRapida.ts | 37 | — |
| 8 | [x] | app/types/dashboard.ts | 839 | — |
| 9 | [x] | app/types/deficitCalorico.ts | 69 | — |
| 10 | [x] | app/types/editorjs.d.ts | 83 | — |
| 11 | [x] | app/types/global.d.ts | 29 | — |
| 12 | [x] | app/types/historialHabitos.ts | 42 | — |
| 13 | [x] | app/types/notas.ts | 35 | — |
| 14 | [x] | app/types/paneles.ts | 91 | — |
| 15 | [x] | app/types/plugins.ts | 55 | — |
| 16 | [x] | app/types/recordatorios.ts | 35 | — |
| 17 | [x] | app/types/timeTracker.ts | 73 | — |
| 18 | [x] | types/auth.ts | 7 | — |
| 19 | [x] | types/native-stubs.d.ts | 28 | — |
| 20 | [x] | app/utils/apiClient.ts | 72 | — |
| 21 | [x] | app/utils/ayunoVentanas.ts | 107 | — |
| 22 | [x] | app/utils/borradosPendientes.ts | 92 | — |
| 23 | [x] | app/utils/calculoTMB.ts | 155 | — |
| 24 | [x] | app/utils/constantes.ts | 115 | — |
| 25 | [x] | app/utils/dashboardRuntime.ts | 24 | — |
| 26 | [x] | app/utils/dependencias.ts | 168 | — |
| 27 | [x] | app/utils/errores.ts | 18 | — |
| 28 | [x] | app/utils/eventBus.ts | 32 | — |
| 29 | [x] | app/utils/fecha.ts | 129 | — |
| 30 | [x] | app/utils/fechaUI.ts | 196 | — |
| 31 | [x] | app/utils/formato.ts | 8 | — |
| 32 | [x] | app/utils/frecuenciaHabitos.ts | 140 | — |
| 33 | [x] | app/utils/frecuenciaRelevancia.ts | 185 | — |
| 34 | [x] | app/utils/frecuenciaUI.ts | 89 | — |
| 35 | [x] | app/utils/gruposEjecucion.ts | 13 | — |
| 36 | [x] | app/utils/habitosLogica.ts | 155 | — |
| 37 | [x] | app/utils/index.ts | 25 | — |
| 38 | [x] | app/utils/jerarquiaTareas.ts | 299 | — |
| 39 | [x] | app/utils/layoutFactory.ts | 113 | — |
| 40 | [x] | app/utils/layoutLogica.ts | 242 | — |
| 41 | [x] | app/utils/limpiezaSesion.ts | 86 | — |
| 42 | [x] | app/utils/mapaCalorUtils.ts | 139 | — |
| 43 | [x] | app/utils/mensajes.ts | 80 | — |
| 44 | [x] | app/utils/migracionHabitos.ts | 45 | — |
| 45 | [x] | app/utils/notasUtils.ts | 123 | — |
| 46 | [x] | app/utils/preferenciasUsuario.ts | 191 | — |
| 47 | [x] | app/utils/validadores.ts | 63 | — |
| 48 | [x] | app/config/accionesExternasIA.ts | 96 | — |
| 49 | [x] | app/config/accionesIA.ts | 337 | — |
| 50 | [x] | app/config/index.ts | 7 | — |
| 51 | [x] | app/config/inicializarIslands.ts | 52 | — |
| 52 | [x] | app/config/inicializarPaneles.ts | 133 | — |
| 53 | [x] | app/config/inicializarPlugins.ts | 242 | — |
| 54 | [x] | app/config/registroIslands.ts | 100 | — |
| 55 | [x] | app/config/registroPaneles.ts | 179 | — |
| 56 | [x] | app/config/registroPlugins.ts | 77 | — |
| 57 | [x] | app/constants/appTexts.ts | 11 | — |
| 58 | [x] | app/data/changelog.ts | 473 | — |
| 59 | [x] | app/data/datosIniciales.ts | 142 | — |
| 60 | [x] | app/data/index.ts | 6 | — |
| 61 | [x] | app/context/index.ts | 5 | — |
| 62 | [x] | app/blocks/index.ts | 49 | — |
| 63 | [x] | app/plugins/GoogleAuthNative.ts | 19 | — |
| 64 | [x] | native-stubs/capacitor-google-auth.ts | 12 | — |

## Hallazgos

> Nota de método: lectura de apiClient/errores/preferenciasUsuario/main + escaneo de tamaños, duplicación de utilidades y `any`.

### General (tamaño — regla 8)
- [x] **H-F15-01** `ALTA` `REGLA` — **8 utils superan 150 líneas**: `jerarquiaTareas.ts` 299, `layoutLogica.ts` 242, `fechaUI.ts` 196, `preferenciasUsuario.ts` 191, `frecuenciaRelevancia.ts` 185, `dependencias.ts` 168, `calculoTMB.ts` 155, `habitosLogica.ts` 155; `config/accionesIA.ts` 337 y **`app/types/dashboard.ts` 839 líneas** (monolito de tipos de tareas+hábitos+proyectos+config+equipos). **Resolver:** utils por dominio (p. ej. `jerarquiaTareas.ts` ya es dominio puro — está bien acoplado pero extenso: extraer helpers); `dashboard.ts` → `types/tarea.ts`, `types/habito.ts`, `types/proyecto.ts` re-exportados desde `index.ts`.
  - ✅ Resuelto 2026-08-19 (refactor dedicado): las 10 rutas quedan bajo límite — `jerarquiaTareas` 299→124 (posicionamiento drag&drop → `posicionamientoTareas.ts`), `layoutLogica` 262→97 (duplicados/división → `duplicadosPanel.ts` + `normalizarLayout.ts`), `fechaUI` 196→124 (fechas rápidas → `fechasRapidas.ts`), `preferenciasUsuario` 191→142 (capa localStorage → `almacenamientoPreferencias.ts`), `frecuenciaRelevancia` 185→100 (historial → `relevanciaHistorial.ts`), `dependencias` 168→114 (ciclos → `ciclosDependencias.ts`), `calculoTMB` 155→97 (macros → `objetivosMacro.ts`), `habitosLogica` 155→125 (resumen → `resumen7Dias.ts`); `accionesIA` 337→15 (facade sobre tipos/prompts/parser/ejecución/validadores); `types/dashboard.ts` 839→49 (barrel sobre `habito/tarea/proyecto/suscripcion/social`). Rutas y exports públicos intactos (facades en las rutas originales); sin cambios de consumidores. Evidencia: `tsc --noEmit` limpio.

### Duplicación
- [x] **H-F15-02** `BAJA` `DUPLICACION` — `obtenerTokenCsrf()` está copiado en **3 sitios**: `utils/apiClient.ts:6-9`, `utils/preferenciasUsuario.ts:127-130` (que además hace `fetch` directo en `persistirPreferenciasAhora` en vez de `apiFetch`) y `hooks/useDashboardApi.ts:47-50`. **Resolver:** exportar desde `apiClient.ts` y reutilizar; `persistirPreferenciasAhora` debería usar `apiFetch`.
  - ✅ Resuelto 2026-08-19 (T5): única definición en `apiClient.ts`; `useDashboardApi` la importa y `preferenciasUsuario` usa `apiFetch` (CSRF + JSON + errores unificados) en el flush de logout. Evidencia: `tsc --noEmit`.

### main.tsx
- [x] **H-F15-03** `BAJA` `ERRORES` — `main.tsx:30-45` — `esAdmin: false` hardcodeado cuando `/api/auth/me` devuelve `user.es_admin` (el backend ya lo incluye en `UserResponse`): si cualquier UI gatea con `window.gloryDashboard.esAdmin` (p. ej. mostrar el panel admin), un admin no lo verá. **Resolver:** `esAdmin: Boolean(usuario?.es_admin)`.
  - ✅ Resuelto 2026-08-19 (T4): `main.tsx` lee `es_admin` del `UserResponse` (que `/api/auth/me` devuelve directo, sin envoltorio `{user}` — corregido también el parsing de `currentUser`). Evidencia: `tsc --noEmit`.

### app/config/accionesIA.ts
- [x] **H-F15-04** `INFO` `ORDEN` — `accionesIA.ts` (337 líneas) es un registro extenso de acciones del LLM; verificar que no duplique `accionesExternasIA.ts` (96) y que las definiciones compartidas (payloads, validadores) no deberían vivir en un `types/ia.ts`. Verificar en revisión de uso real antes de dividir.
  - ✅ Resuelto 2026-08-19 (T5) por verificación: **no hay solape** — `accionesExternasIA` son acciones externas (WhatsApp, research, GitHub, recordatorios, notas) con flujo `pendienteConfirmacion`, consumidas desde `accionesIA:280`; los tipos compartidos (`AccionLLM`, `ResultadoAccion`) ya viven en `accionesIA` y se importan (DIP correcto); no hace falta `types/ia.ts`. Sin cambios de código.
