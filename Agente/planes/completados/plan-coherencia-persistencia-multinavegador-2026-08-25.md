# Plan: coherencia de persistencia multinavegador (preferencias, paneles, grupos)

Fecha: 2026-08-25 · Estado: CERRADO (2026-08-25) · Origen: reporte del usuario ("los grupos no son los
mismos entre navegadores con la misma cuenta; el problema es grave y profundo").
Archivado en `Agente/planes/completados/` al cerrar: LWW por clave con timestamps implementado en
backend y front, asserts en `verify-parity.mjs` (101/101), convergencia local↔servidor verificada en vivo.

## 1. Problema (evidencia)

El usuario pidió que TODA configuración (layout, paneles, grupos, plugins, temas, órdenes)
viva en el backend del usuario y que abrir en otro navegador muestre lo mismo. Se probó y
los grupos divergen entre navegadores con la misma cuenta.

### Causa raíz (doble, simétrica)

1. **El front nunca pisa claves locales existentes** — `aplicarPreferenciasServidor()`
   (`frontend/src/app/utils/preferenciasUsuario.ts:124`):

    ```ts
    const existeLocal = leerClave(clave) !== undefined;
    if (existeLocal) continue; // estado local más fresco: no pisar
    ```

    → Un navegador que YA tiene la clave (aunque sea stale) jamás recibe la versión del
    servidor. Navegador B conserva para siempre su copia vieja de grupos/paneles/plugins.

2. **El backend reemplaza el blob completo** — `upsert_settings`
   (`src/repositories/dashboard.rs:53,60`):
    ```sql
    jsonb_build_object('preferencias', COALESCE($4, dashboard_settings.config->'preferencias', '{}'::jsonb))
    ```
    → El PUT de preferencias **sustituye** el blob entero por el del navegador que suba
    último. Si el navegador B sube su conjunto (sin la clave X que solo tiene A), el
    servidor PIERDE X. El servidor no es fuente de verdad: es "lo que el último que subió
    tenía". Peor: un guardado con `preferencias: {}` (navegador con cache limpia) borra
    TODO el blob del servidor.

**Consecuencia**: con N navegadores, cada uno converge a su propio primer estado, el
servidor pierde claves únicas de cada uno, y ningún navegador nuevo recibe el conjunto
completo. No hay conflicto posible porque no hay versiones/timestamps por clave.

### Verificación en vivo (preview :5174, cuenta admin)

- El blob del servidor (GET /api/dashboard → `configuracion.preferencias`) tiene 11
  claves, incluida `glory_grupos_ejecucion` con `gruposConocidos: ["Dia"]`.
- El localStorage de este navegador coincide porque ESTE navegador creó "Dia" y subió.
- El bug aparece en el cruce: cualquier otro navegador que tenga `glory_grupos_ejecucion`
  en su localStorage conserva su versión stale (nunca se pisa) y el servidor acepta
  reemplazos parciales (pierde claves únicas).

## 2. Decisión de arquitectura

Sincronización de preferencias **por clave con LWW (last-write-wins) por timestamp**, en
ambas direcciones. El blob de preferencias sigue siendo el canal (ya existe, ya viaja en
`PUT/GET /api/dashboard/settings`), pero con semántica correcta:

- **Formato**: cada entrada pasa de `{clave: valor}` a `{clave: {valor, ts}}` donde `ts`
  es el epoch ms de la última escritura local de esa clave.
- **Subida**: `recolectarPreferencias()` emite el blob con ts (desde un índice de
  timestamps, ver Fase 1.3).
- **Servidor**: el PUT **fusiona por clave** (gana el ts mayor) en una sola sentencia SQL;
  nunca reemplaza el blob ni borra claves ausentes.
- **Descarga**: `aplicarPreferenciasServidor()` pisa la clave local SOLO si el ts del
  servidor es mayor (o la clave no existe); la escritura dispara el evento `storage`
  sintético → los stores zustand con persist re-hidratan (ya escuchan ese evento).
- **Migración legacy**: entradas sin `ts` se tratan como `ts=0` → pierden contra
  cualquier escritura con ts; el primer ciclo post-deploy converge y normaliza el blob.

Esto arregla TODOS los dominios de preferencias a la vez (grupos, layout, paneles,
plugins, temas, órdenes, ayuno, déficit, recordatorios, time tracker, arbitraria...), no
solo el síntoma de los grupos. Las entidades de datos (tareas/proyectos/hábitos) ya
sincronizan por entidad y quedan fuera de este cambio.

**Descartado** (por ahora): promocionar grupos/plugins a tablas de primer nivel. El blob
con LWW es coherente, no requiere migración de esquema y cubre todas las claves a la vez.
Se puede reevaluar si un dominio concreto necesita queries por clave.

## 3. Tabla de coherencia por dominio

| Dominio                                                                                                  | Canal actual                                                            | ¿Se sube? | ¿Se aplica en otro navegador?      | Problema                                | Fix        |
| -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | --------- | ---------------------------------- | --------------------------------------- | ---------- |
| Tareas / Proyectos / Hábitos                                                                             | `PUT /api/{tasks,projects,habits}/{id}` por entidad + tombstones DELETE | Sí        | Sí (descarga 30s/foco)             | Ninguno                                 | —          |
| Scratchpad notas                                                                                         | `PUT /api/dashboard/settings` (notas)                                   | Sí        | Sí                                 | Ninguno                                 | —          |
| Config usuario (tema/notificaciones/orden hábitos)                                                       | settings.config                                                         | Sí        | Sí                                 | Ninguno                                 | —          |
| **Grupos de ejecución** (`glory_grupos_ejecucion`)                                                       | blob preferencias                                                       | Sí        | **NO si la clave ya existe local** | apply solo-ausente + replace servidor   | LWW por ts |
| **Layout paneles** (`glory_config_layout`)                                                               | blob preferencias                                                       | Sí        | NO (ídem)                          | ídem                                    | LWW por ts |
| **Paneles sidebar** (`glory_sidebar_paneles`)                                                            | blob preferencias                                                       | Sí        | NO (ídem)                          | ídem                                    | LWW por ts |
| **Plugins** (`glory-plugins`)                                                                            | blob preferencias                                                       | Sí        | NO (ídem)                          | ídem                                    | LWW por ts |
| **Recordatorios** (`glory-recordatorios`)                                                                | blob preferencias                                                       | Sí        | NO (ídem)                          | ídem                                    | LWW por ts |
| **Time tracker** (`glory-time-tracker`)                                                                  | blob preferencias                                                       | Sí        | NO (ídem)                          | ídem                                    | LWW por ts |
| **Ayuno / Déficit calórico**                                                                             | blob preferencias (sin campos backend)                                  | Sí        | NO (ídem)                          | ídem                                    | LWW por ts |
| **Tema** (`dashboard_tema`)                                                                              | blob preferencias                                                       | Sí        | NO (ídem)                          | ídem                                    | LWW por ts |
| **Configs por dominio** (`glory_config_tareas`, `_habitos_*`, `_proyectos`, `_scratchpad`, `_actividad`) | blob preferencias                                                       | Sí        | NO (ídem)                          | ídem                                    | LWW por ts |
| **Órdenes/filtros** (`glory_orden_*`, `glory_filtro_tareas`)                                             | blob preferencias                                                       | Sí        | NO (ídem)                          | ídem                                    | LWW por ts |
| **Nav móvil / IA panel** (`glory-nav-movil`, `glory-ia-panel`)                                           | blob preferencias                                                       | Sí        | NO (ídem)                          | ídem                                    | LWW por ts |
| Grupos FB / tareas                                                                                       | blob preferencias                                                       | Sí        | NO (ídem)                          | ídem                                    | LWW por ts |
| Estado de paneles (nota activa, página móvil, columnas FB, magnific)                                     | blob preferencias                                                       | Sí        | NO (ídem)                          | ídem                                    | LWW por ts |
| Isla Arbitraje                                                                                           | blob preferencias                                                       | Sí        | NO (ídem)                          | ídem                                    | LWW por ts |
| Secretos (`glory_mcp_token_base64`)                                                                      | — (excluido a propósito)                                                | No        | No                                 | Correcto por diseño (no subir secretos) | —          |
| Caches (`HabitosHistorialStore`, `glory_actividad_cache`, offline IndexedDB)                             | — (excluido a propósito)                                                | No        | No                                 | Correcto por diseño (TTL corto)         | —          |
| Marcas de proceso (`glory_usuario_inicializado`, `glory_sync_init_retries`)                              | — (excluido)                                                            | No        | No                                 | Correcto por diseño                     | —          |

Cobertura de claves: auditada 18-08 (las ~21 iniciales) y ampliada; `CLAVES_PREFERENCIAS`
cubre todas las persistidas salvo secretos/caches/marcas (intencional). Se re-verifica con
un test (Fase 2).

## 4. Fases

### Fase 1 — Núcleo LWW (backend + front)

1. **Backend: merge por clave con LWW** en `upsert_settings` (`src/repositories/dashboard.rs`).
   Sustituir `jsonb_build_object('preferencias', $4)` por un CTE que, por clave, conserve
   la entrada con mayor `(value->>'ts')::bigint` (NULLS LAST para legacy):

    ```sql
    preferencias = (
      SELECT COALESCE(jsonb_object_agg(e.key, e.value), '{}'::jsonb)
      FROM (
        SELECT DISTINCT ON (e2.key) e2.key AS key, e2.value AS value
        FROM (
          SELECT key, value FROM jsonb_each(COALESCE(dashboard_settings.config->'preferencias', '{}'::jsonb))
          UNION ALL
          SELECT key, value FROM jsonb_each(COALESCE($4, '{}'::jsonb))
        ) e2
        ORDER BY e2.key, (e2.value->>'ts')::bigint DESC NULLS LAST
      ) e
    )
    ```

    Mismo tratamiento en la rama INSERT (fila nueva, sin previo → `COALESCE($4,'{}')`).
    Verificar `cargo test` + suite de paridad.

2. **Front: blob con ts** — `recolectarPreferencias()` emite `{clave: {valor, ts}}`:
    - `ts` desde un índice `glory_prefs_ts` (`{clave: ts}`) si existe, o `Date.now()` si la
      clave no tiene ts registrado aún (primera subida del blob tras deploy).
    - Las claves legacy (sin ts) que YA estaban en el servidor se normalizan al bajar
      (Fase 1.4) y al subir (ts=now).

3. **Índice de timestamps** — nuevo módulo `utils/timestampsPreferencias.ts`:
    - `registrarEscritura(clave)`: `ts=Date.now()` en `glory_prefs_ts`.
    - `obtenerTs(clave)`, `leerIndice()`, `escribirIndice()`.
    - **Puntos de registro**: `escribirClave()` (wrapper ya usado por preferencias +
      useLocalStorage) y el observador `usePreferenciasServidor` (poll 5s): compara por
      clave el último valor conocido vs actual y registra ts para las que cambiaron
      (zustand persist escribe directo a localStorage sin pasar por `escribirClave`).
    - `glory_prefs_ts` es local-only (marcas de sincronización, no se sube).

4. **Apply con overwrite LWW** — `aplicarPreferenciasServidor()`:
    - Para cada clave del servidor: `tsServidor > (tsLocal del índice || 0)` → escribir
      local con `escribirClave()` (dispara `storage` sintético → stores re-hidratan) y
      registrar ts en el índice.
    - Nunca pisa si `tsLocal >= tsServidor` (estado local más nuevo).

5. **Normalización legacy** — al aplicar/subir, las entradas sin `ts` reciben
   `ts=0` (pierden contra escrituras reales) o se conservan como están y el primer
   guardado posterior les asigna ts real.

### Fase 2 — Verificación

1. Asserts en `.freebuff/verify-parity.mjs` (nuevo bloque "preferencias LWW"):
    - PUT blob con `{claveA:{valor:1,ts:100}}` → GET → presente.
    - PUT blob con `{claveA:{valor:2,ts:50}}` (ts MENOR) → GET → sigue valor 1 (no pisa).
    - PUT blob con `{claveA:{valor:3,ts:200}}` (ts MAYOR) → GET → valor 3.
    - PUT `{}` → GET → NO borra las claves existentes (anti-wipe).
    - PUT con subconjunto (falta claveA) → GET → claveA intacta (anti-pérdida).
2. Test de convergencia multi-navegador (script node o en vivo): dos estados locales
   distintos de `glory_grupos_ejecucion` (A: ["Dia"], B: ["Trabajo"]), sync secuencial,
   → ambos convergen a la unión con el ts mayor por clave.
3. En vivo (preview): cambiar grupo en una pestaña → recargar/abrir la otra → converge;
   consola limpia; suite 94/94 + asserts nuevos; `tsc` limpio; `cargo test`.

### Fase 3 — Cierre

- Roadmap: retirar la entrada; `Agente/completados/` con evidencia.
- Commit del bloque (backend + front + suite), árbol limpio salvo cambios ajenos.

## 5. Definition of Done

- [ ] El backend fusiona preferencias por clave (LWW ts) y nunca borra claves ausentes.
- [ ] El front aplica preferencias del servidor cuando el ts es mayor (pisa stale) y
      re-hidrata los stores.
- [ ] El blob viaja con ts; legacy normalizado; sin pérdida con subidas parciales/vacías.
- [ ] Asserts LWW en la suite; suite completa verde; tsc + cargo test verdes.
- [ ] Verificado en vivo: grupos/paneles/plugins convergen entre dos navegadores con la
      misma cuenta.
