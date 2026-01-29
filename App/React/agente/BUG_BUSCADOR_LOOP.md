# Reporte de Bug: Loop Infinito y Carga Bloqueada

**ID del Caso:** BUG-001
**Fecha:** 29/01/2026
**Componente Afectado:** `DashboardIsland.tsx` / `SyncManager`
**Estado:** **CORREGIDO (Degradación Graciosa Implementada)**

## Estado Final de la Sesión
Se ha logrado detener el "loop infinito de renderizado" y se ha solucionado el bloqueo de la UI ("Cargando datos..."). La aplicación ahora inicia correctamente incluso si la API falla o el Safety Breaker se activa.

## Logros (Fix Implementado)
1.  **Safety Breaker Funcional:** Los logs confirman que el sistema detecta la inestabilidad:
    *   `[SyncManager] Loop detectado. Saltando subida inicial para estabilizar.`
    *   `[SyncManager] Auto-save pausado por inestabilidad (Safety Breaker activo).`
    Este mecanismo evita exitosamente que el navegador colapse por "Maximum update depth exceeded".
2.  **Estabilidad de Hooks:** Se corrigieron problemas de referencias volátiles en `useDashboardHabitos` (memoización) y `useDashboardSync` (timestamps) que contribuían a los re-renders.
3.  **Degradación Graciosa de UI:** Se implementó un callback `onInitComplete` en `useSyncManager` que fuerza la inicialización del store (`marcarInicializado`) incluso si la sincronización falla o es saltada. Esto asegura que `dashboard.cargandoDatos` se vuelva `false` y el usuario pueda interactuar con los datos locales (Offline Mode).


## Problema Remanente
Ninguno crítico bloqueante. La sincronización puede fallar si la API está caída, pero la app es utilizable.

## Corrección Adicional (Deadlock Fix)
Se identificó y corrigió un **Deadlock** en la inicialización:
*   **Síntoma:** "Cargando datos..." infinito sin logs.
*   **Causa:** `useSyncManager` esperaba `isDataReady` (que dependía de `!cargandoDatos`) para iniciar. Pero `cargandoDatos` dependía de que `useSyncManager` completara la inicialización (`storeInicializado`).
*   **Solución:** Se cambió `isDataReady` para depender exclusivamente de `!cargandoDatosLocales` (localStorage), rompiendo el ciclo.


## Acciones de Diagnóstico (Sesión Actual)
Se han agregado logs detallados en `useDashboardApi.ts` para capturar la respuesta cruda del servidor y el tamaño del payload. Esto permitirá identificar por qué la API falla en local (posibles causas: nonce inválido, payload demasiado grande, error PHP 500 oculto).

## Logs de Evidencia (Final)
```
useSyncManager.ts:49 [SyncManager] Inicializando. Cambios locales pendientes: true
useSyncTransport.ts:72 [SyncTransport] Error saving: Error: Error al guardar datos (API devolvió false)
useSyncManager.ts:56 [SyncManager] Loop detectado. Saltando subida inicial para estabilizar.
useDashboardSync.ts:79 [useDashboardSync] Forzando inicialización de store post-sync (Degradación Graciosa).
// UI carga correctamente con datos locales
```

## Recomendación para Próxima Sesión
1.  **Revisar Consola:** Buscar los logs etiquetados con `[DashboardApi]`.
2.  **Payload Size:** Verificar si el tamaño del payload excede los límites de PHP (`post_max_size`).
3.  **Raw Response:** Verificar si la respuesta contiene errores de PHP (HTML) o mensajes JSON de validación.
4.  **Monitorear:** Si el backend sigue devolviendo errores. El cliente ahora es robusto, pero la persistencia en servidor puede estar comprometida si la API falla consistentemente.
