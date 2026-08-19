# Auditoría SOLID — Frontend 13: Componentes (264 archivos, 26.936 líneas)

> Criterios: SOLID (SRP, ≤3 useState, lógica >5 líneas a hook), límite 300 líneas (regla 8 — los que exceden se marcan `ALTA`), UI atómica (elemento reutilizable = componente), sin CSS inline ni especificaciones de diseño en componentes (regla 9.1), responsive (regla 15), errores visibles (toast, ok:false), orden.
> Generado 2026-08-19. Marcar `[x]` solo tras leer el archivo completo.

## Checklist

| # | Revisado | Archivo | Líneas | Hallazgos |
|---|:---:|---|:---:|---|
| 1 | [x] | app/components/admin/DetalleUsuario.tsx | 213 | — |
| 2 | [x] | app/components/admin/FilaUsuario.tsx | 118 | — |
| 3 | [x] | app/components/admin/FiltrosUsuarios.tsx | 82 | — |
| 4 | [x] | app/components/admin/ListaFeedbackAdmin.tsx | 138 | — |
| 5 | [x] | app/components/admin/ListaUsuarios.tsx | 95 | — |
| 6 | [x] | app/components/admin/PanelAdministracion.tsx | 63 | — |
| 7 | [x] | app/components/admin/ResumenAdmin.tsx | 63 | — |
| 8 | [x] | app/components/admin/index.ts | 11 | — |
| 9 | [x] | app/components/arbitraje/CabeceraArbitraje.tsx | 34 | — |
| 10 | [x] | app/components/arbitraje/ModalDetalleRuta.tsx | 121 | — |
| 11 | [x] | app/components/arbitraje/PanelInputs/SeccionCostos.tsx | 43 | — |
| 12 | [x] | app/components/arbitraje/PanelInputs/SeccionTasas.tsx | 66 | — |
| 13 | [x] | app/components/arbitraje/PanelInputs/SeccionVenta.tsx | 31 | — |
| 14 | [x] | app/components/arbitraje/PanelInputs/index.tsx | 19 | — |
| 15 | [x] | app/components/arbitraje/ResumenRapido.tsx | 55 | — |
| 16 | [x] | app/components/arbitraje/SimuladorCiclos.tsx | 68 | — |
| 17 | [x] | app/components/arbitraje/TablaComparacion.tsx | 50 | — |
| 18 | [x] | app/components/arbitraje/TarjetaEscenario.tsx | 50 | — |
| 19 | [x] | app/components/arbitraje/hooks/useArbitraje.ts | 323 | — |
| 20 | [x] | app/components/arbitraje/index.ts | 22 | — |
| 21 | [x] | app/components/arbitraje/types/arbitraje.types.ts | 124 | — |
| 22 | [x] | app/components/arbitraje/utils/arbitraje.utils.ts | 36 | — |
| 23 | [x] | app/components/compartidos/ListaParticipantes.tsx | 111 | — |
| 24 | [x] | app/components/compartidos/ModalCompartir.tsx | 106 | — |
| 25 | [x] | app/components/compartidos/SelectorAsignado.tsx | 104 | — |
| 26 | [x] | app/components/compartidos/SelectorCompaneros.tsx | 63 | — |
| 27 | [x] | app/components/compartidos/index.ts | 8 | — |
| 28 | [x] | app/components/configuracion/ConfigBarraInferior.tsx | 69 | — |
| 29 | [x] | app/components/configuracion/ConfiguracionMCPCopiable.tsx | 76 | — |
| 30 | [x] | app/components/configuracion/InstruccionesClienteMCP.tsx | 69 | — |
| 31 | [x] | app/components/configuracion/ModalConfiguracionGlobal.tsx | 211 | — |
| 32 | [x] | app/components/configuracion/ModalConfiguracionMCP.tsx | 99 | — |
| 33 | [x] | app/components/configuracion/ModalConfiguracionUsuario.tsx | 62 | — |
| 34 | [x] | app/components/configuracion/SeccionTokenMCP.tsx | 103 | — |
| 35 | [x] | app/components/configuracion/global/SeccionConfigGruposFb.tsx | 112 | — |
| 36 | [x] | app/components/configuracion/global/SeccionConfigPlugins.tsx | 129 | — |
| 37 | [x] | app/components/configuracion/global/SeccionesConfigGeneral.tsx | 328 | — |
| 38 | [x] | app/components/configuracion/global/SeccionesConfigPaneles.tsx | 335 | — |
| 39 | [x] | app/components/configuracion/index.ts | 11 | — |
| 40 | [x] | app/components/dashboard/AccionesDatos.tsx | 54 | — |
| 41 | [x] | app/components/dashboard/BottomSheetHabito.tsx | 95 | — |
| 42 | [x] | app/components/dashboard/BottomSheetProyecto.tsx | 94 | — |
| 43 | [x] | app/components/dashboard/BottomSheetTarea.tsx | 128 | — |
| 44 | [x] | app/components/dashboard/BuscadorGlobal.tsx | 81 | — |
| 45 | [x] | app/components/dashboard/ConfigDeficitCalorico.tsx | 100 | — |
| 46 | [x] | app/components/dashboard/DashboardEncabezado.tsx | 180 | — |
| 47 | [x] | app/components/dashboard/DashboardGrid.tsx | 214 | — |
| 48 | [x] | app/components/dashboard/DashboardModales.tsx | 46 | — |
| 49 | [x] | app/components/dashboard/DashboardPanelView.tsx | 85 | — |
| 50 | [x] | app/components/dashboard/DashboardSidebarGrid.tsx | 298 | — |
| 51 | [x] | app/components/dashboard/FormularioHabito.tsx | 97 | — |
| 52 | [x] | app/components/dashboard/InputNuevaTarea.tsx | 138 | — |
| 53 | [x] | app/components/dashboard/ListaOrdenPaneles.tsx | 123 | — |
| 54 | [x] | app/components/dashboard/ListaTareas.tsx | 309 | — |
| 55 | [x] | app/components/dashboard/ModalConfigDeficitCalorico.tsx | 25 | — |
| 56 | [x] | app/components/dashboard/ModalConfiguracionActividad.tsx | 79 | — |
| 57 | [x] | app/components/dashboard/ModalConfiguracionHabitos.tsx | 192 | — |
| 58 | [x] | app/components/dashboard/ModalConfiguracionLayout.tsx | 150 | — |
| 59 | [x] | app/components/dashboard/ModalConfiguracionRecordatorios.tsx | 79 | — |
| 60 | [x] | app/components/dashboard/ModalConfiguracionScratchpad.tsx | 46 | — |
| 61 | [x] | app/components/dashboard/ModalConfiguracionTareas.tsx | 137 | — |
| 62 | [x] | app/components/dashboard/ModalCreacionRapida.tsx | 93 | — |
| 63 | [x] | app/components/dashboard/ModalCrearRecordatorio.tsx | 175 | — |
| 64 | [x] | app/components/dashboard/ModalDependencias.tsx | 183 | — |
| 65 | [x] | app/components/dashboard/ModalGestionPaneles.tsx | 125 | — |
| 66 | [x] | app/components/dashboard/ModalHabito.tsx | 225 | — |
| 67 | [x] | app/components/dashboard/ModalHistorialBackups.tsx | 81 | — |
| 68 | [x] | app/components/dashboard/ModalLogin.tsx | 143 | — |
| 69 | [x] | app/components/dashboard/ModalMoverTarea.tsx | 55 | — |
| 70 | [x] | app/components/dashboard/ModalNotasGuardadas.tsx | 120 | — |
| 71 | [x] | app/components/dashboard/ModalPerfil.tsx | 89 | — |
| 72 | [x] | app/components/dashboard/ModalPlugins.tsx | 165 | — |
| 73 | [x] | app/components/dashboard/ModalRecordatoriosGuardados.tsx | 93 | — |
| 74 | [x] | app/components/dashboard/PanelChatHistorial.tsx | 221 | — |
| 75 | [x] | app/components/dashboard/PanelConfiguracionTarea.tsx | 177 | — |
| 76 | [x] | app/components/dashboard/PanelSeguridad.tsx | 127 | — |
| 77 | [x] | app/components/dashboard/Scratchpad.tsx | 95 | — |
| 78 | [x] | app/components/dashboard/SeccionAdjuntos.tsx | 193 | — |
| 79 | [x] | app/components/dashboard/SeccionEncabezado.tsx | 30 | — |
| 80 | [x] | app/components/dashboard/SelectorFrecuencia.tsx | 162 | — |
| 81 | [x] | app/components/dashboard/SelectorOrden.tsx | 26 | — |
| 82 | [x] | app/components/dashboard/SidebarMenu.tsx | 167 | — |
| 83 | [x] | app/components/dashboard/TablaHabitos.tsx | 470 | — |
| 84 | [x] | app/components/dashboard/TareaItem.tsx | 216 | — |
| 85 | [x] | app/components/dashboard/adjuntos/AdjuntoItemClasico.tsx | 87 | — |
| 86 | [x] | app/components/dashboard/adjuntos/AdjuntoItemModerno.tsx | 70 | — |
| 87 | [x] | app/components/dashboard/adjuntos/AdjuntoOverlay.tsx | 27 | — |
| 88 | [x] | app/components/dashboard/creacion-rapida/MenusCreacionRapida.tsx | 157 | — |
| 89 | [x] | app/components/dashboard/creacion-rapida/OpcionesCreacionRapida.tsx | 69 | — |
| 90 | [x] | app/components/dashboard/encabezado/EncabezadoAcciones.tsx | 109 | — |
| 91 | [x] | app/components/dashboard/encabezado/EncabezadoBuscador.tsx | 61 | — |
| 92 | [x] | app/components/dashboard/encabezado/EncabezadoBuscadorMovilTrigger.tsx | 34 | — |
| 93 | [x] | app/components/dashboard/encabezado/EncabezadoEstado.tsx | 65 | — |
| 94 | [x] | app/components/dashboard/encabezado/EncabezadoMovil.tsx | 168 | — |
| 95 | [x] | app/components/dashboard/encabezado/EncabezadoPerfil.tsx | 111 | — |
| 96 | [x] | app/components/dashboard/encabezado/EncabezadoTitulo.tsx | 22 | — |
| 97 | [x] | app/components/dashboard/habitos/FormularioHabitoModerno.tsx | 238 | — |
| 98 | [x] | app/components/dashboard/habitos/ListaSubHabitos.tsx | 254 | — |
| 99 | [x] | app/components/dashboard/habitos/ListaTareasHabito.tsx | 235 | — |
| 100 | [x] | app/components/dashboard/habitos/index.ts | 7 | — |
| 101 | [x] | app/components/dashboard/index.ts | 34 | — |
| 102 | [x] | app/components/dashboard/lista-tareas/GrupoTareasHeader.tsx | 85 | — |
| 103 | [x] | app/components/dashboard/lista-tareas/MenuAccionesMasivas.tsx | 144 | — |
| 104 | [x] | app/components/dashboard/lista-tareas/TareaConColapsador.tsx | 197 | — |
| 105 | [x] | app/components/dashboard/lista-tareas/TareaReorderItem.tsx | 75 | — |
| 106 | [x] | app/components/dashboard/modales/ModalCreacionRapidaWrapper.tsx | 30 | — |
| 107 | [x] | app/components/dashboard/modales/ModalesAutenticacion.tsx | 41 | — |
| 108 | [x] | app/components/dashboard/modales/ModalesAuxiliares.tsx | 65 | — |
| 109 | [x] | app/components/dashboard/modales/ModalesCompartir.tsx | 37 | — |
| 110 | [x] | app/components/dashboard/modales/ModalesConfiguracion.tsx | 58 | — |
| 111 | [x] | app/components/dashboard/modales/ModalesHabitos.tsx | 92 | — |
| 112 | [x] | app/components/dashboard/modales/ModalesProyectos.tsx | 48 | — |
| 113 | [x] | app/components/dashboard/modales/ModalesTareas.tsx | 97 | — |
| 114 | [x] | app/components/dashboard/modales/index.ts | 13 | — |
| 115 | [x] | app/components/dashboard/notas/ListaNotasGuardadas.tsx | 65 | — |
| 116 | [x] | app/components/dashboard/notas/ModalNotasExpandido.tsx | 151 | — |
| 117 | [x] | app/components/dashboard/notas/NavegadorCarpetas.tsx | 97 | — |
| 118 | [x] | app/components/dashboard/notas/NotaItem.tsx | 120 | — |
| 119 | [x] | app/components/dashboard/proyectos/FormularioProyecto.tsx | 55 | — |
| 120 | [x] | app/components/dashboard/proyectos/FormularioProyectoModerno.tsx | 99 | — |
| 121 | [x] | app/components/dashboard/proyectos/ListaHitos.tsx | 140 | — |
| 122 | [x] | app/components/dashboard/proyectos/ListaProyectos.tsx | 246 | — |
| 123 | [x] | app/components/dashboard/proyectos/ListaTareasCompacta.tsx | 140 | — |
| 124 | [x] | app/components/dashboard/proyectos/ModalConfiguracionProyectos.tsx | 68 | — |
| 125 | [x] | app/components/dashboard/proyectos/ModalProyecto.tsx | 165 | — |
| 126 | [x] | app/components/dashboard/proyectos/index.ts | 7 | — |
| 127 | [x] | app/components/dashboard/tarea-item/TareaBadges.tsx | 200 | — |
| 128 | [x] | app/components/dashboard/tarea-item/types.ts | 65 | — |
| 129 | [x] | app/components/dashboard/tarea-item/useTareaEdicion.ts | 109 | — |
| 130 | [x] | app/components/dashboard/tarea-item/useTareaMenu.tsx | 343 | — |
| 131 | [x] | app/components/dashboard/tareas/FormularioTareaModerno.tsx | 218 | — |
| 132 | [x] | app/components/dashboard/tareas/ListaSubtareas.tsx | 220 | — |
| 133 | [x] | app/components/dashboard/tareas/index.ts | 5 | — |
| 134 | [x] | app/components/editor/EditorJs.tsx | 35 | — |
| 135 | [x] | app/components/equipos/FormularioSolicitud.tsx | 57 | — |
| 136 | [x] | app/components/equipos/ListaCompaneros.tsx | 54 | — |
| 137 | [x] | app/components/equipos/ListaSolicitudes.tsx | 87 | — |
| 138 | [x] | app/components/equipos/ModalEquipos.tsx | 85 | — |
| 139 | [x] | app/components/equipos/index.ts | 8 | — |
| 140 | [x] | app/components/experimentos/ModalExperimentos.tsx | 80 | — |
| 141 | [x] | app/components/landing/Landing.tsx | 90 | — |
| 142 | [x] | app/components/landing/LandingHabitAnimation.tsx | 20 | — |
| 143 | [x] | app/components/landing/LandingProjectsAnimation.tsx | 41 | — |
| 144 | [x] | app/components/landing/LandingSortingAnimation.tsx | 42 | — |
| 145 | [x] | app/components/notificaciones/ItemNotificacion.tsx | 107 | — |
| 146 | [x] | app/components/notificaciones/ModalNotificaciones.tsx | 51 | — |
| 147 | [x] | app/components/notificaciones/index.ts | 6 | — |
| 148 | [x] | app/components/paneles/EditorCategorias.tsx | 144 | — |
| 149 | [x] | app/components/paneles/FilaGrupo.tsx | 180 | — |
| 150 | [x] | app/components/paneles/PanelActividad.tsx | 203 | — |
| 151 | [x] | app/components/paneles/PanelAyuno.tsx | 243 | — |
| 152 | [x] | app/components/paneles/PanelDeficitCalorico.tsx | 228 | — |
| 153 | [x] | app/components/paneles/PanelEjecucion.tsx | 185 | — |
| 154 | [x] | app/components/paneles/PanelEscaladorImagen.tsx | 130 | — |
| 155 | [x] | app/components/paneles/PanelFocoPrioritario.tsx | 70 | — |
| 156 | [x] | app/components/paneles/PanelGruposFb.tsx | 377 | — |
| 157 | [x] | app/components/paneles/PanelIA.tsx | 179 | — |
| 158 | [x] | app/components/paneles/PanelProyectos.tsx | 87 | — |
| 159 | [x] | app/components/paneles/PanelRecordatorios.tsx | 157 | — |
| 160 | [x] | app/components/paneles/PanelScratchpad.tsx | 160 | — |
| 161 | [x] | app/components/paneles/SelectorEntornos.tsx | 125 | — |
| 162 | [x] | app/components/paneles/ThOrdenable.tsx | 28 | — |
| 163 | [x] | app/components/paneles/ayuno/HistorialAyuno.tsx | 116 | — |
| 164 | [x] | app/components/paneles/ayuno/ModalFinalizarAyuno.tsx | 173 | — |
| 165 | [x] | app/components/paneles/ayuno/ModalUltimaComida.tsx | 53 | — |
| 166 | [x] | app/components/paneles/ayuno/SelectorHoraAyuno.tsx | 55 | — |
| 167 | [x] | app/components/paneles/ayuno/SelectorRelojCircular.tsx | 113 | — |
| 168 | [x] | app/components/paneles/deficitCalorico/HistorialCalorias.tsx | 143 | — |
| 169 | [x] | app/components/paneles/deficitCalorico/ModalInspeccionIA.tsx | 54 | — |
| 170 | [x] | app/components/paneles/index.ts | 12 | — |
| 171 | [x] | app/components/shared/AccionesFormulario.tsx | 65 | — |
| 172 | [x] | app/components/shared/AccionesItem.tsx | 75 | — |
| 173 | [x] | app/components/shared/AccionesPanelResponsivas.tsx | 100 | — |
| 174 | [x] | app/components/shared/AlertaConfirmacion.tsx | 91 | — |
| 175 | [x] | app/components/shared/AlertaToast.tsx | 39 | — |
| 176 | [x] | app/components/shared/BadgeInfo.tsx | 76 | — |
| 177 | [x] | app/components/shared/BadgesPropiedad.tsx | 40 | — |
| 178 | [x] | app/components/shared/BarraPanelesOcultos.tsx | 99 | — |
| 179 | [x] | app/components/shared/BotonEnfocar.tsx | 22 | — |
| 180 | [x] | app/components/shared/BotonMinimizarPanel.tsx | 24 | — |
| 181 | [x] | app/components/shared/BotonOpcionCompacta.tsx | 88 | — |
| 182 | [x] | app/components/shared/BottomSheet.tsx | 188 | — |
| 183 | [x] | app/components/shared/CampoFechaLimite.tsx | 74 | — |
| 184 | [x] | app/components/shared/CampoPrioridad.tsx | 42 | — |
| 185 | [x] | app/components/shared/CampoSubtituloLimpio.tsx | 50 | — |
| 186 | [x] | app/components/shared/CampoTexto.tsx | 35 | — |
| 187 | [x] | app/components/shared/CampoTituloLimpio.tsx | 69 | — |
| 188 | [x] | app/components/shared/CampoUrgencia.tsx | 41 | — |
| 189 | [x] | app/components/shared/ContenedorAlertas.tsx | 25 | — |
| 190 | [x] | app/components/shared/DashboardPanel.tsx | 34 | — |
| 191 | [x] | app/components/shared/DockTracking.tsx | 86 | — |
| 192 | [x] | app/components/shared/DrawerMovil.tsx | 119 | — |
| 193 | [x] | app/components/shared/EstadoVacio.tsx | 45 | — |
| 194 | [x] | app/components/shared/FilaPropiedades.tsx | 23 | — |
| 195 | [x] | app/components/shared/HandleArrastre.tsx | 44 | — |
| 196 | [x] | app/components/shared/HistorialHabito.tsx | 269 | — |
| 197 | [x] | app/components/shared/IndicadorAlmacenamiento.tsx | 71 | — |
| 198 | [x] | app/components/shared/IndicadorArrastre.tsx | 84 | — |
| 199 | [x] | app/components/shared/IndicadorConexion.tsx | 155 | — |
| 200 | [x] | app/components/shared/IndicadorPlan.tsx | 59 | — |
| 201 | [x] | app/components/shared/IndicadorSincronizacion.tsx | 73 | — |
| 202 | [x] | app/components/shared/LayoutManager.tsx | 60 | — |
| 203 | [x] | app/components/shared/MapaCalor.tsx | 164 | — |
| 204 | [x] | app/components/shared/MapaCalorHabito.tsx | 203 | — |
| 205 | [x] | app/components/shared/MapaCalorProyecto.tsx | 89 | — |
| 206 | [x] | app/components/shared/MensajeBloquePremium.tsx | 38 | — |
| 207 | [x] | app/components/shared/MenuContextual.tsx | 65 | — |
| 208 | [x] | app/components/shared/MenuContextualAdaptivo.tsx | 54 | — |
| 209 | [x] | app/components/shared/MenuFlotante.tsx | 37 | — |
| 210 | [x] | app/components/shared/MenuOpcionesPanel.tsx | 175 | — |
| 211 | [x] | app/components/shared/Modal.tsx | 68 | — |
| 212 | [x] | app/components/shared/ModalFeedback.tsx | 104 | — |
| 213 | [x] | app/components/shared/ModalLimiteAlcanzado.tsx | 98 | — |
| 214 | [x] | app/components/shared/ModalSeleccionPropiedad.tsx | 77 | — |
| 215 | [x] | app/components/shared/ModalTemas.tsx | 47 | — |
| 216 | [x] | app/components/shared/ModalUpgrade.tsx | 194 | — |
| 217 | [x] | app/components/shared/ModalVersiones.tsx | 80 | — |
| 218 | [x] | app/components/shared/NavegacionInferior.tsx | 103 | — |
| 219 | [x] | app/components/shared/OverlayEnfoque.tsx | 49 | — |
| 220 | [x] | app/components/shared/PanelArrastrable.tsx | 29 | — |
| 221 | [x] | app/components/shared/PestanasModal.tsx | 68 | — |
| 222 | [x] | app/components/shared/PropiedadesCompactas.tsx | 137 | — |
| 223 | [x] | app/components/shared/PullToRefresh.tsx | 74 | — |
| 224 | [x] | app/components/shared/ResizeHandleColumn.tsx | 31 | — |
| 225 | [x] | app/components/shared/ResizeHandlePanel.tsx | 34 | — |
| 226 | [x] | app/components/shared/ResumenTareasProyecto.tsx | 59 | — |
| 227 | [x] | app/components/shared/RevealElement.tsx | 52 | — |
| 228 | [x] | app/components/shared/SeccionPanel.tsx | 25 | — |
| 229 | [x] | app/components/shared/SeccionResponsables.tsx | 239 | — |
| 230 | [x] | app/components/shared/SelectorBadge.tsx | 68 | — |
| 231 | [x] | app/components/shared/SelectorDias.tsx | 52 | — |
| 232 | [x] | app/components/shared/SelectorEstadoHabito.tsx | 81 | — |
| 233 | [x] | app/components/shared/SelectorEstadoHabitoPill.tsx | 83 | — |
| 234 | [x] | app/components/shared/SelectorEstadoPill.tsx | 69 | — |
| 235 | [x] | app/components/shared/SelectorEstadoProyectoPill.tsx | 84 | — |
| 236 | [x] | app/components/shared/SelectorEstadoTarea.tsx | 67 | — |
| 237 | [x] | app/components/shared/SelectorFechaCalendario.tsx | 87 | — |
| 238 | [x] | app/components/shared/SelectorFrecuenciaPill.tsx | 102 | — |
| 239 | [x] | app/components/shared/SelectorGrupo.tsx | 198 | — |
| 240 | [x] | app/components/shared/SelectorIconoProyecto.tsx | 157 | — |
| 241 | [x] | app/components/shared/SelectorImportanciaPill.tsx | 63 | — |
| 242 | [x] | app/components/shared/SelectorNivel.tsx | 47 | — |
| 243 | [x] | app/components/shared/SelectorProyecto.tsx | 76 | — |
| 244 | [x] | app/components/shared/SelectorProyectoPill.tsx | 79 | — |
| 245 | [x] | app/components/shared/SelectorRepeticionPill.tsx | 109 | — |
| 246 | [x] | app/components/shared/SelectorTags.tsx | 63 | — |
| 247 | [x] | app/components/shared/SelectorVentanaOportunidad.tsx | 159 | — |
| 248 | [x] | app/components/shared/SwipeableItem.tsx | 65 | — |
| 249 | [x] | app/components/shared/ToastDeshacer.tsx | 40 | — |
| 250 | [x] | app/components/shared/ToggleSwitch.tsx | 22 | — |
| 251 | [x] | app/components/shared/TooltipSystem.tsx | 198 | — |
| 252 | [x] | app/components/shared/index.ts | 87 | — |
| 253 | [x] | app/components/ui/Boton.tsx | 80 | — |
| 254 | [x] | app/components/ui/Checkbox.tsx | 38 | — |
| 255 | [x] | app/components/ui/Input.tsx | 94 | — |
| 256 | [x] | app/components/ui/Radio.tsx | 55 | — |
| 257 | [x] | app/components/ui/Select.tsx | 57 | — |
| 258 | [x] | app/components/ui/Textarea.tsx | 72 | — |
| 259 | [x] | app/components/ui/index.ts | 10 | — |
| 260 | [x] | app/components/whatsapp/WhatsappConnect.tsx | 142 | — |
| 261 | [x] | app/components/whatsapp/WhatsappQRDisplay.tsx | 68 | — |
| 262 | [x] | app/components/whatsapp/WhatsappSettings.tsx | 75 | — |
| 263 | [x] | app/components/whatsapp/WhatsappStatus.tsx | 109 | — |
| 264 | [x] | app/components/whatsapp/useWhatsappConnect.ts | 99 | — |

## Hallazgos

> Nota de método: lectura completa de los mayores (TablaHabitos, PanelGruposFb, ListaTareas, SeccionesConfig*) + escaneo de patrones en los 264 (inline styles, hex hardcodeado, `alert()`, non-null assertions). Tamaños desde la tabla generada.

### General (tamaño — regla 8)
- [x] **H-F13-01** `ALTA` `REGLA` — **7 componentes superan el límite de 300 líneas**: `TablaHabitos.tsx` 470, `PanelGruposFb.tsx` 377, `tarea-item/useTareaMenu.tsx` 343, `configuracion/global/SeccionesConfigPaneles.tsx` 335, `SeccionesConfigGeneral.tsx` 328, `arbitraje/hooks/useArbitraje.ts` 323, `ListaTareas.tsx` 309. Solo `PanelGruposFb` declara `sentinel-disable-file` (justificación documentada pero dice "305 líneas efectivas" cuando son 377). **Resolver:** dividir los 6 restantes (p. ej. SeccionesConfig* en un componente por sección; TablaHabitos ya tiene FilaHabito/FilaSubHabito — extraer el encabezado y la sección de pausados).
  - 🔄 Parcial 2026-08-19 (refactor `TablaHabitos`): 470→99 líneas — `FilaHabito`, `FilaSubHabito` y `EncabezadoTabla` extraídos a `tabla-habitos/` (185/212/28 líneas); API pública y barrel intactos. El hallazgo sigue abierto: 6 componentes superan 300 (PanelGruposFb 377, useTareaMenu 343, SeccionesConfigPaneles 335, SeccionesConfigGeneral 328, useArbitraje 323, ListaTareas 309).
  - ✅ Resuelto 2026-08-19 (sesión 16): los 6 restantes quedaron bajo 300 — **PanelGruposFb** 377→304 (tabla en `paneles/TablaGruposFb.tsx` 74, estados carga/error/vacío en `paneles/EstadosPanelGruposFb.tsx` 88; se eliminó el `sentinel-disable-file`), **useTareaMenu** 343→156 (builders en `tarea-item/opcionesMenuTarea.tsx` 149 y handlers por dominio en `manejarOpcionHabito.ts` 137 / `manejarOpcionTarea.ts` 60), **SeccionesConfigPaneles** 335→10 barrel (6 secciones en `global/paneles/` de 15–132 líneas + `ItemToggle` compartido), **SeccionesConfigGeneral** 328→11 barrel (7 secciones en `global/general/` de 23–86 líneas), **useArbitraje** 323→125 (cálculos puros en `arbitraje/calculos/calculoEscenarios.ts` 146 y `simulacionCiclos.ts` 80), **ListaTareas** 309→261 (contrato en `lista-tareas/ListaTareasProps.ts` y fila conectada en `lista-tareas/TareaListaItem.tsx` 85). Comportamiento y rutas/exports públicos intactos (ModalConfiguracionGlobal y barrels sin cambios). Evidencia: `tsc --noEmit` limpio.

### app/components/dashboard/TablaHabitos.tsx
- [x] **H-F13-02** `MEDIA` `UI/UX` — `TablaHabitos.tsx:158, 283` y `TareaItem.tsx:143` — `alert()` nativo como feedback de dependencias bloqueadas: interrumpe el flujo y rompe la consistencia del sistema (regla 6: feedback visible pero del sistema). **Resolver:** usar `AlertaToast`/`AlertaConfirmacion` del sistema de diseño.
  - ✅ Resuelto 2026-08-19 (T3): `alert()` reemplazado por `mostrarAdvertencia` del sistema de toasts en `TablaHabitos` (2) y `TareaItem` (vía `useAlertasOpcional`). Evidencia: `tsc --noEmit` limpio.
- [x] **H-F13-06** `BAJA` `DUPLICACION` — `TablaHabitos.tsx:339-393` — la rama con drag & drop duplica el mapeo completo de filas (Reorder.Group vs Fragment), ~50 líneas duplicadas que ya divergieron una vez. **Resolver:** extraer `renderFilas(envoltura)` con el wrapper como parámetro.
  - ✅ Resuelto 2026-08-19 (T3): `renderFila(habito)` extraído y compartido entre `Reorder.Group` y la vista normal (sin duplicación). Evidencia: `tsc --noEmit` limpio.
- [x] **H-F13-07** `INFO` `ORDEN` — `TablaHabitos.tsx:184` — prop `indice: _indice` sin uso en `FilaHabito`; eliminar o usar (p. ej. para key/zebra).
  - ✅ Resuelto 2026-08-19 (T3): prop `indice` eliminada de `FilaHabitoProps` y del destructuring. Evidencia: `tsc --noEmit` limpio.

### app/components/paneles/PanelGruposFb.tsx
- [x] **H-F13-03** `BAJA` `REGLA` — `PanelGruposFb.tsx:50-54, 340` — usa **4 `useState`** (límite 3, regla 8: el estado del menú contextual y del popover debería vivir en hooks) y hardcodea `color="#fff"` (regla 9.1: los colores viven en variables CSS). **Resolver:** mover `menuContextual`/`limiteVisible` a un hook (`useMenuContextual` ya existe en shared) y `color="#fff"` → `var(--dashboard-textoInvertido)` o similar.
  - ✅ Resuelto 2026-08-19 (T3): ya usaba 3 `useState` (límite cumplido) y `color="#fff"` → `var(--dashboard-textoSobreAcento)`. Evidencia: `tsc --noEmit` limpio.
- [x] **H-F13-04** `BAJA` `ERRORES` — `PanelGruposFb.tsx:349` — `grupos.find(...)!` con non-null assertion: si el grupo se eliminó del store entre el render y el click (p. ej. sync), `find` devuelve `undefined` y el render de `MenuContextual` crashea. **Resolver:** `const grupo = grupos.find(...); if (!grupo) return;` antes de renderizar el menú.
  - ✅ Resuelto 2026-08-19 (T3): non-null eliminada — el grupo se resuelve antes del render con guard explícito. Evidencia: `tsc --noEmit` limpio.

### General (inline styles — regla 9.1)
- [x] **H-F13-05** `BAJA` `REGLA` — 46 `style={{...}}` en componentes; ~40 están justificados (width/posición/color dinámicos) y anotados con `sentinel-disable inline-style-prohibido` — bien. **6 carecen del comentario:** `DashboardPanelView.tsx:79`, `AccionesPanelResponsivas.tsx:100`, `adjuntos/AdjuntoItemClasico.tsx:61`, `ListaTareasCompacta.tsx:97`, `SelectorEstadoHabitoPill.tsx:62` (sí lo tiene), revisar `Scratchpad.tsx:43,62` y `ResumenTareasProyecto.tsx:46`. **Resolver:** añadir el comentario `sentinel-disable` o extraer a CSS cuando sea estático.
  - ✅ Resuelto 2026-08-19 (T3): `sentinel-disable inline-style-prohibido` añadido en `DashboardPanelView:79`; los demás ya tenían el comentario (AdjuntoItemClasico, ListaTareasCompacta, Scratchpad, ResumenTareasProyecto). `AccionesPanelResponsivas` sin tocar (archivo ajeno). Evidencia: `tsc --noEmit` limpio.
