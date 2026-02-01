# Dashboard de Productividad Personal - Roadmap

Sistema de seguimiento de hábitos, tareas y notas rápidas con diseño estilo terminal minimalista.

---

## Estado Actual
**Versión:** v1.0.20-beta (2026-02-01)
**Foco:** Mejoras de UI Móvil - Revisión Completada

---

# Nueva revision ✅

1. ✅ **Autocompletado del teclado móvil**: Reforzados los atributos del input en todos los BottomSheets con `inputMode="text"`, `enterKeyHint="done"`, `name` único, y atributos para gestores de contraseñas (`data-lpignore`, `data-1p-ignore`, `aria-autocomplete="none"`).
2. ✅ Poner el boton de cerrar sesión al final en el menu movil. 
3. ✅ Bug propiedades BottomSheet al editar (desaparecían inmediatamente). Iconos BottomSheet ahora 18px con gap 8px.
4. ✅ Centralizar opciones del menú de usuario (creado `utils/opcionesMenuUsuario.tsx`). Layout, notificaciones, panel de administracion, laboratorio NO van en móvil.
5. ✅ Menu contextual: botones con +2px padding vertical, iconos subidos 2px.

# Nueva revisión completada ✅

1. ✅ En el modo compacto de las tareas, y habitos, agregar 1px mas de tamaño a la fuente, solo en version movil. 
2. ✅ En menu lateral movil arreglado el bug de separadores juntos (cuando la última opción tiene separadorDespues y hay opciones secundarias).
3. ✅ Cuando se abre el bottomS, el teclado movil ya no muestra autocompletado (desactivado con autoComplete="off", autoCorrect="off", etc).
4. ✅ El modal de selector de propiedades del BottonS ahora usa Portal para centrarse correctamente en viewport, y las letras son más pequeñas (10px).
5. ✅ **Refactor visual menú contextual móvil**: Ahora el MenuOpcionesPanel y EncabezadoOpcionesMovil usan el mismo patrón que bottomSheetItem (texto primero, icono azul al final, sin check).

---

# Refactorización Completada ✅

## 1. Centralizar opciones del menú de usuario (COMPLETADO - 2026-02-01)

**Solución implementada:**
- ✅ Creado `utils/opcionesMenuUsuario.tsx` con configuración centralizada
- ✅ `EncabezadoMovil.tsx` ahora usa la configuración centralizada
- ✅ Opciones de Layout, notificaciones, admin y laboratorio NO aparecen en móvil
- ✅ Iconos 18px en móvil, 12px en escritorio
- ✅ "Cerrar Sesión" siempre al final del menú

**Archivos modificados:**
- `utils/opcionesMenuUsuario.tsx` (nuevo)
- `components/dashboard/encabezado/EncabezadoMovil.tsx`

---

# Revisiones Móvil en Progreso 📱


## Tareas BottomSheet (1-4) ✅
- [x] **2. Iconos 16px + separación 2px**: Cambiar tamaño de iconos de acciones a 16px y gap a 2px
- [x] **3. Modal selector propiedades - centrado y estilos**: Verificar centrado, usar variables CSS, fuente pequeña
- [x] **4. Badges sin fondo**: Los badges de propiedades seleccionadas deben ser sin fondo, usar variable de borderRadius

## Menú Contextual Móvil (5) ✅
- [x] **5. Refactor visual menú contextual móvil**: Texto primero, icono al final (al otro lado), quitar check cuando seleccionada, icono azul

## Botón Añadir Tareas (6) ✅
- [x] **6. Mostrar "+ Añadir" en móvil**: Actualmente está oculto por CSS en movilListas.css, debe aparecer

## Estado Vacío (6) ✅
- [x] **7. Centrar estado vacío verticalmente**: El placeholder vacío debe estar en el centro de la pantalla

## Bug de Altura (7) ✅
- [x] **8. Bug scroll móvil con barra del navegador**: Solucionado usando `100dvh` (dynamic viewport height) en lugar de `100vh`. El dvh se ajusta automáticamente cuando la barra del navegador aparece/desaparece. También se aumentó el padding-bottom del contenedor con navegación inferior para asegurar que las últimas tareas sean visibles. Archivos modificados:
  - `base.css`: min-height: 100dvh con fallback
  - `movilComponentes.css`: height/max-height: 100dvh para modales móviles
  - `modal.css`: height/max-height: 100dvh para modales móviles
  - `estadoVacio.css`: min-height con dvh para centrado vertical
  - `navegacionInferior.css`: padding-bottom aumentado con variables CSS
  - `variables.css`: nuevas variables `--dashboard-alturaHeaderMovil` y `--dashboard-alturaNavInferior`

## Menú Contextual Proyectos (8) ✅
- [x] **9. Proyectos sin menú contextual móvil**: ListaProyectos usa MenuContextual tradicional, debe usar MenuContextualAdaptivo

## Drawer Móvil (9) ✅
- [x] **10. Refactor DrawerMovil**:
  - Quitar botón X (innecesario)
  - Centrar badge Free respecto al nombre
  - Imagen de usuario 2px más pequeña (42px)
  - Letras de menú más pequeñas
  - Agregar todas las opciones del menú de usuario de escritorio
  - Eliminar drawerMovilPie, mover todo a drawerMovilNavegacion

---

## Historial de Revisiones Completadas

### Fase Móvil Completada (2026-01-31)
- ✅ BottomSheet para edición de tareas móvil
- ✅ Bottom Sheet compacto con variables correctas
- ✅ Drawer encima del nav inferior
- ✅ Badge "MUY_ALTA" muestra correctamente
- ✅ Header de modales móvil corregido
- ✅ Drawer: click en foto/nombre abre perfil
- ✅ Spacing en modal configuración mejorado
- ✅ Bug de repetición corregido
- ✅ BottomSheet más compacto
- ✅ Fuente reducida en BottomSheet
- ✅ Refactor Barra Acciones BottomSheet
- ✅ Unificación BottomSheets (SOLID)
- ✅ Badge Adjunto Premium corregido
- ✅ Menú contextual - solo uno visible a la vez
- ✅ Menú contextual hábitos sincronizado
- ✅ Prioridad "Muy Alta" agregada
- ✅ Tareas no editables inline en móvil
- ✅ Sistema Bottom Sheet unificado
- ✅ Bloqueo selección texto y zoom gestos
- ✅ Refactor menú hamburguesa
- ✅ Refactorización SOLID de DashboardModales
- ✅ Refactorización profunda de DashboardModales (361→50 líneas)
- ✅ BottomSheet integración y refactorización SOLID
- ✅ Modales de selección de propiedades
- ✅ Badges de propiedades seleccionadas
- ✅ Refactor movil.css en 8 archivos modulares

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
