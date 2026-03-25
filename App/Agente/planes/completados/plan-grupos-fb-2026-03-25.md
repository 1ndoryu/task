# Plan: Integración Gestor de Grupos FB — 2026-03-25

## Contexto
La extensión Chrome `fb-group-manager` detecta grupos de Facebook. Se necesita:
1. Conectarla con el dashboard Task (API bidireccional)
2. Panel React dedicado para gestionar grupos
3. Fix: extensión deja de funcionar (8.1)
4. Fix: tooltip/popover en página FB (8.3)
5. Fix: extensión oculta comentarios (8.4)

## Fase 1 — Backend (DB + API + Repository)
**Estado: COMPLETADO (253A-11)**
- [x] Crear plan
- [x] Añadir tabla `glory_grupos_fb` + `glory_categorias_grupos_fb` en Schema.php
- [x] Crear GruposFbRepository.php
- [x] Crear GruposFbApiController.php con autenticación por token Bearer
- [x] Endpoint de generación de token API para extensión
- [x] Endpoint bulk sync (upsert desde extensión)
- [x] Endpoint CRUD (listar, actualizar, eliminar)
- [x] Endpoint categorías
- [x] Endpoint marcar publicado
- [x] Validar + commit

## Fase 2 — Panel React en Dashboard
**Estado: COMPLETADO (253A-11)**
- [x] Crear gruposFbStore.ts (Zustand)
- [x] Crear gruposFbService.ts (llamadas API)
- [x] Crear usePanelGruposFb.ts (hook)
- [x] Crear PanelGruposFb.tsx (componente tabla)
- [x] Crear CSS panelGruposFb.css
- [x] Registrar panel en inicializarPaneles.ts
- [x] Tabla sortable con: check publicado, categoría, importancia, acciones
- [x] Filtros: búsqueda, categoría, importancia, estado
- [x] Menú contextual por grupo: ocultar, editar, ir al grupo, eliminar
- [ ] Selector de entorno (posterior)
- [ ] Clasificación IA (posterior)
- [x] Validar + commit

## Fase 3 — Modificación Extensión
**Estado: COMPLETADO (253A-12)**
- [x] Agregar configuración API (URL + token) en extension settings
- [x] Sync automático: al detectar grupos, enviar a API
- [x] Sync manual completo desde dashboard de extensión
- [x] Fix 8.1: Service worker keepalive con chrome.alarms + tolerancia a fallos transitorios
- [x] Fix 8.3: Inyección de estilos CSS para popover de acciones en Facebook
- [x] Fix 8.4: No ocultar comentarios (solo articles de nivel superior, no anidados)
- [x] Build + test + commit

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
