# Dashboard de Productividad Personal - Roadmap

Sistema de seguimiento de hábitos, tareas y notas rápidas con diseño estilo terminal minimalista.

---

## Estado Actual
**Versión:** v1.0.15-beta (2026-01-29)
**Foco:** Fase 15 - Lanzamiento Beta Nakomi

---

## Fase 15: Lanzamiento Beta Nakomi 🚀 **EN PROGRESO**

**Estado:** 📋 Planificación Completada
**Prioridad:** MÁXIMA - Bloquea lanzamiento

### 15.1 Panel de Actividad - Mejora de Registro 🔧

**Problema:** El registro de actividad no muestra nombres de elementos (hábitos/tareas), es redundante y visualmente fragmentado.

- [ ] **15.1.1 Investigación:** Revisar `actividadService.ts`, API de actividad, y cómo se registran eventos.
- [ ] **15.1.2 Refactorización Backend:** Asegurar que el registro de actividad guarde `elementoNombre` para hábitos y tareas.
- [ ] **15.1.3 Rediseño UI:** Cambiar formato de lista de cajas a lista simple sin numeración.
- [ ] **15.1.4 Formato Unificado:** Mostrar como `Tarea "Nombre de la tarea"` o `Hábito "Ejercicio"` en una línea.
- [ ] **15.1.5 Eliminar Redundancia:** Quitar el patrón "Habito cumplido" + nombre abajo separado.

### 15.2 Sistema FREE/PREMIUM - Refactorización SOLID 💎

**Problema:** El sistema de suscripción fue de las primeras features y no se integró correctamente al escalar el proyecto.

- [ ] **15.2.1 Auditoría:** Revisar `useSuscripcion.ts`, `types/dashboard.ts`, y todos los puntos donde se verifica `esPremium`.
- [ ] **15.2.2 Centralización:** Crear servicio/contexto `SuscripcionProvider` que sea la fuente única de verdad.
- [ ] **15.2.3 Panel Actividad Premium:** Ocultar PanelActividad para usuarios FREE (verificar en `Dashboard.tsx`).
- [ ] **15.2.4 Guards de Acceso:** Implementar HOC o hook `usePremiumGuard` para proteger features premium.
- [ ] **15.2.5 Tests:** Verificar que cambios de plan se reflejan instantáneamente en toda la UI.

### 15.3 Modal de Límites Alcanzados 🚫 **NUEVO**

**Problema:** No existe feedback al usuario cuando alcanza límites de plan FREE.

- [ ] **15.3.1 Diseño Modal:** Crear componente `ModalLimiteAlcanzado` con info del límite y CTA de suscripción.
- [ ] **15.3.2 Hook `useLimites`:** Centralizar verificación de límites con callbacks `onLimiteAlcanzado`.
- [ ] **15.3.3 Integración Tareas:** Mostrar modal al intentar crear tarea cuando se alcanza límite.
- [ ] **15.3.4 Integración Hábitos:** Mostrar modal al intentar crear hábito cuando se alcanza límite.
- [ ] **15.3.5 Integración Proyectos:** Mostrar modal al intentar crear proyecto cuando se alcanza límite.
- [ ] **15.3.6 Integración Adjuntos:** Mostrar modal al intentar subir adjunto sin acceso premium.

### 15.4 Modal Suscripción - Features Faltantes 📋

**Problema:** El modal de suscripción no menciona todas las características premium disponibles.

- [ ] **15.4.1 Investigación:** Localizar el modal de suscripción actual y su contenido.
- [ ] **15.4.2 Agregar Backups:** Incluir "Sistema de Copias de Seguridad automáticas" en lista de features premium.
- [ ] **15.4.3 Agregar IA:** Incluir "Conexión con asistentes de IA" en lista de features premium.
- [ ] **15.4.4 Agregar Actividad:** Incluir "Panel de Actividad con mapa de calor" en lista de features premium.
- [ ] **15.4.5 Verificar Features:** Revisar que todas las features premium estén documentadas en el modal.

### 15.5 Correcciones Visuales 🎨

**Problema:** Varios elementos UI tienen inconsistencias visuales y de usabilidad.

- [ ] **15.5.1 Selector Subtareas:** Centrar verticalmente el icono/selector para expandir subtareas en hábitos y tareas.
- [ ] **15.5.2 Inputs Información Personal:** Auditar estilos de inputs en modales de "Información Personal".
- [ ] **15.5.3 Unificar Inputs:** Aplicar variables CSS de borde según tema a todos los inputs de modales.
- [ ] **15.5.4 Notas Expandidas:** Revisar y aplicar variables CSS en el contenido de notas guardadas expandidas.
- [ ] **15.5.5 Fecha Notas (Layout):** Mover fecha de "hace X días" debajo del título, no al lado.
- [ ] **15.5.6 Fecha Notas (Semántica):** Cambiar a fecha de creación, con fecha de última modificación debajo junto al contador.

### 15.6 Persistencia de Notas 🐛 **CRÍTICO**

**Problema:** Las notas no se guardan al recargar. Regresión introducida en refactorización anterior.

- [ ] **15.6.1 Diagnóstico:** Revisar `useNotas.ts`, `notasStore.ts` y el flujo de guardado.
- [ ] **15.6.2 Restaurar Guardado:** Asegurar que la nota activa se persiste en localStorage/sincronización.
- [ ] **15.6.3 Restaurar Carga:** Asegurar que al iniciar la app se cargue y abra la última nota editada.
- [ ] **15.6.4 Tests Manuales:** Verificar ciclo completo: crear -> editar -> recargar -> verificar contenido.

En base a los comentarios del usuario que fueron: 

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
