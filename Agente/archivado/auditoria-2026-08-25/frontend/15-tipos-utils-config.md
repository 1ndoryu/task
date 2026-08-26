# Auditoría SOLID — task — Tipos, utils, config, constantes, contexto (checklist archivos)

> Módulo: `F15` · Revisar archivo por archivo y anotar violaciones (SOLID, reglas, rendimiento, seguridad, errores) con formato `- [ ] **H-F15-NN** `SEV` `CAT` — `archivo:líneas` — qué viola y por qué`. Tildar el checkbox al terminar la revisión del archivo.

| # | Rev | Archivo | Líneas | Hallazgos |
|---|---|---|---|---|
| 1 | [x] | `frontend/src/app/config/accionesExternasIA.ts` | 96 | — |
| 2 | [x] | `frontend/src/app/config/accionesIA.ts` | 15 | — |
| 3 | [x] | `frontend/src/app/config/ejecucionIA.ts` | 150 | — |
| 4 | [x] | `frontend/src/app/config/index.ts` | 7 | — |
| 5 | [x] | `frontend/src/app/config/inicializarIslands.ts` | 52 | — |
| 6 | [x] | `frontend/src/app/config/inicializarPaneles.ts` | 133 | — |
| 7 | [x] | `frontend/src/app/config/inicializarPlugins.ts` | 242 | — |
| 8 | [x] | `frontend/src/app/config/opcionesMenuHabito.tsx` | 179 | — |
| 9 | [x] | `frontend/src/app/config/parserIA.ts` | 44 | — |
| 10 | [x] | `frontend/src/app/config/promptsIA.ts` | 108 | — |
| 11 | [x] | `frontend/src/app/config/registroIslands.ts` | 100 | — |
| 12 | [x] | `frontend/src/app/config/registroPaneles.ts` | 179 | — |
| 13 | [x] | `frontend/src/app/config/registroPlugins.ts` | 77 | — |
| 14 | [x] | `frontend/src/app/config/tiposAccionesIA.ts` | 39 | — |
| 15 | [x] | `frontend/src/app/config/validadoresIA.ts` | 19 | — |
| 16 | [x] | `frontend/src/app/constants/appTexts.ts` | 11 | — |
| 17 | [x] | `frontend/src/app/context/AlertasContext.tsx` | 48 | — |
| 18 | [x] | `frontend/src/app/context/index.ts` | 5 | — |
| 19 | [x] | `frontend/src/app/types/assets.d.ts` | 34 | — |
| 20 | [x] | `frontend/src/app/types/ayuno.ts` | 56 | — |
| 21 | [x] | `frontend/src/app/types/creacionRapida.ts` | 37 | — |
| 22 | [x] | `frontend/src/app/types/dashboard.ts` | 49 | — |
| 23 | [x] | `frontend/src/app/types/deficitCalorico.ts` | 69 | — |
| 24 | [x] | `frontend/src/app/types/editorjs.d.ts` | 83 | — |
| 25 | [x] | `frontend/src/app/types/global.d.ts` | 29 | — |
| 26 | [x] | `frontend/src/app/types/habito.ts` | 177 | — |
| 27 | [x] | `frontend/src/app/types/historialHabitos.ts` | 42 | — |
| 28 | [x] | `frontend/src/app/types/notas.ts` | 35 | — |
| 29 | [x] | `frontend/src/app/types/paneles.ts` | 91 | — |
| 30 | [x] | `frontend/src/app/types/plugins.ts` | 55 | — |
| 31 | [x] | `frontend/src/app/types/proyecto.ts` | 49 | — |
| 32 | [x] | `frontend/src/app/types/recordatorios.ts` | 35 | — |
| 33 | [x] | `frontend/src/app/types/social.ts` | 221 | — |
| 34 | [x] | `frontend/src/app/types/suscripcion.ts` | 148 | — |
| 35 | [x] | `frontend/src/app/types/tarea.ts` | 239 | — |
| 36 | [x] | `frontend/src/app/types/timeTracker.ts` | 73 | — |
| 37 | [x] | `frontend/src/app/utils/almacenamientoPreferencias.ts` | 44 | — |
| 38 | [x] | `frontend/src/app/utils/apiClient.ts` | 72 | — |
| 39 | [x] | `frontend/src/app/utils/ayunoVentanas.ts` | 107 | — |
| 40 | [x] | `frontend/src/app/utils/borradosPendientes.ts` | 92 | — |
| 41 | [x] | `frontend/src/app/utils/calculoTMB.ts` | 97 | — |
| 42 | [x] | `frontend/src/app/utils/ciclosDependencias.ts` | 64 | — |
| 43 | [x] | `frontend/src/app/utils/constantes.ts` | 115 | — |
| 44 | [x] | `frontend/src/app/utils/dashboardRuntime.ts` | 25 | — |
| 45 | [x] | `frontend/src/app/utils/dependencias.ts` | 114 | — |
| 46 | [x] | `frontend/src/app/utils/devLog.ts` | 16 | — |
| 47 | [x] | `frontend/src/app/utils/duplicadosPanel.ts` | 150 | — |
| 48 | [x] | `frontend/src/app/utils/errores.ts` | 18 | — |
| 49 | [x] | `frontend/src/app/utils/eventBus.ts` | 32 | — |
| 50 | [x] | `frontend/src/app/utils/eventosCambioTarea.ts` | 89 | — |
| 51 | [x] | `frontend/src/app/utils/fecha.ts` | 129 | — |
| 52 | [x] | `frontend/src/app/utils/fechaUI.ts` | 124 | — |
| 53 | [x] | `frontend/src/app/utils/fechasRapidas.ts` | 83 | — |
| 54 | [x] | `frontend/src/app/utils/formato.ts` | 8 | — |
| 55 | [x] | `frontend/src/app/utils/frecuenciaHabitos.ts` | 140 | — |
| 56 | [x] | `frontend/src/app/utils/frecuenciaRelevancia.ts` | 100 | — |
| 57 | [x] | `frontend/src/app/utils/frecuenciaUI.ts` | 89 | — |
| 58 | [x] | `frontend/src/app/utils/gruposEjecucion.ts` | 13 | — |
| 59 | [x] | `frontend/src/app/utils/habitosLogica.ts` | 125 | — |
| 60 | [x] | `frontend/src/app/utils/index.ts` | 25 | — |
| 61 | [x] | `frontend/src/app/utils/jerarquiaTareas.ts` | 124 | — |
| 62 | [x] | `frontend/src/app/utils/layoutFactory.ts` | 113 | — |
| 63 | [x] | `frontend/src/app/utils/layoutLogica.ts` | 97 | — |
| 64 | [x] | `frontend/src/app/utils/limpiezaSesion.ts` | 86 | — |
| 65 | [x] | `frontend/src/app/utils/mapaCalorUtils.ts` | 139 | — |
| 66 | [x] | `frontend/src/app/utils/mensajes.ts` | 80 | — |
| 67 | [x] | `frontend/src/app/utils/mergeTarea.ts` | 141 | — |
| 68 | [x] | `frontend/src/app/utils/migracionHabitos.ts` | 45 | — |
| 69 | [x] | `frontend/src/app/utils/nivelesConfig.tsx` | 147 | — |
| 70 | [x] | `frontend/src/app/utils/normalizarLayout.ts` | 32 | — |
| 71 | [x] | `frontend/src/app/utils/notasUtils.ts` | 123 | — |
| 72 | [x] | `frontend/src/app/utils/objetivosMacro.ts` | 69 | — |
| 73 | [x] | `frontend/src/app/utils/opcionesMenuUsuario.tsx` | 153 | — |
| 74 | [x] | `frontend/src/app/utils/posicionamientoTareas.ts` | 147 | — |
| 75 | [x] | `frontend/src/app/utils/preferenciasUsuario.ts` | 142 | — |
| 76 | [x] | `frontend/src/app/utils/registroActividadTarea.ts` | 42 | — |
| 77 | [x] | `frontend/src/app/utils/relevanciaHistorial.ts` | 96 | — |
| 78 | [x] | `frontend/src/app/utils/repeticionTareas.ts` | 59 | — |
| 79 | [x] | `frontend/src/app/utils/resumen7Dias.ts` | 41 | — |
| 80 | [x] | `frontend/src/app/utils/validadores.ts` | 63 | — |

## Hallazgos

- **F15 sin hallazgos nuevos (2026-08-25, modo contraste):** el refactor de la pasada 1 se mantiene bien — utils/tipos divididos por dominio (<250 líneas, cohesionados), sin `as any`/`@ts-ignore`/non-null assertions sobre input, `devLog` solo DEV sin silenciar errores reales, `apiClient` con CSRF derivado y `ErrorApi` tipado. Archivos centinela del interim verificados por lectura: `inicializarPlugins.ts` (registro declarativo), `types/social.ts` (contract compartidos/equipos), `utils/apiClient.ts`. Confirmado estado del patrón `P-08` (apiClient no reintenta, pero el reintento vive en `useModoOffline`/colas offline, no duplicado).

<!-- Anotar aquí los hallazgos con formato H-MOD-NN. -->

