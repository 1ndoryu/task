# Plan — Entornos completo (extensión + webapp)
**Creado:** 2026-04-03
**Estado:** En progreso

## Fase 1 — Backend: tablas + API (034A-14/15)
1. Crear tabla `wp_glory_entornos` (id, user_id, nombre, icono, color, activo, orden, created_at)
2. Crear tabla `wp_glory_grupos_fb_entorno_overrides` (id, grupo_id, entorno_id, categoria, importancia, oculto)
3. Endpoints CRUD entornos: GET/POST/PUT/DELETE `/grupos-fb/entornos`
4. Endpoint activar: POST `/grupos-fb/entornos/{id}/activar`
5. Endpoint grupos con overrides: GET `/grupos-fb?entorno_id={id}` — aplica overrides sobre datos base
6. Sync: POST `/grupos-fb/sync` ahora acepta campo `entorno_id` opcional, guarda overrides en tabla correspondiente
7. Endpoint config publicado: POST `/grupos-fb/config` con `{ duracionPublicado: number }`

## Fase 2 — Frontend React webapp (034A-15)
1. Selector de entorno en el header del PanelGruposFb
2. CRUD entornos (crear, renombrar, eliminar) en modal
3. Al cambiar entorno, recargar grupos con overrides de ese entorno
4. Config duración publicado en panel de configuración (034A-17)

## Fase 3 — Extensión (034A-14)
1. El sync incluye `entorno_id` del entorno activo
2. Verificar que los overrides realmente se aplican al cambiar entorno en dashboard
3. Mover AI prompt de config a botón "actualizar todo" (034A-18)
4. Cada entorno puede tener su propio prompt guardado

## Dependencias
- Fase 1 se puede hacer completamente ahora
- Fase 2 depende de Fase 1
- Fase 3 depende de Fase 1 (el sync necesita el nuevo campo)
