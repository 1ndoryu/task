# Dashboard de Productividad Personal - Roadmap

Sistema de seguimiento de hábitos, tareas y notas rápidas con diseño estilo terminal minimalista.

---

## Estado Actual

**Fecha de inicio:** 2025-12-19  
**Version:** v1.0.9-beta  
**Ultima actualizacion:** 2025-12-29
**Estado:** Fase 9 EN PROGRESO - Refactorización Visual Configuración (Estilo Linear)

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

- [ ] Crear componente `BotonOpcionCompacta` (extraído de modalCreacionRapida)
  - Pill clickeable con icono + texto
  - Soporte para menú contextual (usando `MenuContextual` existente)
  - Estados: normal, vacío, activo
  - Estilos: reutilizar `.creacionRapidaBotonOpcion` como base
  - Props: `icono`, `texto`, `opciones[]`, `onSeleccionar`, `valorActual`
  
- [ ] Crear componente `PropiedadesCompactas`
  - Layout inline: etiqueta "Propiedades" + lista de `BotonOpcionCompacta`
  - Usa `BotonOpcionCompacta` para cada propiedad:
    - Prioridad (opciones: Alta, Media, Baja)
    - Urgencia (opciones: Bloqueante, Urgente, Normal, Chill, Sin urgencia)
    - Fecha Límite (input date en menú)
  - Cada botón abre su menú contextual con las opciones
  - Sin overlays ni modales

#### 9.2.4 Sección de Responsables
- [ ] Crear componente `SeccionResponsables`
  - Usa el mismo layout inline que `PropiedadesCompactas`
  - Muestra participantes como `BotonOpcionCompacta` (avatar + nombre)
  - "Ninguno" si no hay asignados (pill vacío)
  - Click en participante abre menú con opciones: Cambiar rol, Remover
  - Botón "+ Agregar" abre menú con lista de compañeros disponibles
  - Reutiliza estilos de `.creacionRapidaBotonOpcion`

#### 9.2.5 Sección de Adjuntos (Separada)
- [ ] Crear componente `SeccionAdjuntos`
  - Grid de thumbnails para imágenes
  - Lista compacta para otros archivos
  - Botón `BotonOpcionCompacta` para "+ Agregar"
  - Preview inline para imágenes

#### 9.2.6 Descripción sin Borde
- [ ] Reutilizar/adaptar componente de textarea limpio
  - Auto-expand al escribir
  - Placeholder cuando vacío: "Añade una descripción..."
  - Sin borde, solo focus sutil

#### 9.2.7 Resumen de Tareas (Solo Proyectos)
- [ ] Crear componente `ResumenTareasProyecto`
  - Contador compacto: "3 completadas │ 5 pendientes"
  - Barra de progreso mini opcional
  - Link "Ver todas →" que podría abrir pestaña Issues (futuro)

#### 9.2.8 Header Derecha - Iconos de Acción
- [ ] Mover botón de cerrar (X) y reemplazar con:
  - Icono de Actividad (historial/chat) - reemplaza el botón de chat actual
  - Icono de Estadísticas (futuro)
- [ ] Quitar botón de cerrar tradicional
  - Click fuera del modal cierra (ya existe)
  - ESC cierra (ya existe)

### 9.3 Tamaño del Modal
- [ ] Aumentar `max-width` del modal de proyecto a ~600px
- [ ] Responsive: en móvil ocupa casi todo el ancho
- [ ] Altura: auto hasta max-height, luego scroll interno

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

### 9.7 Componentes Compartidos a Crear

| Componente              | Descripción                  | Prioridad |
| ----------------------- | ---------------------------- | --------- |
| `SelectorIconoProyecto` | Grid de iconos con colores   | Alta      |
| `CampoTituloLimpio`     | Input sin borde, font grande | Alta      |
| `PropiedadesCompactas`  | Grid de propiedades inline   | Alta      |
| `SeccionResponsables`   | Lista de avatares + agregar  | Media     |
| `SeccionAdjuntos`       | Grid/lista de archivos       | Media     |
| `ResumenTareasProyecto` | Contador compacto            | Media     |

### 9.8 Estilos CSS Nuevos

```css
/* configuracionModerna.css */
.configuracionModerna { }
.campoTituloLimpio { }
.propiedadesCompactasGrid { }
.seccionResponsables { }
.seccionAdjuntos { }
```

### 9.9 Orden de Implementación

1. **Fase 9.2.2** - Título/Subtítulo limpio (base del nuevo look)
2. **Fase 9.2.1** - Selector de icono
3. **Fase 9.2.3** - Propiedades compactas
4. **Fase 9.3** - Tamaño del modal
5. **Fase 9.2.6** - Descripción sin borde
6. **Fase 9.2.4** - Responsables
7. **Fase 9.2.5** - Adjuntos separados
8. **Fase 9.2.7** - Resumen de tareas
9. **Fase 9.2.8** - Header icons
10. **Fase 9.4** - Aplicar a Tareas
11. **Fase 9.5** - Aplicar a Hábitos

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
