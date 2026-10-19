#!/bin/sh
# Respaldo diario de la BD de PROYECTO TASKS en la 89 (cron de dev, 03:30).
# [por que] La BD es el dato real: se guardan los últimos 14 volcados y el laptop trae su copia al abrir la app.
set -eu
DIR="$HOME/respaldos/tareas"
mkdir -p "$DIR"
DESTINO="$DIR/tareas-$(date +%Y%m%d-%H%M%S).dump"
# [por que] Escribe a .tmp y renombra al final: un volcado cortado no parece válido.
pg_dump -Fc -h /var/run/postgresql -U dev glory_backend_local > "$DESTINO.tmp"
mv "$DESTINO.tmp" "$DESTINO"
ls -1t "$DIR"/tareas-*.dump | tail -n +15 | xargs -r rm -f
