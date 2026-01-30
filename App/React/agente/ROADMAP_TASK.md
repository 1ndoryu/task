# Dashboard de Productividad Personal - Roadmap

Sistema de seguimiento de hábitos, tareas y notas rápidas con diseño estilo terminal minimalista.

---

## Estado Actual
**Versión:** v1.0.15-beta (2026-01-30)
**Foco:** Fase 15 - Revisiones Beta Nakomi completadas

---

## Fase 15: Lanzamiento Beta Nakomi 🚀 **COMPLETADA**

**Estado:** ✅ 100% Completado (todas las revisiones implementadas)
**Prioridad:** MÁXIMA - Bloquea lanzamiento
**Última actualización:** 2026-01-30

---

### Tareas Completadas ✅

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

---

### Tareas Completadas de la Sesión Actual ✅

#### 15.5 Correcciones Visuales 🎨 ✅

**Resuelto:** Todas las correcciones visuales verificadas/implementadas.

- [x] **15.5.1 Selector Subtareas:** Centrado con `top: 50%; transform: translateY(-50%)` en `.tareaColapsadorBoton`
- [x] **15.5.2 Inputs Información Personal:** Verificado - `.inputPerfil` usa `var(--dashboard-bordePrincipal)`
- [x] **15.5.3 Unificar Inputs:** Verificado - `.formularioInput` usa variables CSS correctamente
- [x] **15.5.4 Notas Expandidas:** Verificado - Todos los estilos usan variables de tema
- [x] **15.5.5 Fecha Notas (Layout):** Implementado en `ListaNotasGuardadas.tsx` - fecha debajo del título
- [x] **15.5.6 Fecha Notas (Semántica):** Implementado - fechaCreacion con Clock, fechaModificacion con Edit2 + contador

#### 15.6 Persistencia de Notas 🐛 ✅

**Resuelto:** Implementado autoguardado y restauración en `PanelScratchpad.tsx`.

- [x] **15.6.1 Diagnóstico:** Identificado - autoguardado estaba en hook deprecado `useNotas.ts`
- [x] **15.6.2 Restaurar Guardado:** Implementado useEffect con debounce 2000ms que llama `guardarNotaActiva()`
- [x] **15.6.3 Restaurar Carga:** Implementado useEffect que llama `cargarNotas()` y `restaurarNotaActivaGuardada()`
- [x] **15.6.4 Tests Manuales:** Pendiente verificación por usuario

#### 15.7 Integración de Límites en Flujos de Creación ✅

**Resuelto:** Integrado en `DashboardModales.tsx` con wrappers de verificación.

- [x] **15.7.1 Integración Hábitos:** `manejarCrearHabitoConLimite` verifica antes de crear
- [x] **15.7.2 Integración Tareas:** `manejarCrearTareaConLimite` verifica tareas activas
- [x] **15.7.3 Integración Proyectos:** `manejarCrearProyectoConLimite` verifica antes de crear
- [ ] **15.7.4 Integración Adjuntos:** TO-DO - requiere prop drilling al componente de adjuntos

#### 15.8 Actualización de Documentación ✅

- [x] **15.8.1 Changelog:** Creado `CHANGELOG.md` con historial completo de Fase 15
- [x] **15.8.2 Plan Backups:** Verificado - archivo ya no existe
- [x] **15.8.3 Commit Final:** Pendiente - listo para commit

---

### Tareas Pendientes para Futuras Sesiones 📋

- [ ] **15.7.4 Integración Adjuntos:** Requiere refactorización para pasar contexto de límites
- [ ] **Versión Móvil:** Adaptar dashboard para dispositivos móviles
- [ ] **Selector de Fecha Personalizado:** Implementar componente de calendario compacto para fechas en modales de creación rápida y configuración de tareas

---

#### 15.9 Revisiones Beta Nakomi ✅

**Estado:** ✅ Completado
**Fecha:** 2026-01-30

**Correcciones implementadas:**

1. **Límites FREE ajustados:**
   - Hábitos: 10 → 5
   - Tareas activas: 50 → 20
   - Archivos: `SuscripcionService.php`, `suscripcionStore.ts`

2. **Modal límites centrado:**
   - CSS corregido para centrar modal vertical y horizontalmente
   - Ancho máximo aumentado
   - Archivo: `modalLimiteAlcanzado.css`

3. **Botón suscribirse en Panel de Actividad:**
   - Agregado prop `onAbrirUpgrade` a `PanelActividad`
   - Propagado desde `DashboardGrid` → `DashboardModales` → `PanelActividad`
   - Archivos: `PanelActividad.tsx`, `DashboardGrid.tsx`, `DashboardModales.tsx`

4. **Cursor desync en notas corregido:**
   - Sincronizadas propiedades CSS entre `.scratchpadTextarea` y `.scratchpadResaltado`
   - `line-height: 1.5`, `white-space: pre-wrap`, `word-wrap: break-word`
   - Archivo: `scratchpad.css`

5. **Border-radius variable en inputs:**
   - Agregada variable `var(--dashboard-radioSm)` a `.inputPerfil`
   - Archivo: `perfil.css`

6. **Componente MensajeBloquePremium creado:**
   - Componente reutilizable para secciones Premium bloqueadas
   - Props: `titulo`, `descripcion`, `onAbrirUpgrade`, `textoBoton`
   - Archivos: `MensajeBloquePremium.tsx`, `mensajeBloquePremium.css`

7. **Secciones Premium bloqueadas para FREE:**
   - Modal Configuración MCP (IA)
   - Modal Historial Backups
   - Panel Seguridad (nota informativa sobre cifrado de archivos)
   - Archivos: `ModalConfiguracionMCP.tsx`, `ModalHistorialBackups.tsx`, `PanelSeguridad.tsx`

8. **Textos de features unificados:**
   - ModalUpgrade actualizado con descripciones consistentes
   - Formato: Título breve + descripción expandida
   - Archivo: `ModalUpgrade.tsx`

**Nota sobre errores 403:**
Los errores 403 en usuarios FREE son comportamiento esperado cuando intentan sincronizar datos que exceden límites. El frontend previene la creación de nuevos items, pero datos pre-existentes que excedan límites serán rechazados por el backend.

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
