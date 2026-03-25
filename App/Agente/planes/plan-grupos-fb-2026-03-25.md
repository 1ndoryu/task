# Plan: Integración Gestor de Grupos FB — 2026-03-25

## Contexto
La extensión Chrome `fb-group-manager` detecta grupos de Facebook. Se necesita:
1. Conectarla con el dashboard Task (API bidireccional)
2. Panel React dedicado para gestionar grupos
3. Fix: extensión deja de funcionar (8.1)
4. Fix: tooltip/popover en página FB (8.3)
5. Fix: extensión oculta comentarios (8.4)

## Fase 1 — Backend (DB + API + Repository)
**Estado: EN PROGRESO**
- [x] Crear plan
- [ ] Añadir tabla `glory_grupos_fb` + `glory_categorias_grupos_fb` en Schema.php
- [ ] Crear GruposFbRepository.php
- [ ] Crear GruposFbApiController.php con autenticación por token Bearer
- [ ] Endpoint de generación de token API para extensión
- [ ] Endpoint bulk sync (upsert desde extensión)
- [ ] Endpoint CRUD (listar, actualizar, eliminar)
- [ ] Endpoint categorías
- [ ] Endpoint marcar publicado
- [ ] Validar + commit

## Fase 2 — Panel React en Dashboard
**Estado: PENDIENTE**
- [ ] Crear gruposFbStore.ts (Zustand)
- [ ] Crear gruposFbService.ts (llamadas API)
- [ ] Crear usePanelGruposFb.ts (hook)
- [ ] Crear PanelGruposFb.tsx (componente tabla)
- [ ] Crear CSS panelGruposFb.css
- [ ] Registrar panel en inicializarPaneles.ts
- [ ] Tabla sortable con: check publicado, categoría, importancia, acciones
- [ ] Filtros: búsqueda, categoría, importancia, estado
- [ ] Menú contextual por grupo: ocultar, editar, ir al grupo, eliminar
- [ ] Selector de entorno
- [ ] Clasificación IA
- [ ] Validar + commit

## Fase 3 — Modificación Extensión
**Estado: PENDIENTE**
- [ ] Agregar configuración API (URL + token) en extension settings
- [ ] Sync automático: al detectar grupos, enviar a API
- [ ] Recibir estado desde API (categorías, hidden, published)
- [ ] Fix 8.1: Service worker idle / contexto invalidado
- [ ] Fix 8.3: Tooltip/popover en página FB
- [ ] Fix 8.4: No ocultar comentarios (selectores demasiado amplios)
- [ ] Build + test + commit

## Arquitectura API
```
POST   /glory/v1/grupos-fb/sync           - Bulk upsert desde extensión (token)
GET    /glory/v1/grupos-fb                 - Listar grupos (cookie|token)
PUT    /glory/v1/grupos-fb/{id}            - Actualizar grupo (cookie|token)
DELETE /glory/v1/grupos-fb/{id}            - Soft delete (cookie|token)
GET    /glory/v1/grupos-fb/token           - Obtener token API (cookie only)
POST   /glory/v1/grupos-fb/token/regenerar - Regenerar token (cookie only)
GET    /glory/v1/grupos-fb/categorias      - Obtener categorías (cookie|token)
POST   /glory/v1/grupos-fb/categorias      - Guardar categorías (cookie|token)
POST   /glory/v1/grupos-fb/{id}/publicar   - Marcar publicado (cookie|token)
```

## Autenticación extensión
- Token almacenado en `user_meta: _glory_ext_api_token`
- Extensión envía `Authorization: Bearer {token}`
- Middleware verifica token → extrae user_id
