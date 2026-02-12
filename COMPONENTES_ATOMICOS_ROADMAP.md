# Roadmap: Conversión de Botones e Inputs a Componentes Atómicos

**Fecha inicio:** 12 de febrero de 2026  
**Objetivo:** Convertir todos los botones e inputs del proyecto en componentes reutilizables sin romper funcionalidad.

## Estado General
- ✅ **Completado** - Fase 3: Migración de botones (100+ componentes, 200+ botones migrados)
- ✅ **Completado** - Fase 4: Migración de inputs (40 inputs + 1 textarea migrados en 26 componentes)
- ✅ **Completado** - BottomSheets, Drawer, Menus, todos los Selectores, Paneles migrados
- 🔄 **Pendiente** - Fase 6: Centralización de estilos (eliminar 100+ usos de claseAdicional)

## Análisis Inicial
- ✅ Identificados: ~200+ botones
- ✅ Identificados: ~40+ inputs (text, number, date, checkbox, file, password)
- ✅ Identificados: ~15+ textareas  
- 🔄 Identificados: ~8+ selects (pendiente de evaluación caso por caso)

---

## Fase 1: Análisis y Estructura
- [x] 1.1 - Identificar todos los botones en el proyecto
- [x] 1.2 - Identificar todos los inputs en el proyecto
- [x] 1.3 - Crear directorio de componentes UI base
- [x] 1.4 - Definir tipos y props de componentes

## Fase 2: Creación de Componentes Base
- [x] 2.1 - Crear componente `Boton.tsx`
- [x] 2.2 - Crear componente `Input.tsx`
- [x] 2.3 - Crear componente `Textarea.tsx`
- [x] 2.4 - Crear componente `Select.tsx`
- [x] 2.5 - Crear componente `Checkbox.tsx`
- [x] 2.6 - Crear componente `Radio.tsx`
- [x] 2.7 - Crear estilos CSS centralizados para componentes UI

## Fase 3: Migración de Botones
- [x] 3.1 - Reemplazar botones en PaginaPruebaIsland (prueba inicial)
- [x] 3.2 - Reemplazar botones en ModalCompartir
- [x] 3.3 - Reemplazar botones en AlertaConfirmacion
- [x] 3.4 - Reemplazar botones en AccionesFormulario
- [x] 3.5 - Reemplazar botones en EstadoVacio
- [x] 3.6 - Reemplazar botones en Modal
- [x] 3.7 - Reemplazar botones en ModalLimiteAlcanzado
- [x] 3.8 - Reemplazar botones en ModalFeedback (+ textarea)
- [x] 3.9 - Reemplazar botones en Landing
- [x] 3.10 - Reemplazar botones en NavegacionInferior
- [x] 3.11 - Reemplazar botones en ModalUpgrade
- [x] 3.12 - Reemplazar botones en PanelScratchpad
- [x] 3.13 - Reemplazar botones en PanelProyectos
- [x] 3.14 - Reemplazar botones en PanelFocoPrioritario
- [x] 3.15 - Reemplazar botones en PanelEjecucion
- [x] 3.16 - Reemplazar botones en ModalInspeccionIA
- [x] 3.17 - Reemplazar botones en HistorialCalorias
- [x] 3.18 - Reemplazar botones en AccionesDatos
- [x] 3.19 - Reemplazar botones en BuscadorGlobal
- [x] 3.20 - Reemplazar botones en ModalLogin
- [x] 3.21 - Reemplazar botones en FormularioHabito
- [x] 3.22 - Reemplazar botones en NotaItem
- [x] 3.23 - Reemplazar botones en componentes de listas (ListaTareasCompacta, ListaTareasHabito, ListaSubtareas)
- [x] 3.24 - Reemplazar botones en adjuntos (AdjuntoItemModerno, AdjuntoOverlay)
- [x] 3.25 - Reemplazar botones en modales complejos (ModalConfiguracionLayout)
- [x] 3.26 - Reemplazar botones en ModalCreacionRapida (ya migrado)
- [x] 3.27 - Reemplazar botones en proyectos/ModalProyecto (ya migrado)
- [x] 3.28 - Reemplazar botones en BottomSheets (Tarea, Habito, Proyecto)
- [x] 3.29 - Reemplazar botones en DrawerMovil
- [x] 3.30 - Reemplazar botones en MenuOpcionesPanel
- [x] 3.31 - Reemplazar botones en ListaParticipantes
- [x] 3.32 - Reemplazar botones en todos los Selectores (~18 componentes, ~80 botones)
- [x] 3.33 - Reemplazar botones en Paneles (~7 componentes, ~40 botones)
- [x] 3.34 - Reemplazar botones en Encabezados y Modales (6 componentes migrados: EncabezadoAcciones, EncabezadoPerfil, EncabezadoEstado, EncabezadoBuscadorMovilTrigger, EncabezadoMovil, EncabezadoBuscador)
- [x] 3.35 - Reemplazar botones en Admin y Equipos (10 componentes migrados: FilaUsuario, PanelAdministracion, ListaUsuarios, ListaFeedbackAdmin, FiltrosUsuarios, DetalleUsuario, ModalEquipos, ListaSolicitudes, FormularioSolicitud, ListaCompaneros)
- [x] 3.36 - Reemplazar botones en Shared comunes (12 componentes migrados: ItemNotificacion, ModalExperimentos, IndicadorPlan, IndicadorSincronizacion, MensajeBloquePremium, ModalTemas, DockTracking, ModalSeleccionPropiedad, PestanasModal, ResumenTareasProyecto, ModalPlugins, ConfigDeficitCalorico)
- [x] 3.37 - Reemplazar botones restantes (completado - 100+ botones migrados en total)

## Notas de Progreso
- ✅ 28 componentes migrados exitosamente (shared, paneles, dashboard, listas, adjuntos)
- ✅ Componentes base de UI creados y funcionando
- ✅ Corrección masiva de errores TypeScript: prop "titulo" → "title" (español → estándar HTML)
- ✅ **NUEVO:** Componente Boton refactorizado con React.forwardRef para soportar refs (soluciona 7 errores en Selectores Pills)
- ✅ **NUEVO:** MenuContextual - agregado import de Boton y limpiada exportación duplicada de OpcionMenu
- ✅ **NUEVO:** DrawerMovil - eliminada referencia a plan 'trial' (PlanSuscripcion solo permite 'free' | 'premium')
- 🔄 Continuando con migración masiva de componentes complejos (modales, listas, formularios)
- 📝 Patrón de migración establecido: import Boton, reemplazar <button> preservando clases con claseAdicional
- ⚠️ Lección aprendida: Usar props HTML estándar (title, disabled, etc.) en lugar de traducciones al español
- ⚠️ Lección aprendida: Componentes base como Boton deben usar forwardRef para permitir refs en componentes hijos

## Fase 4: Migración de Inputs
- [x] 4.1 - Reemplazar inputs en formularios de configuración (ConfigDeficitCalorico: 8 inputs)
- [x] 4.2 - Reemplazar inputs en formularios de notas (NavegadorCarpetas, ModalNotasGuardadas, ModalNotasExpandido: 5 inputs)
- [x] 4.3 - Reemplazar inputs en formularios de admin (DetalleUsuario, FiltrosUsuarios: 2 inputs)
- [x] 4.4 - Reemplazar inputs en formularios de perfil (ModalPerfil: 1 input file)
- [x] 4.5 - Reemplazar inputs en otros formularios (PanelChatHistorial, SelectorVentanaOportunidad, PanelDeficitCalorico, CampoFechaLimite, ModalCreacionRapida, SeccionTokenMCP: 10 inputs)
- [x] 4.6 - Reemplazar inputs en Arbitraje (SeccionCostos, SeccionVenta, SeccionTasas, SimuladorCiclos: 13 inputs)

## Fase 5: Verificación y Limpieza
- [x] 5.1 - Verificar que no queden botones/inputs sin migrar
- [x] 5.2 - Migrar textarea en ModalPerfil (1 textarea)
- [ ] 5.3 - Evaluar migración de selects (8 selects identificados)
- [x] 5.4 - Actualizar documentación del roadmap
- [x] 5.5 - Commit final Fase 4

## Fase 6: Centralización de Estilos (NUEVO)
**Ver archivo:** [PLAN_CENTRALIZACION_ESTILOS.md](./PLAN_CENTRALIZACION_ESTILOS.md)

### Objetivos
- Eliminar 100+ usos de `claseAdicional` en componentes migrados
- Centralizar todos los estilos en ui.css con sistema de variantes
- Limpiar ~110 archivos CSS con reglas obsoletas/duplicadas
- Reducir tamaño CSS en 30-40% (estimado)

### Estado
- [x] 6.1 - Análisis completo de clases duplicadas (100+ usos identificados)
- [x] 6.2 - Creación de plan detallado de centralización
- [ ] 6.3 - Extensión del sistema de variantes (nuevas variantes: pestaña, navegacion, badge, opcion)
- [ ] 6.4 - Migración de componentes por categoría (10 categorías identificadas)
- [ ] 6.5 - Limpieza de CSS obsoleto
- [ ] 6.6 - Consolidación de archivos CSS (120 → ~15 archivos)
- [ ] 6.7 - Validación visual y funcional
- [ ] 6.8 - Testing de temas y performance

**Estimado:** 5-7 días de trabajo completo

---

## Notas de Progreso Finales
- ✅ **100+ componentes migrados exitosamente** (shared, paneles, dashboard, listas, adjuntos, modales, encabezados, admin, equipos, configuración)
- ✅ **Fase 3 COMPLETADA:** Todos los botones migrados a componente Boton atómico (200+ botones)
- ✅ **Fase 4 COMPLETADA:** Todos los inputs migrados a componente Input atómico (39 inputs)
- ✅ Componentes base de UI creados y funcionando (Boton, Input, Select, Checkbox, Radio, Textarea)
- ✅ Corrección masiva de errores TypeScript: prop "titulo" → "title" (español → estándar HTML)
- ✅ **12 feb 2026:** Resueltos 10 errores críticos TypeScript (Boton con forwardRef, MenuContextual imports, DrawerMovil plan type)
- ✅ **12 feb 2026 - Sesión extendida:** Migrados 28 componentes adicionales en una sola sesión (Encabezados, Admin, Equipos, Notificaciones, Experimentos, Shared comunes)
- ✅ **12 feb 2026 - Sesión mega:** Migrados 50+ componentes más (SeccionResponsables, Shared utilities, Dashboard modals, Configuración MCP, Selectores, Paneles)
- ✅ **12 feb 2026 - Sesión inputs:** Migrados 39 inputs en 25+ componentes (Configuración, Notas, Admin, Arbitraje, MCP)
- ✅ **12 feb 2026 - Hotfix visual:** Unificada coherencia de iconos en `selectorBadgeBoton--soloIcono` (ghost vs icono) normalizando color heredado, centrado y tamaño SVG (12px) para evitar brillo/tamaño inconsistente en paneles
- 📝 Patrón de migración establecido: import Input, reemplazar <input> preservando clases con claseAdicional
- 📝 Inputs migrados incluyen: text, number, date, file, password con soporte para refs, toggle show/hide y validaciones
- ⚠️ Lección aprendida: Usar props HTML estándar (title, disabled, etc.) en lugar de traducciones al español
- ⚠️ Lección aprendida: Componentes base como Boton e Input deben usar forwardRef para permitir refs en componentes hijos
- 📋 **SIGUIENTE FASE:** Fase 5 - Verificación y Limpieza (confirmar que no queden botones/inputs sin migrar)

