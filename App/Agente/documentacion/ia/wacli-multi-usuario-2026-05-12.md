# Chatbot WhatsApp multi-usuario — Documentación técnica

> **Fecha:** 2026-05-12
> **Plan:** `Agente/planes/plan-multi-usuario-whatsapp-2026-05-12.md`
> **Fases implementadas:** 1-7 (Fase 8: testing pendiente)

---

## Arquitectura

```
wacli --account user_42 sync
        │
        ▼ NDJSON POST /wp-json/glory/v1/whatsapp/webhook?account=user_42
        │
   WhatsAppWebhookService → valida HMAC + account_name
        │
        ▼ INSERT en glory_whatsapp_event_queue (status=pending)
        │
        ▼ HTTP 202 Accepted (fastcgi_finish_request)
        │
   WhatsAppEventWorker (systemd timer cada 5s o WP cron cada 1 min)
        │
   1. Zombie recovery (re-encola events en 'processing' > 5min)
   2. Fetch hasta 5 eventos pendientes (FIFO)
   3. Por evento:
        a. Per-user lock: GET_LOCK('whatsapp_user_{userId}', 5)
        b. Global LLM slot: GlobalLLMRateLimiter (max 5 concurrentes)
        c. AgentChatProcessor::procesar(userId, mensaje)
        d. WacliManagerService::enviarTexto(userId, jid, respuesta)
        e. Liberar slot + lock + marcar completado
```

## Tablas BD

### `glory_whatsapp_accounts`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| user_id | BIGINT UNIQUE | WP user ID |
| account_name | VARCHAR(32) UNIQUE | `user_{userId}` |
| phone_primary | VARCHAR(20) UNIQUE | Número E.164 |
| jid_primary | VARCHAR(64) | JID vinculado |
| authenticated | TINYINT(1) | 0/1 |
| store_path | VARCHAR(255) | Ruta al store wacli |
| enabled | TINYINT(1) | Activo/deshabilitado |
| blocked | TINYINT(1) | Bloqueado por admin |
| status_transition | VARCHAR(20) | Estado transitorio (registering) |
| daily_msg_count | INT | Mensajes hoy |
| daily_msg_date | DATE | Fecha del contador |
| health_status | VARCHAR(20) | healthy/degraded/dead/unknown |
| last_sync | DATETIME | Último sync |
| last_health_check | DATETIME | Último health check |

### `glory_whatsapp_event_queue`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| account_name | VARCHAR(32) | Vinculado a glory_whatsapp_accounts |
| event_body | LONGTEXT | JSON del evento NDJSON |
| signature | VARCHAR(128) | HMAC recibido |
| status | VARCHAR(20) | pending/processing/completed/failed |
| attempts / max_attempts | INT | Reintentos (default 3) |
| locked_until | DATETIME | Per-event lock |

## Servicios PHP

### `WacliManagerService`
Orquesta cuentas wacli multi-usuario:
- `registrarUsuario()` → crea BD + store + wacli auth con rollback
- `generarCodigoQR()` → regenera QR (rate limit 1/30s en endpoint)
- `verificarAuth()` → consulta auth status de wacli
- `enviarTexto()` / `descargarMedia()` → acciones como usuario específico
- `iniciarSync()` / `detenerSync()` → systemd per-user
- `healthCheck()` → systemd is-active + auth status
- `runHealthCheckSweep()` → cron 15-min: deshabilita cuentas dead + notifica admin
- `desvincular()` → detiene sync + limpia store + resetea BD
- `listarCuentasActivas()` → enabled=1 + authenticated=1

### `WhatsAppEventWorker`
Worker de cola asíncrono:
- `run()` → ciclo completo (zombie recovery → fetch → process)
- `runCron()` → wrapper static para WP cron
- Procesa hasta 5 eventos por ciclo
- Per-user lock con GET_LOCK (timeout 5s)
- Global LLM semaphore (max 5 concurrentes)
- Rate-limit por JID: 20 msg / 5 min (transient)
- Daily reset automático

### `GlobalLLMRateLimiter`
Semáforo global LLM con MySQL GET_LOCK:
- MAX_CONCURRENT=5 slots
- Slot inicial aleatorio (random_int) para evitar starvation
- Non-blocking con timeout 0

### `AgentChatProcessor` (modificado Fase 6)
- `resolverConfigLLM(int $userId)` → lee de `get_user_meta()` con fallback a `get_option()`

### `AgentProactiveService` (modificado Fase 6)
- `analizarTodos()` → admins + usuarios con `glory_whatsapp_chatbot` capability

## Endpoints REST

### Usuario (`/wp-json/glory/v1/whatsapp/`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /register | Registrar nuevo número + QR |
| POST | /renew-qr | Renovar QR (1/30s) |
| GET | /auth-status | Estado de autenticación |
| POST | /unlink | Desvincular cuenta |
| GET | /recipients | Números registrados (enmascarados) |
| GET | /daily-usage | Consumo del día |

### Admin (en `AdminApiController`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /whatsapp/cuentas | Listar cuentas (paginado) |
| GET | /whatsapp/detalle | Detalle de una cuenta |
| POST | /whatsapp/toggle | Habilitar/deshabilitar |
| GET | /whatsapp/health | Dashboard health |
| POST | /whatsapp/force-health | Forzar health check |

## Componentes React

Todos en `App/React/components/whatsapp/`:
- `WhatsappConnect.tsx` — máquina de estados orquestadora
- `WhatsappQRDisplay.tsx` — QR + countdown + polling
- `WhatsappStatus.tsx` — estado + metadatos + desvincular
- `WhatsappSettings.tsx` — uso diario + barra de progreso

Store: `App/React/stores/whatsappStore.ts` (Zustand)
Service: `App/React/services/whatsappService.ts`

## Crons y workers

| Frecuencia | Hook | Ejecuta |
|------------|------|---------|
| Cada 1 min (systemd timer 5s recomendado) | `glory_whatsapp_event_worker` | WhatsAppEventWorker::runCron() |
| Cada 15 min | `glory_whatsapp_health_check` | WacliManagerService::runHealthCheckSweep() |
| Cada 5 min | `glory_agent_process_due_actions` | AgentActionService + AgentProactiveService::analizarTodos() |
| Diario 3am | Bash script | wacli-backup-stores.sh (backup de stores wacli) |

## Seguridad

- HMAC-SHA256 en webhook contra WACLI_WEBHOOK_SECRET
- Per-user lock evita race conditions
- Global LLM semaphore (max 5) evita saturar proveedor
- Límite diario de mensajes (default 50 por usuario)
- Rate limit QR: 1/30s por usuario
- Rollback en registro fallido (BD + store)
- `escapeshellarg()` en todos los comandos sudo/systemctl
- Zombie recovery: re-encola events en 'processing' > 5min

## Monitoreo

- Health check cada 15 min → deshabilita automáticamente cuentas 'dead'
- Notificación al admin por WhatsApp + email cuando se deshabilita una cuenta
- Logging de: registros, QR generados, auth status, health sweeps, errores de sync
- Dashboard admin con health status de todas las cuentas

## Pendientes (Fase 8)

- [ ] POC: 2 cuentas wacli manuales + 2 syncs concurrentes + 2 webhooks
- [ ] Probar aislamiento de datos (Usuario A no ve datos de Usuario B)
- [ ] Probar race condition: 2 mensajes simultáneos del mismo usuario
- [ ] Probar recuperación: matar proceso wacli → systemd restart + health check
- [ ] Probar backup/restore de stores
- [ ] Probar rate limits: QR, mensajes diarios, LLM global
- [ ] Prueba de carga: 5-10 syncs concurrentes
