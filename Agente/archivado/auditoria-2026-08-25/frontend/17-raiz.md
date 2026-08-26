# Auditoría SOLID — task — Raíz y assets del frontend (checklist archivos)

> Módulo: `F17` · Revisar archivo por archivo y anotar violaciones (SOLID, reglas, rendimiento, seguridad, errores) con formato `- [ ] **H-F17-NN** `SEV` `CAT` — `archivo:líneas` — qué viola y por qué`. Tildar el checkbox al terminar la revisión del archivo.

| # | Rev | Archivo | Líneas | Hallazgos |
|---|---|---|---|---|
| 1 | [x] | `frontend/src/App.css` | 187 | — |
| 2 | [x] | `frontend/src/assets/css/init.css` | 13 | — |
| 3 | [x] | `frontend/src/assets/css/ui-formulario.css` | 451 | — |
| 4 | [x] | `frontend/src/assets/css/ui.css` | 321 | — |
| 5 | [x] | `frontend/src/main.tsx` | 77 | — |
| 6 | [x] | `frontend/src/native-stubs/capacitor-google-auth.ts` | 12 | — |
| 7 | [x] | `frontend/src/vite-env.d.ts` | 1 | — |

## Hallazgos

- **F17 sin hallazgos nuevos (2026-08-25, contraste ligero):** raíz del frontend (`main.tsx`, `App.css`, `vite-env`, assets CSS, native-stubs) sin `as any`/`@ts-ignore`; `main.tsx` con la hidratación explícita de stores (H-F11-04) intacta. Árbol limpio.

<!-- Anotar aquí los hallazgos con formato H-MOD-NN. -->

