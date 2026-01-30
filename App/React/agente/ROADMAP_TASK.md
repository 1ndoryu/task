# Dashboard de Productividad Personal - Roadmap

Sistema de seguimiento de hábitos, tareas y notas rápidas con diseño estilo terminal minimalista.

---

## Estado Actual
**Versión:** v1.0.16-beta (2026-01-30)
**Foco:** Segunda revisión Beta Nakomi completada

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
- [ ] **Centralizar creación de tareas**: Varias formas de crear tareas no respetan límites (principios SOLID)
- [ ] **Placeholders vacíos unificados**: Componente reutilizable para estados vacíos (tareas, hábitos, proyectos)
- [ ] **Unificar botón "+ Nueva tarea"**: Coherencia visual con "+ Añadir" de otros paneles
- [x] **Botón check centrado**: Corrección visual en modo no compacto de tareas (YA ESTA CENTRADO)

#### Prioridad Media
- [ ] **Google Login**: Configurar `client_id` en consola de Google Cloud (ver documentación OAuth2)
- [ ] **Botón comentarios Premium**: Solo usuarios premium pueden enviar feedback
- [ ] **Panel Admin mensajes**: Tab para ver mensajes de usuarios en panel admin
- [ ] **Scroll Panel Admin**: Unificar a un solo scroll (actualmente hay 3)
- [ ] **Integración adjuntos límites**: Prop drilling para verificar límites en adjuntos (15.7.4)

#### Documentación Pendiente
- [ ] Documentar configuración de Google OAuth2 (client_id, redirect URIs, etc.)

---

### Revision nueva

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
