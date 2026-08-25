# Cómo reproducir y correr el stack de desarrollo (PROYECTO TASKS / task)

## Contexto (18-08-2026): stack AISLADO

La máquina convive con OTROS proyectos (WANDORIUS) que usan los mismos recursos:
puerto 5173 (vite), puerto 3000 (backend) y el target Cargo compartido
`C:/tmp/glory-target` (un agente de otro proyecto reconstruye `glory-backend.exe`
ahí y pisa el binario de este repo — el backend "moría" con VersionMissing porque
el binario compartido quedaba con código/migraciones de otra era).

Este proyecto usa recursos PROPIOS para no pelearse:

- Target Cargo privado: `C:/tmp/glory-target-task`
- Backend: puerto **3001**
- Frontend (Vite): **127.0.0.1:5174**, proxy `/api` → `http://127.0.0.1:3001`
  (via `VITE_API_PROXY_TARGET` + `VITE_PORT` + `VITE_HOST` en `frontend/vite.config.ts`)
- BD: `glory_backend_local` en PostgreSQL local 5432 (`postgres:root`)

### Por qué el frontend va en 127.0.0.1 (y no en localhost)

WANDORIUS corre su app en `localhost:5173`. Las cookies host-only de `localhost`
se comparten entre PUERTOS del mismo host, y ambas apps usan los mismos nombres
(`session_id`, `csrf_token`): la app hermana pisa las cookies de esta app en
mitad de sesión, y el backend empieza a responder 401 a todo (dashboard congelado
en "Cargando datos...", logout fallando con 401). Sirviendo en `127.0.0.1` el
alcance de cookies es distinto y no hay colisión. Usar SIEMPRE
`http://127.0.0.1:5174` en el navegador (si abres `localhost:5174`, vuelves al
alcance compartido).

## Artefactos que necesita un checkout nuevo

1. **Base de datos**: PostgreSQL local en `127.0.0.1:5432`, usuario `postgres`,
   password `root`. Crear `glory_backend_local` si falta y aplicar migraciones:
   `cargo sqlx migrate run` (con `DATABASE_URL` apuntando a esa BD).
2. **Binario del backend** (target PRIVADO):
   ```bash
   cd "PROYECTO TASKS"
   touch src/main.rs   # fuerza re-expansión de sqlx::migrate!() (evita VersionMissing por artefactos stale)
   CARGO_TARGET_DIR="C:/tmp/glory-target-task" cargo build --bin glory-backend
   ```
   El binario queda en `C:/tmp/glory-target-task/debug/glory-backend.exe`.
   > **Gotcha**: NO usar `C:/tmp/glory-target/debug` (compartido con otros
   > proyectos; lo sobrescriben con código ajeno). Si el backend falla con
   > `VersionMissing(<versión>)`, es un binario stale: `touch src/main.rs` + rebuild.
3. **Dependencias del frontend**: `npm --prefix frontend install --no-audit --no-fund`.

## Cómo arrancar los servidores

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "PROYECTO TASKS/.freebuff/start-backend.ps1"
powershell -NoProfile -ExecutionPolicy Bypass -File "PROYECTO TASKS/.freebuff/start-vite.ps1"
```

- Backend: `http://127.0.0.1:3001` (health `GET /api/health`; Swagger `/swagger-ui/`).
  Logs: `.freebuff/backend.out.log` / `.freebuff/backend.err.log` (dedicados).
- Frontend (Vite): **`http://127.0.0.1:5174`** (proxy `/api` → `:3001`).
  Logs: `.freebuff/vite.out.log` / `.freebuff/vite.err.log`.

Variables del backend: `PORT=3001`, `CORS_ORIGINS=http://localhost:5174,http://127.0.0.1:5174`,
`DATABASE_URL=postgres://postgres:root@127.0.0.1:5432/glory_backend_local`.

> **Claves IA (25-08-2026)**: `/api/ai/chat` y `/api/ai/nutricion` (solo admin)
> leen las MISMAS envs del proyecto anterior (WordPress/Coolify):
> `CEREBRAS_API_KEY`, `GROQ_API`/`GROQ_API_1..3` (rotación), `DEEPSEEK_API`/
> `DEEPSEEK-API`/`DEEPSEEK_API_KEY`. Copia tus claves al `.env` del repo (el
> bloque ya está ahí, vacío). Sin claves los endpoints responden con un error
> claro ("/ai/nutricion → 400: No hay API key configurada para cerebras...").
> Los límites por usuario/hora son `AI_CHAT_RATE_LIMIT_PER_HOUR=80` y
> `AI_NUTRITION_RATE_LIMIT_PER_HOUR=60` (contrato PHP).
Variables del vite: `VITE_PORT=5174`, `VITE_HOST=127.0.0.1`,
`VITE_API_PROXY_TARGET=http://127.0.0.1:3001`.

> **.env**: el `.env` del repo apuntaba a una BD muerta (55455) y puertos de otra
> era; corregido a los valores locales de arriba (es local, no se commitea).

## Verificación

- Suite de paridad (backend vivo; el WS se deriva de PARITY_BASE_URL):
  ```bash
  PARITY_BASE_URL="http://127.0.0.1:3001/api" node "PROYECTO TASKS/.freebuff/verify-parity.mjs"
  ```
  → 61 asserts (registro/sesión, límites FREE/premium, trial, expiración,
  almacenamiento/MIME, backups, feedback, cifrado, MCP, WS broadcast, contraseña,
  admin, actividad `/activity/dia`, heatmap).
- Typecheck front: `npm --prefix frontend run type-check` (tsc --noEmit).
- Tests Rust: `cargo test`.
