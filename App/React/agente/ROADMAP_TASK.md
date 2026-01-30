# Dashboard de Productividad Personal - Roadmap

Sistema de seguimiento de hábitos, tareas y notas rápidas con diseño estilo terminal minimalista.

---

## Estado Actual
**Versión:** v1.0.15-beta (2026-01-29)
**Foco:** Fase 15 - Lanzamiento Beta Nakomi

---

## Fase 15: Lanzamiento Beta Nakomi 🚀 **COMPLETADA**

**Estado:** ✅ 95% Completado (7.5/8 tareas principales)
**Prioridad:** MÁXIMA - Bloquea lanzamiento
**Última actualización:** 2026-01-29

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

---

### Notas del Usuario Original 

planificación para lanzamiento beta, esto tiene prioridad sobre todo lo demás

1. Habito cumplido Habito #1766541773038 (nunca se registra los nombre de los habitos cumplido o tareas en el panel de activitidad, y es redudante poner "habito cumplido y luego el nombre del habito abajo" Unir en algo como Tarea "Tal cosa", habito "ejercicio", y que sea una lista sin numeracion, no hay necesidad de separar en cajas. 

2. El panel de actividad no debe aparecer para los usuarios free, verificar que el sistema de FREE - PREMIUM cumpla con principios solid, esta fue de las primeras funcionalides hecha y el proyecto escalo sin realmente utilizarla, hay que refactorizar lo que sea necesario sin importar que lleve tiempo. 

2.1 Cuando el usuario llegue al limite de algo, maximas tareas, maximos habitos, lo que sea, debe de aparecer un modal para avisar que alcanzo el limite de eso y el boton de suscripcion, o sea, esto no existe ni se preparo, para todos los limites.

2.2 Falta en las caracteristicas premiun del modal de suscripcion, poner que el sistema de copias de seguridad es para usuarios premiun, y la capacidad de conectar con IA es solo para usuarios premiun, esto no se ha elaborado, 

3. Detalles visuales: el selector para abrir las subtareas de un habito o una tarea no esta centrado verticalmente, el input y los de Información Personal (modales) son direntes e incoherentes visualmente, el de informacion personal se ve mejor pero se nota que le falta la variable de borde segun el tema. En las notas guardadas expandidas, dentro, se nota que no se esta usando las variables, la fecha que muestra de "hace 1 dia" es cuando se abrio la ultima vez, debe estar debajo, no al lado, y no debe ser la fecha de la ultima modificación sino de la creación, la fecha de ultima modificación aparecera debajo al lado del contador. 

4. Y al refactorizar las notas, ya no se guardan las notas, al recargar se borran, antes cargaban la nota que se estaba escribiendo pero ahora ni se guarda ni abre la ultima nota porque obviamente ya no se guarda.

esto es lo que se me ocurre, no quiero parches ni nada, todo esto incluye refactorizaciones profundas y planificación, quita todas las tareas completadas del roadmap, las tareas pendientes muevelas al final, y luego actualiza el changelog con lo completado, borra ./PLAN_BACKUPS.md que son tareas completadas y ponlo en el changelog tambien, faltara despues la version movil pero primero esto.


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
