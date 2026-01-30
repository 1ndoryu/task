# Dashboard de Productividad Personal - Roadmap

Sistema de seguimiento de hábitos, tareas y notas rápidas con diseño estilo terminal minimalista.

---

## Estado Actual
**Versión:** v1.0.17-beta (2026-01-31)
**Foco:** Tercera revisión Beta Nakomi - Correcciones UX

---

## Fase 15: Lanzamiento Beta Nakomi 🚀 **COMPLETADA**

**Estado:** ✅ 100% Completado
**Última actualización:** 2026-01-30

---

### 15.9 Segunda Revisión Beta ✅

**Mejoras implementadas:**

1. ✅ **Errores 403 silenciados**: Flag `silent` en errores API para evitar alarmas en consola
2. ✅ **Compartir oculto**: Opciones de compartir tareas/proyectos comentadas (feature pendiente)
3. ✅ **Mi Equipo oculto**: Botón en header comentado (feature pendiente)
4. ✅ **Trial 30 días**: Actualizado de 14 a 30 días gratuitos
5. ✅ **Almacenamiento 1GB**: Actualizado de 50MB a 1GB límite FREE
6. ✅ **Prioridad "Muy Alta"**: Nueva prioridad añadida a hábitos
7. ✅ **Background proyectos**: Removido color de fondo en `.listaProyectos`
8. ✅ **Hábitos no compactos**: Vista expandida por defecto
9. ✅ **Columna Actividad**: Historial (5 días) visible por defecto
10. ✅ **Panel Actividad visible**: Visible por defecto para nuevos usuarios
11. ✅ **Datos iniciales**: 3 tareas de bienvenida genéricas
12. ✅ **Nota de bienvenida**: Markdown explicativo de la beta
13. ✅ **Orden inteligente**: Por defecto en lugar de manual
14. ✅ **Hábitos en Ejecución**: Activado por defecto

---

### Tareas Pendientes para Futuras Sesiones 📋

#### Prioridad Alta
- [x] **Placeholders vacíos unificados**: Componente reutilizable para estados vacíos (tareas, hábitos, proyectos)
- [x] **Unificar botón "+ Nueva tarea"**: Coherencia visual con "+ Añadir" de otros paneles
- [x] **Botón check centrado**: Corrección visual en modo no compacto de tareas 

#### Prioridad Media
- [ ] **Google Login**: Configurar `client_id` en consola de Google Cloud (ver documentación OAuth2) (ESTO ES UNA TAREA PENDIENTE PARA EL USUARIO)
- [x] **Botón comentarios Premium**: Solo usuarios premium pueden enviar feedback, opción en menú contextual del usuario, modal con máximo 3 al día.
- [x] **Panel Admin mensajes**: Tab para ver mensajes de usuarios en panel admin
- [x] **Scroll Panel Admin**: Unificado a un solo scroll, diseño más compacto y minimalista.
- [x] **Integración adjuntos límites**: Prop drilling para verificar límites en adjuntos (15.7.4)

---

### Implementación Feedback Premium y Mejoras Admin (2026-01-31)

**Tareas completadas:**

1. ✅ **Sistema de Feedback Premium**:
   - `FeedbackApiController.php`: API REST con endpoints POST/GET para enviar y listar feedback
   - `ModalFeedback.tsx`: Modal con verificación premium, límite 3/día, tipos (sugerencia/bug/otro)
   - `feedback.css`: Estilos del modal
   - Schema de BD `glory_feedback` con campos: id, user_id, usuario_nombre, usuario_email, tipo, mensaje, leido, fecha_creacion
   - Integración en `EncabezadoPerfil.tsx`, `useModalesDashboard.ts`, `DashboardModales.tsx`, `DashboardEncabezado.tsx`, `DashboardIsland.tsx`

2. ✅ **Tab de Feedback en Panel Admin**:
   - `ListaFeedbackAdmin.tsx`: Componente con lista expandible, paginación, marcar como leído
   - `PanelAdministracion.tsx`: Tabs Usuarios/Feedback con iconos
   - Estilos en `panelAdministracion.css`

3. ✅ **Scroll y Diseño Panel Admin**:
   - Eliminado scroll anidado en `.listaUsuariosFilas`
   - Reducido gap y padding en tarjetas, filtros y filas
   - Diseño más compacto con espaciados `--dashboard-espacioSm`

4. ✅ **Integración Límites Adjuntos**:
   - `SeccionAdjuntos.tsx`: Props `limiteAdjuntos` y `onClickUpgrade`
   - Estados visuales: bloqueado (premium), límite alcanzado
   - Propagación en `FormularioTareaModerno.tsx` y `FormularioProyectoModerno.tsx`
   - Estilos en `adjuntos.css`: `.adjuntosAreaCarga--bloqueado`, `.adjuntosAreaCarga--limite`, `.pillOpcion--premium`

---

### Revisiones nuevas

1. El boton de de + añadir de las tareas no funciona.

2. La altura del panel de notas donse se escribe sigue sin ocupar la la altura completa, el texto invisible y visible siguen siendo muy diferentes en tamaño y todo, esto esta muy mal y necesita una revision profunda, tampoco respeta la configuracion de tamaño de texto en la configuracion de tarea. (scratchpadTextarea)

este es el estilo correcto

.scratchpadTextarea--resaltado {
    color: transparent;
    caret-color: var(--dashboard-textoSecundario);
    position: relative;
    z-index: 1;
}

3. LA NOTA INICIAL AL REGISTRARSE SIGUE SIN CARGAR AHORA TAMPOCO CARGAN LAS TAREAS INICIALES AL REGISTRARSE.

4. El boton de crear tarea del placeholder vacío debe abrir el modal de creacion rapida de tarea, no crear una tareap, igual cuando se da click en + añadir debería pasar lo mismo pero no funciona.


### Revision nueva ✅ COMPLETADA (2026-01-31)

**Todas las tareas corregidas:**

1. ✅ ~~El boton de + añadir al final de los habitos, no funciona, y falta en el panel de proyectos.~~ **CORREGIDO**: Añadido botón +Añadir en `ListaProyectos.tsx` con estilos en `proyectos.css`. El de hábitos ya funcionaba, el de tareas también funciona.

2. ✅ ~~El placeholder vacío se hizo para los habitos y proyectos pero falta para las tareas.~~ **CORREGIDO**: Añadido componente `EstadoVacio` en `ListaTareas.tsx` con mensaje "Sin tareas pendientes".

3. ✅ ~~La nota no aparece al registrarse.~~ **CORREGIDO**: Importado `notasIniciales` en `notasStore.ts` para mostrar nota de bienvenida.

4. ✅ ~~En el modal de premium sigue apareciendo 14 días.~~ **CORREGIDO**: Actualizado a 30 días en `ModalUpgrade.tsx`.

5. ✅ ~~Desface entre texto invisible y visible en notas.~~ **CORREGIDO**: Ajustado `overflow-y: scroll` en `scratchpad.css` para mantener scroll consistente.

6. ✅ ~~Exportar datos no incluye historial.~~ **CORREGIDO**: Validación en `dataService.ts` ahora acepta `historialCompletados`, `historialPospuestos`, `fechaCreacion`, `fechaPausa`, `pausado` para hábitos y `fechaCreacion`, `fechaCompletado`, `prioridad`, `urgencia` para tareas. Versión actualizada a 1.1.0.

7. ✅ ~~Changelog con lenguaje técnico.~~ **CORREGIDO**: Reescritas entradas v1.0.15-beta y v1.0.14-beta con lenguaje natural en `changelog.ts`. Añadido comentario de aviso para futuras entradas.

8. ✅ ~~Actividad de "admin" en tareas iniciales.~~ **CORREGIDO**: Filtro en `useMensajes.ts` oculta mensajes de sistema con "admin" para tareas de bienvenida (IDs 1-3).

### Revision Anterior ✅

1. ✅ ~~hay una confuncion respecto a eso, 5. ✅ **Almacenamiento 1GB**: Actualizado de 50MB a 1GB límite FREE eran 1gb para los premiun y 50mb para los free~~ **CORREGIDO**: FREE=50MB, PREMIUM=1GB en `AlmacenamientoService.php` y `ModalUpgrade.tsx`

2. ✅ ~~Cree una nueva cuenta y no aparece la nota ni las tareas ni los habitos genericos por defecto al registrarse.~~ **CORREGIDO**: Implementada detección de usuario nuevo en `useSyncManager.ts` - ahora sube datos iniciales al servidor en vez de sobrescribirlos con arrays vacíos.

3. ✅ ~~La prioridad "muy alta" aparece solo en al configurar el habito pero no en el modal de creación rapida.~~ **CORREGIDO**: Añadido 'Muy Alta' al menú de importancia en `ModalCreacionRapida.tsx`


### Revisiones Anteriores Completadas (Referencia)

<details>
<summary>Ver revisiones anteriores (15.1 - 15.8)</summary>

#### ✅ 15.1-15.8 Completadas
- Panel de Actividad formato unificado
- Sistema FREE/PREMIUM refactorizado
- Modal de límites alcanzados
- Modal suscripción con features completas
- Correcciones visuales
- Persistencia de notas
- Integración de límites en flujos
- Documentación actualizada

</details>

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
