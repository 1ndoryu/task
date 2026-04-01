# Plan: Refactor Arquitectónico de Sincronización

**Tarea:** 014A-19
**Fecha:** 2026-04-01
**Problema:** La sincronización usa dual-layer (WebSocket + HTTP) sin coordinación, causando: ecos WS, saves HTTP redundantes, y potencial pérdida de datos por race conditions.

## Diagnóstico

1. **Echo WS**: Cambio remoto WS → actualiza estado local → useNotificadorCambiosWebSocket lo detecta como "nuevo" → lo reenvía vía WS → servidor lo rebroadcastea → loop (mitigado por LWW pero chatty y error-prone)
2. **HTTP redundante**: Cambios remotos WS disparan `hasChanges=true` en useChangeDetector → auto-save HTTP envía datos que ya están en servidor
3. **Sin timestamps por entidad**: LWW global no puede resolver conflictos campo-por-campo
4. **Backend acepta todo**: `applyChanges()` retorna `conflicts: []` siempre

## Fases de implementación

### Fase 1: Echo Prevention (Frontend)
- `useNotificadorCambiosWebSocket.ts`: Aceptar ref de IDs remotos recientes, saltar notificación para esos IDs
- `useDashboardSync.ts`: Crear ref de tracking, poblar en callbacks WS, pasar al notifier

### Fase 2: Hash Absorption (Frontend)
- `useSyncManager.ts`: Aceptar ref contador de cambios remotos, absorber hash sin disparar HTTP
- `useDashboardSync.ts`: Crear contador ref, incrementar en callbacks WS, pasar a sync manager

### Fase 3: Per-entity updatedAt (Full Stack)
- `types/dashboard.ts`: Agregar `updatedAt?: number` a Tarea, Habito, Proyecto
- Stores/hooks que mutan: Setear `updatedAt = Date.now()` en cada mutación
- `TareasRepository.php`: Comparar `updatedAt` antes de overwrite en `saveAll()`

## Estado
- [x] Fase 1 — Echo Prevention
- [x] Fase 2 — Hash Absorption
- [x] Fase 3 — Per-entity updatedAt
