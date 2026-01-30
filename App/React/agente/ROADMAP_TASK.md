# Dashboard de Productividad Personal - Roadmap

Sistema de seguimiento de hábitos, tareas y notas rápidas con diseño estilo terminal minimalista.

---

## Estado Actual
**Versión:** v1.0.19-beta (2026-01-31)
**Foco:** Beta Nakomi Estable - Preparación Producción

---

### Fase de Revisiones UI/UX (Prioridad Alta) 🔥
- [x] **Badge Prioridad Hábitos**: 
  - [x] Corregir "Muy alta" ausente en panel ejecución.
  - [x] **FIX**: Igualar estilo "Muy Alta" al de "Alta" (Solicitud de usuario).
- [x] **UX Botón Añadir**: Botón añadir expandido correctamente.
- [x] **Menú Contextual Hábitos**:
  - [x] Selectores de Importancia implementados.
  - [x] **FIX**: Corregir bug "Case duplicate" en `TablaHabitos.tsx` que rompe el build.
  - [x] **FIX**: Investigar por qué las opciones no aparecen (posible prop `onActualizar` faltante).
- [x] **Footer**: Corregido a "Nakomi.studio".

### Tareas Pendientes 📋

#### Prioridad Media
- [ ] **Google Login**: Configurar `client_id` en consola de Google Cloud (ver documentación OAuth2) (ESTO ES UNA TAREA PENDIENTE PARA EL USUARIO)

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
