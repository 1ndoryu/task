# Lecciones Aprendidas

## 2026-03-28 — Heatmap no llenaba el 100% del contenedor (5 fallos previos)

**Patrón del error:** Aplicar fixes internos (overflow, min-width, aspect-ratio en celdas) sin analizar la cadena completa container → flexbox → max-width. Todos los intentos previos corregían síntomas dentro del grid, pero el limitante real era `max-width` fijo en las columnas de semana y en las celdas.

**Lección:** Cuando un bug CSS reaparece, rastrear la cadena complete de layout de fuera hacia dentro: contenedor padre → flex/grid → hijo → nieto. El primer punto donde el tamaño se fija o se cap (max-width, fixed width) es probablemente la raíz. No atacar el interior sin verificar que el exterior permite el crecimiento.

**Fix correcto:** Calcular el tamaño de celda dinámicamente en JS basado en el ancho real del contenedor (ResizeObserver) y pasar como CSS variable `--mapa-calor-tamano-celda`. Así el grid siempre llena 100% independientemente del tamaño del contenedor.

## 2026-04-02 — CSS unclosed block no detectado antes de commit (024A-15)

**Patrón del error:** `multi_replace_string_in_file` reemplazó un bloque CSS que incluía el `}` de cierre en el `oldString`, pero el `newString` generado perdió esa llave. Esto dejó un bloque CSS abierto (`configBarraInferiorItem--fijado {` sin `}`). El error NO fue detectado porque `get_errors` solo se ejecutó sobre archivos `.tsx`, nunca sobre los `.css` editados.

**Lección:** La Regla 11 dice "después de editar CUALQUIER archivo: ejecutar get_errors sobre ESE archivo". Cuando `multi_replace_string_in_file` toca N archivos, se debe ejecutar `get_errors` sobre TODOS los N archivos editados, no solo los que parecen más importantes. Los archivos CSS son especialmente vulnerables a errores de sintaxis silenciosos porque ni TypeScript ni el editor los validan tan estrictamente.

**Fix correcto:** Inmediatamente después de cada `multi_replace_string_in_file`, listar TODOS los archivos tocados y pasar la lista completa a `get_errors`. No asumir que "los CSS son simples" y saltarlos.
