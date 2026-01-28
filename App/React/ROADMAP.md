# Dashboard de Productividad Personal - Roadmap

Sistema de seguimiento de hábitos, tareas y notas rápidas con diseño estilo terminal minimalista.

> **Tareas completadas movidas a:** `fases-completadas.md`

---

## Tareas del Proyecto SaaS Task (API)

> **Última sincronización:** 2026-01-11 00:13

---

## Estado Actual
**Version:** v1.0.14-beta (2026-01-27)
**Foco:** Fase 14 (Mejoras/UX) y Fase 10.7 (APK)

## Fase 12: Gestión de Tiempo (Time Tracking) ⏱️

**Prioridad:** Baja | **Urgencia:** Chill

### 12.1 Diseño y Planificación
- [ ] Definir modelo de datos y diseño UI del cronómetro
- [ ] Definir integración con hábitos (botón play)

### 12.2 Implementación
- [ ] Componente `Cronometro`, Hook `useTimeTracking`
- [ ] Reportes de tiempo invertido

## Fase 14: Mejoras de Configuración y UX (Enero 2026) 🌟 **EN PROGRESO**

**Estado:** 🏗️ En Construcción (v1.0.14-beta)

### 14.5 Planificación de Estructura (Sidebar)
- [ ] **Análisis de Navegación Lateral:** Evaluar sidebar fijo a la izquierda para soportar futuras vistas (Calendario, Wiki).

### 14.6 Deuda Técnica Visual 🚧
- [ ] Auditar modales de configuración restantes para usar `var(--...)`.

### 14.8 Subtareas de Hábitos - Pendientes 🚧
- [x] **Revisión UX/UI (Feedback):**
  - [x] **Drag & Drop:** Mejorar sensación de reordenamiento en configuración, se añadió handle `GripVertical`.
  - [x] **Badge Prioridad:** Mostrar en lista interna, editable inline.
  - [x] **Checkbox:** Cambiar círculo por cuadrado.
- [x] **Bugs Sincronización:**
  - [x] **Herencia:** Subtareas creadas en panel ejecución no heredan importancia.
  - [x] **Visibilidad:** Subtareas creadas en panel ejecución no aparecen en "Metas".

### 14.8 Subtareas de Hábitos - Feedback UX/UI 🚧
- [x] **Badge Prioridad (Estilo Hito):** Reemplazar ciclo simple por Menú/Pill igual al de Hitos de Proyecto.
- [x] **Drag & Drop (Fix):** Se implementó actualización optimista local para evitar saltos.

### 14.9 Gestión Avanzada de Subtareas (Prioritario)
- [x] **Configuración Tareas:** Añadir sección "Subtareas" (estilo Hábitos/Metas) en el panel de configuración de tareas normales.
- [ ] **Acceso Rápido:** Opción "Agregar subtarea" en menú contextual.

---

## Fases Futuras 🚀

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
