# Plan: Desglose de contexto de la conversación + botón Compactar (318A-7)

> **Fecha:** 2026-09-01 · **ID:** 318A-7 · **Estado:** ✅ completado (2026-09-02)
> **Objetivo:** la barra de uso de contexto del chat de IA debe mostrar, al
> poner el cursor, el desglose de la ventana de contexto de la CONVERSACIÓN en
> español (estilo Claude): total usado/máx + %, secciones (System Instructions,
> Tool Definitions, Messages, Tool Results, Reservado para respuesta) y un
> botón **Compactar** persistente.

## Alcance

- **Backend (Rust/Axum):**
  1. Nuevo evento SSE `contexto_detalle` con el desglose por secciones,
     calculado en el runtime al construir el contexto de cada llamada LLM.
  2. Endpoint `POST /api/agente/conversaciones/:id/compactar` que marca los
     mensajes viejos como `compactado = true` y guarda un resumen (la columna
     `compactado` ya existe en `agente_mensajes`, hoy nunca se escribe).
- **Frontend (React):**
  3. Ampliar el estado de contexto del store con las secciones.
  4. Tooltip de `BarraContextoInferior` con desglose en español + botón Compactar.
  5. CSS del desglose y del botón (tokens del sistema, monocromo).
- **Docs:** roadmap + evidencia en `Agente/completados/`.

## No alcance

- No cambia la auto-compactación en memoria durante el turno (sigue igual).
- No toca archivos sin commitear del otro agente (`inicializarIslands.ts`,
  `main.tsx`, `VerificacionFormularios318A3Island.tsx`).
- No push (requiere autorización).

## Fases verificables

### F1 — Backend: evento `contexto_detalle`
- `src/agent/runtime.rs`: nuevo variante `AgenteEvento::ContextoDetalle` con
  `max_ventana`, `reserva_salida`, `system_instrucciones`, `definiciones_tools`,
  `mensajes`, `resultados_tools`, `total_entrada`, `ocupacion_pct`.
- Método privado `calcular_desglose(mensajes, schemas, config) -> Desglose`.
  - `system_instrucciones` = tokens de mensajes rol `system`.
  - `definiciones_tools` = tokens del JSON de schemas.
  - `mensajes` = tokens de mensajes rol `user`/`assistant`.
  - `resultados_tools` = tokens de mensajes rol `tool`.
  - `reserva_salida` = `config.reserva_salida`; `max_ventana` = `config.max_ventana`.
  - `ocupacion_pct` = total_entrada / (max_ventana − reserva_salida) × 100.
- Emitir `ContextoDetalle` al inicio de cada iteración del loop (tras preparar
  mensajes y calcular schemas), antes de la llamada LLM.
- Tests unitarios de `calcular_desglose`.

### F2 — Backend: endpoint compactar
- `src/agent/context.rs`: exponer `resumen_de_mensajes` como `pub(crate)` (o
  pública) para reutilizarla en el endpoint.
- `src/repositories/agente.rs`: `insertar_resumen` (INSERT system compactado)
  y `marcar_compactados` (UPDATE ... SET compactado = TRUE para ids < umbral).
- `src/handlers/agente.rs`: handler `compactar_conversacion`:
  1. verifica propiedad;
  2. carga mensajes no compactados;
  3. si son pocos (< 4) devuelve historial sin cambios;
  4. deja el último turno verbatim, marca el resto compactado;
  5. inserta resumen system;
  6. devuelve el historial resultante (igual que `listar_mensajes_conversacion`).
- Ruta: `POST /agente/conversaciones/:id/compactar`.
- Verificación: `cargo test` + `cargo check` (target C:\tmp).

### F3 — Frontend: tipos, store y servicio
- `service.ts`: tipo evento `contexto_detalle` y `compactarConversacion(id)`.
- `store.ts`: ampliar `contexto` del mensaje con las secciones; manejar el
  evento; exponer `compactarTab`.
- `usePanelAgente.ts`: exponer `compactarTab` al panel.

### F4 — Frontend: tooltip con desglose + botón
- `mensajes.tsx`: `BarraContextoInferior` recibe `onCompactar` y `compactando`;
  tooltip con secciones en español + botón Compactar (deshabilitado si no hay
  datos o está compactando).
- `PanelAgente.tsx`: pasar `onCompactar` y `compactando`.
- `panelAgente.css`: estilos del desglose (tokens `--dashboard-*`, monocromo,
  sin colores literales).

### F5 — Validación y cierre
- `cargo test` (backend) + `tsc --noEmit` (frontend) + verificación visual en
  navegador (localhost:5175) si el stack está levantado.
- Roadmap: añadir tarea 318A-7 como pendiente/en curso y retirarla al cerrar.
- Evidencia en `Agente/completados/tareas-2026-09-01.md` + commit explícito.

## Definition of Done

- [x] Backend emite `contexto_detalle` con secciones correctas (test).
- [x] `POST /compactar` marca BD y devuelve historial (verificado con test/curl).
- [x] Tooltip muestra desglose en español con %.
- [x] Botón Compactar funciona y deshabilita mientras compacta.
- [x] `cargo test` y `tsc --noEmit` verdes.
- [x] Roadmap y evidencia actualizados; commit explícito por archivo.

## Evidencia de cierre (2026-09-02)

- `cargo check` OK (vía `run-with-db.mjs`); tests backend **30/30** (27 + 3 nuevos del desglose).
- `tsc --noEmit` (frontend) exit 0; `.freebuff/galeria-visual.mjs` **9/9 checks** (20 ítems).
- Verificación visual en navegador `/agente/visuales` (ítem 20-contexto-detallado): tooltip con
  System Instructions 1920 · 1.5%, Tool Definitions 2176 · 1.7%, Messages 12.800 · 10.0%, Tool
  Results 3072 · 2.4%, Reservado 20.000 · 15.6% y botón Compactar clicable.
- Pendiente real: prueba de integración del endpoint con turno real (solo tests unitarios del
  desglose). Nota: `listar_mensajes` no filtra compactado (el frontend muestra el historial completo
  tras compactar; solo se reduce el contexto del LLM).
- Evidencia completa en `Agente/completados/tareas-2026-09-01.md`.
