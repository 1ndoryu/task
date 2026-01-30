# Changelog - Dashboard de Productividad Personal

Registro de cambios significativos del proyecto.

---

## [1.0.15-beta] - 2026-01-29

### Fase 15: Lanzamiento Beta Nakomi

#### ✅ 15.1 Panel de Actividad - Mejora de Registro
- Implementado formato unificado: `Tipo "Nombre"` en línea simple
- Eliminada redundancia "Habito cumplido" + nombre separado
- Cambiado de lista numerada con cajas a lista simple sin numeración
- Formato final: `Tarea "Nombre" · Proyecto` o `Hábito "Nombre"`

**Archivos modificados:**
- `PanelActividad.tsx`: Función `formatearActividadUnificada()`
- `panelActividad.css`: Clase `.panelActividadDetalleLista--unificada`

#### ✅ 15.2 Sistema FREE/PREMIUM - Refactorización SOLID
- Centralizado sistema de suscripción en `suscripcionStore.ts` con Zustand
- Implementado patrón DIP (Dependency Inversion Principle)
- Selectores atómicos para evitar re-renders innecesarios
- Panel de Actividad oculto para usuarios FREE con mensaje de bloqueo

**Archivos creados:**
- `stores/suscripcionStore.ts`: Store centralizado con `puedeCrear()`, `verificarLimite()`, `tieneAcceso()`

**Archivos modificados:**
- `PanelActividad.tsx`: Agregado verificación Premium y componente `MensajeBloqueoFree`
- `panelActividad.css`: Estilos para estado bloqueado `.panelActividadBloqueado`

#### ✅ 15.3 Modal de Límites Alcanzados
- Creado componente `ModalLimiteAlcanzado` con diseño terminal estético
- Implementado hook `useLimites` para verificación centralizada
- Integrado en `DashboardModales.tsx` con estado global
- Soporte para límites: habitos, tareasActivas, proyectos, adjuntos

**Archivos creados:**
- `components/shared/ModalLimiteAlcanzado.tsx`
- `hooks/useLimites.ts`
- `styles/dashboard/componentes/modalLimiteAlcanzado.css`

**Archivos modificados:**
- `useDashboardCompleto.ts`: Integrado hook `limites`
- `DashboardModales.tsx`: Agregado `ModalLimiteAlcanzado`
- `shared/index.ts`: Exportado componente
- `styles/dashboard/index.css`: Importado CSS del modal

#### ✅ 15.4 Modal Suscripción - Features Completas
- Agregadas características faltantes en lista de beneficios premium
- Incluido: Panel de Actividad, Sistema de Backups, Conexión con IA
- Actualizado array `CARACTERISTICAS` con todas las features

**Archivos modificados:**
- `ModalUpgrade.tsx`: Array CARACTERISTICAS actualizado

#### ✅ 15.5 Correcciones Visuales
- **15.5.1**: Selector subtareas centrado verticalmente (`top: 50%; transform: translateY(-50%)`)
- **15.5.2-15.5.4**: Verificados inputs de perfil y formularios - usan variables CSS correctamente
- **15.5.5**: Fecha de creación movida debajo del título en notas
- **15.5.6**: Separada fecha de creación vs modificación con icono Edit2 y contador

**Archivos modificados:**
- `tareas.css`: Clase `.tareaColapsadorBoton` centrada
- `ListaNotasGuardadas.tsx`: Nuevo layout con fechaCreacion y fechaModificacion
- `scratchpad.css`: Nuevas clases `.modalNotasItemFechaCreacion`, `.modalNotasItemMetasInferiores`

#### ✅ 15.6 Persistencia de Notas (BUG CRÍTICO)
- Restaurado autoguardado con debounce de 2000ms
- Implementada restauración de última nota activa al cargar
- Flujo completo: escribir → debounce → guardarNotaActiva() → API → recargar → cargarNotas() → restaurarNotaActivaGuardada()

**Archivos modificados:**
- `PanelScratchpad.tsx`: 
  - Agregado `cargarNotas` y `restaurarNotaActivaGuardada` del store
  - useEffect para cargar notas al montar
  - useEffect para restaurar nota activa después de carga
  - useEffect para autoguardado con debounce

#### ✅ 15.7 Integración de Límites en Flujos de Creación
- Verificación de límites antes de crear hábitos, tareas y proyectos
- Wrappers con verificación: `manejarCrearHabitoConLimite`, `manejarCrearProyectoConLimite`, `manejarCrearTareaConLimite`
- Integrado en `manejarGuardarRapido` del modal de creación rápida

**Archivos modificados:**
- `DashboardModales.tsx`: 
  - Verificación en `manejarGuardarRapido` para tareas, hábitos y proyectos
  - Nuevos wrappers con verificación de límites
  - Actualizado `onGuardar` de modales para usar wrappers

#### ✅ 15.8 Actualización de Documentación
- Creado `CHANGELOG.md` con historial de Fase 15
- Eliminado `PLAN_BACKUPS.md` (ya no existía)
- Actualizado `ROADMAP_TASK.md` marcando tareas completadas

---

## Notas de Desarrollo

### Principios Aplicados
- **SOLID**: Single Responsibility, Dependency Inversion
- **Zustand**: Estado global centralizado con selectores atómicos
- **CSS Variables**: Todos los estilos usan variables temáticas

### TO-DO Pendientes
- Integración de límites para adjuntos (15.7.4) - requiere prop drilling al componente
- Versión móvil del dashboard
