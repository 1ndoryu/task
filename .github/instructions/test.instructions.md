---
applyTo: '**'
---

# Protocolo de Desarrollo y Conducta (v4.0)

> Se aplica SIEMPRE, en CADA archivo que toques. No depende de invocación del usuario.

## -4. GLORY SENTINEL (`.agent/code-sentinel`) — MEJORA CONTINUA

Glory Sentinel es la extensión interna de VS Code para auditoría automática de calidad de código. Su objetivo es detectar problemas reales de **arquitectura, seguridad, mantenibilidad** y **uso correcto de Glory** en tiempo real.

**Regla de mejora continua:**
- Si detectas un **falso positivo** emitido por Sentinel (diagnóstico incorrecto sobre código válido), **DEBES** corregir la regla o el analizador correspondiente en `.agent/code-sentinel/` para eliminarlo. No basta con ignorarlo.
- Si detectas una **violación real que Sentinel NO detecta** (patrón peligroso no cubierto por las reglas actuales), **DEBES** agregar la detección: nueva regla en `rules.md`, nuevo patrón en `regexPatterns.ts`, o lógica en el analizador adecuado (`phpAnalyzer.ts`, `reactAnalyzer.ts`, `staticAnalyzer.ts`, `gloryAnalyzer.ts`).
- Sentinel se mejora **en cada iteración** donde se encuentre una oportunidad. No se deja para "después".
- Focos de detección: SQL inseguro, fallos silenciosos, SRP, separación lógica-vista, Schema System, manejo de errores, patrones React peligrosos, uso correcto del framework Glory.
- Tras modificar Sentinel, verificar que compila sin errores y que las reglas nuevas no generan falsos positivos en el código existente.

## -3. AUTOAPLICACIÓN DE REGLAS

- Al tocar un archivo por cualquier motivo, corregir toda violación visible de este protocolo. Si es compleja, dejar TO-DO explícito.
- No racionalizar inacción: "no es mi tarea" no es excusa. Si lo ves y puedes arreglarlo sin riesgo, lo arreglas.
- Excepción: secciones marcadas `[EN CURSO — AG-XXXX]` por otro agente.

## -2. EMPIEZA SIEMPRE CON LA TAREA MAS DIFICIL.

## -1. CONCURRENCIA Y PROPIEDAD DE TAREAS

> Violar esta regla invalida todo el trabajo.

- **Identificador:** Elegir `AG-XXXX` al iniciar sesión (ej: `AG-DAW`, `AG-FIX`).
- **Secuencia obligatoria:** Leer roadmap completo -> verificar tareas libres -> marcar `[EN CURSO — AG-XXXX]` -> commitear roadmap -> trabajar -> releer roadmap antes de cerrar.
- **Formato roadmap:** Libre: `213. Descripción...` | Tomada: `213. [EN CURSO — AG-DAW] Desc... **Estado:** progreso` | Completada: `213. [AG-DAW] Resultado...`
- **Commits:** Siempre `git add` selectivo (prohibido `git add .`). Verificar `git diff --stat HEAD` antes. Mensaje: `[AG-XXXX] C213: descripción`. No incluir archivos de otros agentes.
- **Prohibido:** Tocar tareas/archivos de otro agente en curso, marcar completadas tareas ajenas, revertir cambios ajenos sin orden del usuario. Conflictos = notificar al usuario.

## 0. FLUJO DE TRABAJO (VSCODE)

- **Autonomía total:** Trabajar de forma prolongada y continua. Prohibido detenerse para consultas triviales o confirmaciones paso a paso. Máxima eficiencia por interacción.
- **Batching:** Ejecutar todos los pasos/tareas sin detenerse. Validar internamente antes de devolver control.
- **Roadmap como eje central:** Actualizar inmediatamente al completar tareas. Releer tras cada tarea completada. Buscar comentarios nuevos del usuario.
- **Refactorización oportunista:** Aplicar mejoras de bajo riesgo sin pedir permiso.

## 1. PRINCIPIOS GENERALES

- **Idioma:** Español en comunicación y clases CSS.
- **Integridad:** Prohibido omitir código (`// ...resto`). Ediciones atómicas y completas.
- Cero emojis en código/comentarios.
- Entender antes de modificar. Mejora arquitectónica posible = hacerla o dejar TO-DO.

## 2. ESTÁNDARES DE CÓDIGO

- **JS/TS:** `camelCase` (vars/funcs), `PascalCase` (componentes/clases).
- **CSS:** Español + `camelCase` (`.contenedorPrincipal`, `.botonActivo`).
- **Verificación de referencias (CRITICO):** Antes de usar variable CSS, import o componente, verificar que existe. Si no existe, crearlo primero. Nunca referenciar algo inexistente. Secuencia: crear -> importar -> usar -> verificar compilación.
- **Comentarios:** Bloques `/* ... */` explicando el "por qué". Prohibidas barras decorativas. Dejar notas de lo aprendido/arreglado.

## 3. ARQUITECTURA Y SOLID

- **Limites:** Componentes/Estilos max 300 lineas | Hooks max 120 | Utils max 150. Si excede, dividir.
- **Directorios:** Organizar por dominio/modulo (`components/ui/`, `features/auth/`). Prohibido carpetas planas.
- **SRP:** 1 componente = 1 responsabilidad. Max 3 `useState`.
- **Separación logica-vista:** >5 lineas de logica = extraer a hook dedicado (`useMiComponente.ts`). Componente solo contiene imports, destructuring y JSX.
- **SOLID:** OCP (extender por props/composición), LSP (hijos sustituibles), ISP (props minimas), DIP (depender de abstracciones).

## 4. REACT Y ESTADO

- Todo elemento UI reutilizable = componente propio. No duplicar JSX.
- Estado global con **Zustand** (selectores obligatorios: `useStore(s => s.campo)`, nunca `useStore()` sin selector).
- Contenedores principales con `id` unico.

## 5. CSS

- Todo en archivos `.css` separados. Prohibido CSS inline.
- Variables obligatorias para colores, espaciados, tipografia. Buscar clases existentes antes de crear nuevas.

## 6. ENTREGA

1. **Post-edición:** Siempre ejecutar `get_errors` tras editar. Prohibido dar tarea por terminada con errores.
2. **Commit automático** al finalizar tarea (sin pedir permiso).
3. **MD de trabajo:** Actualizar estado + registrar lecciones aprendidas (1-2 lineas, formato `- [contexto]: hallazgo`). Si >10 tareas completadas, compactarlas en resumen.
4. **Cierre:** Releer md completo antes de cerrar. Si hay instrucciones nuevas, ejecutarlas. Dejar resumen corto de cambios y TO-DOs pendientes.

## 7. PROHIBICIONES TÉCNICAS

### SQL y Base de Datos
- **Prepared statements obligatorios.** Prohibido concatenar variables en SQL. WordPress: siempre `$wpdb->prepare()`.
- **Schema System obligatorio:** Toda referencia a tablas, columnas, valores de CHECK constraints debe usar constantes del schema (`*Cols`, `*Enums`, `*Schema`). Si no existe, crearla. Prohibido strings literales en queries.
- **Gotcha INTERVAL:** `INTERVAL '$var'` no es parametro PDO. Validar con whitelist en el receptor.
- **FQN:** Usar `use` statements, no FQN inline en queries.
- **N+1 / roundtrips:** Combinar queries redundantes con `CASE/FILTER`, CTEs, JOINs. Loop con query = batch o cache.

### Manejo de Errores
- **Todo I/O, red, BD, parsing, API externa en try-catch** con logging util. Catches vacios = prohibido. Supresor `@` = prohibido.
- **PHP critico:** `exec/shell_exec` (try-catch + validar retorno), `curl_exec` (verificar `curl_error()`), `json_decode` (verificar `json_last_error()`), file ops (try-catch), `glob` (validar `false`), `ZipArchive` (try-catch completo), `$wpdb->*` (verificar retorno + try-catch).
- **Controllers REST:** try-catch global con `\Throwable`, logging + respuesta 500.
- **Operaciones criticas no deben retornar void:** INSERT/UPDATE/DELETE/API externa debe retornar bool o tipo verificable.
- **Archivos temporales:** `unlink` en bloque `finally`.
- **Race conditions:** Patron buscar-crear usar upsert atomico o constraints UNIQUE.
- **React/TS:** Error en catch = `ok: false` (nunca `ok: true`). Fallos = feedback visible al usuario (toast). Updates optimistas con rollback en fallo. `useEffect` async con `AbortController` cleanup. Tipos consistentes (`null` vs `undefined`).

### Seguridad
- Sanitizar toda entrada de usuario. Prohibido `eval()`, `innerHTML` sin sanitizar.
- `exec/shell_exec`: siempre `escapeshellarg()` por argumento.
- Prohibido hardcodear secrets en codigo. Usar env vars.
- WordPress REST: `permission_callback` lo mas restrictivo posible.
- IDs en URLs externas: validar formato antes de concatenar.
- SSL explicito en APIs de pago (`CURLOPT_SSL_VERIFYPEER = true`).

### Orden y Mantenibilidad
- **Archivos monolito:** Si excede limites o mezcla dominios, dividir.
- **Refactorizacion oportuna:** Codigo duplicado, imports muertos, nombres confusos = corregir inmediatamente.
- **Guardian de entropia:** Cada cambio debe dejar el codigo igual o mas ordenado. Elegir ubicacion correcta, mantener patrones, no romper convenciones. La entropia se combate decision a decision.