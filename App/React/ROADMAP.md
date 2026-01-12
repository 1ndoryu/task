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
> # Desde .agent\coolify-manager
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

#### 10.8.5 Mejoras Visuales del Menú Opciones Móvil ✅

**Objetivo:** Refinar el diseño del BottomSheet de opciones para que sea más compacto y consistente.

**Mejoras implementadas:**
- [x] **Iconos consistentes:**
  - [x] Usar iconos originales de las opciones (CheckSquare, User, LayoutList, Folder)
  - [x] Fallback a iconos genéricos si no hay icono personalizado
  - [x] Tamaño de iconos reducido a 14px para consistencia
- [x] **Diseño compacto:**
  - [x] Reducir padding de `.menuOpcionesPanelItem` (espacioSm)
  - [x] Reducir altura mínima de items de 44px a 36px
  - [x] Reducir tamaño de iconos de 24px a 18px en contenedor
  - [x] Quitar título innecesario del BottomSheet
  - [x] Reducir indicador de arrastre y padding del contenido
- [x] **Variables CSS:**
  - [x] Usar `--dashboard-tamanoMuyPequeno` para títulos de grupo
  - [x] Usar `--dashboard-tamanoMovilPequeno` para etiquetas
  - [x] Usar `--dashboard-tamanoPequeno` para descripciones

---

#### 10.8.8 Bugs y Refinamientos del Menú Opciones Móvil

**Objetivo:** Corregir comportamientos inesperados y refinar el diseño del BottomSheet de opciones.  
**Prioridad:** Alta | **Urgencia:** Alta  
**Estado:** ✅ Completado

---

##### 10.8.8.1 Bug: Botón de 3 Puntos con Estilo Incorrecto ✅

**Problema resuelto:** El botón usaba `.botonIconoEncabezado__puntoNotificacion` (rojo).  
**Solución:** Creada nueva clase `.badgeFiltrosActivos` con color acento sutil.

- [x] Revisar estilos de `.botonOpcionesMovil` en `encabezado.css`
- [x] Creada clase `.badgeFiltrosActivos` con color morado sutil
- [x] El badge solo aparece si hay filtros activos
- [x] Consistencia visual con otros botones del header

---

##### 10.8.8.2 Bug: Scroll Innecesario en Paneles ✅

**Problema resuelto:** `min-height` forzado causaba scroll innecesario.  
**Solución:** Removido `min-height` en `.dashboardGridMovil` y `.panelDashboard--movil`.

- [x] Removido `min-height` que forzaba altura fija
- [x] Panel ahora usa altura automática según contenido
- [x] Sin scroll innecesario con pocas tareas

---

##### 10.8.8.3 Mejora: Arrastrar hacia Abajo para Cerrar ✅

**Implementado:** Gesto drag-to-close en el BottomSheet.

- [x] Detección de gesto swipe-down en el handle
- [x] Cierre cuando se arrastra más del 30% de altura
- [x] Velocidad del gesto también cierra (> 0.5 px/ms)
- [x] Mantiene funcionalidad de tap en overlay para cerrar

---

##### 10.8.8.4 Mejora: Iconos para Opciones de Ordenamiento ✅

**Implementado:** Iconos descriptivos para cada modo de ordenamiento.

- [x] Icono para "Manual": `GripVertical`
- [x] Icono para "Inteligente": `Sparkles`
- [x] Icono para "Fecha límite": `Calendar`
- [x] Icono para "Prioridad": `Flag`
- [x] Actualizado `useOpcionesDashboard` con diccionario `ICONOS_ORDEN`

---

##### 10.8.8.5 Mejora: Compactar Menú - Quitar Subtítulos ✅

**Implementado:** Menú más compacto sin subtítulos de grupo.

- [x] Quitados subtítulos "Ordenar por", "Filtrar por", etc.
- [x] Solo se muestran separadores sutiles entre grupos
- [x] Removidas descripciones redundantes

---

##### Orden de Implementación 10.8.8 ✅

| Paso | Subtarea | Descripción                        | Estado       |
| ---- | -------- | ---------------------------------- | ------------ |
| 1    | 10.8.8.1 | Fix botón 3 puntos (estilo)        | ✅ Completado |
| 2    | 10.8.8.2 | Fix scroll innecesario             | ✅ Completado |
| 3    | 10.8.8.5 | Compactar menú (quitar subtítulos) | ✅ Completado |
| 4    | 10.8.8.4 | Añadir iconos ordenamiento         | ✅ Completado |
| 5    | 10.8.8.3 | Gesto drag-to-close                | ✅ Completado |

---

#### 10.8.9 Limpieza del Header y UX Móvil ✅

**Objetivo:** Simplificar el header eliminando elementos obsoletos y mejorar UX táctil.  
**Prioridad:** Media | **Urgencia:** Normal  
**Estado:** ✅ Completado

---

##### 10.8.9.1 Eliminar encabezadoLogo ✅

**Problema resuelto:** El dropdown de navegación de página ya no era útil.  
**Solución:** Eliminado completamente, ahora solo muestra título simple.

- [x] Eliminar `.encabezadoLogo` y `.encabezadoTituloBoton` de `DashboardEncabezado.tsx`
- [x] Eliminar estilos asociados en `encabezado.css`
- [x] Eliminar menú de navegación de página (`menuPagina`)
- [x] Simplificar la estructura del header (solo span con título)

---

##### 10.8.9.2 Quitar Tooltips en Móvil ✅

**Problema resuelto:** Los tooltips (sistema personalizado `TooltipSystem`) aparecían en móvil.  
**Solución:** Deshabilitar completamente el `TooltipSystem` en móvil.

- [x] Modificar `TooltipSystem.tsx` para importar `useEsDispositivoMovil`
- [x] Retornar `null` inmediatamente si `esMovil === true`
- [x] Mantener `aria-label` para accesibilidad en botones del header

---

##### 10.8.9.3 Mover Búsqueda al Menú de Opciones ✅

**Mejora:** El botón de búsqueda separado ocupaba espacio innecesario.  
**Solución:** Búsqueda movida dentro del BottomSheet de opciones (3 puntos).

- [x] Eliminar `botonBuscadorMovil` del header
- [x] Añadir opción "Buscar" como primer item del menú de opciones
- [x] Limpiar CSS asociado al botón de búsqueda móvil

---

##### Orden de Implementación 10.8.9 ✅

| Paso | Subtarea | Descripción              | Estado       |
| ---- | -------- | ------------------------ | ------------ |
| 1    | 10.8.9.1 | Eliminar encabezadoLogo  | ✅ Completado |
| 2    | 10.8.9.2 | Quitar tooltips en móvil | ✅ Completado |
| 3    | 10.8.9.3 | Mover búsqueda al menú   | ✅ Completado |

---


#### 10.8.6 Modales y Botón Volver Compacto ✅

**Objetivo:** Hacer más compacto el header de modales en móvil.  
**Prioridad:** Media | **Urgencia:** Normal  
**Estado:** ✅ Completado

---

##### 10.8.6.1 Header Modal Compacto ✅

**Implementado:** Layout tipo barra de navegación móvil.

- [x] Reducir altura del header (de ~48px a ~40px)
- [x] Botón "← Volver" más pequeño - solo icono sin texto
- [x] Título con font-size reducido (12px con `--dashboard-tamanoMovilPequeno`)
- [x] Quitar subtítulos o metadata del header

---

##### 10.8.6.2 Layout del Header ✅

**Implementado:** Estructura grid de 3 columnas `40px | 1fr | 40px`.

```
┌─────────────────────────────────────┐
│ ←  │   Título del Modal    │ [   ] │
└─────────────────────────────────────┘
```

- [x] Icono de volver (←) sin texto "Volver"
- [x] Título centrado con truncamiento (ellipsis)
- [x] Espacio reservado derecho para simetría
- [x] CSS con grid-template-columns para layout consistente

---

##### Orden de Implementación 10.8.6 ✅

| Paso | Subtarea | Descripción            | Estado       |
| ---- | -------- | ---------------------- | ------------ |
| 1    | 10.8.6.1 | Header compacto 40px   | ✅ Completado |
| 2    | 10.8.6.2 | Layout grid 3 columnas | ✅ Completado |
| 3    | 10.8.6.3 | Eliminar PestanasModal | ✅ Completado |

---

##### 10.8.6.3 Eliminar Pestañas Móvil (Código Muerto) ✅

**Problema resuelto:** Las pestañas "Configuración" / "Chat / Historial" eran código muerto.  
**Solución:** Eliminado `PestanasModal` de `PanelConfiguracionTarea` y `ModalHabito`.

- [x] Eliminar importación y uso de `PestanasModal`
- [x] Eliminar estado `pestanaActiva` de los componentes
- [x] Actualizar CSS para ocultar columna derecha en móvil
- [x] Simplificar: en móvil siempre se muestra solo la configuración

---

#### 10.8.10 Formulario Compacto Móvil ✅

**Objetivo:** Compactar la vista de propiedades del formulario de tarea/hábito para móvil.  
**Prioridad:** Alta | **Urgencia:** Normal  
**Estado:** ✅ Completado

```
┌─────────────────────────────────────┐
│ Estado        ○ Pendiente          │
├─────────────────────────────────────┤
│ 🚨 Alta       ⚡ Bloqueante         │ ← Pills compactos en fila
├─────────────────────────────────────┤
│ Propiedades   📅 31 dic            │
├─────────────────────────────────────┤
│ Proyecto      📁 test proyecto      │
├─────────────────────────────────────┤
│ Repetición    🔁 Repetir            │
├─────────────────────────────────────┤
│ Etiquetas     + Etiqueta            │
├─────────────────────────────────────┤
│ Adjuntos      📎 Agregar            │
└─────────────────────────────────────┘
```

- [x] **Layout compacto de propiedades:**
  - [x] Reducir padding vertical entre filas (`espacioMovilXs`)
  - [x] Labels más pequeños (`--dashboard-tamanoMuyPequeno`)
  - [x] Pills de prioridad/urgencia más compactos (padding: 3px 8px)
  - [x] Reducir gap entre elementos del formulario (`espacioMovilSm`)
- [x] **Campos específicos:**
  - [x] Título: font-size reducido a 1.25rem
  - [x] Subtítulo: min-height 32px, font-size movil pequeño
  - [x] Pills: font-size 9px (tamanoMuyPequeno), iconos 12px
  - [x] Selector de icono: 32x32px (reducido de 40x40)
  - [x] Avatares responsables: 20x20px (reducido de 24x24)
- [x] **Variables CSS utilizadas:**
  - [x] `--dashboard-espacioMovilSm` para padding
  - [x] `--dashboard-tamanoMuyPequeno` para labels (9px)
  - [x] `--dashboard-espacioMovilXs` para gaps mínimos

---

#### 10.8.11 Modal con Chat Integrado en Móvil ✅

**Objetivo:** Ocultar iconos del header modal en móvil y mostrar el chat/actividad inline al final del modal.  
**Prioridad:** Alta | **Urgencia:** Normal  
**Estado:** ✅ Completado

```
┌─────────────────────────────────────┐
│ ←        Editar Tarea               │  ← Sin iconos de acciones
├─────────────────────────────────────┤
│                                     │
│  [Formulario de propiedades]        │
│                                     │
├─────────────────────────────────────┤
│  💬 Actividad                       │  ← Chat inline compacto
│  ─────────────────────────────────  │
│  Usuario: Comentario...             │
│  Hace 2h                            │
│  ─────────────────────────────────  │
│  [Escribir comentario...]           │
└─────────────────────────────────────┘
```

- [x] **Ocultar iconos del header modal en móvil:**
  - [x] Ocultar `.modalAccionesEncabezado > *` via CSS en móvil
  - [x] Mantener el espacio reservado para simetría del grid
  - [x] Aplicar solo cuando `esMovil === true` (condicional en JSX)
- [x] **Mostrar chat/actividad inline al final del modal:**
  - [x] En móvil, renderizar `PanelChatHistorial` dentro del contenido del modal
  - [x] Posicionar después de las propiedades del formulario (`.chatInlineMovil`)
  - [x] Pasar prop `compacto={true}` para versión reducida
- [x] **Estilos del chat compacto móvil:**
  - [x] Altura máxima limitada (200px) con scroll interno
  - [x] Input de comentario inline
  - [x] Mensajes más pequeños (font-size 9px y 8px)
  - [x] Separador visual antes del chat (border-top dashed)
- [x] **Componentes afectados:**
  - [x] `modal.css`: Estilos para ocultar acciones en móvil
  - [x] `PanelConfiguracionTarea.tsx`: Renderizar chat inline en móvil
  - [x] `PanelChatHistorial.tsx`: Añadida prop `compacto` con clase CSS
  - [x] `movil.css`: Estilos `.chatInlineMovil` y `.panelChatHistorial--compacto`

---

#### 10.8.12 Layout Listas Compactas Móvil

**Objetivo:** Mejorar el layout de las listas de proyectos y hábitos en modo compacto móvil.  
**Prioridad:** Alta | **Urgencia:** Normal  
**Estado:** ✅ Completado

##### 10.8.12.1 Proyectos - Layout 2 Filas ✅

**Problema resuelto:** Los proyectos se mostraban en una sola fila horizontal, causando truncamiento excesivo del título.  
**Solución:** Layout apilado de 2 filas implementado.

```
Antes (1 fila - mal):
┌──────────────────────────────────────────────┐
│ 📁 Título del proyec... │ 🟢 │ 75% │ 5/20 │ ⋮ │
└──────────────────────────────────────────────┘

Después (2 filas - bien):
┌──────────────────────────────────────────────┐
│ 📁 Título del proyecto completo              │
│    🟢 Activo  │  📊 75%  │  📋 5/20          │
└──────────────────────────────────────────────┘
```

- [x] Fila 1: Icono + Título completo (sin truncar, white-space normal)
- [x] Fila 2: Badges en línea (estado, progreso, contador) con flex-wrap
- [x] Ocultar columna de acciones (menú ⋮) en móvil
- [x] Reducir padding entre filas para mantener compacto (espacioXs)

##### 10.8.12.2 Tareas - Sin Cambios ✅

**Estado:** ✅ Ya están bien  
Las tareas actualmente tienen un layout adecuado para móvil. No requieren modificaciones.

##### 10.8.12.3 Hábitos - Compactar Versión Móvil ✅

**Problema resuelto:** La versión compacta de hábitos tenía demasiado espaciado en móvil.  
**Solución:** Reducidos padding, tamaños de iconos y badges.

- [x] Reducir padding vertical del item (espacioXs)
- [x] Reducir tamaño del checkbox (16px)
- [x] Compactar badge de racha (10px iconos, 2px gap)
- [x] Ocultar columnas secundarias (inactividad, urgencia, acciones)
- [x] Ocultar encabezado de tabla en móvil

##### 10.8.12.4 CSS Modificado ✅

- [x] `movil.css`: Reglas para `.proyectoItem` en móvil (layout 2 filas, flex-direction column)
- [x] `movil.css`: Reglas para `.tablaFilaCompacta` (mayor compactación de hábitos)
- [x] Ocultar `.proyectoAcciones`, `.accionesItem`, columnas secundarias en móvil

---

#### 10.8.13 Configuración de Columnas Hábitos por Dispositivo ✅

**Objetivo:** Separar la configuración de columnas visibles de hábitos entre móvil y desktop.  
**Prioridad:** Alta | **Urgencia:** Normal  
**Estado:** ✅ Completado

**Problema resuelto:** La configuración de columnas era global, causando que columnas no relevantes ocuparan espacio en móvil.  
**Solución:** Configuración separada por dispositivo con defaults optimizados.

##### 10.8.13.1 Modificar Hook useConfiguracionHabitos ✅

**Implementado:** El hook detecta el dispositivo y usa configuraciones separadas.

- [x] Importar `useEsMovil` en el hook
- [x] Definir `CONFIG_HABITOS_MOVIL_DEFECTO` con solo:
  - `indice: true` (checkbox)
  - `importancia: true` (badge prioridad)
  - `historial: true` (actividad últimos días)
  - Resto: `false`
- [x] Definir `CONFIG_HABITOS_DESKTOP_DEFECTO` con las actuales
- [x] Cargar/guardar en key diferente según `esMovil`
- [x] Primera carga en móvil: aplicar defaults móvil automáticamente

##### 10.8.13.2 Columnas Móvil por Defecto ✅

**Layout implementado en móvil:**
```
┌────────────────────────────────────────────────┐
│ ☑ │ Nombre del Hábito    │ ●○●●○ │ ALTA │
└────────────────────────────────────────────────┘
     ^                        ^       ^
     checkbox                 historial  importancia
```

- [x] Solo 3 columnas visibles: checkbox, nombre+historial, importancia
- [x] El grid se ajusta dinámicamente (sin columnas vacías)
- [x] No mostrar: inactividad, urgencia, racha, acciones, frecuencia, tocaHoy

##### 10.8.13.3 Persistencia Separada ✅

- [x] Key móvil: `glory_config_habitos_movil`
- [x] Key desktop: `glory_config_habitos_desktop`
- [x] Al cambiar de dispositivo, cargar la config correspondiente
- [x] El usuario puede personalizar cada una independientemente

##### 10.8.13.4 Actualizar Componentes ✅

- [x] `useConfiguracionHabitos.ts`: Detecta móvil, usa keys y defaults separados
- [x] `ModalConfiguracionHabitos.tsx`: Muestra solo columnas relevantes en móvil, oculta tolerancia de urgencia
- [x] El grid se ajusta automáticamente según columnas visibles (ya existente en `obtenerGridTemplate()`)

##### Orden de Implementación 10.8.13 ✅

| Paso | Subtarea  | Descripción                        | Estado       |
| ---- | --------- | ---------------------------------- | ------------ |
| 1    | 10.8.13.1 | Modificar hook con detección móvil | ✅ Completado |
| 2    | 10.8.13.2 | Defaults móvil optimizados         | ✅ Completado |
| 3    | 10.8.13.3 | Persistencia separada localStorage | ✅ Completado |
| 4    | 10.8.13.4 | Actualizar componentes             | ✅ Completado |

---

#### 10.8.7 Menús Contextuales Bottom Sheet ✅

**Objetivo:** Los menús contextuales deben cubrir el ancho completo de la pantalla desde abajo.  
**Estado:** ✅ Completado

- [x] **Estilo BottomSheet para menús contextuales:**
  - [x] `position: fixed; bottom: 0; left: 0; right: 0` (en `bottomSheet.css`)
  - [x] `width: 100%` sin márgenes laterales
  - [x] Border-radius 16px en esquinas superiores
  - [x] Overlay oscuro detrás (`.bottomSheetOverlay`)
- [x] **Animación:**
  - [x] Slide-up desde abajo con `transform: translateY(100%)` → `translateY(0)`
  - [x] Duración: 300ms con cubic-bezier
  - [x] Cerrar con slide-down (drag-to-close) o tap en overlay
- [x] **Contenido:**
  - [x] Opciones con altura táctil mínima (`--dashboard-tamanoTactilMinimo: 44px`)
  - [x] Iconos a la izquierda de cada opción
  - [x] Separadores sutiles entre grupos
  - [x] Safe area bottom con `env(safe-area-inset-bottom)`
- [x] **Componentes migrados a `MenuContextualAdaptivo`:**
  - [x] `TablaHabitos.tsx`: Menú contextual de hábitos
  - [x] `TareaItem.tsx`: Menú contextual de tareas y hábitos
---

#### 10.8.14 Limpieza Visual de Listas Móvil

**Objetivo:** Simplificar la apariencia de las listas de tareas, hábitos y proyectos en móvil.  
**Prioridad:** Alta | **Urgencia:** Normal  
**Estado:** ✅ Completado

##### 10.8.14.1 Ocultar Botones de Acciones en Tareas (Móvil) ✅

**Problema resuelto:** Los botones de tuerca y papelera ocupaban espacio innecesario en móvil.  
**Solución:** Ocultar `.tareaAccionesContenedor` en móvil - el menú contextual ya ofrece estas opciones.

- [x] Añadir regla CSS para ocultar `.tareaAccionesContenedor` en `@media (max-width: 480px)`
- [x] Verificar que el menú contextual (long-press) sigue funcionando

##### 10.8.14.2 Eliminar Colores de Fondo en Hábitos (General) ✅

**Problema resuelto:** Los fondos verde/amarillo en filas de hábitos (completado, toca hoy) eran visualmente ruidosos.  
**Solución:** Eliminados colores de fondo, manteniendo solo indicadores sutiles (borde izquierdo, checkbox, badges).

- [x] Revisar `.tablaFilaCompletada` - quitado fondo verde
- [x] Revisar `.tablaFilaTocaHoy` - quitado fondo amarillo, mantenido borde sutil
- [x] Mantener el estado visual mediante otros indicadores (checkbox, badges)
- [x] Aplicar cambio globalmente (no solo móvil)

##### 10.8.14.3 Reducir Padding Interno de Hábitos (Móvil) ✅

**Problema resuelto:** Las filas de hábitos tenían demasiado espacio interno en móvil.  
**Solución:** Compactado el padding de `.tablaFila` y `.tablaFilaCompacta` en móvil.

- [x] Reducir padding de `.tablaFila` en móvil
- [x] Reducir padding de `.tablaFilaCompacta` en móvil
- [x] Ajustar gap entre elementos internos
- [x] Verificar que el área táctil sigue siendo suficiente (mínimo 36px)

---

#### 10.8.15 Estandarización de Botones "Añadir" (Global)

**Objetivo:** Unificar visualmente los botones de añadir en todos los paneles.  
**Prioridad:** Media | **Urgencia:** Normal  
**Estado:** ✅ Completado

**Problema resuelto:** Los botones de añadir eran inconsistentes:
- Tareas: `+ nueva tarea`
- Hábitos: `+ Añadir nuevo habito de seguimiento` → Ahora: `+ Añadir`
- Proyectos: Sin botón visible

**Solución:** Estilo CSS compacto unificado aplicado. Botones ocultos en móvil (FAB es suficiente).

##### 10.8.15.1 Diseño Unificado ✅

```
┌─────────────────────────────────────┐
│  + Añadir                           │  ← Botón compacto, texto corto
└─────────────────────────────────────┘
```

- [x] Definir estilo unificado: texto pequeño, padding mínimo, borde sutil dashed
- [x] Texto genérico: `+ Añadir` (el contexto está claro por el panel)
- [x] Hover/active sutil con fondo

##### 10.8.15.2 Implementar en Componentes ✅

- [x] `TablaHabitos.tsx`: Texto acortado a `+ Añadir`, CSS actualizado en `.añadirHabito`
- [x] Tareas: Mantiene su input inline (`tareaNuevoInline`) - ya estaba compacto

##### 10.8.15.3 Ocultar en Móvil ✅

- [x] El botón FAB central hace innecesarios estos botones en móvil
- [x] Ocultados con `display: none` en móvil: `.añadirHabito`, `.tareaNuevoInline`, `.tareaNuevoBoton`

##### Orden de Implementación 10.8.14-15 ✅

| Paso | Subtarea  | Descripción                       | Estado       |
| ---- | --------- | --------------------------------- | ------------ |
| 1    | 10.8.14.1 | Ocultar acciones tareas en móvil  | ✅ Completado |
| 2    | 10.8.14.2 | Eliminar fondos color en hábitos  | ✅ Completado |
| 3    | 10.8.14.3 | Reducir padding hábitos en móvil  | ✅ Completado |
| 4    | 10.8.15.1 | Diseñar botón añadir unificado    | ✅ Completado |
| 5    | 10.8.15.2 | Implementar en todos los paneles  | ✅ Completado |
| 6    | 10.8.15.3 | Ocultar en móvil si es redundante | ✅ Completado |

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

