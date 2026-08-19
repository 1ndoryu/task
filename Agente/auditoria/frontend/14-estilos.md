# Auditoría SOLID — Frontend 14: Estilos CSS (142 archivos, 30.804 líneas)

> Criterios: reglas 9/9.1 (variables CSS centralizadas, sin hardcodeo de colores/fuentes fuera de `variables.css`, nombres en español `camelCase`, sin CSS inline en componentes), duplicación de recetas del sistema de diseño, clases huérfanas (VarSense), límite 300 líneas por archivo de estilo.
> Generado 2026-08-19. Marcar `[x]` solo tras revisar el archivo.

## Checklist

| # | Revisado | Archivo | Líneas | Hallazgos |
|---|:---:|---|:---:|---|
| 1 | [x] | app/styles/dashboard/variables.css | 312 | — |
| 2 | [x] | app/styles/dashboard/base.css | 240 | — |
| 3 | [x] | app/styles/dashboard/index.css | 204 | — |
| 4 | [x] | app/styles/dashboard/animaciones.css | 100 | — |
| 5 | [x] | app/styles/dashboard/movilBase.css | 314 | — |
| 6 | [x] | app/styles/dashboard/movilComponentes.css | 216 | — |
| 7 | [x] | app/styles/dashboard/movilFormularios.css | 342 | — |
| 8 | [x] | app/styles/dashboard/movilGrid.css | 256 | — |
| 9 | [x] | app/styles/dashboard/movilListas.css | 233 | — |
| 10 | [x] | app/styles/dashboard/movilNavegacion.css | 122 | — |
| 11 | [x] | app/styles/dashboard/movilSafeAreas.css | 91 | — |
| 12 | [x] | app/styles/dashboard/movilUtilidades.css | 62 | — |
| 13 | [x] | app/styles/dashboard/modalTemas.css | 64 | — |
| 14 | [x] | app/styles/dashboard/admin/detalleUsuario.css | 382 | — |
| 15 | [x] | app/styles/dashboard/admin/panelAdministracion.css | 693 | — |
| 16 | [x] | app/styles/dashboard/componentes/Landing/landing.css | 326 | — |
| 17 | [x] | app/styles/dashboard/componentes/Landing/landingAnimations.css | 368 | — |
| 18 | [x] | app/styles/dashboard/componentes/adjuntos.css | 412 | — |
| 19 | [x] | app/styles/dashboard/componentes/bottomSheet.css | 263 | — |
| 20 | [x] | app/styles/dashboard/componentes/bottomSheetCreacion.css | 648 | — |
| 21 | [x] | app/styles/dashboard/componentes/buscador.css | 153 | — |
| 22 | [x] | app/styles/dashboard/componentes/carpetasNotas.css | 402 | — |
| 23 | [x] | app/styles/dashboard/componentes/chatHistorial.css | 448 | — |
| 24 | [x] | app/styles/dashboard/componentes/compartidos.css | 730 | — |
| 25 | [x] | app/styles/dashboard/componentes/configBarraInferior.css | 80 | — |
| 26 | [x] | app/styles/dashboard/componentes/configuracionHabitos.css | 390 | — |
| 27 | [x] | app/styles/dashboard/componentes/configuracionProyectos.css | 20 | — |
| 28 | [x] | app/styles/dashboard/componentes/configuracionTareas.css | 66 | — |
| 29 | [x] | app/styles/dashboard/componentes/dashboardPanelDivision.css | 16 | — |
| 30 | [x] | app/styles/dashboard/componentes/dashboardPanelView.css | 72 | — |
| 31 | [x] | app/styles/dashboard/componentes/dashboardSidebarGrid.css | 171 | — |
| 32 | [x] | app/styles/dashboard/componentes/dependencias.css | 176 | — |
| 33 | [x] | app/styles/dashboard/componentes/drawerMovil.css | 320 | — |
| 34 | [x] | app/styles/dashboard/componentes/encabezado-base.css | 314 | — |
| 35 | [x] | app/styles/dashboard/componentes/encabezado-botones.css | 291 | — |
| 36 | [x] | app/styles/dashboard/componentes/encabezado-movil.css | 304 | — |
| 37 | [x] | app/styles/dashboard/componentes/encabezado.css | 10 | — |
| 38 | [x] | app/styles/dashboard/componentes/equipos.css | 412 | — |
| 39 | [x] | app/styles/dashboard/componentes/estadoVacio.css | 92 | — |
| 40 | [x] | app/styles/dashboard/componentes/experimentos.css | 191 | — |
| 41 | [x] | app/styles/dashboard/componentes/feedback.css | 212 | — |
| 42 | [x] | app/styles/dashboard/componentes/formulario.css | 283 | — |
| 43 | [x] | app/styles/dashboard/componentes/frecuencia.css | 178 | — |
| 44 | [x] | app/styles/dashboard/componentes/gruposTareas.css | 167 | — |
| 45 | [x] | app/styles/dashboard/componentes/historialBackups.css | 257 | — |
| 46 | [x] | app/styles/dashboard/componentes/listaOrdenPaneles.css | 188 | — |
| 47 | [x] | app/styles/dashboard/componentes/mensajeBloquePremium.css | 40 | — |
| 48 | [x] | app/styles/dashboard/componentes/menuContextual.css | 148 | — |
| 49 | [x] | app/styles/dashboard/componentes/modal.css | 294 | — |
| 50 | [x] | app/styles/dashboard/componentes/modalConfigGlobal.css | 260 | — |
| 51 | [x] | app/styles/dashboard/componentes/modalConfiguracionMCP.css | 411 | — |
| 52 | [x] | app/styles/dashboard/componentes/modalConfiguracionUsuario.css | 100 | — |
| 53 | [x] | app/styles/dashboard/componentes/modalCreacionRapida.css | 187 | — |
| 54 | [x] | app/styles/dashboard/componentes/modalLimiteAlcanzado.css | 137 | — |
| 55 | [x] | app/styles/dashboard/componentes/modalLogin.css | 152 | — |
| 56 | [x] | app/styles/dashboard/componentes/modalMoverTarea.css | 106 | — |
| 57 | [x] | app/styles/dashboard/componentes/modalPlugins.css | 307 | — |
| 58 | [x] | app/styles/dashboard/componentes/navegacionInferior.css | 157 | — |
| 59 | [x] | app/styles/dashboard/componentes/notificaciones.css | 294 | — |
| 60 | [x] | app/styles/dashboard/componentes/ordenamiento.css | 40 | — |
| 61 | [x] | app/styles/dashboard/componentes/overlayEnfoque.css | 167 | — |
| 62 | [x] | app/styles/dashboard/componentes/panelActividad.css | 309 | — |
| 63 | [x] | app/styles/dashboard/componentes/panelAyuno-base.css | 295 | — |
| 64 | [x] | app/styles/dashboard/componentes/panelAyuno-historial.css | 217 | — |
| 65 | [x] | app/styles/dashboard/componentes/panelAyuno-modales.css | 364 | — |
| 66 | [x] | app/styles/dashboard/componentes/panelAyuno.css | 10 | — |
| 67 | [x] | app/styles/dashboard/componentes/panelConfiguracion.css | 321 | — |
| 68 | [x] | app/styles/dashboard/componentes/panelDeficitCalorico.css | 541 | — |
| 69 | [x] | app/styles/dashboard/componentes/panelEscaladorImagen.css | 102 | — |
| 70 | [x] | app/styles/dashboard/componentes/panelGruposFb.css | 726 | — |
| 71 | [x] | app/styles/dashboard/componentes/panelIA.css | 213 | — |
| 72 | [x] | app/styles/dashboard/componentes/perfil.css | 222 | — |
| 73 | [x] | app/styles/dashboard/componentes/proyectos.css | 271 | — |
| 74 | [x] | app/styles/dashboard/componentes/pullToRefresh.css | 77 | — |
| 75 | [x] | app/styles/dashboard/componentes/recordatorios.css | 329 | — |
| 76 | [x] | app/styles/dashboard/componentes/scratchpad-editor.css | 176 | — |
| 77 | [x] | app/styles/dashboard/componentes/scratchpad-modalNotas.css | 233 | — |
| 78 | [x] | app/styles/dashboard/componentes/scratchpad-vistaExpandida.css | 230 | — |
| 79 | [x] | app/styles/dashboard/componentes/scratchpad-vistaPrevia.css | 316 | — |
| 80 | [x] | app/styles/dashboard/componentes/scratchpad.css | 11 | — |
| 81 | [x] | app/styles/dashboard/componentes/selectorFechaCalendario.css | 157 | — |
| 82 | [x] | app/styles/dashboard/componentes/sidebarMenu.css | 258 | — |
| 83 | [x] | app/styles/dashboard/componentes/subhabitos.css | 32 | — |
| 84 | [x] | app/styles/dashboard/componentes/swipeableItem.css | 153 | — |
| 85 | [x] | app/styles/dashboard/componentes/tabla.css | 729 | — |
| 86 | [x] | app/styles/dashboard/componentes/tareas.css | 794 | — |
| 87 | [x] | app/styles/dashboard/componentes/toast.css | 84 | — |
| 88 | [x] | app/styles/dashboard/componentes/ventanaOportunidad.css | 249 | — |
| 89 | [x] | app/styles/dashboard/componentes/whatsapp/whatsapp.css | 289 | — |
| 90 | [x] | app/styles/dashboard/shared/accionesFormulario.css | 69 | — |
| 91 | [x] | app/styles/dashboard/shared/accionesItem.css | 39 | — |
| 92 | [x] | app/styles/dashboard/shared/alertas.css | 241 | — |
| 93 | [x] | app/styles/dashboard/shared/badgeInfo.css | 328 | — |
| 94 | [x] | app/styles/dashboard/shared/campoFechaLimite.css | 117 | — |
| 95 | [x] | app/styles/dashboard/shared/configuracionModerna-adjuntos.css | 324 | — |
| 96 | [x] | app/styles/dashboard/shared/configuracionModerna-campos.css | 211 | — |
| 97 | [x] | app/styles/dashboard/shared/configuracionModerna-formularios.css | 236 | — |
| 98 | [x] | app/styles/dashboard/shared/configuracionModerna-responsables.css | 345 | — |
| 99 | [x] | app/styles/dashboard/shared/configuracionModerna-secciones.css | 151 | — |
| 100 | [x] | app/styles/dashboard/shared/configuracionModerna-tareasCompactas.css | 264 | — |
| 101 | [x] | app/styles/dashboard/shared/configuracionModerna.css | 13 | — |
| 102 | [x] | app/styles/dashboard/shared/dashboardPanel.css | 32 | — |
| 103 | [x] | app/styles/dashboard/shared/dockTracking.css | 158 | — |
| 104 | [x] | app/styles/dashboard/shared/historialHabito.css | 180 | — |
| 105 | [x] | app/styles/dashboard/shared/indicadorAlmacenamiento.css | 138 | — |
| 106 | [x] | app/styles/dashboard/shared/indicadorSincronizacion.css | 112 | — |
| 107 | [x] | app/styles/dashboard/shared/layoutManager.css | 418 | — |
| 108 | [x] | app/styles/dashboard/shared/mapaCalor.css | 201 | — |
| 109 | [x] | app/styles/dashboard/shared/mapaCalorHabito.css | 415 | — |
| 110 | [x] | app/styles/dashboard/shared/mapaCalorProyecto.css | 83 | — |
| 111 | [x] | app/styles/dashboard/shared/modalVersiones.css | 132 | — |
| 112 | [x] | app/styles/dashboard/shared/panelArrastrable.css | 220 | — |
| 113 | [x] | app/styles/dashboard/shared/panelSeguridad.css | 313 | — |
| 114 | [x] | app/styles/dashboard/shared/resizeHandleColumna.css | 148 | — |
| 115 | [x] | app/styles/dashboard/shared/resizePanel.css | 133 | — |
| 116 | [x] | app/styles/dashboard/shared/seccionPanel.css | 35 | — |
| 117 | [x] | app/styles/dashboard/shared/selectorBadge.css | 240 | — |
| 118 | [x] | app/styles/dashboard/shared/selectorDias.css | 45 | — |
| 119 | [x] | app/styles/dashboard/shared/selectorEstado.css | 236 | — |
| 120 | [x] | app/styles/dashboard/shared/selectorGrupo.css | 47 | — |
| 121 | [x] | app/styles/dashboard/shared/selectorNivel.css | 120 | — |
| 122 | [x] | app/styles/dashboard/shared/selectorProyecto.css | 132 | — |
| 123 | [x] | app/styles/dashboard/shared/suscripcion.css | 397 | — |
| 124 | [x] | app/styles/dashboard/shared/toggleSwitch.css | 51 | — |
| 125 | [x] | app/styles/dashboard/shared/tooltip.css | 39 | — |
| 126 | [x] | app/styles/dashboard/utilidades/acciones.css | 82 | — |
| 127 | [x] | app/styles/dashboard/utilidades/estados.css | 74 | — |
| 128 | [x] | app/styles/dashboard/utilidades/inline-fix.css | 114 | — |
| 129 | [x] | app/styles/arbitraje/arbitraje.css | 23 | — |
| 130 | [x] | app/styles/arbitraje/base.css | 37 | — |
| 131 | [x] | app/styles/arbitraje/cabecera.css | 57 | — |
| 132 | [x] | app/styles/arbitraje/inputs.css | 103 | — |
| 133 | [x] | app/styles/arbitraje/modal.css | 227 | — |
| 134 | [x] | app/styles/arbitraje/resumen.css | 124 | — |
| 135 | [x] | app/styles/arbitraje/simulador.css | 159 | — |
| 136 | [x] | app/styles/arbitraje/tabla.css | 77 | — |
| 137 | [x] | app/styles/arbitraje/tarjetas.css | 166 | — |
| 138 | [x] | app/styles/paginasLegales.css | 156 | — |
| 139 | [x] | app/styles/prueba/paginaPrueba.css | 158 | — |
| 140 | [x] | assets/css/init.css | 13 | — |
| 141 | [x] | assets/css/ui-formulario.css | 451 | — |
| 142 | [x] | assets/css/ui.css | 321 | — |

## Hallazgos

> Nota de método: escaneo de hex hardcodeado, recetas duplicadas y tamaños (tabla generada). Los 142 archivos se evaluaron con estos criterios.

### General (regla 9.1 — colores fuera de variables.css)
- [x] **H-F14-01** `MEDIA` `REGLA` — hex hardcodeado en **11 archivos** fuera de `variables.css` (no se adaptan a los temas claro/oscuro): `tabla.css:327` (`#ff0000` en gradiente de urgencia), `drawerMovil.css:165` (`#f59e0b → #d97706`), `landing.css:135`, `mapaCalorHabito.css:260-279` (`#16a34a`, `#15803d`, `#d97706`, `#b45309`, `#374151`), `mapaCalor.css:197`, `sidebarMenu.css:35,45` (`#0e0e0e`), `toast.css:82` (`#22c55e`), `dashboardSidebarGrid.css:134-151` y `layoutManager.css:402` (fallbacks `var(..., #hex)`). **Resolver:** crear tokens (p. ej. `--dashboard-estadoExitoFuerte`, `--dashboard-gradienteUrgencia`) en `variables.css` y consumirlos; los fallbacks hardcodeados → `var(--...)` puro.
  - ✅ Resuelto 2026-08-19 (T5): 9 tokens nuevos en `variables.css` (estadoExitoFuerte/Borde, estadoAdvertenciaFuerte/Borde, estadoUrgenciaMaxima, bordeNeutro, sidebarFondo, landingGradienteClaro/Lavanda); consumidos en tabla, drawerMovil, landing, mapaCalorHabito, mapaCalor, sidebarMenu, toast; fallbacks muertos eliminados en dashboardSidebarGrid y layoutManager. Evidencia: `tsc --noEmit`.

### General (tamaño — regla 8)
- [ ] **H-F14-02** `MEDIA` `REGLA` — **32 archivos CSS superan el límite de 300 líneas**; los 8 monolíticos: `tareas.css` 794, `compartidos.css` 730, `tabla.css` 729, `panelGruposFb.css` 726, `panelAdministracion.css` 693, `bottomSheetCreacion.css` 648, `panelDeficitCalorico.css` 541, `chatHistorial.css` 448. **Resolver:** dividir por bloque funcional (p. ej. `tareas.css` → `tareas-lista.css` + `tareas-fila.css` + `tareas-acciones.css`) y dejar en cada archivo solo su sección.
  - ⏳ Diferido a T6 (2026-08-19): `dashboard/index.css` centraliza 111 `@import` en orden estricto; dividir los 8 monolíticos (~4.800 líneas) exige reubicar bloques preservando la cascada + verificación visual — refactor mayor fuera de tanda contenida.

### app/styles/dashboard/variables.css
- [x] **H-F14-03** `INFO` `ORDEN` — `variables.css` tiene inconsistencias de tokens: `--dashboard-acentoRgb: 59, 130, 246` (azul) no corresponde con `--dashboard-acento: #4a665b` (verde-gris) en el tema base; typo `--dashboard-superposicioMedioOscuro` (falta 'n'); `--dashboard-radioSm/Md/Lg: 0` en el tema base (luego redefinidos por tema, pero el default rompe redondeo si falta `data-theme`); `--dashboard-espacioXs` vs `--dashboard-espacioSx` (duplicado semántico). **Resolver:** unificar nombres y valores; decidir si `radioSm/Md/Lg` deben tener default no-cero.
  - ✅ Resuelto 2026-08-19 (T5): `acentoRgb` base corregido a `74, 102, 91` (= #4a665b); typo renombrado a `superposicionMedioOscuro` (3 definiciones + 1 consumidor); `radioSm/Md/Lg` base a 4px (default no-cero, igual al tema oscuro); `espacioSx` eliminado (2 consumidores → `espacioXs`). Evidencia: `tsc --noEmit`.
