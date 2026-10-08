# PROYECTO TASKS — instrucciones del proyecto

Especializa el `AGENTS.md` del área (`area-trabajo/AGENTS.md`): el protocolo común,
el gate (§5–§6) y el sistema documental (§7) valen aquí; abajo solo lo propio del proyecto.

Protocolo de Desarrollo v7.0 — Modo Bloque. Reglas absolutas (por prioridad):

1. **Deploy vía `coolify-manager-rs` siempre** (nunca SSH/docker/scp/curl directo); excepción:
   diagnóstico de emergencia documentado.
2. **Ante dudas, detente y consulta al usuario** antes de empezar.
3. **Zero patches / expansive thinking**: busca la raíz arquitectónica; prohibido "es temporal".
4. **Edición solo con herramientas integradas** (replace/create); prohibido mutar código con
   scripts/heredocs/terminal. **Edición por módulo**, no parches masivos; valida al cierre del bloque.
5. **Order guardian**: al tocar un archivo, corrige violaciones visibles de bajo riesgo.
6. **Seguridad**: SQL preparado (`query_as!`, `$wpdb->prepare()`), errores globales, secrets en env,
   validar en boundary; prohibido `eval()`/`innerHTML` sin sanitizar/`unwrap()` sobre input externo.
7. **No silent failures**: I/O/red/BD con logging; `?`+thiserror/anyhow en Rust; React con
   `ok:false`/toast/rollback/AbortController; métodos críticos retornan resultado.
8. **Performance**: sin N+1; selectores Zustand específicos; INTERVAL con whitelist.
9. **SOLID**: 1 componente = 1 responsabilidad; max 3 useState; lógica >5 líneas a hook; componentes
   ≤300 líneas, hooks ≤120, utils ≤150; directorios jerárquicos por dominio.
10. **Code standards**: `camelCase` vars, `PascalCase` componentes; CSS en español camelCase en
    archivos separados, variables obligatorias; consistencia visual (revisar variables.css,
    components/ui/ y patrones antes de crear CSS); UI atómica; codegen Orval `tags-split`;
    carpetas/archivos en inglés.
11. **No design specs in components**: prohibido color/fuente/tamaño literal en componentes; todo
    en `variables.css` o componentes atómicos; reutilizar recetas base antes de variantes locales.
12. **Comments as memory**: bloques `/* ... */` con el "por qué"; sin barras decorativas; no borrar
    comentarios previos; lecciones en `Agente/lecciones/` y en el código.
13. **Block validation**: valida una sola ronda al cierre del bloque; errores ajenos también se
    corrigen; no cerrar con errores pendientes.
14. **Commits**: prohibido `git add .`/`--all`; `git add` explícito; verificar diff/status antes;
    mensaje `{id}: descripcion`; commit automático al cerrar bloque; prohibido cerrar con completadas
    sin commit+push.
15. **Sentinel**: `sentinel-disable-file`/`limite-lineas` solo con justificación válida.
16. **Responsive**: ≥320px/≥768px/≥1024px; verificar visualmente ≥2 resoluciones.
17. **Releer roadmap** después de cada commit/resumen (última acción).
18. **Glory framework**: `/glory-rs` y `/glory` son agnósticos; lógica reutilizable va al submódulo.
19. **Continuous improvement**: mejorar reglas/herramientas sin pedir permiso.
20. **No VS Code restart** (`workbench.action.reloadWindow` etc.); el usuario decide reinicios.
21. **Bounded terminal**: comando acotado (criterio de salida) o larga vida (background + readiness);
    nunca espera ciega; si es ambiguo, comprobación discriminante puntual.
22. **Anti-stall remoto**: deploys/builds remotos con heartbeat/readiness o fases cortas; nunca
    encadenar build largo + health en comando opaco; verificar binario por path real antes de probar
    producción (cuidado con `CARGO_TARGET_DIR`).
23. **Subagentes**: delegar investigación/búsqueda/lectura/validación a subagentes (DeepSeek V4
    Flash); el principal conserva edición/diseño/validación final.

Flujo: leer roadmap → ejecutar bloque → validar una vez → testear (verificación real, no solo
compilar) → archivar en `Agente/completados/` → documentar → prevención → implementar prevenciones
→ commit+push (+deploy vía coolify-manager si el roadmap lo indica) → releer roadmap. Validación por
stack: `npm run self-check`/`scripts/self-check.ps1` detecta Rust/Frontend/PHP/Node.
