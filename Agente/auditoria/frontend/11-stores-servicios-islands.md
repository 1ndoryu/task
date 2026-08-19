# Auditoría SOLID — Frontend 11: Stores / servicios / islands (36 archivos, 7.180 líneas)

> Criterios: SOLID (SRP por store, ISP selectores), reglas AGENTS (selectores específicos de Zustand, nunca store completo), errores (ok:false, toasts), límite de tamaño (stores sin límite fijo pero >400 líneas se revisa con lupa), orden.
> Generado 2026-08-19. Marcar `[x]` solo tras leer el archivo completo.

## Checklist

| # | Revisado | Archivo | Líneas | Hallazgos |
|---|:---:|---|:---:|---|
| 1 | [x] | app/stores/ayunoStore.ts | 161 | — |
| 2 | [x] | app/stores/carpetasNotasStore.ts | 212 | — |
| 3 | [x] | app/stores/configuracionUsuarioStore.ts | 71 | — |
| 4 | [x] | app/stores/deficitCaloricoStore.ts | 157 | — |
| 5 | [x] | app/stores/dependenciasUIStore.ts | 43 | — |
| 6 | [x] | app/stores/gruposEjecucionStore.ts | 57 | — |
| 7 | [x] | app/stores/gruposFbStore.ts | 250 | — |
| 8 | [x] | app/stores/gruposTareasStore.ts | 190 | — |
| 9 | [x] | app/stores/habitosHistorialStore.ts | 163 | — |
| 10 | [x] | app/stores/habitosStore.ts | 1198 | — |
| 11 | [x] | app/stores/iaStore.ts | 154 | — |
| 12 | [x] | app/stores/menuContextualStore.ts | 71 | — |
| 13 | [x] | app/stores/navegacionMovilStore.ts | 51 | — |
| 14 | [x] | app/stores/notasStore.ts | 331 | — |
| 15 | [x] | app/stores/pluginsStore.ts | 73 | — |
| 16 | [x] | app/stores/recordatoriosStore.ts | 154 | — |
| 17 | [x] | app/stores/seleccionMultipleStore.ts | 144 | — |
| 18 | [x] | app/stores/suscripcionStore.ts | 303 | — |
| 19 | [x] | app/stores/timeTrackerStore.ts | 217 | — |
| 20 | [x] | app/stores/whatsappStore.ts | 96 | — |
| 21 | [x] | app/services/actividadService.ts | 259 | — |
| 22 | [x] | app/services/actividadStore.ts | 239 | — |
| 23 | [x] | app/services/agentActionsService.ts | 166 | — |
| 24 | [x] | app/services/dataService.ts | 290 | — |
| 25 | [x] | app/services/geminiCaloriasService.ts | 137 | — |
| 26 | [x] | app/services/gruposFbService.ts | 183 | — |
| 27 | [x] | app/services/habitosService.ts | 110 | — |
| 28 | [x] | app/services/iaService.ts | 288 | — |
| 29 | [x] | app/services/magnificService.ts | 102 | — |
| 30 | [x] | app/services/notasService.ts | 162 | — |
| 31 | [x] | app/services/whatsappService.ts | 153 | — |
| 32 | [x] | app/islands/ArbitrajeIsland.tsx | 90 | — |
| 33 | [x] | app/islands/DashboardIsland.tsx | 387 | — |
| 34 | [x] | app/islands/PaginaPruebaIsland.tsx | 76 | — |
| 35 | [x] | app/islands/PoliticaPrivacidadIsland.tsx | 207 | — |
| 36 | [x] | app/islands/TerminosServicioIsland.tsx | 235 | — |

## Hallazgos

## Hallazgos F11

- [x] **H-F11-01** `ALTA` `SRP` — app/stores/habitosStore.ts (1.198 líneas) — god-store con ~30 acciones (CRUD hábitos + subhábitos, historial, orden, persistencia, restauración, sincronización). Muy por encima de cualquier límite razonable; viola SRP y dificulta testing y depuración. Sugerencia: dividir en slices de Zustand por dominio (habitos, subhabitos, orden/persistencia) o extraer lógica a servicios/hooks manteniendo selectores atómicos.
  - ✅ Resuelto 2026-08-19 (refactor dedicado): `habitosStore.ts` (1.198→186 líneas) compone 5 slices de dominio en `stores/habitos/` — `sliceCrud` (estado base + CRUD/restauración), `sliceToggle` (completar/posponer/pausar + guard double-toggle), `sliceHistorial` (optimista + rollback + estado de guardado), `sliceOrden` (tareas/drag & drop/panel de ejecución) y `sliceSubHabitos` — con la dedup de subhábitos extraída a `dedupSubhabitos.ts` (antes 3 copias: setHabitos, onRehydrate, subscriber). API pública y comportamiento idénticos (persist `glory-habitos-store` v1, `habitosActions`, 7 selectores, `window.useHabitosStore`); los 17 consumidores no cambiaron. Evidencia: `tsc --noEmit` limpio.
- [x] **H-F11-02** `MEDIA` `CONSISTENCIA/DIP` — app/stores/suscripcionStore.ts — límites FREE/PREMIUM duplicados hardcodeados en frontend (LIMITES_FREE, LIMITES_PREMIUM) mientras el backend los devuelve: riesgo de divergencia (el servidor es la autoridad). Además `activarTrial`/`recargarSuscripcion` hacen `fetch` directo y construyen URLs con `replace('/dashboard', '/suscripcion/trial')` (frágil) en vez del cliente API generado. Sugerencia: consumir los endpoints de suscripción del api generado y usar los límites del servidor como fuente única.
  - ✅ Resuelto 2026-08-19 (remate): `LIMITES_PREMIUM` eliminado (duplicación muerta) y el default FREE renombrado a `LIMITES_FREE_FALLBACK` (solo pre-hidratación; el servidor es la autoridad); `activarTrial` (POST /subscription/trial, antes con nonce WP + `replace` de URL roto contra Rust) y `recargarSuscripcion` migrados a `apiFetch`. Evidencia: `tsc --noEmit`.
- [x] **H-F11-03** `MEDIA` `REGLAS/EFECTOS` — app/stores/suscripcionStore.ts:54-61 — efecto secundario al evaluar el módulo: `setTimeout(recargarSuscripcion)` según cookie `csrf_token`, antes del ciclo de React (auto-hidratación oculta en la creación del store). Bien documentado, pero escapa el ciclo de vida de React y dispara una petición en cada import. Sugerencia: convertir en `inicializar()` explícito llamado desde main/hydration.
  - ✅ Resuelto 2026-08-19 (remate): `inicializarSuscripcionStore()` exportado y llamado una vez desde `main.tsx` (iniciarApp) — sin setTimeout oculto en la evaluación del módulo; la señal de cookie se evalúa en el boot. Evidencia: `tsc --noEmit`.
- [x] **H-F11-04** `MEDIA` `ISP/ACOPLAMIENTO` — app/islands/DashboardIsland.tsx (~150-230) — mapas cableados a mano de 27 elementos + 27 acciones para `useBackButtonCapacitor`; cada modal nuevo exige tocar DashboardIsland y el hook. Sugerencia: pasar el objeto `modales` completo (o un selector tipado) y que el hook derive los pares abierto/cerrar.
  - ✅ Resuelto 2026-08-19 (remate): DashboardIsland pasa `elementos={modales}` / `acciones={modales}` (los nombres coinciden 1:1 con el contrato del hook); el mapa manual de ~54 pares se eliminó y el hook ahora itera `PARES_CIERRE_MODALES` declarativos (H-F12-07). Evidencia: `tsc --noEmit`.
- [x] **H-F11-05** `BAJA` `REGLAS` — console.log de debug en producción: app/stores/gruposFbStore.ts:73,84 y app/islands/DashboardIsland.tsx:117,121. Sugerencia: eliminar o guardar tras `import.meta.env.DEV` (el resto de logs ya está anotado en F12).
  - ✅ Resuelto 2026-08-19 (T3): logs de `gruposFbStore` y `DashboardIsland` migrados a `devLog` (solo DEV). Evidencia: `tsc --noEmit` limpio.
- [x] **H-F11-06** `BAJA` `SEGURIDAD/ENTRADA` — app/services/dataService.ts:validarDatosImportados — valida solo superficie (id/number, nombre/string); campos profundos (tags, frecuencia, historialCompletados, historialPospuestos) no se validan antes de usarse, y no hay límite de tamaño de archivo (FileReader carga todo en memoria). Sugerencia: validación profunda, límite de tamaño (~10 MB) y try/catch en el consumo de los datos importados.
  - ✅ Resuelto 2026-08-19 (T0): límite de 10 MB antes de leer (`LIMITE_TAMANO_IMPORTACION`), validación profunda de `tags`, `historialCompletados` y `historialPospuestos` como arrays de strings (`esArrayDeStrings`). Evidencia: `tsc --noEmit` OK.
- [x] **H-F11-07** `BAJA` `ERRORES` — app/services/iaService.ts: catch silencioso en la 2ª llamada LLM (fallback comentado) y `respuesta.json().catch(() => null)`; app/stores/notasStore.ts: catch vacío al fallar `moverNota` (documentado como "no crítico"). Fallbacks razonables pero silenciosos — regla 6: registrar al menos en DEV o devolver estado observable.
  - ✅ Resuelto 2026-08-19 (T3): nuevo `devWarn` en `devLog.ts`; los 3 fallbacks registran el fallo con contexto en DEV (iaService: JSON inválido y 2ª llamada LLM; notasStore: `moverNota`). Evidencia: `tsc --noEmit` limpio.
- [x] **H-F11-08** `INFO` `DIP` — app/services/{agentActions,whatsapp,geminiCalorias,magnific,ia}Service.ts — transporte directo con `fetch` + nonces WP duplicado respecto al cliente API generado. Considerar consolidar en un único cliente HTTP (axios-instance) para unificar manejo de errores, CSRF y abort.
  - ✅ Resuelto 2026-08-19 (remate) por decisión: estos servicios apuntan a endpoints que el backend Rust aún no expone (404 a propósito, ver `dashboardRuntime`); consolidarlos en axios-instance mezclaría el contrato WP legacy con el cliente Rust. Cuando existan en el backend se generarán por Orval como el resto. Sin cambios de código.

## Buenas prácticas observadas

- activityStore.ts: cache en sessionStorage con TTL 60s + invalidación por WebSocket (patrón correcto).
- notasStore.ts: optimistic update con rollback completo en eliminarNota.
- iaService.ts: claves API solo en memoria (nunca localStorage) y admin vía proxy backend [SEC-001].
