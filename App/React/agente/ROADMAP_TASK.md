# Dashboard de Productividad Personal - Roadmap

Sistema de seguimiento de hábitos, tareas y notas rápidas con diseño estilo terminal minimalista.

---

## Estado Actual
**Versión:** v1.0.18-beta (2026-01-31)
**Foco:** Beta Nakomi Estable - Preparación Producción

---

### Fase de Revisiones UI/UX (Prioridad Alta) 🔥

#### Badge de Adjunto Premium
- [ ] El badge "Adjunto" no debe mostrarse bloqueado para nadie (ni Free ni Premium)
- [ ] Para usuarios Free: al dar clic, mostrar modal de suscripción (comportamiento normal sin indicador visual de bloqueo)

#### Menús Contextuales - Comportamiento General
- [ ] Al abrir un menú contextual, cerrar automáticamente cualquier otro menú abierto (solo uno visible a la vez)
- [ ] Hacer clic nuevamente en el trigger de un menú abierto debe cerrarlo (toggle)

#### Menú Contextual Hábitos - Sincronización
- [x] **Sincronizar opciones**: Las opciones del menú contextual de hábitos en el panel de Hábitos deben aparecer también en el panel de Ejecución ✅
- [x] **Refactorizar si es necesario**: Revisar si el sistema de menús contextuales requiere refactorización a SOLID para mantener mantenibilidad ✅
  - Creado `config/opcionesMenuHabito.tsx` como fuente única de verdad
  - Actualizado `TareaItem.tsx`, `ListaTareas.tsx`, `PanelEjecucion.tsx`, `DashboardGrid.tsx`

#### Prioridad de Tareas
- [ ] Agregar nueva prioridad **"Muy Alta"** a las tareas

---

### Fase Móvil 📱 (Prioridad Alta)

#### Interacción con Tareas
- [ ] Las tareas ya no serán editables inline en móvil (un toque abre el modal de configuración)

#### Nuevo Sistema "Contextual Móvil" (Bottom Sheet Unificado)
- [ ] Crear mecanismo unificado para crear/editar: tareas, hábitos y proyectos
- [ ] Aparece en la parte inferior de la pantalla (no cubre toda la pantalla)
- [ ] Estructura similar al modal de creación rápida actual
- [ ] Opciones con iconos simplificados cuando no hay valor seleccionado
- [ ] Diseño compacto y minimalista

#### Prevención de Gestos Accidentales
- [ ] Bloquear selección de texto en toda la app móvil
- [ ] Bloquear zoom con gestos (pinch-to-zoom)

#### Refactor del Menú Hamburguesa
- [ ] **Quitar opciones**: Mi equipo (ocultar), Configurar layout, Notificaciones, Nueva tarea, Nuevo hábito, Nuevo proyecto
- [ ] **Mantener arriba**: Mi perfil, Copias de seguridad, y demás opciones del menú contextual de usuario en escritorio
- [ ] **Fix z-index**: El menú debe aparecer POR ENCIMA del nav inferior (actualmente aparece debajo)

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
