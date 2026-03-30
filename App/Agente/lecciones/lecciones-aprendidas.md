# Lecciones Aprendidas

## 2026-03-28 — Heatmap no llenaba el 100% del contenedor (5 fallos previos)

**Patrón del error:** Aplicar fixes internos (overflow, min-width, aspect-ratio en celdas) sin analizar la cadena completa container → flexbox → max-width. Todos los intentos previos corregían síntomas dentro del grid, pero el limitante real era `max-width` fijo en las columnas de semana y en las celdas.

**Lección:** Cuando un bug CSS reaparece, rastrear la cadena complete de layout de fuera hacia dentro: contenedor padre → flex/grid → hijo → nieto. El primer punto donde el tamaño se fija o se cap (max-width, fixed width) es probablemente la raíz. No atacar el interior sin verificar que el exterior permite el crecimiento.

**Fix correcto:** Calcular el tamaño de celda dinámicamente en JS basado en el ancho real del contenedor (ResizeObserver) y pasar como CSS variable `--mapa-calor-tamano-celda`. Así el grid siempre llena 100% independientemente del tamaño del contenedor.
