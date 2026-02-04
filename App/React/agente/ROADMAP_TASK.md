# Dashboard de Productividad Personal - Roadmap

Sistema de seguimiento de hábitos, tareas y notas rápidas con diseño estilo terminal minimalista.

---

## PROTOCOLO DE TRABAJO

**IMPORTANTE - LEER PRIMERO:**

1. **Ejecución secuencial:** Trabajaré tarea por tarea en el orden establecido.
2. **Actualización inmediata:** Al completar cada tarea, actualizo este roadmap de inmediato.
3. **Revisión constante:** Reviso este archivo frecuentemente para ver si hay nuevos comentarios o instrucciones.
4. **Dudas:** Las dudas se escriben aquí y se deja espacio para respuesta del usuario.
5. **Commit automático:** Al finalizar cada tarea significativa, hago commit.

---

## Estado Actual
**Versión:** v1.0.22-beta (2026-02-04)
**Foco:** Sprint Bugs Críticos + Mejoras Móvil

---

# TAREAS PENDIENTES - SPRINT ACTUAL

## 🔴 PRIORIDAD ALTA - Bugs Críticos

### TAREA 1: Back no funciona en APK
**Estado:** ⬜ Pendiente | **Prioridad:** Alta | **Tipo:** Bug Crítico

**Problema:** Al presionar el botón back en la APK, se sale de la aplicación en lugar de cerrar elementos abiertos.

**Comportamiento esperado:**
1. Si hay un modal abierto → cerrar modal
2. Si hay un BottomSheet abierto → cerrar BottomSheet
3. Si hay menú lateral abierto → cerrar menú
4. Si no hay nada abierto → comportamiento por defecto (salir o ir atrás)

**Implementación:** Usar el plugin `@capacitor/app` para interceptar el evento `backButton` y manejar la navegación.

**Archivos clave:**
- `hooks/useModalesDashboard.ts` (gestión de estados de modales)
- `stores/drawersStore.ts` (gestión de drawer lateral)
- Agregar listener en archivo principal (App.tsx o index.tsx)

---

### TAREA 2: Hora incorrecta en panel de actividades
**Estado:** ⬜ Pendiente | **Prioridad:** Alta | **Tipo:** Bug

**Problema:** Las actividades muestran hora incorrecta. Ejemplo: si se completa algo a las 05:00, aparece que se completó a las 10:00 (diferencia de 5 horas, posible problema de timezone UTC vs local).

**Archivos clave:**
- `services/actividadService.ts` (funciones: `registrarHabitoCumplido`, `obtenerDetalleActividadDia`)
- `components/paneles/PanelActividad.tsx` (visualización de timestamps)
- `utils/fecha.ts` (funciones de conversión de fechas)

---

### TAREA 3: Hábito no aparece el día correcto según frecuencia
**Estado:** ⬜ Pendiente | **Prioridad:** Alta | **Tipo:** Bug

**Problema:** Caso real - Hábito "Leer" realizado el 31 de enero con frecuencia de 3 días. Debería aparecer el 3 de febrero pero aparece el 4 de febrero. No tiene badge de "hoy" ni aparece en panel de ejecución.

**Causa probable:** El cálculo de `proximaFecha` suma días desde el día siguiente en lugar del mismo día, o hay un error de off-by-one.
Archivos clave:**
- `utils/habitosLogica.ts` (funciones: `calcularToggleHabito`, `calcularPosponerHabito`)
- `stores/habitosStore.ts` (lógica de actualización de hábitos)
- `types/dashboard.ts` (interface `FrecuenciaHabito`)
- `utils/fecha.ts` (funciones: `calcularDiasDesde`, `obtenerFechaLocalISO`)
**Verificar:** Lógica en el store de hábitos para el cálculo de fechas según frecuencia.

---

## 🟡 PRIORIDAD MEDIA - Mejoras UI/UX Móvil

### TAREA 4: Subtareas en móvil no parecen subtareas (modo normal)
**Archivos clave:**
- `components/dashboard/TareaItem.tsx` (renderizado de tareas)
- `utils/jerarquiaTareas.ts` (funciones: `esSubtarea`, `obtenerPadre`, `obtenerSubtareas`)
- CSS de TareaItem con media queries para móvil
- Buscar clase/estilos para modo compacto como referencia

**Problema:** En la versión móvil, las subtareas no tienen indentación visual en modo normal. En modo compacto sí funcionan correctamente.

**Solución:** Agregar `padding-left` o `margin-left` a las subtareas en modo normal para móvil.

---


**Archivos clave:**
- `components/paneles/PanelEjecucion.tsx` (handlers de click)
- `components/dashboard/BottomSheetHabito.tsx` (edición de hábitos)
- `components/dashboard/BottomSheetTarea.tsx` (edición de tareas)
- `hooks/useModalesDashboard.ts` (funciones: abrir/cerrar BottomSheets)
- `hooks/useCreacionEntidades.ts` (handlers: `manejarGuardarHabitoBottomSheet`, `manejarGuardarTareaBottomSheet`)
### TAREA 5: Interacción de hábitos/tareas en panel de ejecución
**Estado:** ⬜ Pendiente | **Prioridad:** Media | **Tipo:** UX

**Problemas:**
1. **Hábitos:** Al tocar un hábito en panel de ejecución, debería abrir el BottomSheet (igual que en panel de hábitos). Actualmente no lo hace.
2. **Tareas:** Al tocar una tarea, abre el panel de configu

**Archivos clave:**
- `components/shared/SwipeableItem.tsx` (componente reutilizable para swipe)
- `components/dashboard/HabitoItem.tsx` (item de hábito, wrap con SwipeableItem)
- `stores/habitosStore.ts` (funciones: `toggleHabito`, `posponerHabito`)
- CSS del componente de hábitos (ajustar gap)ración en vez del BottomSheet de edición (el mismo que aparece al crear tarea).

**Comportamiento esperado:** Un toque = BottomSheet para edición rápida (tanto hábitos como tareas).

---

### TAREA 6: Modo compacto - Mejoras en hábitos
**Estado:** ⬜ Pendiente | **Prioridad:** Media | **Tipo:** UX

**Archivos clave:**
- `components/paneles/PanelEjecucion.tsx` (lógica de ordenamiento/ranking)
- `hooks/useOrdenarTareas.ts` (funciones de ordenamiento)
- `hooks/dashboard/useTareaOrdenamiento.ts` (gestión de orden)
- `utils/fecha.ts` (funciones para calcular días transcurridos)

**Mejoras:**
1. Aumentar gap entre hábitos en 2px
2. Implementar swipe con el dedo con 2 opciones:
   - Swipe derecha → Completar
   - Swipe izquierda → Posponer

**Nota:** Actualmente el swipe elimina, cambiar a posponer.

---

### TAREA 7: Ranking de tareas por días de vencimiento
**Estado:** ⬜ Pendiente | **Prioridad:** Media | **Tipo:** Feature

**Descripción:** Las tareas deben aumentar sus puntos en el ranking de ordenamiento del panel de ejecución por cada día que pase después de su fecha de vencimiento.

**Lógica sugerida:** `puntos += diasVencidos * factorUrgencia`


**Archivos a crear:**
- `services/notificacionesService.ts` (lógica de programación)
- `hooks/useNotificaciones.ts` (gestión en React)
- Integrar con `stores/habitosStore.ts` y `stores/tareasStore.ts`
---

## 🟠 PRIORIDAD BAJA - Funcionalidades Post-Lanzamiento

### TAREA 8: Notificaciones push en APK
**Estado:** ⬜ Pendiente | **Prioridad:** Baja (Post-lanzamiento) | **Tipo:** Feature

**Descripción:** Implementar sistema de notificaciones para la APK.

**Requisitos:**
1. Notificaciones push funcionales en Android
2. Notificación cuando un hábito entra en ventana de oportunidad
3. Preferencia: solución sin servicios de terceros si es posible

**Opciones técnicas:**
- **Opción 1 (sin terceros):** Usar `@capacitor/local-notifications` para notificaciones locales programadas. No requiere servidor externo.
- **Opción 2 (con terceros):** Firebase Cloud Messaging (FCM

**Archivos a crear/modificar:**
- Backend: implementar WebSocket server (posible librería: `ws` o `socket.io`)
- `services/websocketService.ts` (cliente WebSocket)
- `hooks/useSincronizacion.ts` (hook para escuchar eventos)
- Modificar todos los stores (tareas, hábitos, notas) para emitir eventos de cambios) - gratuito, pero requiere cuenta Google.

**Recomendación:** Comenzar con notificaciones locales (`@capacitor/local-notifications`) ya que no requiere backend adicional y cubre el caso de ventanas de oportunidad.

---

### TAREA 9: Sincronización en Tiempo Real (WebSockets)
**Estado:** ⬜ Pendiente | **Prioridad:** Baja (Post-lanzamiento) | **Tipo:** Feature

**Descripción:** Implementar actualización en tiempo real entre dispositivos usando WebSockets.

**Implementación sugerida:**
1. Servidor WebSocket (puede ser parte del backend existente o servicio separado)
2. Cliente WebSocket en React que escuche cambios
3. Cuando un dispositivo hace un cambio, emite evento al servidor
4. Servidor propaga a todos los dispositivos conectados del mismo usuario


**Archivos relacionados actuales:**
- `components/dashboard/ModalConfiguracionTareas.tsx`
- `components/paneles/ModalConfigActividad.tsx` (y otros modales de config)
- `stores/panelConfigStore.ts` (posible store nuevo centralizado)
- Crear: `components/dashboard/ModalConfiguracionGlobal.tsx`
**Alternativa:** Si usas Supabase, tiene Realtime integrado.

---

### TAREA 10: Modal central de configuración
**Descripción:** Si no hay internet, la app debe funcionar offline y sincronizar cuando vuelva la conexión.

**Archivos clave:**
- `services/offlineService.ts` (detección de estado de red, cola de sincronización)
- `hooks/useOffline.ts` (hook para estado online/offline)
- Modificar todos los servicios API (tareas, hábitos, notas) para queue requests
- `stores/sincronizacionStore.ts` (gestionar cola de cambios pendientes)
- Usar `@capacitor/network` para detección de conectividade

**Descripción:** Centralizar todas las configuraciones de paneles en un modal único.

**Requisitos:**
1. Modal con panel lateral para navegación entre secciones
2. Cada panel mantiene acceso directo a su configuración (atajo)
3. Incluir opciones de perfil
4. Diseño SOLID para evitar duplicación de configuraciones
5. Coherencia visual con el resto de la app

**Archivos posibles:**
- `components/notas/ListaNotasGuardadas.tsx`
- `components/notas/ModalNotasExpandido.tsx`
- `components/notas/EditorNota.tsx`
- `stores/notasStore.ts`
- CSS relacionados con notas

**Nota del usuario:** Esto NO es prioritario.


### TAREA 11: Modo Offline para App
**Estado:** ⬜ Pospuesta | **Prioridad:** Alta (Post-lanzamiento)

Si no hay internet, la app debe funcionar offline y sincronizar cuando vuelva la conexión.

---

## 🔵 PENDIENTE DE ACLARAR

### TAREA 12: Problema visual de las notas
**Estado:** ⏸️ Pendiente de aclarar | **Prioridad:** Por definir | **Tipo:** Bug/UI

**Descripción:** El usuario menciona un problema visual difícil de explicar.

**Esperando:** Descripción detallada del problema (posicionamiento, móvil/desktop, editor/lista/carpetas, etc.)

---


# Comentarios exactos del usuario. 



# ARCHIVO DE FASES ANTERIORES

## Fase 13: App Móvil Híbrida (Capacitor)
**Estado:** ✅ Autenticación completada | Pagos pendientes

- [x] Inicializar Capacitor
- [x] Generar proyecto Android
- [x] Autenticación Google nativa funcionando
- [ ] RevenueCat para pagos (pospuesto)

## Fase 14: Mejoras Pre-Beta
- [ ] Análisis de navegación lateral (sidebar)
- [ ] Auditar modales para usar variables CSS

---

## Notas Técnicas

### Archivos Clave:
- **Notas:** `useNotas.ts`, `notasStore.ts`, `ModalNotasExpandido.tsx`, `ListaNotasGuardadas.tsx`
- **Tareas/Hábitos:** Stores en `/stores`, componentes en `/components`
- **Panel Actividad:** `actividadService.ts`, `PanelActividad.tsx`
- **Estilos móvil:** Buscar media queries en archivos CSS

### Principios:
1. **SRP:** Cada componente/hook una sola responsabilidad
2. **Componentes máx 300 líneas**
3. **Hooks máx 120 líneas**
4. **CSS en español con camelCase**

---

## COMUNICACIÓN ASÍNCRONA

_Espacio para que el usuario deje comentarios durante la ejecución:_

### Comentarios del Usuario:
> _[Escribe aquí cualquier aclaración o nueva instrucción]_

### Respuestas del Agente:
> _[Responderé aquí cuando lea nuevos comentarios]_
