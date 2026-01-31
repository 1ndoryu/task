# Dashboard de Productividad Personal - Roadmap

Sistema de seguimiento de hábitos, tareas y notas rápidas con diseño estilo terminal minimalista.

---

## Estado Actual
**Versión:** v1.0.18-beta (2026-01-31)
**Foco:** Beta Nakomi Estable - Preparación Producción

---

### Fase de Revisiones UI/UX (Prioridad Alta) 🔥

#### Badge de Adjunto Premium
- [x] El badge "Adjunto" en la configuración de tareas ya no se muestra bloqueado ✅
  - Modificado `SeccionAdjuntos.tsx` para siempre mostrar botón "Agregar" (sin icono Crown)
  - Usuarios Free ven el modal de upgrade al hacer clic (comportamiento via `manejarClickSubida`)
- [x] Para usuarios Free: al dar clic, mostrar modal de suscripción ✅
  - Ya implementado con `onClickUpgrade` callback

#### Menús Contextuales - Comportamiento General
- [x] Al abrir un menú contextual, cerrar automáticamente cualquier otro menú abierto (solo uno visible a la vez) ✅
- [x] Hacer clic nuevamente en el trigger de un menú abierto debe cerrarlo (toggle) ✅
  - Creado `stores/menuContextualStore.ts` como coordinador global
  - Creado `hooks/useMenuContextualGlobal.ts` con:
    - `useMenuContextualGlobal(prefix)`: Para componentes únicos (genera ID automático)
    - `useMenuContextualConId(id)`: Para componentes en listas (ID estable, ej: `tarea-${id}`)
  - Integrado en `TareaItem.tsx` y `TablaHabitos.tsx` (FilaHabito)
  - Ahora click derecho en cualquier elemento cierra automáticamente otros menús abiertos

#### Menú Contextual Hábitos - Sincronización
- [x] **Sincronizar opciones**: Las opciones del menú contextual de hábitos en el panel de Hábitos deben aparecer también en el panel de Ejecución ✅
- [x] **Refactorizar si es necesario**: Revisar si el sistema de menús contextuales requiere refactorización a SOLID para mantener mantenibilidad ✅
  - Creado `config/opcionesMenuHabito.tsx` como fuente única de verdad
  - Actualizado `TareaItem.tsx`, `ListaTareas.tsx`, `PanelEjecucion.tsx`, `DashboardGrid.tsx`

#### Prioridad de Tareas
- [x] Agregar nueva prioridad **"Muy Alta"** a las tareas ✅
  - Agregado `'muy_alta'` a `NivelPrioridad` en `types/dashboard.ts`
  - Actualizado peso en `useOrdenarTareas.ts` (500 puntos)
  - Actualizado validación en `dataService.ts`
  - Actualizado selector en `CampoPrioridad.tsx`
  - Actualizado menú contextual y badge en `TareaItem.tsx`
  - Actualizado mapeo importancia→prioridad en `useHabitosComoTareas.ts`

---

### Fase Móvil 📱 (Prioridad Alta)

#### Interacción con Tareas
- [x] Las tareas ya no serán editables inline en móvil (un toque abre el modal de configuración) ✅
  - Modificado `TareaItem.tsx` con detección via `useEsMovil`
  - En móvil/tablet, `iniciarEdicion()` ahora llama `onConfigurar()` en lugar de activar modo edición

#### Nuevo Sistema "Contextual Móvil" (Bottom Sheet Unificado)
- [x] Crear mecanismo unificado para crear/editar: tareas, hábitos y proyectos ✅
  - Creados componentes `BottomSheetTarea.tsx` y `BottomSheetHabito.tsx`
  - Estilos en `bottomSheetCreacion.css`
  - Integrados en `DashboardModales.tsx` con detección de móvil
- [x] Aparece en la parte inferior de la pantalla (no cubre toda la pantalla) ✅
  - Utiliza el componente base `BottomSheet` existente con z-index 1500
- [x] Estructura similar al modal de creación rápida actual ✅
  - Input principal con autofocus
  - Opciones compactas con iconos
- [x] Opciones con iconos simplificados cuando no hay valor seleccionado ✅
  - Botones de opción con estados inactivo/activo
- [x] Diseño compacto y minimalista ✅
  - Usa variables CSS del sistema
  - Tipografía monospaciada consistente

#### Prevención de Gestos Accidentales
- [x] Bloquear selección de texto en toda la app móvil ✅
- [x] Bloquear zoom con gestos (pinch-to-zoom) ✅
  - Agregado en `movil.css` sección "PREVENCIÓN DE GESTOS ACCIDENTALES"
  - `user-select: none` en `.dashboardContenedor` y todos sus hijos
  - `touch-action: pan-x pan-y` en html/body para bloquear pinch-to-zoom
  - Excepción para inputs/textareas para permitir edición

#### Refactor del Menú Hamburguesa
- [x] **Quitar opciones**: Mi equipo (ocultar), Configurar layout, Notificaciones, Nueva tarea, Nuevo hábito, Nuevo proyecto ✅
  - Modificado `EncabezadoMovil.tsx` para simplificar `opcionesDrawer`
- [x] **Mantener arriba**: Mi perfil, Copias de seguridad, y demás opciones del menú contextual de usuario en escritorio ✅
  - Se mantienen en `opcionesSecundariasDrawer`
- [x] **Fix z-index**: El menú debe aparecer POR ENCIMA del nav inferior ✅
  - Actualizado `movil.css`: drawer z-index 300, overlay 299 (antes 200/199)
  - Navegación inferior permanece en z-index 100

---

### Tareas Pendientes 📋

#### Prioridad Media (Usuario)
- [ ] **Google Login**: Configurar `client_id` en consola de Google Cloud (ver documentación OAuth2)

---

## Fases Futuras 🚀

### Fase 12: Gestión de Tiempo (Time Tracking) ⏱️

**Prioridad:** Baja | **Urgencia:** Chill

#### 12.1 Diseño y Planificación
- [ ] Definir modelo de datos y diseño UI del cronómetro
- [ ] Definir integración con hábitos (botón play)

#### 12.2 Implementación
- [ ] Componente `Cronometro`, Hook `useTimeTracking`
- [ ] Reportes de tiempo invertido

### Fase 14: Mejoras Pendientes (Pre-Beta)

#### 14.5 Planificación de Estructura (Sidebar)
- [ ] **Análisis de Navegación Lateral:** Evaluar sidebar fijo a la izquierda para soportar futuras vistas (Calendario, Wiki).

#### 14.6 Deuda Técnica Visual 🚧
- [ ] Auditar modales de configuración restantes para usar `var(--...)`.

### Extra: Scratchpad + File Manager
- [ ] Guardar notas del Scratchpad.
- [ ] File Manager (Vista explorador, agrupación por proyecto).

### Extra: Compartir Hábitos
- [ ] Ver estado de cumplimiento de compañeros.
- [ ] Notificaciones de logros compartidos.

### Extra: Gamificación y Social
- [ ] Niveles, badges, feed de actividad.

### Pendientes de Cifrado Avanzado (Fase 4)
- [ ] Opción de separar datos cifrados de no cifrados en sincronización.

---

## Notas Técnicas

### Archivos Clave para Fase 15:
- **Actividad:** `actividadService.ts`, `PanelActividad.tsx`, `useActividad.ts`
- **Suscripción:** `useSuscripcion.ts`, `types/dashboard.ts`
- **Notas:** `useNotas.ts`, `notasStore.ts`, `ModalNotasExpandido.tsx`, `ListaNotasGuardadas.tsx`
- **Inputs:** `styles/variables.css`, componentes de formularios

### Principios a Seguir:
1. **SRP:** Cada componente/hook una sola responsabilidad
2. **DIP:** Depender de abstracciones (interfaces de suscripción centralizadas)
3. **OCP:** Extender por composición (HOC/hooks de guards)
4. **Sin parches:** Refactorizaciones completas, no fixes superficiales
