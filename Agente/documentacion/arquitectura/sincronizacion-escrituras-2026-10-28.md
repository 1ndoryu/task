# Sincronización de escrituras (28AA-1) — estado de despliegue y verificación

Plan (cerrado): `Agente/planes/completados/plan-sincronizacion-escrituras-2026-10-28.md`. Esta nota recoge lo desplegado y lo que queda abierto tras cerrar `28AA-1` (seguimiento en `28AA-2`).

## Qué está en código

- F1–F4 (frontend, `main`): bloqueo optimista con `expectedUpdatedAt`, reaplicación tras 409, pendientes con versión, sincronía entre pestañas.
- F5 backend (`3abff9a`): `upsert_task_agente` / `upsert_habit_agente` leen el payload guardado con `FOR UPDATE`, lo fusionan con `fusionar_payload` y escriben en una transacción. Con esto el agente ya no borra subhábitos. Log temporal `registrar_sin_version` (quitar tras una semana).
- F5 legacy (`frontend-legacy`, fuera de git): envía `expectedUpdatedAt`, guarda la versión al cargar y en cada PUT. Un 409 no se reintenta (`useSyncTransport`); `useSyncManager` descarta la copia local obsoleta, la guarda en `localStorage` (`glory_copia_descartada`) y muestra un aviso, cargando la del servidor.
- F6 (decisión de la usuaria): no reescribir los subhábitos de MN INMOBILIARIA; los respaldos no los contienen.

## Despliegue en la 89

- Ficha `PROYECTO TASKS` (`workspace-manager/config/registro.json`): tenía bloque `build` pero la sonda de salud buscaba `<title>Tareas`; el título real es `PROYECTO TASKS`. Corregido a `<title>PROYECTO TASKS`.
- Arranque: `Arranque stop "PROYECTO TASKS"` y `Arranque up "PROYECTO TASKS" --sin-bd --build`. Sin `--dev`, sin vite, sin reconstruir la BD de la 89.
- Resultado: `arrancado en dev89 (modo build, puertos 4190, tunel pid 29376) + probe verde`. `14190/api/health` → 200; `14190/` sirve `<title>PROYECTO TASKS`.
- Código en la 89: `src/services/productivity.rs` y `src/agent/tools.rs` contienen `upsert_*_agente`; `src/models/productivity.rs` contiene `fusionar_payload`.
- Incidencia: un `ssh -L 14190/14191` huérfano (PID 6916, lanzado por un `up` anterior) retenía los puertos locales; se cerró ese PID concreto tras comprobar su línea de comandos.

## F7 (escenario de dos pestañas)

- Decisión de la usuaria: correrla en la base de pruebas de la 89 (`glory_backend_local` vía túnel 14190), no en la app local del portátil.
- Ejecutado a nivel de contrato (`scratchpad/f7-dos-pestanas.mjs`, fuera del repo): A crea un hábito de prueba y añade 3 subhábitos; B, con la versión vieja, edita el nombre → **409**; los 3 subhábitos y el nombre siguen; B recarga, reaplica y sigue sin perderlos; el hábito de prueba se borra al final. **Resultado: todo en OK.**
- Navegador (dos pestañas, `127.0.0.1:14190`, build de la 89): la pestaña A creó el hábito con 3 subhábitos y después añadió un cuarto; la pestaña B, con la copia de antes, marcó un subhábito como hecho: la consola mostró un **409** de una escritura y B recargó la copia del servidor; la marca quedó en el historial de hoy y los 4 subhábitos siguieron en la base. El hábito de prueba se borró (204, 0 restos).
- Sincronía en vivo: en la pestaña de fondo, el cambio de A no apareció en B en 7 s; B lo vio tras recargar. Queda sin verificar el refresco al enfocar y el canal `tareas-nuevo:v1:sincronia` en pestañas visibles (cubierto por `sincronia.test.ts`).
- El aviso de descarte del legacy (`frontend-legacy`) no se ve en 14190: esa build sirve el frontend principal. Sin verificar.
- Gate `--cierre`: 0 nuevos, base 13 (sin cambios). El gate solo cubre el repo; `frontend-legacy` queda fuera.
- Nota: la base de la 89 se usa como base de pruebas según `tareas-local-y-cuenta-unica`; la línea anterior de este documento que la llamaba «la de la usuaria» queda corregida.

## Residuales conocidos

- Pendiente local obsoleta en `frontend-legacy`: resuelta con descarte y aviso (ver F5 legacy). Límite: se reemplaza la copia local entera, no solo las filas en conflicto; la copia descartada solo queda en `localStorage`. Pendiente de prueba en navegador.
- `useSincronizacion.ts`: el mensaje genérico «Error al sincronizar los datos locales» puede sustituir el texto específico de conflicto.
- `ToolTarea` pone `completado` a `false` si falta en la entrada (una actualización parcial puede desmarcar).
- `ToolHabito` escribe `tipo`/`cadaDias` en la raíz en vez de bajo `frecuencia` (la columna queda en `diario`).
- `expectedUpdatedAt` seguirá opcional hasta retirar el log temporal y endurecerlo a 422.
