# Plan v2: Chatbot WhatsApp multi-usuario con QR — 2026-05-12

> **Versión:** 3.0 — Revisión del plan v2 post-review con correcciones de seguridad + 3 nuevos requerimientos del producto.
> **Cambios v3:** Feature de pago (capability gateada por suscripción), retrocompatibilidad garantizada con integración admin existente, flujo UX detallado para self-service de usuarios.

---

## 1. Resumen ejecutivo

**Objetivo:** Permitir que usuarios NO administradores (suscriptores, clientes, miembros) tengan su propio chatbot en WhatsApp usando **un número de teléfono por usuario** + escaneo de **código QR** para vincular su dispositivo. El sistema debe aislar datos, sesiones, memoria y acciones entre usuarios de forma segura, sin exponer información ajena.

**Requerimientos de producto confirmados (v3):**
- **Feature de pago:** Solo usuarios con suscripción activa pueden activar el chatbot WhatsApp. Admin siempre tiene acceso sin restricción de pago.
- **No romper la integración del admin:** El admin ya tiene 2 números registrados y usa el agente activamente. La nueva arquitectura debe ser completamente aditiva — el setup del admin no se toca.
- **UX self-service:** El usuario debe poder registrar su WhatsApp, escanear QR, ver estado, configurar su chatbot y desvincularlo desde el frontend, sin asistencia del admin.

**v2 → v2:** Se simplifica a **1 número por usuario** en v1. El segundo número se agrega en v2 si hay demanda real (reduce ~30% la complejidad).

**Problema actual:** El sistema WhatsApp (`wacli`) opera con una sola cuenta vinculada (`WACLI_ACCOUNT`) y un solo webhook. Solo el administrador (dueño del número primario `WHATSAPP`) tiene acceso al chatbot. Los demás números entrantes son ignorados o rechazados explícitamente.

---

## 2. Arquitectura conceptual (v2)

```
                          ┌─────────────────────────────────┐
                          │   WordPress + PHP (REST)         │
                          │                                  │
┌──────────┐              │  ┌───────────────────────────┐   │
│ Usuario A │───QR─────▶  │  │  WacliManagerService      │   │
│ (1 num)   │             │  │  - Multi-account registry  │   │
└──────────┘              │  │  - Per-user wacli instance │   │
                          │  └──────────┬────────────────┘   │
┌──────────┐              │             │                    │
│ Usuario B │───QR─────▶  │  ┌──────────▼────────────────┐   │
│ (1 num)   │             │  │  WhatsAppWebhookService    │   │
└──────────┘              │  │  (modificado)              │   │
                          │  │  - Responde 202 Accepted    │   │
                          │  │  - Valida HMAC → encola     │   │
                          │  └──────────┬────────────────┘   │
                          │             │                    │
                          │  ┌──────────▼────────────────┐   │
                          │  │  EventQueue table (InnoDB) │   │
                          │  │  + Worker (cron 1s)        │   │
                          │  └──────────┬────────────────┘   │
                          │             │                    │
                          │  ┌──────────▼────────────────┐   │
                          │  │  AgentChatProcessor (1/N)  │   │
                          │  │  - Per-user lock            │   │
                          │  │  - Global LLM semaphore      │   │
                          │  │  - Inyecta contexto user     │   │
                          │  └───────────────────────────┘   │
                          └─────────────────────────────────┘
                                      │
                          ┌───────────▼────────────┐
                          │   wacli --account A     │──▶ WhatsApp A
                          │   wacli --account B     │──▶ WhatsApp B
                          └────────────────────────┘
```

**Diferencia clave vs v1:** El webhook ahora es **asíncrono**. Responde `202 Accepted` inmediatamente, encola el evento, y un worker lo procesa después. Esto elimina timeouts de LLM, permite rate limiting real y desacopla la recepción del procesamiento.

---

## 3. Componentes necesarios

### 3.1 Infraestructura wacli: multi-account

**Estado actual:** `WacliService` soporta `--account` vía env var `WACLI_ACCOUNT`. Cada comando se ejecuta con una sola cuenta.

**Lo que cambia:** Cada usuario tendrá su propia cuenta wacli aislada con su propio `--account` y directorio de store.

```
En servidor:
  /data/wacli/
    users/
      user_3/
        store/          ← wacli store del usuario #3
        account_name    ← "user_3"
      user_7/
        store/          ← wacli store del usuario #7
        account_name    ← "user_7"
```

**`WacliManagerService` (nuevo):**
- Administra múltiples instancias wacli en el servidor.
- Métodos:
  - `registrarUsuario(userId, phonePrimary)` — crea estructura de directorios y ejecuta `wacli --account user_X auth`.
  - `obtenerStoreDir(userId)` — retorna `/data/wacli/users/user_{userId}/store`.
  - `generarCodigoQR(userId)` — captura QR desde wacli. **Rate limited: 1 vez cada 30s por usuario.**
  - `verificarAuth(userId)` — llama `wacli --account user_X --read-only auth status`.
  - `enviarTexto(userId, jid, mensaje)` — envía como el usuario correcto.
  - `descargarMedia(userId, chat, msgId, mediaType)` — descarga bajo la cuenta correcta.
  - `iniciarSync(userId)` / `detenerSync(userId)` — systemd per-user.
  - `healthCheck(userId)` — verifica que el proceso systemd esté vivo y `auth status` responda.
- Cada operación ejecuta `proc_open` con `--account user_X --store-dir /data/wacli/users/user_X/store`.
- **Toda invocación de `proc_open`/`exec` debe sanitizar argumentos con `escapeshellarg()`**, aunque el input venga de la BD. Esto es obligatorio por regla 5 del proyecto.

### 3.2 Base de datos: Tabla dedicada (MEJORA CRÍTICA vs v1)

En lugar de 10+ meta_keys en `wp_usermeta` (lento, sin índices), se crea una tabla dedicada:

```sql
CREATE TABLE glory_whatsapp_accounts (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE,
  account_name VARCHAR(32) NOT NULL UNIQUE,
  phone_primary VARCHAR(20) NOT NULL UNIQUE,
  jid_primary VARCHAR(64) DEFAULT NULL,
  authenticated TINYINT(1) DEFAULT 0,
  linked_jid VARCHAR(64) DEFAULT NULL,
  store_path VARCHAR(255) DEFAULT NULL,
  enabled TINYINT(1) DEFAULT 1,
  blocked TINYINT(1) DEFAULT 0,
  daily_msg_count INT DEFAULT 0,
  daily_msg_date DATE DEFAULT NULL,
  last_sync DATETIME DEFAULT NULL,
  last_health_check DATETIME DEFAULT NULL,
  health_status VARCHAR(20) DEFAULT 'unknown',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_account_name (account_name),
  INDEX idx_jid_primary (jid_primary),
  INDEX idx_enabled (enabled),
  INDEX idx_health_status (health_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Por qué tabla y no usermeta:**
- La query del webhook (`SELECT user_id WHERE account_name = ?`) pasa de full scan de usermeta a índice único → O(1)
- Las columnas son tipadas (INT, DATE, VARCHAR) vs texto genérico
- 10+ meta_keys por usuario activo = ~100 filas extra en usermeta que fragmentan la tabla
- Permite JOINs directos con otras tablas sin subqueries de usermeta

**Campos en wp_usermeta que se MANTIENEN (no migran a la tabla):**
- `glory_chatbot_proveedor` / `glory_chatbot_modelo` — configuración LLM por usuario (son del agente, no de WhatsApp)
- `glory_chatbot_master_context` — contexto maestro (es del agente, no de WhatsApp)
- `glory_chatbot_privacy_mode` — privacidad (es del agente)

### 3.3 Gestión de cuentas de usuario

**Nuevo endpoint `POST /glory/v1/whatsapp/register`:**
```php
// Espera:
{
  "primary": "+584141234567"
}
// Crea la cuenta wacli, devuelve QR en base64 o raw
{
  "ok": true,
  "qr": "data:image/png;base64,...",
  "accountName": "user_42",
  "instructions": "Escanea este código QR desde WhatsApp > Dispositivos vinculados"
}
```

**Endpoints adicionales:**
- `POST /glory/v1/whatsapp/renew-qr` — regenera QR si expiró. **Rate limit: 1 vez cada 30s.**
- `GET /glory/v1/whatsapp/auth-status` — estado de autenticación del usuario actual.
- `POST /glory/v1/whatsapp/unlink` — desvincula, detiene sync, elimina store.
- `GET /glory/v1/whatsapp/recipients` — lista los números registrados (enmascarados).
- `GET /glory/v1/whatsapp/daily-usage` — consumo de mensajes del día.

**Control de acceso a endpoints:**
- `register`, `renew-qr`, `auth-status`, `unlink`: `is_user_logged_in` + `current_user_can('glory_whatsapp_chatbot')`.
- `register` verifica UNIQUE en `phone_primary` y `user_id`.
- Límite: 1 cuenta por usuario.

**Estado transitorio `registering` + rollback (crítico):** El registro usa un estado intermedio para evitar cuentas huérfanas.
```php
function registrarUsuario(int $userId, string $phone): array {
    // 1. Insertar fila con status_transition = 'registering', authenticated = 0
    // 2. Ejecutar wacli --account user_X auth
    // 3. Si auth falla (binario no encontrado, permisos, timeout):
    //    a. Rollback: DELETE FROM glory_whatsapp_accounts WHERE user_id = X
    //    b. rm -rf /data/wacli/users/user_X/
    //    c. Retornar error. Usuario puede re-intentar.
    // 4. Si auth funciona: status_transition = NULL, authenticated=0, retornar QR
    //
    // Esto evita que un registro fallido deje un estado inconsistente.
}
```

### 3.4 Webhook asíncrono con cola de eventos (MEJORA CRÍTICA vs v1)

**Problema del diseño síncrono v1:** El webhook espera a que el LLM responda (5-20s). wacli puede timeout. PHP/FPM puede timeout. Dos mensajes simultáneos del mismo usuario causan race conditions.

**Solución:** Webhook asíncrono con tabla de eventos + worker.

**Nueva tabla `glory_whatsapp_event_queue`:**
```sql
CREATE TABLE glory_whatsapp_event_queue (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  account_name VARCHAR(32) NOT NULL,
  event_body LONGTEXT NOT NULL,     -- JSON del evento NDJSON
  signature VARCHAR(128) NOT NULL,   -- HMAC recibido
  status VARCHAR(20) DEFAULT 'pending',  -- pending | processing | completed | failed
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  locked_until DATETIME DEFAULT NULL,  -- per-event lock
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME DEFAULT NULL,
  INDEX idx_status (status),
  INDEX idx_locked (locked_until),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Flujo del webhook:**

```
POST /wp-json/glory/v1/whatsapp/webhook?account={name}
  │
  1. Validar HMAC-SHA256 (igual que ahora)
  2. Validar account_name → existe en glory_whatsapp_accounts?
3. Si todo OK → INSERT en glory_whatsapp_event_queue (status='pending')
4. Responder HTTP 202 Accepted (Content-Length: 0, Connection: close)
5. fastcgi_finish_request() → libera PHP-FPM (con fallback si no existe la función)
  │
  [Worker se ejecuta cada 1s vía cron o systemd timer]
  │
  6. SELECT * FROM glory_whatsapp_event_queue
     WHERE status='pending' AND (locked_until IS NULL OR locked_until < NOW())
     ORDER BY created_at ASC LIMIT 1
  7. UPDATE locked_until = NOW() + 30s WHERE id = X
  8. Procesar evento (igual que el flujo síncrono actual)
  9. UPDATE status = 'completed' (o 'failed') WHERE id = X
```

**Fallback para `fastcgi_finish_request()`:** Esta función solo existe en SAPI `cgi-fcgi` (PHP-FPM). En CLI, Apache mod_php o CGI puro, lanza un error fatal.
```php
// Al inicio del webhook handler:
if (function_exists('fastcgi_finish_request')) {
    ignore_user_abort(true);
    // Enviar headers 202 + cerrar conexión
    status_header(202);
    header('Content-Type: application/json');
    echo json_encode(['ok' => true, 'queued' => true]);
    fastcgi_finish_request(); // Cierra conexión, PHP sigue ejecutándose
} else {
    // Fallback: cerrar conexión HTTP manual
    ignore_user_abort(true);
    ob_start();
    status_header(202);
    header('Content-Type: application/json');
    header('Content-Length: ' . strlen('{"ok":true,"queued":true}'));
    header('Connection: close');
    echo json_encode(['ok' => true, 'queued' => true]);
    ob_end_flush();
    flush();
}
```

**Per-user lock (previene race conditions):**
```php
// Antes de procesar cada mensaje, adquirir lock por usuario
$lockKey = "whatsapp_user_{$userId}";
$locked = $wpdb->get_var("SELECT GET_LOCK('$lockKey', 5)"); // timeout 5s
if (!$locked) {
    // Re-encolar o saltar (otro mensaje del mismo usuario se está procesando)
    update_event_status($eventId, 'pending'); // lo deja para el próximo ciclo
    return;
}
try {
    // procesar mensaje...
} finally {
    $wpdb->query("SELECT RELEASE_LOCK('$lockKey')");
}
```

**Worker (sistema de timer):**
- Opción A (recomendado): Systemd timer cada 5s, procesa hasta 5 eventos por ejecución.
- Opción B (fallback): Cron de WordPress cada minuto.
- Opción C: Loop PHP persistente con sleep(1) (similar al runner de OpenCode).

**Recomendación: Opción A como default.** La latencia de 1 minuto (cron WP) es inaceptable para un chatbot WhatsApp donde los usuarios esperan respuesta en segundos. Systemd timer cada 5s da ~7s de latencia promedio (2.5s de espera + ~5s de procesamiento LLM). Usar Opción B solo si no se puede agregar systemd timer.

**Zombie event recovery (crítico):** Si el worker muere durante el procesamiento (fatal PHP, timeout, OOM), un evento puede quedar en estado `processing` indefinidamente.
```sql
-- Recovery run al inicio de cada ciclo del worker:
UPDATE glory_whatsapp_event_queue
SET status = 'pending', locked_until = NULL
WHERE status = 'processing'
  AND updated_at < NOW() - INTERVAL 5 MINUTE;
```
Esto evita que un worker muerto deje eventos atascados para siempre.

**Daily message count reset:** Al procesar cada mensaje, el worker verifica si `daily_msg_date != CURDATE()`. Si es distinto, resetea `daily_msg_count = 0` y `daily_msg_date = CURDATE()` antes de incrementar.

### 3.5 Global LLM Rate Limiter (MEJORA CRÍTICA vs v1)

**Problema:** 20 usuarios enviando mensajes simultáneamente → 20 requests concurrentes al LLM → 429 Rate Limit del proveedor.

**Solución:** Semáforo global + cola por usuario.

```php
/**
 * Semáforo global: máximo N requests concurrentes al LLM.
 * Usa MySQL GET_LOCK (asociado a la conexión, se libera al cerrar).
 * Para evitar lock starvation, el slot inicial se elige aleatoriamente.
 *
 * ORDEN OBLIGATORIO DE LOCKS (prevención de deadlock):
 *   Adquirir: 1) Per-user lock, 2) Global LLM slot
 *   Liberar:  1) Global LLM slot, 2) Per-user lock
 */
class GlobalLLMRateLimiter {
    private int $maxConcurrent;
    private string $lockPrefix;
    private \wpdb $wpdb;
    
    public function __construct(\wpdb $wpdb, int $maxConcurrent = 5, string $lockPrefix = 'glory_llm_sem_') {
        $this->wpdb = $wpdb;
        $this->maxConcurrent = $maxConcurrent;
        $this->lockPrefix = $lockPrefix;
    }
    
    /**
     * @return int|false Slot number if acquired, false if all busy.
     */
    public function acquireSlot(): int|false {
        $start = random_int(0, $this->maxConcurrent - 1); // Evita starvation
        for ($i = 0; $i < $this->maxConcurrent; $i++) {
            $slot = ($start + $i) % $this->maxConcurrent;
            // Usar GET_LOCK con timeout 0 (non-blocking)
            $locked = $this->wpdb->get_var(
                $this->wpdb->prepare(
                    "SELECT GET_LOCK(%s, 0)",
                    $this->lockPrefix . $slot
                )
            );
            if ($locked === '1' || $locked === 1) {
                return $slot;
            }
        }
        return false; // todos los slots ocupados
    }
    
    public function releaseSlot(int $slot): void {
        $this->wpdb->query(
            $this->wpdb->prepare(
                "SELECT RELEASE_LOCK(%s)",
                $this->lockPrefix . $slot
            )
        );
    }
}
```

### 3.6 Backup de stores wacli (MEJORA vs v1)

**Problema:** Store wacli (~1-5 MB con sesión activa) se corrompe → usuario pierde vinculación → re-escanear QR.

**Solución:** Backup periódico de `/data/wacli/users/` con retención aislada.

```bash
#!/bin/bash
# /etc/cron.d/wacli-store-backup
# Se ejecuta diariamente a las 3am
0 3 * * * root /usr/local/bin/wacli-backup-stores.sh
```

```bash
#!/usr/bin/bash
# wacli-backup-stores.sh
BACKUP_DIR="/data/backups/wacli-stores"
SOURCE_DIR="/data/wacli/users"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p "$BACKUP_DIR"

tar czf "$BACKUP_DIR/wacli-stores-$TIMESTAMP.tar.gz" -C "$SOURCE_DIR" .

# Retención: mantener últimos 5 backups manuales/diarios
ls -1t "$BACKUP_DIR"/wacli-stores-*.tar.gz | tail -n +6 | xargs -r rm -f
```

**Nota:** Esta retención (`manualKeep=5`) es independiente de los backups programados del sitio, siguiendo la política establecida del proyecto.

### 3.7 Health check y detección de corrupción (MEJORA vs v1)

**Problema:** wacli sync se cae, systemd lo reinicia, pero el store quedó inconsistente. Sin notificación, el usuario pierde el chatbot silenciosamente.

**Solución:** Health check periódico + tabla de monitoreo.

```php
// WacliManagerService::healthCheck(userId)
// 1. Verificar que el proceso systemd está activo
//    systemctl is-active wacli-sync@user_X
// 2. Verificar auth status responde
//    wacli --account user_X --read-only auth status --timeout 10s
// 3. Verificar last_sync en glory_whatsapp_accounts < 1 hora
// 4. Si systemd está restarting > 3 veces en 5min → deshabilitar + notificar admin
//
// Resultado se guarda en glory_whatsapp_accounts:
//   last_health_check = NOW()
//   health_status = 'healthy' | 'degraded' | 'dead'
```

**Cron de health check (cada 15 minutos):**
```php
// En el worker de agenda o cron separado:
$accounts = $wpdb->get_results(
    "SELECT user_id, account_name, phone_primary FROM glory_whatsapp_accounts 
     WHERE enabled = 1 AND authenticated = 1"
);
foreach ($accounts as $acct) {
    $status = $wacliManager->healthCheck($acct->user_id);
    if ($status === 'dead') {
        // Deshabilitar automáticamente la cuenta
        $wpdb->update('glory_whatsapp_accounts', 
            ['enabled' => 0, 'health_status' => 'dead'], 
            ['user_id' => $acct->user_id]
        );
        
        // NOTIFICAR al admin por WhatsApp (canal primario) y email (backup)
        // Uso: WacliService::enviarTexto con el JID del administrador
        $adminPhone = getenv('WHATSAPP');
        if ($adminPhone) {
            $wacliManager->enviarTexto($adminUserId, $adminPhone, 
                "⚠️ Chatbot caído: usuario #{$acct->user_id} ({$acct->account_name}, {$acct->phone_primary}). " .
                "Store corrupto o sync detenido. Se deshabilitó automáticamente. " .
                "Health check: " . date('Y-m-d H:i:s')
            );
        }
        // Fallback: email
        wp_mail(get_option('admin_email'), 
            'Chatbot WhatsApp caído - ' . $acct->account_name,
            "El chatbot del usuario #{$acct->user_id} ({$acct->phone_primary}) se ha deshabilitado.\n" .
            "Account: {$acct->account_name}\n" .
            "Health check: " . date('Y-m-d H:i:s')
        );
    }
}
```

### 3.8 Systemd service template

```ini
# /etc/systemd/system/wacli-sync@.service
[Unit]
Description=wacli sync for user %i
After=network.target
StartLimitIntervalSec=300
StartLimitBurst=3

[Service]
Type=simple
User=www-data
# El secret se lee de un archivo seguro (600) — NUNCA pasarlo inline en ExecStart
# porque es visible via ps aux, /proc/*/cmdline y systemctl show
EnvironmentFile=/etc/wacli/secrets.env
Environment="WACLI_STORE_DIR=/data/wacli/users/%i"
ExecStart=/usr/local/bin/wacli --account %i --store-dir /data/wacli/users/%i sync --webhook https://task.nakomi.studio/wp-json/glory/v1/whatsapp/webhook?account=%i --webhook-secret ${WACLI_WEBHOOK_SECRET} --lock-wait 30s
Restart=always
RestartSec=10
# Si falla 3 veces en 5 minutos, dejar de reintentar (StartLimitBurst=3, StartLimitIntervalSec=300)
# systemd reset-failure wacli-sync@user_X para reactivar manualmente

[Install]
WantedBy=multi-user.target
```

**Controller PHP que gestiona servicios systemd:**
```php
// WacliManagerService::iniciarSync(userId)
// -> exec('sudo systemctl start wacli-sync@user_{userId}')
// WacliManagerService::detenerSync(userId)
// -> exec('sudo systemctl stop wacli-sync@user_{userId}')
// WacliManagerService::healthCheckSystemd(userId)
// -> exec('sudo systemctl is-active wacli-sync@user_{userId}')
```

**Sudoers:** `www-data ALL=(root) NOPASSWD: /usr/bin/systemctl start wacli-sync@*, /usr/bin/systemctl stop wacli-sync@*, /usr/bin/systemctl is-active wacli-sync@*, /usr/bin/systemctl reset-failure wacli-sync@*`

### 3.9 Hook de registro de usuario

Al crear/registrar un usuario en WordPress, no se crea automáticamente la cuenta wacli. Debe ser un paso explícito (self-service desde el frontend). Hook opcional para admin: `whatsapp_user_registered` action en WordPress.

### 3.13 Modelo de pago y acceso (NUEVO — v3)

**Principio:** La feature es de pago. La capability `glory_whatsapp_chatbot` es la llave — se concede al activar una suscripción activa y se revoca al cancelarla. El admin (`administrator`) siempre la tiene sin validación de pago.

**Mecanismo de acceso:**
```php
// Verificación en cada endpoint de usuario:
function canUserUseWhatsappChatbot(int $userId): bool {
    // Admin siempre puede (no paga)
    if (user_can($userId, 'administrator')) return true;
    
    // Usuario normal: necesita suscripción activa
    return user_can($userId, 'glory_whatsapp_chatbot');
}
```

**Asignación de la capability:**
- Al activar una suscripción: `add_user_meta($userId, 'glory_whatsapp_sub_status', 'active')` + `$user->add_cap('glory_whatsapp_chatbot')`.
- Al cancelar: `$user->remove_cap('glory_whatsapp_chatbot')` + deshabilitar cuenta en `glory_whatsapp_accounts` (`enabled = 0`).
- El servicio de pagos existente en el proyecto dispara los hooks de activación/cancelación.

**Columna adicional en `glory_whatsapp_accounts`:**
```sql
ALTER TABLE glory_whatsapp_accounts 
  ADD COLUMN is_admin TINYINT(1) DEFAULT 0 COMMENT '1 = cuenta del administrador, bypass de checks de pago';
```

**Qué ve un usuario sin suscripción:**
- El frontend muestra el panel de "Mi Chatbot → WhatsApp" con un CTA de upgrade/pago.
- Los endpoints REST devuelven `403` con mensaje `{"ok": false, "error": "subscription_required"}`.
- No se crea cuenta wacli ni se consume ningún recurso del servidor.

**Qué define el precio:** Fuera del scope del plan técnico — coordinar con el producto. El plan implementa el gate técnico; el precio y los planes de suscripción los define el negocio.

### 3.14 Retrocompatibilidad con la integración del admin (CRÍTICO — v3)

**Contexto:** El admin ya tiene 2 números registrados en wacli con la cuenta `WACLI_ACCOUNT` y usa el agente activamente. Este sistema NO debe interrumpir ese flujo bajo ninguna circunstancia.

**Estrategia: la nueva arquitectura es 100% aditiva.**

**Routing del webhook — coexistencia:**
```
GET ?account=WACLI_ACCOUNT  →  flujo admin existente (WhatsAppWebhookService actual, sin cambios)
GET ?account=user_X         →  flujo nuevo multi-usuario (WhatsAppEventWorker)
```
El webhook detecta el `account` param:
```php
// WhatsAppWebhookService::handle():
$account = sanitize_text_field($_GET['account'] ?? '');
$adminAccount = getenv('WACLI_ACCOUNT'); // cuenta del admin

if ($account === $adminAccount) {
    // Ruta admin: lógica existente, sin cambios
    return $this->handleAdminWebhook($request);
}

// Ruta multi-usuario: nueva lógica
return $this->handleUserWebhook($account, $request);
```

**Qué NO se toca:**
- `WacliService.php` existente (el admin lo sigue usando igual).
- La cuenta wacli del admin (`WACLI_ACCOUNT`) y su directorio de store.
- Los 2 números del admin registrados en wacli.
- Los env vars `WACLI_ACCOUNT`, `WACLI_WEBHOOK_SECRET`, `WHATSAPP`, `WHATSAPP_2`.
- El proceso systemd del admin (si existe) o el proceso wacli que ya corre.
- `AgentChatProcessor` en su path del admin — el nuevo código agrega un branch, no reemplaza.

**Qué sí cambia (para el admin también, de forma transparente):**
- `AgentChatProcessor` ahora lee config LLM de `get_user_meta()` en lugar de `get_option()`. Para el admin, esto es transparente si se migra su config actual de option → usermeta en el mismo deploy (script de migración en Fase 1).
- `AgentProactiveService` / `AgentSchedulerService` ahora iteran todos los usuarios, incluyendo al admin — no cambia el comportamiento del admin, solo agrega los nuevos.

**Migración de datos del admin (Fase 1):**
```php
// Script de migración one-time:
$adminId = get_option('glory_admin_user_id') ?? 1;

// Mover config LLM de options → usermeta del admin:
$proveedor = get_option('glory_chatbot_proveedor');
$modelo = get_option('glory_chatbot_modelo');
if ($proveedor) update_user_meta($adminId, 'glory_chatbot_proveedor', $proveedor);
if ($modelo) update_user_meta($adminId, 'glory_chatbot_modelo', $modelo);
// Las options globales quedan como fallback (no se borran) para no romper nada
```

**Registro del admin en `glory_whatsapp_accounts` (opcional):**
El admin puede (no debe) tener fila en la tabla con `is_admin = 1`. NO es obligatorio — su webhook va por el path existente. Solo se registra si se quiere incluir al admin en el health check dashboard. Si se agrega, `account_name = getenv('WACLI_ACCOUNT')`.

### 3.10 Aislamiento de datos por usuario

**Ya aislado actualmente:**
- `glory_agent_chat_messages` → filtrado por `user_id` + `session_id`
- `glory_agent_actions` → filtrado por `user_id`
- MemPalace → namespace `user_{userId}`
- Contexto maestro → `wp_usermeta` clave `glory_chatbot_master_context`
- OpenCode jobs → tabla con `user_id`

**Aislar adicionalmente:**
- `AgentProactiveService` → debe iterar TODOS los usuarios con `enabled = 1`, no solo admins.
- `AgentSchedulerService` → verificar recordatorios de todos los usuarios.
- `AgentRateLimitService` → ya está por usuario (clave transiente incluye userId).
- **Configuración LLM por usuario:** `glory_chatbot_proveedor` y `glory_chatbot_modelo` deben ser por usuario (wp_usermeta) en lugar de WP options globales. `AgentChatProcessor` debe leer de `get_user_meta()` en lugar de `get_option()`.

### 3.11 UX para registro y vinculación (EXPANDIDO — v3)

**Principio de diseño:** El usuario debe poder completar el flujo completo (registrar número → escanear QR → chatbot activo) en menos de 2 minutos, sin instrucciones externas y sin contactar al admin.

**Estados del componente (máquina de estados clara):**
```
not_subscribed → upgrade CTA
not_connected   → formulario de número
registering     → spinner "Preparando tu chatbot..."
qr_ready        → QR + countdown 60s + "Abre WhatsApp → Dispositivos vinculados → Vincular dispositivo"
qr_expired      → botón "Renovar QR" + mensaje "El código expiró, genera uno nuevo"
connecting      → spinner "Verificando conexión..."
connected       → panel de estado (verde) + configuración
error           → mensaje de error claro + acción de recovery
disconnected    → panel de reconexión
```

**Flujo paso a paso:**

1. **Acceso:** Usuario va a "Mi Chatbot" → "WhatsApp". Si no tiene suscripción, ve CTA de upgrade con precio. Si tiene suscripción, ve el panel de conexión.

2. **Registro:** Formulario simple:
   - Input de número con validación E.164 en tiempo real (verde/rojo sin submit)
   - Placeholder: `+584141234567`
   - Hint: "Ingresa el número del teléfono donde tienes WhatsApp"
   - Botón "Conectar mi WhatsApp"
   - El botón se deshabilita si el número es inválido

3. **QR Display:**
   - QR código centrado, grande (~250x250px), con borde claro
   - Countdown visual (barra de progreso o texto "60s") que se actualiza cada segundo
   - Instrucciones inline: `Abre WhatsApp → los 3 puntitos → Dispositivos vinculados → Vincular dispositivo`
   - Screenshot de referencia o ícono de pasos si el diseño lo permite
   - Polling automático cada 3s a `GET /glory/v1/whatsapp/auth-status`
   - Si `authenticated = true` → transición automática a `connected` sin acción del usuario
   - Al expirar: overlay sobre el QR "Código expirado" + botón "Renovar" (rate limit visible: "Próxima renovación en Xs")

4. **Panel conectado:**
   - Número vinculado (enmascarado: `+584141****67`)
   - Indicador de salud (verde/amarillo/rojo)
   - Mensajes hoy: `X / 50` con barra de progreso
   - Toggle "Chatbot activo" (habilita/deshabilita sin desvincular)
   - Configuración LLM: proveedor y modelo (select, mismo que la config del admin)
   - Botón "Desvincular" con confirmación modal

5. **Recovery visible para el usuario:**
   - Si `health_status = 'degraded'`: banner amarillo "Tu chatbot está teniendo problemas. Intenta reconectar."
   - Si `health_status = 'dead'`: banner rojo "Tu chatbot se desconectó. Reconecta tu WhatsApp."
   - Botón "Reconectar" lanza el flujo de QR de nuevo.

**Componentes React:**
- `WhatsappConnect.tsx` — wrapper con máquina de estados
- `WhatsappQRDisplay.tsx` — QR + countdown + polling
- `WhatsappStatusPanel.tsx` — panel cuando está conectado
- `WhatsappSettings.tsx` — configuración LLM + daily limit toggle
- `WhatsappUpgradeCTA.tsx` — pantalla para usuarios sin suscripción

**Store Zustand (`iaStore.ts` — extensión):**
```typescript
whatsapp: {
  status: 'not_subscribed' | 'not_connected' | 'registering' | 'qr_ready' | 
          'qr_expired' | 'connecting' | 'connected' | 'error' | 'disconnected';
  qrBase64: string | null;
  qrExpiresAt: number | null; // timestamp Unix
  phone: string | null;        // enmascarado
  dailyUsage: { count: number; limit: number; date: string } | null;
  healthStatus: 'healthy' | 'degraded' | 'dead' | 'unknown';
  error: string | null;
}
```

### 3.12 Seguridad: consideraciones críticas (v2 actualizada)

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| **Race condition en webhook** | Media | **Crítico** | Per-user lock con MySQL GET_LOCK + cola de eventos. Dos mensajes del mismo usuario no se procesan concurrentemente. |
| **Un usuario registra el número de otro** | Baja | Alto | Verificación vía QR (solo el dueño del teléfono puede escanearlo). Validación UNIQUE en phone_primary de la tabla. |
| **Fuga de datos entre sesiones** | Baja | Crítico | Aislamiento por `user_id` en TODAS las queries. Prohibido usar `get_current_user_id()` en contextos webhook — el userId viene del account_name resuelto. |
| **Escalado de privilegios** | Baja | Alto | Endpoints requieren nonce + cookie WP + capability `glory_whatsapp_chatbot`. Webhook público pero requiere HMAC. |
| **Uso malicioso del QR** | Baja | Medio | QR expira ~60s (wacli). renew-qr rate limited (1/30s). Log de cada generación con IP y timestamp. |
| **Almacenamiento inseguro de stores** | Baja | Alto | Permisos 600, dueño www-data, bajo `/data/wacli/users/` con aislamiento de directorio por usuario. |
| **Consumo de recursos (procesos wacli)** | Media | Medio | **Soft limit: 20 cuentas** (recomendado para v1). **Hard limit: 50 cuentas** (absoluto, no exceder). Iterar pruebas para determinar el límite real del servidor. Desactivar inactivas (>30 días). |
| **Rate limiting** | Media | Medio | Por usuario (ya existe + daily limit). Sin límite de proveedor LLM puede saturarse. |
| **Abuso al LLM (costos)** | Media | Alto | Límite diario de mensajes (env var `WHATSAPP_DAILY_MSG_LIMIT`, default 50). Global LLM semaphore (máx 5 concurrentes). Alertas de consumo anómalo. |
| **Corrupción de store wacli** | Baja | Alto | Backup diario de stores (retención 5). Health check cada 15 min. Deshabilitado automático si detecta caída + notificación admin. |
| **Timeout de webhook** | Media | Medio | Webhook responde 202 Accepted inmediatamente y procesa en background via cola. No más timeouts de LLM en el webhook. |
| **LLM provider rate limit** | Media | Alto | Semáforo global (MAX_CONCURRENT=5). Los mensajes que exceden se re-encolan para el próximo ciclo del worker. |
| **Bloqueo número por usuario** | Baja | Bajo | Campo `blocked` en tabla + WHATSAPP_BLOCKED_JIDS global para spam/abuso. |

---

## 4. Flujo detallado de un mensaje entrante (v2 — asíncrono)

```
1. Usuario escribe en WhatsApp
       │
2. wacli --account user_42 sync (systemd)
       │ recibe el mensaje
       │
3. wacli envía NDJSON POST a:
       /wp-json/glory/v1/whatsapp/webhook?account=user_42
       │
4. WhatsAppWebhookService::validarFirma()
       │ → HMAC-SHA256 contra WACLI_WEBHOOK_SECRET
       │
5. Validar account_name en glory_whatsapp_accounts
       │ → SELECT user_id, enabled FROM glory_whatsapp_accounts
       │   WHERE account_name = 'user_42' AND enabled = 1
       │ → Si no existe o deshabilitado → 404 / 403
       │
6. INSERT INTO glory_whatsapp_event_queue
       │ (account_name, event_body, signature, status='pending')
       │
7. Responder 202 Accepted (con fallback si no existe fastcgi_finish_request)
       │ → Libera PHP-FPM inmediatamente
       │
       === WORKER (systemd timer cada 5s, procesa batch) ===
       │
8. SELECT * FROM glory_whatsapp_event_queue
       WHERE status='pending' 
       AND (locked_until IS NULL OR locked_until < NOW())
       ORDER BY created_at ASC LIMIT 5
       │
9. Por cada evento (en orden FIFO):
   │
   9.1 Adquirir per-user lock:
   │   SELECT GET_LOCK('whatsapp_user_{userId}', 5)
   │   Si no se obtiene → saltar (otro worker lo procesa)
   │
9.2 Adquirir slot LLM global:
    │   $slot = GlobalLLMRateLimiter::acquireSlot()
    │   Si no hay slot → UPDATE locked_until = NOW() + 5s, saltar (reintenta pronto)
   │
   9.3 Resolver JID remitente desde el evento
   9.4 Verificar daily message limit
   9.5 AgentChatProcessor::procesar(userId, mensaje, sessionId)
   │   - Cargar contexto (tareas, hábitos, notas, memorias)
   │   - Leer proveedor/modelo de user_meta (no global)
   │   - Enviar a LLM
   │   - Parsear + ejecutar acciones
   │   - Guardar en glory_agent_chat_messages
   │
   9.6 WacliService::enviarTexto(userId, jid, respuesta)
   │
   9.7 Liberar slot LLM: GlobalLLMRateLimiter::releaseSlot($slot)
   9.8 Liberar per-user lock: SELECT RELEASE_LOCK('whatsapp_user_{userId}')
   9.9 UPDATE glory_whatsapp_event_queue
       SET status = 'completed', processed_at = NOW()
       WHERE id = X
   │
10. Usuario recibe respuesta en WhatsApp
```

---

## 5. Plan de implementación por fases

### Fase 1: Base de datos (est. 1 día) — COMPLETADO
- [x] Crear tabla `glory_whatsapp_accounts` en Schema.php (v1.0.16)
- [x] Crear tabla `glory_whatsapp_event_queue` en Schema.php
- [x] Agregar capability `glory_whatsapp_chatbot` al rol subscriber en functions.php
- [x] Migrar datos existentes del admin actual — `admin_init` hook que lee `WACLI_ACCOUNT`/`WHATSAPP` env, busca el primer admin, inserta fila. Se ejecuta una sola vez (option `glory_whatsapp_migration_admin_done`)
- [x] Version bump DB_VERSION a 1.0.16

### Fase 2: WacliManagerService (est. 2 días) — COMPLETADO
- [x] Crear `App/Services/WacliManagerService.php`:
  - `registrarUsuario()` — crear directorio, ejecutar `wacli auth`, rollback en fallo
  - `generarCodigoQR()` — capturar QR con rate limit interno
  - `verificarAuth()` — auth status wrapper
  - `iniciarSync()` / `detenerSync()` — systemd via sudo + escapeshellarg
  - `enviarTexto()` / `descargarMedia()` — delegar en cuenta correcta
  - `healthCheck()` — systemd + auth status
- [ ] Template systemd `wacli-sync@.service` — pendiente de infraestructura (servidor)
- [ ] Configurar sudoers — pendiente de infraestructura
- [ ] Script de backup `wacli-backup-stores.sh` — pendiente de infraestructura
- [x] Cron de health check (cada 15 min) — implementado en functions.php + WacliManagerService::runHealthCheckSweep()

### Fase 3: Webhook asíncrono + Worker (est. 2 días) — COMPLETADO
- [x] Modificar `WhatsAppWebhookService.php`:
  - Validar account_name contra `glory_whatsapp_accounts`
  - Encolar evento en `glory_whatsapp_event_queue`
  - Responder 202 y liberar conexión con `fastcgi_finish_request()` + fallback HTTP
- [x] Crear `WhatsAppEventWorker.php`:
  - Worker que procesa eventos FIFO (hasta 5 por ciclo)
  - Zombie event recovery al inicio de cada ciclo
  - Per-user lock con GET_LOCK
  - Global LLM semaphore (GlobalLLMRateLimiter)
  - Daily message count reset + rate-limit 20/5min por JID
- [ ] Systemd timer para el worker (cada 5s) — pendiente de infraestructura
- [x] Cron de WP (cada minuto) como fallback — implementado en functions.php

### Fase 4: Endpoints REST (est. 1 día) — COMPLETADO
- [x] Crear `App/Api/WhatsappUserApiController.php`:
  - register, renew-qr (rate limited 1/30s), auth-status, unlink, recipients, daily-usage
- [x] Agregar endpoints admin en AdminApiController.php:
  - whatsappListarCuentas, whatsappDetalleCuenta, whatsappToggleCuenta, whatsappHealthDashboard, whatsappForceHealthCheck
- [x] Modificar AgentRestHandlers.php para rutear webhook asíncrono

### Fase 5: Frontend React (est. 2 días) — COMPLETADO
- [x] Crear componentes: WhatsappConnect, WhatsappQRDisplay, WhatsappStatus, WhatsappSettings (en `App/React/components/whatsapp/`)
- [x] CSS: whatsapp.css (estilo dashboard dark theme)
- [x] Store: whatsappStore.ts (Zustand, estados: not_connected → registering → qr_ready → connected)
- [x] Service: whatsappService.ts (tipos y funciones para todos los endpoints REST)

### Fase 6: Aislamiento de LLM config + Procesos batch (est. 1 día) — COMPLETADO
- [x] Modificar `AgentChatProcessor::resolverConfigLLM()` para leer de `get_user_meta()` con fallback a `get_option()` (+ actualizar callsites con $userId)
- [x] Modificar `AdminApiController::guardarChatbotConfig()` para guardar también en user_meta del admin
- [x] Modificar `AgentSchedulerService::generarMensajePersonalizado()` para leer LLM de user_meta
- [x] Modificar `AgentProactiveService::analizarAdmins()` → `analizarTodos()`: admins + usuarios con `glory_whatsapp_chatbot` capability
- [x] Modificar `AgentSchedulerService::processDueActions()` para llamar `analizarTodos()` en lugar de `analizarAdmins()`

### Fase 7: Seguridad y monitoreo (est. 1 día) — COMPLETADO
- [x] Implementar límite diario de mensajes (columnas `daily_msg_count` + `daily_msg_date` en Schema + reset lógico en Worker)
- [x] Implementar GlobalLLMRateLimiter (max 5 slots, random_int anti-starvation)
- [x] Dashboard admin con health status de cuentas (endpoints en AdminApiController)
- [x] Sistema de alertas: `WacliManagerService::runHealthCheckSweep()` cron 15-min que deshabilita cuentas 'dead' + notifica admin por WhatsApp y email
- [x] Logging de conexiones, QR generados, errores de auth (error_log en registrarUsuario, generarCodigoQR, verificarAuth, rollbackRegistro, healthCheck, runHealthCheckSweep)

### Fase 8: Testing y rollout (est. 1 día) — DOCUMENTACIÓN COMPLETADA
- [ ] POC: 2 cuentas wacli manuales + 2 syncs concurrentes + 2 webhooks
- [ ] Probar aislamiento de datos (Usuario A no ve datos de Usuario B)
- [ ] Probar race condition: 2 mensajes simultáneos del mismo usuario
- [ ] Probar recuperación: matar proceso wacli, verificar systemd restart + health check
- [ ] Probar backup/restore de stores
- [ ] Probar rate limits: QR, mensajes diarios, LLM global
- [ ] Prueba de carga: 5-10 syncs concurrentes
- [x] Documentación técnica creada en `Agente/documentacion/ia/wacli-multi-usuario-2026-05-12.md`

**Total estimado:** 10-11 días full-stack.

---

## 6. Archivos a crear/modificar

| Archivo | Acción |
|---|---|
| `App/Database/Schema.php` | **MODIFICAR** — Agregar `glory_whatsapp_accounts` + `glory_whatsapp_event_queue` |
| `App/Services/WacliManagerService.php` | **CREAR** — Gestión multi-account wacli |
| `App/Services/WhatsAppWebhookService.php` | **MODIFICAR** — Validación multi-tenant + encolado asíncrono |
| `App/Services/WhatsAppEventWorker.php` | **CREAR** — Worker de cola con per-user lock, global LLM semaphore |
| `App/Services/GlobalLLMRateLimiter.php` | **CREAR** — Semáforo global de LLM (MySQL locks) |
| `App/Api/WhatsappUserApiController.php` | **CREAR** — Endpoints de usuario para WhatsApp |
| `App/Api/AdminApiController.php` | **MODIFICAR** — Endpoints admin multi-usuario |
| `App/Services/AgentChatProcessor.php` | **MODIFICAR** — Leer config LLM de user_meta, no de WP option |
| `App/Services/WacliService.php` | **MODIFICAR** — Overloads que acepten userId en lugar de env var |
| `App/Services/AgentProactiveService.php` | **MODIFICAR** — Iterar todos los usuarios con WhatsApp activo |
| `App/Services/AgentSchedulerService.php` | **MODIFICAR** — Recordatorios de todos los usuarios |
| `App/Services/AgentRestHandlers.php` | **MODIFICAR** — Handlers nuevos |
| `App/React/components/whatsapp/WhatsappConnect.tsx` | **CREAR** — Flujo de conexión |
| `App/React/components/whatsapp/WhatsappQRDisplay.tsx` | **CREAR** — Visualizador QR |
| `App/React/components/whatsapp/WhatsappStatus.tsx` | **CREAR** — Estado de conexión |
| `App/React/components/whatsapp/WhatsappSettings.tsx` | **CREAR** — Configuración de números |
| `App/React/stores/iaStore.ts` | **MODIFICAR** — Estado WhatsApp |
| `App/React/services/iaService.ts` | **MODIFICAR** — Endpoints WhatsApp |
| `functions.php` | **MODIFICAR** — Capability glory_whatsapp_chatbot |
| `Agente/documentacion/ia/wacli-multi-usuario-2026-05-12.md` | **CREAR** — Documentación técnica |

---

## 7. Riesgos y mitigaciones (v2 — tabla completa)

| ID | Riesgo | Prob | Impacto | Mitigación |
|---|---|---|---|---|
| R1 | **Race condition en webhook** — 2 mensajes simultáneos del mismo usuario corrompen la sesión | Media | **Crítico** | Per-user lock con MySQL GET_LOCK + cola FIFO. Worker no procesa un evento del mismo usuario si otro ya está en proceso. |
| R2 | **Query lenta de usermeta** — webhook hace SELECT contra wp_usermeta sin índice útil | Alta | Alto | Tabla dedicada `glory_whatsapp_accounts` con índice en account_name. O(1) en webhook. |
| R3 | **LLM provider rate limit** — 20 usuarios saturan el proveedor | Media | Alto | GlobalLLMRateLimiter con MAX_CONCURRENT=5. Mensajes que exceden se re-encolan. |
| R4 | **Abuso de costos LLM** — un usuario envía 1000 mensajes/día | Media | Alto | Límite diario de mensajes por usuario (env var `WHATSAPP_DAILY_MSG_LIMIT`, default 50). Alertas de consumo anómalo. |
| R5 | **Store wacli corrupto** — pérdida de vinculación sin recovery | Baja | Alto | Backup diario de stores (retención 5). Health check cada 15 min. Deshabilitado automático + notificación admin. |
| R6 | **Timeout webhook** — LLM tarda 20s, wacli corta la conexión | Media | Medio | Webhook asíncrono: 202 Accepted inmediato + cola + worker. |
| R7 | **QR generation flood** — 100 regeneraciones/min agotan recursos | Baja | Medio | Rate limit en renew-qr: 1 vez cada 30s por usuario. |
| R8 | **systemd no escala** — 50+ servicios systemd = límite del sistema | Alta | Medio | Soft limit: 20 usuarios (v1). Hard limit: 50 usuarios. Evaluar supervisor único en Rust/PHP para >50 (ver sección 9). |
| R9 | **Conflicto de números** — usuario registra número ajeno | Baja | Alto | QR verification (solo el dueño escanea). UNIQUE en phone_primary. OTP opcional. |
| R10 | **Fuga de datos** — userId incorrecto en webhook | Baja | **Crítico** | userId se resuelve desde account_name. Prohibido usar get_current_user_id(). Parámetro inmutable en AgentChatProcessor. |
| R11 | **wacli sin --store-dir** — no aísla stores entre cuentas | Media | Alto | Usar solo `--account` (wacli aísla por account name). Verificar en POC antes de implementar. |
| R12 | **Meta bloquea IP** — demasiados dispositivos vinculados desde la misma IP | Baja | Alto | Monitorear bloqueos de Meta. Usar proxy rotatorio si es necesario. Límite conservador (20 usuarios). |
| R13 | **Zombie events en cola** — el worker muere y deja eventos en 'processing' | Baja | Alto | Recovery query al inicio del worker: `WHERE status='processing' AND updated_at < NOW()-5MIN` → re-encolar. |

---

## 8. Preguntas abiertas (v2 actualizadas)

1. **wacli `--store-dir`:** ¿La versión actual de `openclaw/wacli` soporta `--store-dir`? Si no, ¿basta con `--account` para aislar stores? **🚨 BLOQUER del POC** — toda la arquitectura de aislamiento depende de que wacli aísle stores correctamente. Verificar esto primero.

2. **QR output format:** ¿wacli `auth` devuelve el QR como ASCII art, base64 PNG, o pairing code? Esto afecta cómo se captura y muestra.

3. **Concurrencia de wacli:** ¿wacli permite que múltiples instancias `sync` apunten al mismo webhook URL (con diferentes `?account=`)? El webhook ahora es asíncrono, pero ¿wacli espera `200 OK` o acepta `202 Accepted`?

4. **Meta rate limits:** ¿Hay límite de Meta/WhatsApp sobre cuántos dispositivos vinculados desde una misma IP?

5. **Verificación OTP:** ¿Es necesario enviar código SMS/call, o el QR (requiere acceso físico al teléfono) es suficiente verificación de propiedad?

6. **Modelo de negocio:** ¿Los usuarios pagan por el chatbot? ¿Cuántos usuarios se esperan (corto/mediano/largo plazo)?

7. **OpenCode para no-admins:** ¿Se requiere o no? Para v1: se bloquea con mensaje "solo disponible para administradores". ¿Esto es aceptable?

8. **Latencia del worker:** ¿Es aceptable hasta 1 minuto de latencia (cron de WP)? Si no, migrar a systemd timer (1s).

---

## 9. Consideraciones de escalado futuro

### Si se superan 50 usuarios:

**Problema:** 50+ servicios systemd = 50+ procesos `wacli sync`, gestión compleja, límite de PIDs.

**Solución propuesta: Supervisor único** (Rust o PHP):
```text
Un solo proceso que:
  - Mantiene N subprocesos wacli sync en un process pool
  - Reconoce los account names de cada subproceso
  - Centraliza logging y health checks
  - Monitorea corrupción de stores
  - Escala a 100+ usuarios con overhead mínimo
  - Reinicia subprocesos individualmente sin afectar los demás
```

### Arquitectura para escala >100 usuarios:

```text
  - Servidor dedicado para wacli processes (2-4 GB RAM para 100 syncs)
  - Webhook queue con SQS/RabbitMQ en lugar de tabla MySQL
  - Pool de workers PHP (no depender de un solo worker cron)
  - Redis para rate limiting en lugar de transients de WP
```

---

## 10. Conclusión

El plan v2 aborda los **7 riesgos críticos/altos** identificados en la revisión del plan original:

| Riesgo v1 | Estado en v2 |
|---|---|
| Race condition en webhook | 🔒 Per-user lock + cola FIFO |
| Query lenta de usermeta | ✅ Tabla dedicada con índices |
| Sin límite QR generation | ✅ Rate limit 1/30s |
| Sin backup de stores | ✅ Backup diario + health check |
| Sin rate limit global LLM | ✅ GlobalLLMRateLimiter |
| Sin detección de corrupción | ✅ Health check + deshabilitado automático |
| Webhook síncrono frágil | ✅ Async 202 + cola + worker |

**Complejidad:** Media-alta (10-11 días full-stack).
**Esfuerzo principal:** WacliManagerService + Webhook asíncrono + Worker + Frontend.
**Riesgo más crítico:** Aislamiento de stores wacli + concurrencia en webhook (ambos mitigados en v2).

**Se recomienda POC de 2 días antes de implementar el sistema completo:**
1. Crear manualmente dos cuentas wacli en el servidor de pruebas.
2. Verificar que ambos syncs funcionan simultáneamente.
3. Probar el webhook asíncrono: envío de evento → cola → worker → LLM → respuesta.
4. Probar per-user lock: dos mensajes simultáneos del mismo usuario.
5. Con los resultados, ajustar este plan v2.
