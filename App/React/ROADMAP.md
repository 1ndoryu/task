# Dashboard de Productividad Personal - Roadmap

Sistema de seguimiento de hábitos, tareas y notas rápidas con diseño estilo terminal minimalista.

---

## Tareas del Proyecto SaaS Task (API)

> **Última sincronización:** 2026-01-11 00:13

---

## Fase 10: Versión Móvil (WebView → APK) 📱 **PRIORITARIA**

**Objetivo:** Preparar la webapp para ser embebida en un WebView de Android y generar un APK.  
**Enfoque:** Optimizar la experiencia web móvil primero, luego empaquetar con WebView nativo.  
**Prioridad:** Alta | **Urgencia:** Normal  
**Estado:** 🚧 EN PROGRESO

### 10.1 Fundamentos CSS Móvil ✅
> Breakpoints definidos, `movil.css` creado, documentación en `docs/PATRONES_MOVIL.md`

### 10.2 Componentes Adaptativos ✅
> Una columna en móvil, búsqueda modal fullscreen, modales fullscreen con botón "← Volver", `BottomSheet` con animación y overlay, `MenuContextualAdaptivo` integrado

### 10.3 Header Móvil ✅
> Layout grid 3 columnas (hamburguesa | título | búsqueda), `DrawerMovil` con swipe y overlay, header fijo con `position: fixed`, iconos unificados (20px)

---

### 10.4 Optimización WebView ✅

**Objetivo:** Asegurar compatibilidad y rendimiento en WebView Android.

- [x] **Viewport y meta tags:**
  - [x] `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">`
  - [x] `<meta name="mobile-web-app-capable" content="yes">`
  - [x] `<meta name="theme-color" content="#090909">` para barra de estado
  - [x] `format-detection` para desactivar auto-links
- [x] **Safe Areas:**
  - [x] Variables CSS `--dashboard-safeArea*` con `env()` y fallbacks
  - [x] Clase `.contenedorConSafeArea` utilitaria
  - [x] Safe areas automáticos en header, drawer, modal, bottomsheet, navegación
- [x] **Rendimiento WebView:**
  - [x] Animaciones con `transform` y `opacity` únicamente
  - [x] `will-change` y `backface-visibility` en elementos animados
  - [x] `touch-action: manipulation` para eliminar delay 300ms
  - [x] `-webkit-tap-highlight-color: transparent`
- [ ] **Comunicación JS ↔ Android (Futuro):**
  - [ ] Definir interfaz `window.Android` para callbacks nativos
  - [ ] Notificaciones push vía Firebase (opcional)
  - [ ] Acceso a cámara/galería nativo (opcional)

### 10.5 UX Mobile-First ✅

**Objetivo:** Experiencia táctil fluida y natural.

- [x] **Tamaños táctiles:**
  - [x] Variable `--dashboard-tamanoTactilMinimo: 44px`
  - [x] Variable `--dashboard-espacioTactil: 8px`
- [x] **Feedback táctil:**
  - [x] Estados `:active` con `opacity` y `scale` en botones
  - [x] Transiciones suaves de 0.1s en elementos interactivos
- [x] **Scroll optimizado:**
  - [x] `-webkit-overflow-scrolling: touch` en contenedores
  - [x] `overflow-x: hidden` para evitar scroll horizontal
  - [x] `overscroll-behavior: none` para evitar rebote
- [x] **Modales fullscreen faltantes:**
  - [x] Aplicar a: ConfiguraciónTarea, ConfiguraciónProyecto, ModalHabito (ya usan Modal base con fullscreen)

### 10.6 Navegación Móvil ✅

**Objetivo:** Navegación nativa estilo app.

```
┌─────────────────────────────────────┐
│  🏠  │  📋  │  ➕  │  🔔  │  👤  │
└─────────────────────────────────────┘
```

- [x] **Componente `NavegacionInferior`:**
  - [x] Fijo en la parte inferior (position: fixed)
  - [x] 5 iconos minimalistas sin etiquetas
  - [x] Indicador visual de sección activa
  - [x] Altura: ~52px + safe-area-inset-bottom
- [x] **Botón FAB central (+):**
  - [x] Círculo con borde sutil (monocromático)
  - [x] Al tocar: abre menú con opciones (Tarea, Proyecto, Hábito)
- [x] **Rutas de navegación:**
  - [x] Home → Dashboard
  - [x] Tasks → Lista de tareas
  - [x] Notificaciones → Modal notificaciones
  - [x] Perfil → Modal perfil

### 10.7 Preparación APK (Futuro)

**Objetivo:** Documentar y preparar el empaquetado Android.

- [ ] **Documentación técnica:**
  - [ ] Crear `docs/WEBVIEW_ANDROID.md` con instrucciones
  - [ ] Requisitos mínimos de Android (API level)
  - [ ] Configuración de WebView recomendada
- [ ] **Assets para APK:**
  - [ ] Icono de app (múltiples resoluciones)
  - [ ] Splash screen
  - [ ] Nombre de app y package name
- [ ] **Configuración WebView:**
  - [ ] JavaScript habilitado
  - [ ] DOM Storage habilitado
  - [ ] Cache configurado
  - [ ] Manejo de permisos (cámara, archivos)

---

### 10.8 Reestructuración UX Móvil 🚧 EN PROGRESO

**Objetivo:** Transformar la experiencia móvil para que cada panel sea una página independiente con navegación nativa.  
**Prioridad:** Alta | **Urgencia:** Alta  
**Estado:** 🚧 EN PROGRESO

> **Para ver cambios aplicados en móvil:**
> ```powershell
> # Desde ...\coolify-manager
> .\manager.ps1 deploy -SiteName nakomi -Update
> ```

---

#### 10.8.1 Sistema de Navegación por Páginas ✅

**Objetivo:** Cada panel principal es una página independiente en móvil.

```
┌─────────────────────────────────────┐
│  📋  │  📁  │  ➕  │  ✅  │  📊  │
│ Tareas │ Proy │ FAB │ Hábi │ Acti │
└─────────────────────────────────────┘
```

- [x] **Reestructurar Navegación Inferior:**
  - [x] Botón 1: Panel Ejecución/Tareas (por defecto al abrir)
  - [x] Botón 2: Panel Proyectos
  - [x] Botón 3: FAB central (crear Tarea/Proyecto/Hábito)
  - [x] Botón 4: Panel Hábitos
  - [x] Botón 5: Panel Actividad/Mapa de Calor
- [x] **Estado de navegación:**
  - [x] Hook `usePaginaMovil` para gestionar página activa
  - [x] Persistir última página visitada en localStorage
  - [x] Transiciones suaves entre páginas (fade animation)
- [x] **Renderizado condicional:**
  - [x] Solo renderizar el panel activo en móvil
  - [x] Mantener estado de cada panel al cambiar

---

#### 10.8.2 Paneles Fullscreen Sin Bordes ✅

**Objetivo:** Los paneles ocupan el 100% del viewport sin decoraciones.

- [x] **Estilos de panel móvil:**
  - [x] Quitar `border`, `border-radius` de paneles en móvil
  - [x] `width: 100%` con padding pequeño (8-12px)
  - [x] Sin sombras ni separadores visuales
  - [x] Fondo hereda del contenedor principal
- [x] **Quitar elementos de control:**
  - [x] Ocultar botones de minimizar/maximizar/cerrar panel
  - [x] Ocultar cabecera de panel si solo contiene controles
  - [x] Mantener solo el contenido funcional

---

#### 10.8.3 Menú de Opciones Unificado ✅

**Objetivo:** Consolidar todas las opciones de panel en un solo botón.

```
┌─────────────────────────────────────┐
│ Panel Tareas          [🔍] [⚙️]    │
└─────────────────────────────────────┘
               ↓ toca ⚙️
┌─────────────────────────────────────┐
│         OPCIONES                    │
├─────────────────────────────────────┤
│ 📊 Ordenar por...                   │
│ 🔽 Orden ascendente/descendente     │
│ 🏷️ Filtrar por etiqueta            │
│ 📁 Filtrar por proyecto             │
│ 📅 Filtrar por fecha                │
│ ⚙️ Configuración del panel          │
│ 🔄 Actualizar                       │
└─────────────────────────────────────┘
```

- [x] **Componente `MenuOpcionesPanel`:**
  - [x] Creado para desktop (wrapper que muestra children o BottomSheet)
  - [x] En móvil: botón de 3 puntos movido al **header móvil superior** (junto a la lupa)
  - [x] Abre BottomSheet con todas las opciones agrupadas
  - [x] Opciones varían según el panel activo
- [x] **Arquitectura móvil:**
  - [x] **Ocultar encabezado de paneles** (`SeccionEncabezado`) en móvil via CSS
  - [x] Hook `useOpcionesPanelMovil` construye opciones según `paginaMovil.paginaActiva`
  - [x] `DashboardEncabezado` recibe `opcionesMovil` y muestra el botón de 3 puntos
- [x] **Opciones a incluir:**
  - [x] Ordenamiento con opción activa resaltada
  - [x] Filtros con opción activa resaltada (solo tareas)
  - [x] Configuración específica del panel
- [x] **Indicador visual:**
  - [x] Badge o punto cuando hay filtros activos
  - [x] Helpers: `crearOpcionesOrdenamiento`, `crearOpcionesFiltro`, `crearOpcionConfiguracion`
- [x] **CSS agregado:**
  - [x] `.botonOpcionesMovil` en `encabezado.css`
  - [x] `.menuOpcionesPanelContenido`, `.menuOpcionesPanelItem` en `movil.css`
  - [x] Regla para ocultar `.seccionEncabezado` en móvil

---

#### 10.8.4 Eliminar Capacidad de Minimizar (Móvil) ✅

**Objetivo:** En móvil no tiene sentido minimizar paneles.

- [x] **Ocultar controles de minimizar:**
  - [x] `display: none` para botón minimizar en móvil (CSS en movil.css línea 785)
  - [x] Quitar animación de colapso en móvil (no se renderiza el componente)
  - [x] Paneles siempre en estado "expandido" (móvil siempre renderiza panel activo)
- [x] **Limpiar lógica:**
  - [x] En DashboardGrid.tsx: `handleMinimizarElement = esMovil ? null : ...`
  - [x] No es necesario condicional en hook: sin botón, la función nunca se invoca

---

#### 10.8.5 Modales y Botón Volver Compacto

**Objetivo:** Hacer más compacto el header de modales en móvil.

- [ ] **Header modal compacto:**
  - [ ] Reducir altura del header (de ~48px a ~40px)
  - [ ] Botón "← Volver" más pequeño o solo icono
  - [ ] Título con font-size reducido (14-16px)
  - [ ] Quitar subtítulos o metadata del header
- [ ] **Layout del header:**
  ```
  ┌─────────────────────────────────────┐
  │ ← │ Título del Modal          [✕] │
  └─────────────────────────────────────┘
  ```
  - [ ] Icono de volver (←) sin texto "Volver"
  - [ ] Título centrado o alineado a la izquierda
  - [ ] Botón cerrar (✕) opcional a la derecha

---

#### 10.8.6 Menús Contextuales Bottom Sheet

**Objetivo:** Los menús contextuales deben cubrir el ancho completo de la pantalla desde abajo.

- [ ] **Estilo BottomSheet para menús contextuales:**
  - [ ] `position: fixed; bottom: 0; left: 0; right: 0`
  - [ ] `width: 100%` sin márgenes laterales
  - [ ] Border-radius solo en esquinas superiores (12-16px)
  - [ ] Overlay oscuro detrás
- [ ] **Animación:**
  - [ ] Slide-up desde abajo (transform: translateY)
  - [ ] Duración: 200-250ms
  - [ ] Cerrar con slide-down o tap en overlay
- [ ] **Contenido:**
  - [ ] Opciones con altura táctil (44-48px)
  - [ ] Iconos a la izquierda de cada opción
  - [ ] Separadores sutiles entre grupos
  - [ ] Safe area bottom para dispositivos con gestos

---

#### 10.8.7 Header Móvil Ajustado

**Objetivo:** Adaptar el header móvil fijo para la nueva arquitectura.

- [ ] **Contenido dinámico:**
  - [ ] Mostrar nombre del panel/página actual
  - [ ] Hamburguesa a la izquierda (Drawer)
  - [ ] Búsqueda y Opciones a la derecha
- [ ] **Sincronización con navegación:**
  - [ ] Título cambia según página activa
  - [ ] Posiblemente quitar icono de búsqueda del nav inferior

---

### Orden de Tareas 10.8

| Paso | Subtarea | Descripción                     | Prioridad |
| ---- | -------- | ------------------------------- | --------- |
| 1    | 10.8.1   | Sistema navegación por páginas  | Alta      |
| 2    | 10.8.2   | Paneles fullscreen sin bordes   | Alta      |
| 3    | 10.8.4   | Eliminar minimizar en móvil     | Media     |
| 4    | 10.8.3   | Menú opciones unificado         | Media     |
| 5    | 10.8.5   | Botón volver compacto           | Media     |
| 6    | 10.8.6   | Menús contextuales bottom sheet | Alta      |
| 7    | 10.8.7   | Header móvil ajustado           | Media     |

---

### Orden de Implementación Fase 10

| Paso | Subfase | Descripción               | Estado        |
| ---- | ------- | ------------------------- | ------------- |
| 1    | 10.1    | Fundamentos CSS           | ✅ Completado  |
| 2    | 10.2    | Componentes Adaptativos   | ✅ Completado  |
| 3    | 10.3    | Header Móvil + Drawer     | ✅ Completado  |
| 4    | 10.4    | Optimización WebView      | ✅ Completado  |
| 5    | 10.5    | UX Mobile-First           | ✅ Completado  |
| 6    | 10.6    | Navegación Inferior       | ✅ Completado  |
| 7    | 10.7    | Preparación APK           | ⏳ Pendiente   |
| 8    | 10.8    | Reestructuración UX Móvil | 🚧 EN PROGRESO |

---

## Fase 11: Sistema de Notas Mejorado

**Objetivo:** Mejorar la experiencia de escritura y gestión de notas.  
**Prioridad:** Media | **Urgencia:** Chill

#### 11.1 Editor de Notas con Markdown
- [ ] Implementar parser de Markdown en el panel de escritura
- [ ] Soporte para sintaxis básica: **negrita**, *cursiva*, listas, código
- [ ] Preview en tiempo real o toggle vista previa
- [ ] Atajos de teclado (Ctrl+B, Ctrl+I, etc.)

#### 11.2 Vista Expandida de Notas
- [ ] Botón "Expandir" en sección Notas Guardadas
- [ ] Layout de dos columnas: lista de notas | editor
- [ ] Navegación entre notas sin recargar página
- [ ] Reutilizar componente existente (centralizar lógica)

#### 11.3 Búsqueda de Notas
- [ ] Integrar notas en el sistema de búsqueda global
- [ ] Indexar título y contenido de notas
- [ ] Mostrar resultados de notas en dropdown de búsqueda

---

## Fase 12: Gestión de Tiempo (Time Tracking)

**Objetivo:** Agregar seguimiento de tiempo a hábitos y tareas.  
**Prioridad:** Baja | **Urgencia:** Chill  
**Nota:** Requiere planificación adicional y adaptación de la API.

#### 12.1 Diseño y Planificación
- [ ] Definir modelo de datos para registros de tiempo
- [ ] Diseñar UI del cronómetro/timer
- [ ] Definir integración con hábitos (opción "activar tracking")
- [ ] Evaluar si aplicarlo también a tareas

#### 12.2 Implementación Base
- [ ] Componente `Cronometro` (play, pause, stop)
- [ ] Hook `useTimeTracking` para gestionar estado
- [ ] Almacenamiento de sesiones de tiempo
- [ ] Integración con hábitos: botón play al lado del checkbox

#### 12.3 Reportes de Tiempo
- [ ] Vista de tiempo invertido por hábito/tarea
- [ ] Gráficos de distribución de tiempo
- [ ] Exportar datos de tiempo

---

### Tareas Completadas Recientes ✅

<details>
<summary>Fase 10: Móvil/PWA (Enero 2026)</summary>

| Tarea                                                        | Subfase |
| ------------------------------------------------------------ | ------- |
| Breakpoints CSS definidos, `movil.css` creado, documentación | 10.1    |
| Modales fullscreen con botón "Volver", layout una columna    | 10.2    |
| BottomSheet, MenuContextualAdaptivo integrado                | 10.2    |
| Header móvil grid 3 columnas, iconos 20px unificados         | 10.3    |
| DrawerMovil con swipe, overlay y animación                   | 10.3    |
| Búsqueda modal fullscreen en móvil                           | 10.2    |
| Meta tags WebView, safe areas CSS, touch optimizations       | 10.4    |
| Tamaños táctiles, feedback :active, scroll optimizado        | 10.5    |
| NavegacionInferior con FAB monocromático, menú creación      | 10.6    |

</details>

<details>
<summary>Fase 9: Refactorización Visual Linear (Dic 2025)</summary>

| Componente/Feature                                                          | Estado |
| --------------------------------------------------------------------------- | ------ |
| SelectorIconoProyecto, CampoTituloLimpio, CampoSubtituloLimpio              | ✅      |
| PropiedadesCompactas, BotonOpcionCompacta, SeccionResponsables              | ✅      |
| ListaTareasCompacta, SeccionAdjuntos, GridAdjuntos                          | ✅      |
| FormularioTareaModerno + selectores pill (Estado, Proyecto, Repetición)     | ✅      |
| FormularioHabitoModerno + selectores pill (Importancia, Estado, Frecuencia) | ✅      |
| FormularioProyectoModerno + SelectorEstadoProyectoPill                      | ✅      |
| Sistema de Tags con autocompletado                                          | ✅      |
| Responsables vs Compartir diferenciados                                     | ✅      |
| Panel de Comentarios rediseñado (input fijo inferior)                       | ✅      |
| Estandarización de FilaPropiedades (Tareas, Hábitos, Proyectos)             | ✅      |
| Hooks: useAutoguardado, usePanelChat, PestanasModal                         | ✅      |

</details>

---


## Estado Actual

**Fecha de inicio:** 2025-12-19  
**Version:** v1.0.11-beta  
**Ultima actualizacion:** 2026-01-11  
**Estado:** Fase 9 COMPLETA - Fase 10 EN PROGRESO

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

### Alta Prioridad

<details>
<summary>Fase 9: Refactorización Visual de Configuración (Estilo Linear) ✅ COMPLETADA</summary>

**Inspiración:** [Linear App Plan](https://linear.app/plan)  
**Enfoque:** Gestión moderna de proyectos, orientado al usuario individual con capacidad de trabajo en equipo.

#### Resumen de Logros

**Componentes Creados:**
- `SelectorIconoProyecto`, `CampoTituloLimpio`, `CampoSubtituloLimpio`
- `PropiedadesCompactas`, `BotonOpcionCompacta`, `SeccionResponsables`
- `ListaTareasCompacta`, `SeccionAdjuntos`, `GridAdjuntos`
- `FormularioTareaModerno`, `FormularioHabitoModerno`, `FormularioProyectoModerno`
- Selectores Pill: Estado, Proyecto, Repetición, Importancia, Frecuencia

**Hooks Creados:**
- `useAutoguardado`, `usePanelChat`, `PestanasModal`

**Mejoras Visuales:**
- Layout estilo Linear con propiedades inline compactas
- Modal de 600px responsive
- Sistema de Tags con autocompletado
- Responsables vs Compartir diferenciados
- Panel de Comentarios rediseñado

**Estilos CSS** en `configuracionModerna.css`:
- `.campoTituloLimpio`, `.pillOpcion`, `.botonOpcionCompacta`
- `.propiedadesCompactas`, `.seccionResponsables--inline`
- `.selectorIconoProyecto`, `.selectorColores`

#### Tareas Pendientes (Fase 9)

- [ ] **9.4** Adaptar `PanelConfiguracionTarea` con misma estructura completa
- [ ] **9.5** Adaptar `ModalHabito` con misma estructura completa
- [ ] **9.6** Sistema de Pestañas (Overview / Issues) para proyectos
- [ ] **9.7.9** Sistema de Temas Visuales (Original, Dark Mode, Light Mode)

</details>

---

<details>
<summary>Fase 9.7: Refinamientos Post-Fase 9 ✅ COMPLETADA</summary>

**Logros:**
- Ajustes visuales: botón eliminar, modal responsables, padding chat
- Bugs lógica: deshacer acción, subtareas heredan proyecto, modal cierre
- Organización propiedades en 3 filas con etiquetas
- Sistema de Tags con autocompletado
- Responsables vs Compartir diferenciados
- Panel de Comentarios rediseñado
- Mejoras visuales en Hábitos (separador, meses, descripción, icono)
- Estandarización de propiedades (Tareas, Hábitos, Proyectos)
- Fix: input comentarios fijo no cubre contenido

</details>

### 9.7.9 Sistema de Temas Visuales (Pendiente)

**Objetivo:** Permitir al usuario cambiar el tema visual del dashboard.

| Tema           | Descripción                                         |
| -------------- | --------------------------------------------------- |
| **Original**   | Tema actual (dark mode estilo terminal/minimalista) |
| **Dark Mode**  | Dark mode genérico más estándar                     |
| **Light Mode** | Tema claro para preferencias de día                 |

**Tareas:**
- [ ] Crear `ModalTemas.tsx` con selector visual
- [ ] Modificar `variables.css` para soportar múltiples temas
- [ ] Agregar opción al menú contextual del usuario
- [ ] Hook `useTema` para gestionar el estado

---

### Baja Prioridad

<details>
<summary>Mejoras menores</summary>

**Chat/Mensajes:**
- [x] Compactar mensajes (menos padding)
- [x] Verificar historial de cambios en chat de proyectos

**Hábitos:**
- [x] Animación de entrada/salida
- [x] Umbral de reseteo editable
- [x] Adaptar racha a frecuencia

**Tareas:**
- [x] Animación de arrastre más fluida
- [x] Soporte markdown en descripción

**Ordenamiento:**
- [x] Drag & drop manual para hábitos
- [x] Buscar hábitos por nombre

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

| Fase  | Nombre                                   | Estado          |
| ----- | ---------------------------------------- | --------------- |
| 0-4   | Sistema Social                           | ✅ Completada    |
| 5-7   | Urgencia, Chat, UX                       | ✅ Completada    |
| 8     | Mapa de Calor + Historial + UX Dashboard | ✅ Completada    |
| 9     | Refactorización Visual (Estilo Linear)   | ✅ Completada    |
| 10    | Versión Móvil (PWA)                      | 🚧 EN PROGRESO   |
| 11    | Sistema de Notas Mejorado                | Media Prioridad |
| 12    | Gestión de Tiempo (Time Tracking)        | Baja Prioridad  |
| Extra | Scratchpad + File Manager                | Baja Prioridad  |
| Extra | Compartir Hábitos                        | Baja Prioridad  |

