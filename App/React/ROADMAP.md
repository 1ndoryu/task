# Dashboard de Productividad Personal - Roadmap

Sistema de seguimiento de hábitos, tareas y notas rápidas con diseño estilo terminal minimalista.

---

## Estado Actual

**Fecha de inicio:** 2025-12-19  
**Version:** v1.0.8-beta  
**Ultima actualizacion:** 2025-12-29
**Estado:** Fase 8 EN PROGRESO - Mejoras UX Modal de Tareas

## Funcionalidades Completadas

| Módulo              | Descripción                                                                   |
| ------------------- | ----------------------------------------------------------------------------- |
| **Infraestructura** | Arquitectura SOLID, CSS centralizado, TypeScript, Sincronización, Cifrado E2E |
| **Hábitos**         | CRUD, frecuencias, rachas, historial, mapa calor, posponer                    |
| **Tareas**          | CRUD inline, subtareas, Drag & Drop, prioridades, adjuntos, chat              |
| **Proyectos**       | Jerarquía 3 niveles, progreso, mapa calor, vista expandible                   |
| **Actividad**       | Mapa de calor, historial visual, cache, actualizaciones optimistas            |
| **Social**          | Equipos, compartir, notificaciones, mensajes                                  |
| **Freemium**        | Free/Premium, Trial 14 días, Stripe integrado                                 |
| **Seguridad**       | API REST WordPress, nonce CSRF, AES-256-GCM, HKDF-SHA256                      |
| **Admin**           | Gestión usuarios, filtros, estadísticas                                       |

---

## Reglas de Desarrollo **IMPORTANTE**

- **Zustand primero**: Al modificar o crear nuevas funcionalidades, aprovechar para refactorizar usando Zustand como fuente única de verdad del estado.
- **CSS centralizado**: Todos los estilos en archivos CSS, nunca inline, usar variables de variables.css.
- **SOLID**: Mantener componentes pequeños con responsabilidad única.
- **Refactorización progresiva**: Aprovechar cada cambio o mejora para refactorizar poco a poco el código donde sea necesario. Aplicar mejoras de mantenibilidad de forma incremental. Hacer TODO pequeños progresivamente.
- **Comentarios TODO**: Siempre dejar comentarios `// TODO:` de cosas que se pueden mejorar. Los TODO deben ser pequeños y progresivos, pueden ser simples o complejos, pero no deben romper el flujo actual. Sirven como recordatorio para futuras mejoras.

---

</details>

### Alta Prioridad

**UX - Modal de Tareas:**
- [x] Opción de mover tarea a otro proyecto al abrir PanelConfiguracionTarea (8.5) ✅
  - Creado `SelectorProyecto` con patrón colapsable tipo SelectorFrecuencia
  - Integrado en `PanelConfiguracionTarea` debajo del título
  - Muestra proyecto actual y permite cambiar directamente
- [x] Selector de estado de tarea después del título (8.6) ✅
  - Creado `SelectorEstadoTarea` para cambiar pendiente/completada
  - Integrado en `PanelConfiguracionTarea` en modo edición

**UX - Modal de Hábitos:**
- [ ] Selector de estado de hábito después del título (8.7)
  - Mostrar los 3 estados disponibles: completado, pospuesto, omitido
  - Solo para hábitos existentes (modo edición)
  - Ubicar debajo del nombre del hábito

**UI - Header del Dashboard:**
- [ ] Unificar estilos de botones Admin y Experimentos (8.8)
  - Quitar color violeta del botón de administración
  - Quitar color amarillo del botón de experimentos
  - Aplicar el mismo estilo neutro que los demás botones del header (botonIconoEncabezado base)
  - Mover botón de Admin al lado del botón de Experimentos en la navegación
- [ ] Buscador global centrado en el header (8.9)
  - Input de búsqueda centrado en el header principal
  - Búsqueda en tiempo real mientras se escribe
  - Mostrar resultados: tareas, proyectos y hábitos
  - Al hacer click en resultado, abrir su modal de configuración
  - Dropdown de resultados con iconos distintivos por tipo
- [ ] Menú de navegación "Dashboard" (8.10)
  - Reemplazar el SVG "Tasks" por texto "Dashboard"
  - Al hacer click, abrir menú contextual con opciones de página
  - Agregar página de ejemplo para demostrar navegación
  - Preparar estructura para futuras páginas

**UI - Headers de Paneles:**
- [ ] Reducir opacidad de elementos en header de paneles (8.11)
  - Reducir opacidad de iconos y nombre del panel
  - Mantener el icono de arrastre con opacidad actual
  - Aplicar transición suave al hover para restaurar opacidad

**UX - Menú Contextual:**
- [ ] Ocultar tooltips cuando hay menú contextual abierto (8.12)
  - Detectar cuando un menú contextual está visible
  - Deshabilitar/ocultar tooltips globalmente mientras esté abierto
  - Restaurar tooltips al cerrar el menú

### Baja Prioridad

<details>
<summary>Mejoras menores</summary>

**Hábitos:**
- [ ] Animación de entrada/salida
- [ ] Umbral de reseteo editable
- [ ] Adaptar racha a frecuencia

**Tareas:**
- [ ] Animación de arrastre más fluida
- [ ] Soporte markdown en descripción

**Ordenamiento:**
- [ ] Drag & drop manual para hábitos
- [ ] Buscar hábitos por nombre

**Responsive/PWA:**
- [ ] Layout móvil adaptativo
- [ ] Service Worker offline
- [ ] Instalable en móvil

</details>

### Fases Futuras

<details>
<summary>Fase 9: Scratchpad + File Manager</summary>

**Scratchpad - Sistema de Guardado:**
- [ ] Botón "Guardar nota" en Scratchpad
- [ ] Notas guardadas con título y fecha
- [ ] Archivo de notas guardadas

**File Manager:**
- [ ] Vista tipo explorador de archivos
- [ ] Agrupación por proyecto/tarea/tipo
- [ ] Preview de archivos
- [ ] Subir archivos sin asociar a tarea

</details>

<details>
<summary>Fase 10: Compartir Hábitos</summary>

- [ ] Tabla `wp_glory_habitos_compartidos`
- [ ] Opción "Compartir hábito" en menú contextual
- [ ] Ver estado de cumplimiento del compañero
- [ ] Notificaciones de logros

</details>

<details>
<summary>Fase 11: Futuro</summary>

- [ ] Correo de invitación a usuarios no registrados
- [ ] Notificaciones por correo (resumen, alertas)
- [ ] Feed de red social (posts, likes, comentarios)
- [ ] Gamificación (badges, niveles, leaderboards)

</details>

### Pendientes de Cifrado Avanzado (Fase 4)

- [ ] Campo `cifrado_compartido: false` en elementos compartidos
- [ ] Separar datos cifrados de no cifrados en sincronización

---

## Resumen de Fases

| Fase | Nombre                    | Estado         |
| ---- | ------------------------- | -------------- |
| 0-4  | Sistema Social            | ✅ Completada   |
| 5-7  | Urgencia, Chat, UX        | ✅ Completada   |
| 8    | Mapa de Calor + Historial | ✅ Completada   |
| 9    | Scratchpad + File Manager | Baja Prioridad |
| 10   | Compartir Hábitos         | Baja Prioridad |
| 11   | Futuro                    | Pendiente      |
