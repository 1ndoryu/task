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
**Versión:** v1.0.23-beta (2026-02-04)
**Foco:** Sprint Bugs Críticos + Mejoras Móvil + Funcionalidades Post-Lanzamiento

# Revisiones

1. El back sigue sin funcionar, no se si es porque deba de procesar el apk nuevamente, o sea generalo y reinstlar.

2. "TAREA 5: Interacción de hábitos/tareas en panel de ejecución" Se mal interpreo, lo que tiene abrir al dar un toque sobre las tareas o habitos es 

<div class="bottomSheetContenido"><div class="bottomSheetTarea"><div class="bottomSheetTarea__inputWrapper"><input type="text" placeholder="¿Qué necesitas hacer?" class="bottomSheetTarea__input" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" data-form-type="other" inputmode="text" enterkeyhint="done" name="bottomsheet-tarea-input" data-lpignore="true" data-1p-ignore="true" aria-autocomplete="none" value=""></div><div class="bottomSheetTarea__acciones"><div class="bottomSheetTarea__opcionesGrupo"><button type="button" class="bottomSheetTarea__accion " aria-label="Proyecto" title="Proyecto">

Lo copio del html para que se entienda mi punto, es lo que abre cuando toco un habito en el panel de habitos pero en el panel de ejecucion no pasa ni con las tareas. No estoy pidiendo que se abra el modal de configuracion eso se abre en otra circustancia.

---

# TAREAS PENDIENTES - SPRINT ACTUAL

## 🔴 PRIORIDAD ALTA - Bugs Críticos

### TAREA 1: Back no funciona en APK
**Estado:** ✅ Completado | **Prioridad:** Alta | **Tipo:** Bug Crítico

**Solución implementada:** Creado hook `useBackButtonCapacitor.ts` que intercepta el evento `backButton` de Capacitor. Revisa en orden: menús contextuales, BottomSheets, drawer, modales. Solo minimiza la app si no hay nada abierto.

**Fix dependencias (2026-02-04):** Resuelto error de build en producción. Se agregó `@capacitor/app@^6.0.3` al `package.json` de `Glory/assets/react` y se configuró alias en `vite.config.ts` para resolver correctamente el import desde `App/React/hooks/useBackButtonCapacitor.ts`.

---

### TAREA 2: Hora incorrecta en panel de actividades
**Estado:** ✅ Completado | **Prioridad:** Alta | **Tipo:** Bug

**Solución implementada:** Añadido parámetro `horaLocal` al servicio de actividad. El frontend envía la hora local del cliente (`HH:MM:SS`) y el backend la usa directamente en lugar de depender del timezone del servidor.

---

### TAREA 3: Hábito no aparece el día correcto según frecuencia
**Estado:** ✅ Completado | **Prioridad:** Alta | **Tipo:** Bug

**Solución implementada:** Corregido bug off-by-one en `frecuenciaHabitos.ts`. El problema era que `ultimaFecha` usaba `T12:00:00` mientras `hoy` usaba medianoche, causando diferencia de 0.5 días. Normalizado ambas a `T00:00:00`.

---

## 🟡 PRIORIDAD MEDIA - Mejoras UI/UX Móvil

### TAREA 4: Subtareas en móvil no parecen subtareas (modo normal)
**Estado:** ✅ Completado | **Prioridad:** Media | **Tipo:** UI

**Solución implementada:** Añadido en `movilListas.css` regla específica `.tareaItemSubtarea` con `padding-left: 30px` para móvil.

---

### TAREA 5: Interacción de hábitos/tareas en panel de ejecución
**Estado:** ✅ Completado | **Prioridad:** Media | **Tipo:** UX

**Solución implementada (original):** Modificado `manejarClickContenido` en `TareaItem.tsx` para que hábitos llamen a `onEditarHabito` (abre BottomSheet).

**Fix aclaración usuario (2026-02-04):** Corregido para que al tocar una tarea en el panel de ejecución se abra el `BottomSheetTarea` (compacto, mismo que al crear tarea) en vez del `PanelConfiguracionTarea` (completo). Modificado en `ModalesTareas.tsx` - ahora `tareaEditandoMovil` usa `BottomSheetTarea` con prop `tareaExistente`.

---

### TAREA 6: Modo compacto - Mejoras en hábitos
**Estado:** ✅ Completado | **Prioridad:** Media | **Tipo:** UX

**Solución implementada:**
1. Añadido `margin-bottom: 2px` a `.tablaFilaCompacta` en `tabla.css`
2. Swipe izquierda ahora es "posponer" para hábitos (icono Clock, color advertencia) y "eliminar" para tareas normales en `TareaConColapsador.tsx`

---

### TAREA 7: Ranking de tareas por días de vencimiento
**Estado:** ✅ YA IMPLEMENTADO | **Prioridad:** Media | **Tipo:** Feature

**Verificación:** El hook `useOrdenarTareas.ts` ya incluye esta lógica:
- `FACTOR_PONDERACION_RETRASO = 50` (puntos por día vencido)
- `calcularDiasRetraso()` calcula días desde vencimiento
- `calcularPesoTotal()` suma `diasRetraso * FACTOR_PONDERACION_RETRASO`

---

## 🟠 PRIORIDAD BAJA - Funcionalidades Post-Lanzamiento

### TAREA 8: Notificaciones push en APK
**Estado:** ✅ Completado | **Prioridad:** Baja (Post-lanzamiento) | **Tipo:** Feature

**Descripción:** Implementar sistema de notificaciones para la APK.

**Solución implementada (2026-02-04):**
Creado hook `useNotificacionesLocales.ts` que:
- Usa `@capacitor/local-notifications` para notificaciones locales
- Programa notificaciones automáticas cuando un hábito entra en ventana de oportunidad
- Maneja permisos de notificación
- Cancelación y actualización de notificaciones programadas

**Requisitos de instalación:**
```bash
npm install @capacitor/local-notifications
npx cap sync
```

---

### TAREA 9: Sincronización en Tiempo Real (WebSockets)
**Estado:** ✅ Completado | **Prioridad:** Baja (Post-lanzamiento) | **Tipo:** Feature

**Descripción:** Implementar actualización en tiempo real entre dispositivos usando WebSockets.

**Solución implementada (2026-02-04):**

1. **useWebSocket.ts** - Cliente WebSocket con:
   - Reconexión automática con backoff exponencial
   - Heartbeat para mantener conexión viva
   - Detección de visibilidad de página (reconecta al volver)
   - Reconexión al volver online
   - Soporte para Capacitor (reconecta al volver a la app)

2. **useSincronizacionTiempoReal.ts** - Integración con sync existente:
   - Cola de cambios locales
   - Envío de cambios a otros dispositivos
   - Recepción de cambios remotos

3. **PullToRefresh.tsx** - Componente para móvil:
   - Gesto de tirar hacia abajo para recargar
   - Indicador visual de progreso
   - Animación al refrescar

**Nota:** Se requiere configurar la URL del WebSocket en `CONFIG_WS.url` del hook.

---

### TAREA 10: Modal central de configuración
**Estado:** ⬜ Pendiente | **Prioridad:** Baja (NO prioritario) | **Tipo:** Refactor/Feature

**Descripción:** Centralizar todas las configuraciones de paneles en un modal único.

**Requisitos:**
1. Modal con panel lateral para navegación entre secciones
2. Cada panel mantiene acceso directo a su configuración (atajo)
3. Incluir opciones de perfil
4. Diseño SOLID para evitar duplicación de configuraciones
5. Coherencia visual con el resto de la app

**Nota del usuario:** Esto NO es prioritario.


### TAREA 11: Modo Offline para App
**Estado:** ✅ Completado | **Prioridad:** Alta (Post-lanzamiento) | **Tipo:** Feature

**Descripción:** Si no hay internet, la app debe funcionar offline y sincronizar cuando vuelva la conexión.

**Solución implementada (2026-02-04):**

1. **useModoOffline.ts** - Sistema offline-first con IndexedDB:
   - Almacenamiento persistente de datos con IndexedDB
   - Cola de operaciones pendientes
   - Sincronización automática al recuperar conexión
   - Detección automática de estado online/offline

2. **IndicadorConexion.tsx** - Indicador visual de estado:
   - Muestra estado: conectado, sincronizando, pendiente, offline, error
   - Aparece automáticamente cuando hay problemas
   - Clickeable para forzar sincronización

---

## 🔵 PENDIENTE DE ACLARAR

### TAREA 12: Problema visual de las notas
**Estado:** ⏸️ Pendiente de aclarar | **Prioridad:** Por definir | **Tipo:** Bug/UI

**Descripción:** El usuario menciona un problema visual difícil de explicar.

**Esperando:** Descripción detallada del problema (posicionamiento, móvil/desktop, editor/lista/carpetas, etc.)

---


# Comentarios exactos del usuario. 

1. Centralizarlar todas las configuraciones de los paneles en un modal central de configuración, esto tiene que ser solid para no duplicar configuraciones, tiene que ser un modal que divida en panel lateral las configuraciones, los paneles mantendran sus acceso a sus configuraciones, tambien se centrara las opciones de perfil y nos aseguraremos que todo encaje visualmente. (Esto no es prioritario)

2. Las subtareas en la version movil no parecen subtareas, no se desplazan un poco a la izquierda para verse como subtareas, en el modo compacto si parece estar bien pero no en el modo normal.

3. En el panel de ejecución o tareas, cuando doy un toque a un habito, debería abrirse el bottomS como se abre al dar un toque en el panel de habitos, y las tareas en el panel de ejecución tienen el problema que al dar un toque abren el panel de configuracion en vez del bottomS (ese que se abre al dar a crear tarea, deberia servir para editar)

4. El back no funciona en la apk, el back debería cerrar modales, cerrar el menu, cerrar bottomS abiertos, etc, en cambio al dar back se sale de la app. 

5. En el modo compacto, los habitos en el panel de habito necesitan un poco mas de gap (2px mas) y que funcione desplazar con el dedo pero que en vez de eliminar sea posponer, seran 2 opciones completar y posponer para los hábitos.

6. Preparar para que las notificaciones lleguen a la apk, también tienen que generarse notificaciones cuando un habito entra en ventana de oportunidad.

7. Problema de sincronía entre dispositivos: esto es dificil de explicar pero hay que hacer las bases para que la actualización entre dispositivos sea en tiempo real.

8. Problema visual de las notas: esto es dificil de explicar, dejar en el roadmap como pendiente de aclarar.

9. Hora incorrecta en el panel de actividades, las actividades al dar click en un dia si completo algo a las 05:00, aparece que se completo a las 10:00

10. Las tareas por cada dia de vencimiento deben aumentar sus puntos en el ramking de ordenamiento en el panel de ejecución/tareas.

11. No indica bien el día en que realmente toca hacer un habito. Caso real, Habito leer, lo hice el 31 de enero, la frecuencia es 3 días, supongo que si es de 3 días toca el 3 de febrero, estoy en el 3 de febrero y no aparece con el badge de hoy ni aparece en el panel de ejecución, aparece al siguiente dia 4 de febrero. 

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
