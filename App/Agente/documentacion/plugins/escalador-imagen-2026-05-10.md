# Escalador de Imagen Magnific — 2026-05-10

## Alcance
- Plugin y panel solo visibles para administradores.
- REST backend admin-only para no exponer `MAGNIFIC_API_KEY`.
- Modos disponibles: Creative y Precision.

## Variables de entorno
- Principal: `MAGNIFIC_API_KEY`.
- Aliases aceptados por compatibilidad: `x-magnific-api-key`, `MAGNIFIC_API`, `MAGNIFIC_KEY`.

## Endpoints internos
- `POST /wp-json/glory/v1/magnific/upscale`
- `GET /wp-json/glory/v1/magnific/upscale/{task_id}?mode=creative|precision`

## Parámetros Magnific confirmados
- Creative: `scale_factor`, `optimized_for`, `prompt`, `creativity`, `hdr`, `resemblance`, `fractality`, `engine`, `filter_nsfw`, `webhook_url`.
- Precision: `sharpen`, `smart_grain`, `ultra_detail`, `filter_nsfw`, `webhook_url`.

## Gotchas
- Magnific procesa tareas async: el panel inicia tarea y luego consulta estado.
- Creative y Precision no comparten opciones; el backend filtra por modo antes de enviar.