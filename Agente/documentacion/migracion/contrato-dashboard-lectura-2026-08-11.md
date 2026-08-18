# Contrato de lectura del dashboard

**Estado:** aprobado para implementación local; no es todavía compatibilidad de escritura con WordPress.
**Fuente:** `App/Api/DashboardApiController.php`, `DashboardRepository.php`, repositorios de tareas/hábitos/proyectos y `useDashboardApi.ts` medidos el 2026-08-11.

## Alcance del primer corte

| Contrato | WordPress observado | Rust canónico | Estado |
|---|---|---|---|
| Carga del agregado | `GET /wp-json/glory/v1/dashboard` | `GET /api/dashboard` | Este bloque |
| Estado de sincronización | `GET /dashboard/sync` | — | Diferido |
| Cambios incrementales | `GET /dashboard/changes?since=` | — | Diferido |
| Escritura bulk/LWW | `POST /dashboard` | — | Bloqueado hasta política de conflictos |
| Push de cambios | `POST /dashboard/changes` | — | Bloqueado hasta idempotencia y permisos |

El lector requiere sesión Rust. Solo incluye filas propias (`user_id = auth.user_id` y `deleted_at IS NULL`); los elementos compartidos se excluyen explícitamente hasta que exista el modelo de usuarios legacy, roles y permisos. El endpoint no consulta WordPress ni `user_meta`.

## Respuesta canónica

La respuesta conserva nombres camelCase que ya consume React, pero se documenta como contrato Rust/JSON y no como envelope WordPress:

```json
{
  "data": {
    "version": "1.0.0",
    "habitos": [],
    "tareas": [],
    "proyectos": [],
    "notas": "",
    "configuracion": {
      "notificaciones": {
        "email": false,
        "frecuenciaResumen": "nunca",
        "horaPreferida": "09:00",
        "tareasPorVencer": true,
        "rachaEnPeligro": true
      },
      "cifradoE2E": false,
      "tema": "terminal",
      "ordenHabitos": "inteligente"
    },
    "ultimaActualizacion": null
  },
  "meta": {
    "loadedAt": "2026-08-11T00:00:00Z",
    "serverTimestamp": 0,
    "sharedItemsIncluded": false,
    "truncated": false
  }
}
```

Cada entidad se devuelve desde su `payload` JSON preservado, sobreescribiendo `id` con `legacy_id`/`id_local` para evitar que un identificador stale del payload gane al índice de correlación. Las columnas tipadas (`name/text`, estado, prioridad, orden y relaciones) son índices de lectura; la proyección completa se amplía por vertical sin interpolar JSON SQL.

## Permisos y errores

- `401`: cookie ausente, expirada o revocada.
- `500`: error de persistencia; no expone SQL, credenciales ni payload interno.
- No hay mutación, por lo que no requiere CSRF en este corte.
- El límite de body global y los límites de pool siguen aplicando.

## Decisiones de datos

- `legacy_id` es obligatorio y único por propietario y dominio; no se confunde con el UUID interno.
- `payload` se conserva como extensión, pero no sustituye columnas necesarias para filtros y orden.
- No se descifra ni se reinterpreta `data` de WordPress en este bloque: el ETL de cifrado E2E queda como riesgo abierto.
- `completadoHoy` de hábitos solo se recalcula cuando exista timezone confiable del usuario; el lector inicial conserva el valor del payload y no inventa la zona del servidor.
- El campo `sharedItemsIncluded` hace visible que colaboración aún no está migrada; no se presenta una lista incompleta como si fuera total.
- Cada dominio devuelve como máximo 500 elementos; si hay más, `meta.truncated` es `true` y el siguiente bloque deberá ofrecer paginación/cambios explícitos.

## Criterios de aceptación

1. Usuario autenticado sin filas recibe exactamente el fixture vacío.
2. Un usuario no puede leer filas de otro usuario aunque conozca su `legacy_id`.
3. Filas soft-deleted no aparecen.
4. El `id` de la respuesta proviene de `legacy_id`, incluso si el payload trae otro valor.
5. Las relaciones internas y el payload no generan consultas por fila (consultas acotadas por dominio).
6. OpenAPI publica el esquema y el frontend adapta este contrato sin `/wp-json`, `X-WP-Nonce` ni `window.gloryDashboard`.
