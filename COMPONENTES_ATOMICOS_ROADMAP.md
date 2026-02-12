# Roadmap: Conversión de Botones e Inputs a Componentes Atómicos

**Fecha inicio:** 12 de febrero de 2026  
**Objetivo:** Convertir todos los botones e inputs del proyecto en componentes reutilizables sin romper funcionalidad.

## Estado General
- 🔄 **En Progreso** - Fase 3: Migración de botones (8 componentes migrados)

## Análisis Inicial
- ✅ Identificados: ~200+ botones
- ✅ Identificados: ~40+ inputs (text, number, date, checkbox, file, password)
- ✅ Identificados: ~15+ textareas
- ✅ Identificados: ~5+ selects

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
- [ ] 3.22 - Reemplazar botones en ModalCreacionRapida (10+ botones)
- [ ] 3.23 - Reemplazar botones en componentes de listas (ListaTareasCompacta, ListaSubtareas, etc.)
- [ ] 3.24 - Reemplazar botones en adjuntos (AdjuntoItemModerno, AdjuntoOverlay)
- [ ] 3.25 - Reemplazar botones en modales complejos (ModalConfiguracionLayout, ModalProyecto, etc.)
- [ ] 3.26 - Reemplazar botones restantes (50+ componentes pendientes)

## Notas de Progreso
- ✅ 21 componentes migrados exitosamente (shared, paneles, dashboard)
- ✅ Componentes base de UI creados y funcionando
- 🔄 Continuando con migración masiva de componentes complejos (modales, listas, formularios)
- 📝 Patrón de migración establecido: import Boton, reemplazar <button> preservando clases con claseAdicional

## Fase 4: Migración de Inputs
- [ ] 4.1 - Reemplazar inputs en formularios de autenticación
- [ ] 4.2 - Reemplazar inputs en formularios de notas
- [ ] 4.3 - Reemplazar inputs en formularios de equipos
- [ ] 4.4 - Reemplazar inputs en formularios de perfil
- [ ] 4.5 - Reemplazar inputs en otros formularios

## Fase 5: Verificación y Limpieza
- [ ] 5.1 - Verificar que no queden botones/inputs sin migrar
- [ ] 5.2 - Actualizar documentación
- [ ] 5.3 - Commit final

---

## Notas de Progreso
_Se actualizará conforme avance el trabajo_

