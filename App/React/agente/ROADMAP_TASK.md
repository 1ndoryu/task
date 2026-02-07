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
**Versión:** v1.0.24-beta (2026-02-07)
**Foco:** Sprint Sincronización + Notas + UX Móvil + Notificaciones Push

---

# TAREAS PENDIENTES - SPRINT ACTUAL

## 🔴 PRIORIDAD ALTA - Bugs Críticos de Sincronización

### TAREA 1: Conflictos de sincronización en hábitos (Last-Write-Wins)
**Estado:** ⬜ Pendiente | **Prioridad:** Alta | **Tipo:** Bug Crítico

**Descripción:** La sincronización entre dispositivos tiene conflictos graves:
- Al marcar/desmarcar un hábito, el estado entra en bucle (se marca y desmarca en tiempo real)
- Cambios en un dispositivo no se reflejan en otro
- Posible race condition en el WebSocket

**Requisitos:**
1. Implementar estrategia **Last-Write-Wins** con timestamps precisos
2. Cada cambio debe incluir `timestamp` del momento exacto de la acción
3. Al recibir un cambio remoto, solo aplicar si `timestamp > timestampLocal`
4. Revisar si hay conflictos en `useDashboardSync.ts` y `useNotificadorCambiosWebSocket.ts`

**Archivos a revisar:**
- `useWebSocket.ts`
- `useSincronizacionTiempoReal.ts`
- `useDashboardSync.ts`
- `useNotificadorCambiosWebSocket.ts`

---

### TAREA 2: Hábitos duplicados en panel de ejecución
**Estado:** ⬜ Pendiente | **Prioridad:** Alta | **Tipo:** Bug

**Descripción:** Al marcar un hábito desde el panel de ejecución:
- El hábito vuelve a aparecer en la lista
- Se puede marcar 2 veces
- Aparece marcado 2 veces en panel de actividad
- Al desmarcar, se eliminan ambas actividades

**Nota:** Probablemente relacionado con TAREA 1 (conflictos de sync). Resolver primero TAREA 1 y verificar si persiste.

---

### TAREA 3: Editar tarea no guarda cambios (Bug 4 usuario)
**Estado:** ⬜ Pendiente | **Prioridad:** Alta | **Tipo:** Bug

**Descripción:** En el popup de edición de tarea existente:
- Al cambiar propiedades (ej: fecha límite), no se guardan
- Cerrar el popup descarta los cambios
- Posible problema de zona horaria con fechas límite

**Reportado:** Tarea creada con fecha "mismo día" muestra expirada desde el día anterior.

**Archivos a revisar:**
- Modal/BottomSheet de edición de tareas
- Servicio de guardado de tareas
- Manejo de timezones en fechas

---

## 🟡 PRIORIDAD MEDIA - Notas y UI

### TAREA 4: Sincronización de notas en tiempo real (estilo Google Docs)
**Estado:** ⬜ Pendiente | **Prioridad:** Media | **Tipo:** Feature

**Descripción:** Las notas no se sincronizan en tiempo real entre dispositivos.

**Requisitos:**
1. Sincronizar contenido mientras se escribe (no solo al guardar)
2. Usar WebSocket para enviar cambios incrementales (no el documento completo)
3. Implementar debounce inteligente para no saturar la conexión
4. Manejar conflictos con Last-Write-Wins por sección/párrafo si es posible

**Consideraciones técnicas:**
- Evaluar si usar OT (Operational Transformation) o CRDT para resolución de conflictos
- O simplificar con Last-Write-Wins a nivel de nota completa

---

### TAREA 5: Notas no se mueven de carpeta en tiempo real
**Estado:** ⬜ Pendiente | **Prioridad:** Media | **Tipo:** Bug

**Descripción:**
1. Mover una nota de carpeta requiere recargar para ver el cambio
2. Al crear nota con botón "+", no se crea en la carpeta actual abierta

**Requisitos:**
1. Mover nota debe reflejarse inmediatamente en el árbol de carpetas
2. Crear nota debe usar la carpeta actualmente seleccionada como destino

---

### TAREA 6: Pérdida de cambios al cerrar modal de notas rápidamente
**Estado:** ⬜ Pendiente | **Prioridad:** Media | **Tipo:** Bug

**Descripción:** Al editar una nota desde el modal de notas guardadas y cerrar rápidamente, los cambios se pierden.

**Solución propuesta:**
1. Añadir indicador visual "Guardando..." mientras hay cambios pendientes
2. Bloquear cierre del modal hasta que se complete el guardado
3. O mostrar confirmación "Tienes cambios sin guardar, ¿descartar?"

---

### TAREA 7: Menú contextual panel de hábitos - Eliminar opción duplicada
**Estado:** ⬜ Pendiente | **Prioridad:** Media | **Tipo:** UI

**Descripción:** En el menú contextual del panel de hábitos aparecen:
- "Configurar hábito"
- "Editar hábito"

**Requisito:** Dejar solo "Configurar hábito" (eliminar "Editar hábito").

---

### TAREA 8: Popup tareas - Paleta de colores en modo claro (Bug 2 usuario)
**Estado:** ⬜ Pendiente | **Prioridad:** Media | **Tipo:** Bug UI

**Descripción:** El popup para añadir tarea mantiene paleta de colores de modo oscuro aunque se use modo claro.

**Requisito:** Usar variables CSS para que respete el tema actual.

---

### TAREA 9: Texto "Prioridad muy_alta" en dropdown (Bug 3 usuario)
**Estado:** ⬜ Pendiente | **Prioridad:** Media | **Tipo:** Bug UI

**Descripción:** Al seleccionar "Muy Alta" en el dropdown de prioridad, el botón muestra "Prioridad muy_alta" en vez de "Prioridad Muy Alta".

**Requisito:** Formatear correctamente el texto de prioridad.

---

## 🟠 PRIORIDAD BAJA - Mejoras UX Móvil

### TAREA 10: Pull-to-refresh en versión móvil
**Estado:** ⬜ Pendiente | **Prioridad:** Baja | **Tipo:** Feature UX

**Descripción:** Implementar gesto de tirar hacia arriba para recargar.

**Requisitos:**
1. Detectar gesto de pull-down en cualquier panel
2. Recargar solo el panel actual (no toda la app)
3. Mostrar indicador visual de recarga
4. Usar librería de gestos o implementar manualmente para Capacitor

---

### TAREA 11: Indicador de estado de conexión en móvil
**Estado:** ⬜ Pendiente | **Prioridad:** Baja | **Tipo:** Feature UX

**Descripción:** Mostrar estado de conexión visible en la versión móvil.

**Requisitos:**
1. Icono/badge en header o área visible
2. Estados: conectado, desconectado, sincronizando
3. Aprovechar el `IndicadorConexion.tsx` existente o adaptarlo para móvil

---

### TAREA 12: Notificaciones Push en APK (Firebase/OneSignal)
**Estado:** ⬜ Pendiente | **Prioridad:** Baja | **Tipo:** Feature

**Descripción:** Las notificaciones no funcionan en la APK:
- Las notificaciones locales (`useNotificacionesLocales.ts`) no se disparan
- Hábitos en ventana de oportunidad no generan notificaciones
- El botón `modalExperimentos__accionDescripcion` no funciona
- Se necesitan notificaciones **push** (desde servidor a Android)

**Requisitos:**
1. Depurar por qué las notificaciones locales no funcionan
2. Implementar Firebase Cloud Messaging (FCM) o OneSignal para push
3. Servidor debe enviar push cuando un hábito entra en ventana de oportunidad
4. La notificación debe aparecer en Android aunque la app esté cerrada

**Archivos a revisar:**
- `useNotificacionesLocales.ts`
- Verificar permisos de notificación en Android
- Configuración de Capacitor para notificaciones

---

## ⬜ BACKLOG - No Prioritario

### Modal central de configuración
**Estado:** ⬜ Pendiente | **Prioridad:** Muy Baja | **Tipo:** Refactor/Feature

**Descripción:** Centralizar todas las configuraciones de paneles en un modal único.
**Nota del usuario:** Esto NO es prioritario.

---

# HISTORIAL DE TAREAS COMPLETADAS

## Sprint Anterior (v1.0.23-beta)
- ✅ Back no funciona en APK (hook `useBackButtonCapacitor.ts`)
- ✅ Hora incorrecta en panel de actividades (parámetro `horaLocal`)
- ✅ Hábito no aparece el día correcto según frecuencia (bug off-by-one)
- ✅ Subtareas en móvil no parecen subtareas (padding-left móvil)
- ✅ Interacción de hábitos/tareas en panel de ejecución (BottomSheet)
- ✅ Modo compacto - Mejoras en hábitos (margin, swipe posponer)
- ✅ Ranking de tareas por días de vencimiento (ya implementado)
- ✅ Notificaciones locales en APK (hook `useNotificacionesLocales.ts`)
- ✅ Sincronización WebSocket entre dispositivos (SSL configurado)
- ✅ Modo Offline con IndexedDB (useModoOffline.ts, IndicadorConexion.tsx)

---

# ARCHIVO DE FASES ANTERIORES (POSPUESTA)

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
- **WebSocket:** `useWebSocket.ts`, `useSincronizacionTiempoReal.ts`, `useDashboardSync.ts`
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
