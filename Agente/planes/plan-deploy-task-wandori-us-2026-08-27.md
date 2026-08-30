# Plan: Despliegue de `task` en `task.wandori.us` (versión pre-Fase 0)

> **Fecha:** 27-08-2026
> **Estado:** PLANIFICADO — pendiente de autorización del usuario para push + escrituras remotas.
> **Objetivo:** desplegar la versión **comiteada `083c63d`** (antes de la Fase 0 del plugin de agente IA) del repo `task` como sitio Rust nuevo en Coolify, bajo el dominio `https://task.wandori.us`, sin afectar a los demás sitios del VPS.

---

## 1. Contexto y decisión de versión

| Aspecto | Valor |
|---|---|
| Repositorio | `github.com/1ndoryu/task`, rama `main` |
| HEAD actual | `cf0b77e` = **Fase 0+1 del plugin agente IA (INCOMPLETA**: falta `src/agent/scheduler.rs` sin commitear) |
| **Versión objetivo** | **`083c63d`** = `docs(agente): plan completo del plugin` (pre-Fase 0: base + UI + plan) |
| Por qué | El usuario pidió *"la versión comiteada... antes de la fase 0"*. La Fase 0+1 (`cf0b77e`) está incompleta y NO es candidata a producción todavía. |
| Cambios sin commitear | `src/agent/mod.rs`, `src/handlers/agente.rs`, `src/handlers/mod.rs`, `src/main.rs`, `src/agent/scheduler.rs`, `Agente/planes/plan-agente-ia-plugin-2026-08-27.md` — NO se despliegan (código no comiteado). |
| Remoto | `origin/main` = `7e89a2c` — **71 commits atrás** del HEAD local. El build de Coolify clona desde GitHub → **push es prerrequisito**. |

### Decisión de seguridad (autónoma)
- **NO se ejecuta push ni deploy** sin autorización explícita del usuario (regla `no-deploy-implicito`).
- El plan queda listo para ejecutar en cuanto el usuario autorice.
- La verificación de compilación del HEAD objetivo ya se hizo localmente (ver §7).

---

## 2. Análisis de riesgo — lecciones del incidente anterior

> **Advertencia del usuario:** "la última vez un agente hizo que los demas sitios se cayeran".
> Revisado el pipeline `deploy-service` de `coolify-manager-rs` v1.0.0 y las lecciones registradas.

### Causas históricas de caídas (todas verificadas como mitigadas en el pipeline actual)

| Riesgo | Incidente histórico | Mitigación actual en `deploy-service` |
|---|---|---|
| `restart --all` deja servicios Rust caídos | Incidente 2026-05-11: todos los workloads `exited` | **No se usa `restart --all`**. El deploy usa `docker compose up -d --no-build --force-recreate --no-deps` solo del servicio objetivo. |
| DNS collision `postgres` (28P01) | Incidente restaurante.wandori.us: alias `postgres` de `coolify-db` en red compartida | Templates nuevos usan `postgres-{{STACK_UUID}}`; `ensure_postgres_auth_and_hostname` corrige y verifica. |
| Coolify regenera compose on-disk durante build | Incidente 2026-07-21: fixes sed perdidos a los ~9 min | **Re-aplica fixes post-build** (bind mount, hostname postgres, runtime envs, SSH mount, label Traefik). |
| Traefik `Host()` sin backticks → sin cert | Despliegue real agape 2026-08-26 (234B) | Template `rust-stack.yaml` con backticks + `rewrite_compose_host_rules`. |
| Daño colateral a otros sitios | El usuario lo vivió | **F7: health check de TODOS los sitios del servidor al final del deploy** — detecta daños colaterales. |

### Blindaje adicional de este plan
- **Baseline previo:** health de los 9 sitios (guillermo, padel, wandori, nakomi, cap, studio, kamples, glory-rest, agape) — **todos `http_ok=true app_ok=true`** (27-08-2026).
- **Build local verificado** del HEAD objetivo (`083c63d`): backend release + frontend Vite → **OK** (ver §7).
- **Sitio nuevo = stack nuevo aislado**: no comparte red/compose/postgres con otros stacks (salvo la red `coolify` de Traefik, que es la normal).
- **`--skip-backup`**: sitio nuevo sin datos → no hay backup que perder (evita 2-3 min y no aplica).
- **Rollback automático E11** integrado en `deploy-service` (restaura compose anterior + recreate + rebuild + redeploy API si health falla).
- **No se toca el sitio legacy `nakomi`** (`task.nakomi.studio`, WordPress) — el usuario confirmó que es el legacy y no debe tocarse.

---

## 3. Preflight ya realizado (evidencia)

```text
1. Binario manager: C:\tmp\glory-target\coolify-manager\release\coolify-manager.exe (v1.0.0) OK
2. & $cm list → 9 sitios; NO existe 'task' → hay que crearlo
3. Health baseline: 9/9 sitios OK (http_ok=true app_ok=true fatal_logs=false)
4. nslookup task.wandori.us → NXDOMAIN (sin DNS, zona wandori.us en Cloudflare)
5. Repo task: HEAD=cf0b77e (Fase 0+1 incompleta), objetivo=083c63d, origin/main 71 commits atrás
6. Config backend: lee FRONTEND_DIST (NO STATIC_DIR), DATABASE_URL, CORS_ORIGINS, COOKIE_SECURE, TRUST_PROXY_HEADERS, HOST, PORT
7. Health endpoint: /api/health (coincide con template)
8. Migraciones: sqlx::migrate!() en arranque (main.rs) — aplica migrations/*.sql automáticamente
9. Sin macros query! → no requiere .sqlx offline ni BD en build
10. Frontend: npm ci + vite build OK; usa src/glory-core (interno), NO importa glory-rs (submodulo no necesario en build remoto)
```

---

## 4. Plan de ejecución (requiere autorización)

### Fase A — Push de la versión objetivo (AUTORIZACIÓN REQUERIDA)

```powershell
# 1. Estado actual
git -C "C:\Users\Owner\OneDrive\Documentos\area-trabajo\PROYECTO TASKS" status --short --branch

# 2. Crear rama temporal desde 083c63d para no arrastrar la Fase 0+1 incompleta
#    (solo si se quiere exactamente 083c63d; alternativa: push directo de main si el usuario
#     confirma que quiere cf0b77e)
git -C "C:\Users\Owner\OneDrive\Documentos\area-trabajo\PROYECTO TASKS" checkout -b deploy-pre-fase0 083c63d

# 3. Push (la rama del build en Coolify se fija con --glory-branch)
git -C "C:\Users\Owner\OneDrive\Documentos\area-trabajo\PROYECTO TASKS" push origin deploy-pre-fase0:deploy-pre-fase0
```

> **Decisión pendiente del usuario:** ¿push de `083c63d` en rama `deploy-pre-fase0` (recomendado, aísla la Fase 0 incompleta) o push de `main` completo (`cf0b77e`, incluye Fase 0+1)?

### Fase B — Crear sitio nuevo en Coolify (AUTORIZACIÓN REQUERIDA)

```powershell
$cm = "C:\tmp\glory-target\coolify-manager\release\coolify-manager.exe"

& $cm new `
  --name task `
  --domain "https://task.wandori.us" `
  --template rust `
  --glory-branch deploy-pre-fase0 `   # o main según decisión
  --repo-url "https://github.com/1ndoryu/task.git" `
  --app-bin glory-backend `
  --frontend-dir frontend `
  --skip-theme --skip-cache
```

Efectos:
- Crea stack Rust en Coolify (UUID nuevo), `postgres-<uuid>` dedicado, bind mount `/data/uploads/task`.
- Guarda el sitio `task` en `config/settings.json` (repoUrl/appBin/frontendDir correctos).
- NO hace `instant_deploy` (Rust) → requiere `deploy-service`.

### Fase C — Configurar DNS (AUTORIZACIÓN REQUERIDA)

```powershell
# 1. Añadir bloque dnsConfig (cloudflare, zone wandori.us, record A "task") a settings.json
#    (patrón igual que agape/glory-rest) — edición manual del JSON local del manager.

# 2. Dry-run primero, luego real
& $cm setup-site-dns --name task --dry-run
& $cm setup-site-dns --name task
```

### Fase D — Deploy (AUTORIZACIÓN REQUERIDA)

```powershell
# Deploy zero-downtime con rollback automático E11
& $cm deploy-service --name task --skip-backup
```

> Duración: 8-15 min (build Rust `--no-cache`). `--skip-backup` porque es sitio nuevo sin datos.
> El pipeline: sync compose → verifica postgres → sube Dockerfile.rust → build → swap `--no-deps` →
> Traefik/Coolify network → health check → **F7 health de todos los sitios** → verificación envs/volúmenes.

### Fase E — Env runtime del stack (AUTORIZACIÓN REQUERIDA)

El backend `task` lee `FRONTEND_DIST` (el template solo pone `STATIC_DIR`, que task ignora).
Añadir como env del stack (vía `sync-env` o panel de Coolify):

```text
FRONTEND_DIST=/app/dist
CORS_ORIGINS=https://task.wandori.us
COOKIE_SECURE=true
TRUST_PROXY_HEADERS=true
HOST=0.0.0.0
PORT=3000
# Claves LLM opcionales (solo si se quiere el chat IA activo en producción):
# CEREBRAS_API_KEY / GROQ_API* / DEEPSEEK_API*  (las mismas envs del proyecto anterior)
```

```powershell
# Sync de una variable con validación (requiere .env temporal con las claves Stripe obligatorias)
& $cm sync-env --name task --only FRONTEND_DIST --env-file .env
# ... repetir por variable, o usar el panel de Coolify (más simple para varias)
```

> **IMPORTANTE:** `deploy-service` re-aplica runtime envs del compose post-build; pero las envs
> nuevas deben existir en el panel ANTES o el contenedor se recrea sin ellas. Si se añaden
> después del primer deploy, se re-ejecuta `deploy-service --skip-backup` (recrea contenedor
> con las envs del panel). Alternativa: panel Coolify → añadir envs → redeploy.

### Fase F — Verificación post-deploy (OBLIGATORIA)

```powershell
# 1. Health del sitio nuevo
& $cm health --name task

# 2. Health de TODOS los sitios (detectar daños colaterales — lección del incidente)
$sitios = @("guillermo","padel","wandori","nakomi","cap","studio","kamples","glory-rest","agape")
foreach ($s in $sitios) { & $cm health --name $s }

# 3. Verificación HTTP del dominio (cert HTTPS + respuesta)
#    (curl https://task.wandori.us/api/health → 200 OK esperado)

# 4. Logs acotados si algo falla
& $cm logs --name task --target app --lines 50
```

---

## 5. Rollback

| Escenario | Acción |
|---|---|
| Health falla tras deploy | `deploy-service` ejecuta **rollback automático E11** (restaura compose anterior + recreate + rebuild + redeploy API). |
| Daño colateral a otro sitio | F7 lo detecta → diagnosticar con `health`/`logs`; `deploy-service --skip-backup` del sitio afectado (si estaba autorizado) o escalar. |
| DNS mal configurado | `setup-site-dns --name task --dry-run` para revisar antes de aplicar. |
| Sitio nuevo sin datos | No hay backup que restaurar; si falla el primer deploy, `new` + `deploy-service` se re-ejecutan (no hay estado que perder). |

---

## 6. Definition of Done

- [ ] Versión `083c63d` (o la decidida) pusheada al remoto en rama controlada.
- [ ] Sitio `task` creado en Coolify (stack Rust, UUID, settings.json actualizado).
- [ ] DNS `task.wandori.us` → 66.94.100.241 configurado en Cloudflare y verificado (HTTPS).
- [ ] `deploy-service --name task --skip-backup` completado con health OK.
- [ ] Env runtime correctas (FRONTEND_DIST, CORS_ORIGINS, COOKIE_SECURE, TRUST_PROXY_HEADERS).
- [ ] `health --name task` → `http_ok=true app_ok=true`.
- [ ] Health de los **9 sitios existentes** sigue OK (sin daños colaterales).
- [ ] `https://task.wandori.us/api/health` responde 200 y el frontend SPA carga.
- [ ] Roadmap actualizado (URL produccion definida) y evidencia en `Agente/completados/`.

---

## 7. Evidencia de verificación local (ya hecha)

- **Backend `083c63d`:** `cargo build --release --locked` en `C:\tmp\task-deploy-check` → **Finished release en 3m17s** (sin errores). `SQLX_OFFLINE=true` (no hay macros `query!`).
- **Frontend `083c63d`:** `npm ci && npm run build` → **built in 14.25s** (dist correcto, sin errores). No depende de `glory-rs`.
- **Clonación del HEAD:** `C:\tmp\task-deploy-check` (clone local del repo en `083c63d`) — el remoto clonará igual desde GitHub tras el push.

---

## 8. Pendientes / decisiones que requiere el usuario

1. **Versión:** ¿`083c63d` (pre-Fase 0, recomendado) o `cf0b77e` (Fase 0+1 incompleta) o `main`+working tree (NO recomendado)?
2. **Rama del build:** ¿`deploy-pre-fase0` (aisla la Fase 0) o `main`?
3. **Autorización push** a GitHub (prerrequisito).
4. **Autorización de escrituras remotas:** `new` + `setup-site-dns` + `deploy-service` + `sync-env`.
5. **Env LLM:** ¿incluir las claves IA (CEREBRAS/GROQ/DEEPSEEK) en producción para el chat IA, o dejarlas fuera por ahora?

---

*Generado por el agente el 27-08-2026. Sin escrituras remotas ejecutadas (pendiente autorización).*
