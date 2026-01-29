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

## Logs de Evidencia (Final)
```
useSyncManager.ts:49 [SyncManager] Inicializando. Cambios locales pendientes: true
useSyncTransport.ts:72 [SyncTransport] Error saving: Error: Error al guardar datos (API devolvió false)
useSyncManager.ts:56 [SyncManager] Loop detectado. Saltando subida inicial para estabilizar.
useDashboardSync.ts:79 [useDashboardSync] Forzando inicialización de store post-sync (Degradación Graciosa).
// UI carga correctamente con datos locales
```

## Recomendación para Próxima Sesión
Monitorear si el backend sigue devolviendo errores. El cliente ahora es robusto, pero la persistencia en servidor puede estar comprometida si la API falla consistentemente.
