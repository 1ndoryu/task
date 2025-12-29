# Dashboard de Productividad Personal - Roadmap

Sistema de seguimiento de hábitos, tareas y notas rápidas con diseño estilo terminal minimalista.

---

## Estado Actual

**Fecha de inicio:** 2025-12-19  
**Version:** v1.0.9-beta  
**Ultima actualizacion:** 2025-12-29
22. ✅ **Fase 9.10** - Cambiar botones de creación a Creación Rápida (Proyectos, Tareas, etc)
**Estado:** Fase 9 EN PROGRESO - Refactorización Visual (Proyectos Finalizado ✅)

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

## Fase 9: Refactorización Visual de Configuración (Estilo Linear)

**Inspiración:** [Linear App Plan](https://linear.app/plan) - Gestión moderna de proyectos
**Enfoque:** Competencia directa a Linear, pero orientado al usuario individual con capacidad de trabajo en equipo.

### 9.1 Estructura General del Nuevo Modal/Panel (PROYECTOS PRIMERO)

**Layout objetivo (Estilo Linear Issue/Project View):**
```
┌──────────────────────────────────────────────────────────┐
│  [Icono]  Título sin borde                               │
│           Subtítulo/Lead sin borde                       │
├──────────────────────────────────────────────────────────┤
│  PROPIEDADES (Key Properties - inline, compactas)        │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Estado ○ En Progreso │ Prioridad 🚩 Alta │ ••• más │ │
│  │ Fecha 📅 Dic 29      │ Urgencia ⚡ Normal │         │ │
│  └─────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────┤
│  RESPONSABLES                                            │
│  👤 Ninguno asignado   [+ Agregar]                       │
├──────────────────────────────────────────────────────────┤
│  ADJUNTOS                                                │
│  📎 Sin adjuntos       [+ Agregar]                       │
│  [archivo1.pdf] [imagen.png] ...                         │
├──────────────────────────────────────────────────────────┤
│  DESCRIPCIÓN (textarea sin borde, expandible)            │
│  Escribe una descripción...                              │
├──────────────────────────────────────────────────────────┤
│  TAREAS (resumen compacto - solo en Proyectos)           │
│  ● 3 completadas │ ○ 5 pendientes  [Ver todas →]        │
├──────────────────────────────────────────────────────────┤
│  [Actividad 🔔] [Estadísticas 📊] (iconos header derecha)│
└──────────────────────────────────────────────────────────┘
```

### 9.2 Tareas de Implementación - Proyectos

#### 9.2.1 Icono de Proyecto
- [x] Crear componente `SelectorIconoProyecto`
  - Lista de iconos predefinidos (categorias: trabajo, personal, vida, social, hobbies)
  - Opcion de elegir color del icono (8 colores)
  - Icono por defecto: carpeta generica
  - Guardado en nuevo campo `icono?: string` y `colorIcono?: string` en tipo `Proyecto`

#### 9.2.2 Titulo y Subtitulo sin Borde
- [x] Crear componente `CampoTituloLimpio`
  - Input sin borde visible (border: none, background: transparent)
  - Placeholder sutil cuando vacio
  - Font-size mas grande para titulo principal
  - Transicion suave en focus (borde sutil aparece)
- [x] Crear componente `CampoSubtituloLimpio`
  - Similar pero font-size menor, color mas apagado
  - Campo "lead" o resumen breve del proyecto

#### 9.2.3 Propiedades Compactas (Key Properties)

**ENFOQUE CORRECTO:** Extraer `creacionRapidaBotonOpcion` como componente base reutilizable.

- [x] Crear componente `BotonOpcionCompacta` (extraído de modalCreacionRapida)
  - Pill clickeable con icono + texto
  - Soporte para menú contextual (usando `MenuContextual` existente)
  - Estados: normal, vacío, activo
  - Estilos: clase `.pillOpcion` centralizada en configuracionModerna.css
  - Props: `icono`, `texto`, `opciones[]`, `onSeleccionar`, `valorActual`
  
- [x] Crear componente `PropiedadesCompactas`
  - Layout inline: etiqueta "Propiedades" + lista de pills
  - Propiedades soportadas:
    - Prioridad (opciones: Alta, Media, Baja)
    - Urgencia (opciones: Bloqueante, Urgente, Normal, Chill, Sin urgencia)
    - Fecha Límite (input date en menú)
  - Cada botón abre su menú contextual con las opciones
  - Sin overlays ni modales - estilos de menus en configuracionModerna.css

#### 9.2.4 Sección de Responsables
- [x] Crear componente `SeccionResponsables`
  - Layout inline con etiqueta + pills de participantes
  - Muestra participantes con avatar + nombre usando `.pillOpcion`
  - "Ninguno asignado" si no hay participantes (pill vacío)
  - Click en participante abre menú con opciones: Cambiar rol, Remover
  - Botón "+ Agregar" abre menú con lista de compañeros disponibles
  - Estilos centralizados en configuracionModerna.css

#### 9.2.5 Sección de Adjuntos (Separada)
- [x] Componente `SeccionAdjuntos` ya existe en dashboard/ (462 líneas)
  - Grid de thumbnails para imágenes - implementado
  - Lista compacta para otros archivos - implementado
  - Preview inline para imágenes - implementado
  - [x] Adaptar al layout inline estilo Linear (etiqueta + pills)

#### 9.2.6 Descripción sin Borde
- [x] Reutilizar componente `CampoSubtituloLimpio`
  - Auto-expand al escribir (con limit de filas)
  - Placeholder cuando vacío: "Añade una descripción..."
  - Sin borde visible, focus con borde sutil (estilos en configuracionModerna.css)

#### 9.2.7 Hitos del Proyecto (Milestones)
- [x] Crear componente `ListaHitos` (Reemplaza a Resumen de Tareas)
  - Lista de hitos (objetivos clave del proyecto)
  - Ordenados automáticamente por prioridad
  - Funcionalidad: Agregar, Editar, Eliminar
  - Prioridades: Alta, Media, Baja
  - No admiten subtareas
  - Reutilizar lógica visual de tareas pero adaptada

#### 9.2.8 Header Derecha - Iconos de Acción
- [x] Mover botón de cerrar (X) y reemplazar con:
  - Icono de Actividad (historial/chat) - reemplaza el botón de chat actual
  - Icono de Estadísticas (futuro)
- [x] Quitar botón de cerrar tradicional
  - Click fuera del modal cierra (ya existe)
  - ESC cierra (ya existe)

### 9.3 Tamaño del Modal
- [x] Aumentar `max-width` del modal de proyecto a ~600px (clase `.modalContenedor--moderno`)
- [x] Responsive: en móvil ocupa casi todo el ancho (media query 700px)
- [x] Altura: auto hasta max-height, luego scroll interno (ya implementado en modal base)

### 9.4 Aplicar Patrón a Tareas (Después de Proyectos)
- [ ] Adaptar `PanelConfiguracionTarea` con misma estructura
  - Icono: checkbox con estado (pendiente/completado)
  - Título limpio
  - Propiedades compactas (Proyecto, Prioridad, Urgencia, Fecha)
  - Responsable (asignado a)
  - Adjuntos
  - Descripción
  - Subtareas (resumen compacto)

### 9.5 Aplicar Patrón a Hábitos (Después de Tareas)
- [ ] Adaptar `ModalHabito` con misma estructura
  - Icono: estado del hábito (completado hoy, pendiente, pospuesto)
  - Título limpio
  - Propiedades: Frecuencia, Importancia, Racha
  - Sin responsables (hábitos son personales por ahora)
  - Sin adjuntos (por ahora)
  - Descripción (nueva funcionalidad)

### 9.6 Sistema de Pestañas (Overview / Issues) - FUTURO
- [ ] Para proyectos: pestañas en el header del modal
  - Overview: la vista actual con resumen
  - Issues/Tareas: lista completa de tareas del proyecto
  - Actividad: historial y chat
- [ ] Navegación fluida entre pestañas

### 9.7 Componentes Compartidos - Estado

| Componente              | Descripción                     | Estado       |
| ----------------------- | ------------------------------- | ------------ |
| `SelectorIconoProyecto` | Grid de iconos con colores      | ✅ Completado |
| `CampoTituloLimpio`     | Input sin borde, font grande    | ✅ Completado |
| `CampoSubtituloLimpio`  | Textarea sin borde, auto-expand | ✅ Completado |
| `PropiedadesCompactas`  | Grid de propiedades inline      | ✅ Completado |
| `BotonOpcionCompacta`   | Pill reutilizable con menú      | ✅ Completado |
| `SeccionResponsables`   | Lista de avatares + agregar     | ✅ Completado |
| `ListaTareasCompacta`   | Árbol de tareas interactivo     | ✅ Completado |
| `SeccionAdjuntos`       | Grid/lista de archivos          | ✅ Completado |

### 9.8 Estilos CSS Nuevos

Todos centralizados en `configuracionModerna.css`:
- `.campoTituloLimpio`, `.campoSubtituloLimpio__input`
- `.pillOpcion`, `.botonOpcionCompacta`
- `.propiedadesCompactas`, `.propiedadesCompactas__menu`
- `.seccionResponsables--inline`
- `.resumenTareasProyecto`, `.barraProgresoMini`
- `.selectorIconoProyecto`, `.selectorColores`

### 9.2.10 Visualización Grid de Adjuntos (Explorador Minimalista)
- [ ] Separador visual estilo Hitos
- [ ] Componente `GridAdjuntos`:
  - Ubicado debajo de la sección de controles de adjuntos
  - Grid auto-responsive (3 columnas base)
  - Cards minimalistas:
    - Preview (imágenes) o Icono tipo archivo
    - Nombre truncado elegante
    - Acciones al hover (Descargar, Eliminar)

### 9.9 Orden de Implementación

1. ✅ **Fase 9.2.2** - Título/Subtítulo limpio
2. ✅ **Fase 9.2.1** - Selector de icono
3. ✅ **Fase 9.2.3** - Propiedades compactas + BotonOpcionCompacta
4. ✅ **Fase 9.3** - Tamaño del modal (600px)
5. ✅ **Fase 9.2.6** - Descripción sin borde
6. ✅ **Fase 9.2.4** - Responsables
7. ✅ **Fase 9.2.5** - Adjuntos (existente, adaptar a Linear)
8. ✅ **Fase 9.2.7** - Hitos del Proyecto (Milestones)
9. ✅ **Fase 9.2.8** - Header icons
10. ✅ **Fase 9.2.9** - Refinamientos Visuales (Ajustes finos)
      - [x] Cursor correcto en iconos header (chat, actividad)
      - [x] Ajustar gap entre iconos header
      - [x] Mover selector de icono arriba del título
      - [x] Quitar bordes y padding en input título/descripción (estado focus)
11. ⏳ **Fase 9.2.10** - Visualización Grid de Adjuntos
      - [ ] Separador visual
      - [ ] Componente GridAdjuntos (3 columnas)
      - [ ] Cards de archivo minimalistas
12. ⏳ **Fase 9.3** - Corrección de Bugs
      - [ ] Subtarea hereda proyecto del padre (Panel Ejecución)
13. ⏳ **Fase 9.4** - Aplicar a Tareas
14. ⏳ **Fase 9.5** - Aplicar a Hábitos

---

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
<summary>Fase 10: Scratchpad + File Manager</summary>

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
<summary>Fase 11: Compartir Hábitos</summary>

- [ ] Tabla `wp_glory_habitos_compartidos`
- [ ] Opción "Compartir hábito" en menú contextual
- [ ] Ver estado de cumplimiento del compañero
- [ ] Notificaciones de logros

</details>

<details>
<summary>Fase 12: Futuro</summary>

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

| Fase | Nombre                                   | Estado         |
| ---- | ---------------------------------------- | -------------- |
| 0-4  | Sistema Social                           | ✅ Completada   |
| 5-7  | Urgencia, Chat, UX                       | ✅ Completada   |
| 8    | Mapa de Calor + Historial + UX Dashboard | ✅ Completada   |
| 9    | Refactorización Visual (Estilo Linear)   | 🚧 EN PROGRESO  |
| 10   | Scratchpad + File Manager                | Baja Prioridad |
| 11   | Compartir Hábitos                        | Baja Prioridad |
| 12   | Futuro                                   | Pendiente      |
