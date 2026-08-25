# Auditoría SOLID — task — Tipos, utils, config, constantes, contexto (checklist archivos)

> Módulo: `F15` · Revisar archivo por archivo y anotar violaciones (SOLID, reglas, rendimiento, seguridad, errores) con formato `- [ ] **H-F15-NN** `SEV` `CAT` — `archivo:líneas` — qué viola y por qué`. Tildar el checkbox al terminar la revisión del archivo.

| # | Rev | Archivo | Líneas | Hallazgos |
|---|---|---|---|---|
| 1 | [ ] | `frontend/src/app/config/accionesExternasIA.ts` | 96 | — |
| 2 | [ ] | `frontend/src/app/config/accionesIA.ts` | 15 | — |
| 3 | [ ] | `frontend/src/app/config/ejecucionIA.ts` | 150 | — |
| 4 | [ ] | `frontend/src/app/config/index.ts` | 7 | — |
| 5 | [ ] | `frontend/src/app/config/inicializarIslands.ts` | 52 | — |
| 6 | [ ] | `frontend/src/app/config/inicializarPaneles.ts` | 133 | — |
| 7 | [ ] | `frontend/src/app/config/inicializarPlugins.ts` | 242 | — |
| 8 | [ ] | `frontend/src/app/config/opcionesMenuHabito.tsx` | 179 | — |
| 9 | [ ] | `frontend/src/app/config/parserIA.ts` | 44 | — |
| 10 | [ ] | `frontend/src/app/config/promptsIA.ts` | 108 | — |
| 11 | [ ] | `frontend/src/app/config/registroIslands.ts` | 100 | — |
| 12 | [ ] | `frontend/src/app/config/registroPaneles.ts` | 179 | — |
| 13 | [ ] | `frontend/src/app/config/registroPlugins.ts` | 77 | — |
| 14 | [ ] | `frontend/src/app/config/tiposAccionesIA.ts` | 39 | — |
| 15 | [ ] | `frontend/src/app/config/validadoresIA.ts` | 19 | — |
| 16 | [ ] | `frontend/src/app/constants/appTexts.ts` | 11 | — |
| 17 | [ ] | `frontend/src/app/context/AlertasContext.tsx` | 48 | — |
| 18 | [ ] | `frontend/src/app/context/index.ts` | 5 | — |
| 19 | [ ] | `frontend/src/app/types/assets.d.ts` | 34 | — |
| 20 | [ ] | `frontend/src/app/types/ayuno.ts` | 56 | — |
| 21 | [ ] | `frontend/src/app/types/creacionRapida.ts` | 37 | — |
| 22 | [ ] | `frontend/src/app/types/dashboard.ts` | 49 | — |
| 23 | [ ] | `frontend/src/app/types/deficitCalorico.ts` | 69 | — |
| 24 | [ ] | `frontend/src/app/types/editorjs.d.ts` | 83 | — |
| 25 | [ ] | `frontend/src/app/types/global.d.ts` | 29 | — |
| 26 | [ ] | `frontend/src/app/types/habito.ts` | 177 | — |
| 27 | [ ] | `frontend/src/app/types/historialHabitos.ts` | 42 | — |
| 28 | [ ] | `frontend/src/app/types/notas.ts` | 35 | — |
| 29 | [ ] | `frontend/src/app/types/paneles.ts` | 91 | — |
| 30 | [ ] | `frontend/src/app/types/plugins.ts` | 55 | — |
| 31 | [ ] | `frontend/src/app/types/proyecto.ts` | 49 | — |
| 32 | [ ] | `frontend/src/app/types/recordatorios.ts` | 35 | — |
| 33 | [ ] | `frontend/src/app/types/social.ts` | 221 | — |
| 34 | [ ] | `frontend/src/app/types/suscripcion.ts` | 148 | — |
| 35 | [ ] | `frontend/src/app/types/tarea.ts` | 239 | — |
| 36 | [ ] | `frontend/src/app/types/timeTracker.ts` | 73 | — |
| 37 | [ ] | `frontend/src/app/utils/almacenamientoPreferencias.ts` | 44 | — |
| 38 | [ ] | `frontend/src/app/utils/apiClient.ts` | 72 | — |
| 39 | [ ] | `frontend/src/app/utils/ayunoVentanas.ts` | 107 | — |
| 40 | [ ] | `frontend/src/app/utils/borradosPendientes.ts` | 92 | — |
| 41 | [ ] | `frontend/src/app/utils/calculoTMB.ts` | 97 | — |
| 42 | [ ] | `frontend/src/app/utils/ciclosDependencias.ts` | 64 | — |
| 43 | [ ] | `frontend/src/app/utils/constantes.ts` | 115 | — |
| 44 | [ ] | `frontend/src/app/utils/dashboardRuntime.ts` | 25 | — |
| 45 | [ ] | `frontend/src/app/utils/dependencias.ts` | 114 | — |
| 46 | [ ] | `frontend/src/app/utils/devLog.ts` | 16 | — |
| 47 | [ ] | `frontend/src/app/utils/duplicadosPanel.ts` | 150 | — |
| 48 | [ ] | `frontend/src/app/utils/errores.ts` | 18 | — |
| 49 | [ ] | `frontend/src/app/utils/eventBus.ts` | 32 | — |
| 50 | [ ] | `frontend/src/app/utils/eventosCambioTarea.ts` | 89 | — |
| 51 | [ ] | `frontend/src/app/utils/fecha.ts` | 129 | — |
| 52 | [ ] | `frontend/src/app/utils/fechaUI.ts` | 124 | — |
| 53 | [ ] | `frontend/src/app/utils/fechasRapidas.ts` | 83 | — |
| 54 | [ ] | `frontend/src/app/utils/formato.ts` | 8 | — |
| 55 | [ ] | `frontend/src/app/utils/frecuenciaHabitos.ts` | 140 | — |
| 56 | [ ] | `frontend/src/app/utils/frecuenciaRelevancia.ts` | 100 | — |
| 57 | [ ] | `frontend/src/app/utils/frecuenciaUI.ts` | 89 | — |
| 58 | [ ] | `frontend/src/app/utils/gruposEjecucion.ts` | 13 | — |
| 59 | [ ] | `frontend/src/app/utils/habitosLogica.ts` | 125 | — |
| 60 | [ ] | `frontend/src/app/utils/index.ts` | 25 | — |
| 61 | [ ] | `frontend/src/app/utils/jerarquiaTareas.ts` | 124 | — |
| 62 | [ ] | `frontend/src/app/utils/layoutFactory.ts` | 113 | — |
| 63 | [ ] | `frontend/src/app/utils/layoutLogica.ts` | 97 | — |
| 64 | [ ] | `frontend/src/app/utils/limpiezaSesion.ts` | 86 | — |
| 65 | [ ] | `frontend/src/app/utils/mapaCalorUtils.ts` | 139 | — |
| 66 | [ ] | `frontend/src/app/utils/mensajes.ts` | 80 | — |
| 67 | [ ] | `frontend/src/app/utils/mergeTarea.ts` | 141 | — |
| 68 | [ ] | `frontend/src/app/utils/migracionHabitos.ts` | 45 | — |
| 69 | [ ] | `frontend/src/app/utils/nivelesConfig.tsx` | 147 | — |
| 70 | [ ] | `frontend/src/app/utils/normalizarLayout.ts` | 32 | — |
| 71 | [ ] | `frontend/src/app/utils/notasUtils.ts` | 123 | — |
| 72 | [ ] | `frontend/src/app/utils/objetivosMacro.ts` | 69 | — |
| 73 | [ ] | `frontend/src/app/utils/opcionesMenuUsuario.tsx` | 153 | — |
| 74 | [ ] | `frontend/src/app/utils/posicionamientoTareas.ts` | 147 | — |
| 75 | [ ] | `frontend/src/app/utils/preferenciasUsuario.ts` | 142 | — |
| 76 | [ ] | `frontend/src/app/utils/registroActividadTarea.ts` | 42 | — |
| 77 | [ ] | `frontend/src/app/utils/relevanciaHistorial.ts` | 96 | — |
| 78 | [ ] | `frontend/src/app/utils/repeticionTareas.ts` | 59 | — |
| 79 | [ ] | `frontend/src/app/utils/resumen7Dias.ts` | 41 | — |
| 80 | [ ] | `frontend/src/app/utils/validadores.ts` | 63 | — |

## Hallazgos

<!-- Anotar aquí los hallazgos con formato H-MOD-NN. -->

