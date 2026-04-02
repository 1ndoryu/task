# Lecciones Aprendidas

## 2026-03-28 — Heatmap no llenaba el 100% del contenedor (5 fallos previos)

**Patrón del error:** Aplicar fixes internos (overflow, min-width, aspect-ratio en celdas) sin analizar la cadena completa container → flexbox → max-width. Todos los intentos previos corregían síntomas dentro del grid, pero el limitante real era `max-width` fijo en las columnas de semana y en las celdas.

**Lección:** Cuando un bug CSS reaparece, rastrear la cadena complete de layout de fuera hacia dentro: contenedor padre → flex/grid → hijo → nieto. El primer punto donde el tamaño se fija o se cap (max-width, fixed width) es probablemente la raíz. No atacar el interior sin verificar que el exterior permite el crecimiento.

**Fix correcto:** Calcular el tamaño de celda dinámicamente en JS basado en el ancho real del contenedor (ResizeObserver) y pasar como CSS variable `--mapa-calor-tamano-celda`. Así el grid siempre llena 100% independientemente del tamaño del contenedor.

## 2026-04-02 — CSS unclosed block no detectado antes de commit (024A-15)

**Patrón del error:** `multi_replace_string_in_file` reemplazó un bloque CSS que incluía el `}` de cierre en el `oldString`, pero el `newString` generado perdió esa llave. Esto dejó un bloque CSS abierto (`configBarraInferiorItem--fijado {` sin `}`). El error NO fue detectado porque `get_errors` solo se ejecutó sobre archivos `.tsx`, nunca sobre los `.css` editados.

**Lección:** La Regla 11 dice "después de editar CUALQUIER archivo: ejecutar get_errors sobre ESE archivo". Cuando `multi_replace_string_in_file` toca N archivos, se debe ejecutar `get_errors` sobre TODOS los N archivos editados, no solo los que parecen más importantes. Los archivos CSS son especialmente vulnerables a errores de sintaxis silenciosos porque ni TypeScript ni el editor los validan tan estrictamente.

**Fix correcto:** Inmediatamente después de cada `multi_replace_string_in_file`, listar TODOS los archivos tocados y pasar la lista completa a `get_errors`. No asumir que "los CSS son simples" y saltarlos.

## 2026-04-02 — Extensión Chrome borra comentarios de Facebook (024A-22)

**Patrón del error:** `link.appendChild(badge)` dentro de un `<a>` gestionado por React de Facebook. React de Facebook reconcilia el DOM periódicamente y al encontrar nodos inesperados dentro de elementos que gestiona, puede eliminar el nodo padre completo o su árbol de hijos, haciendo desaparecer comentarios y contenido. Además, `hideGroupFromPage` ocultaba `[role="article"]` del feed, y dentro de un grupo TODOS los posts tienen el link al grupo → se ocultaban todos.

**Lección:** NUNCA modificar el interior de elementos DOM que otro framework de JS (React, Angular, Vue) gestiona. Usar `insertAdjacentElement` (sibling) en vez de `appendChild` (child). Para ocultar elementos, ser muy conservador con el selector: solo ocultar en contextos seguros (listItems, cards de discover), nunca articles del feed. Suspender MutationObservers durante inyecciones de DOM propias para evitar loops.

## 2026-04-02 — flex:1 no limita altura en panels con alturaDefecto:'auto' (024A-21)

**Patrón del error:** Reemplacé `max-height: 500px` por `flex: 1; min-height: 0` en el contenedor de scroll de la tabla. Esto funciona cuando el padre tiene altura fija (panelAlturaFija), pero el panel usa `alturaDefecto: 'auto'` → el padre crece con el contenido → flex:1 no tiene límite → la tabla se extiende infinitamente.

**Lección:** `flex: 1 + min-height: 0` solo funciona como restricción de altura cuando algún ancestro tiene una altura fija. Con content-based sizing (auto), hay que usar `max-height` explícito.
