# Plan: Chatbot WhatsApp multi-usuario con QR y dos números — 2026-05-11

## 1. Resumen ejecutivo

**Objetivo:** Permitir que usuarios NO administradores (suscriptores, clientes, miembros) tengan su propio chatbot en WhatsApp usando **dos números de teléfono por usuario** + escaneo de **código QR** para vincular su dispositivo. El sistema debe aislar datos, sesiones, memoria y acciones entre usuarios de forma segura, sin exponer información ajena.

**Problema actual:** El sistema WhatsApp (`wacli`) opera con una sola cuenta vinculada (`WACLI_ACCOUNT`) y un solo webhook. Solo el administrador (dueño del número primario `WHATSAPP`) tiene acceso al chatbot. Los demás números entrantes son ignorados o rechazados explícitamente.

---

## 2. Arquitectura conceptual

```
                          ┌─────────────────────────────────┐
                          │      WordPress + PHP (REST)      │
                          │                                  │
┌──────────┐              │  ┌───────────────────────────┐   │
│ Usuario A │───QR─────▶  │  │  WacliManagerService      │   │
│ (2 nums)  │             │  │  - Multi-account registry  │   │
└──────────┘              │  │  - Per-user wacli instance │   │
                          │  └──────────┬────────────────┘   │
┌──────────┐              │             │                    │
│ Usuario B │───QR─────▶  │  ┌──────────▼────────────────┐   │
│ (2 nums)  │             │  │  MultiTenantWebhookHandler │   │
└──────────┘              │  │  - Rutea por JID → user    │   │
                          │  │  - Aísla sesiones/datos    │   │
                          │  └──────────┬────────────────┘   │
                          │             │                    │
                          │  ┌──────────▼────────────────┐   │
                          │  │  AgentChatProcessor (1/N)  │   │
                          │  │  - Inyecta contexto del    │   │
                          │  │    usuario correcto        │   │
                          │  └───────────────────────────┘   │
                          └─────────────────────────────────┘
                                      │
                          ┌───────────▼────────────┐
                          │   wacli --account A     │──▶ WhatsApp A
                          │   wacli --account B     │──▶ WhatsApp B
                          └────────────────────────┘
```

Cada usuario tiene **dos números** vinculados a su cuenta: el **primario** (conversación principal con el agente) y el **secundario** (por ejemplo, un número familiar o de negocio que también interactúa con el mismo agente pero con datos del mismo usuario).

---

## 3. Componentes necesarios

### 3.1 Infraestructura wacli: multi-account

**Estado actual:** `WacliService` soporta `--account` vía env var `WACLI_ACCOUNT`. Cada comando se ejecuta con una sola cuenta.

**Lo que cambia:** Cada usuario tendrá su propia cuenta wacli aislada con su propio `--account` y `--store-dir`.

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
  - `registrarUsuario(userId, phonePrimary, phoneSecondary)` — crea estructura de directorios.
  - `obtenerStoreDir(userId)` — retorna `/data/wacli/users/user_{userId}/store`.
  - `generarCodigoQR(userId)` — inicia `wacli --account user_X auth --qr` y captura la salida QR (base64 PNG o raw string).
  - `verificarAuth(userId)` — llama `wacli --account user_X --read-only auth status`.
  - `enviarTexto(userId, jid, mensaje)` — envía como el usuario correcto.
  - `descargarMedia(userId, chat, msgId, mediaType)` — descarga bajo la cuenta correcta.
- Cada operación ejecuta `proc_open` con `--account user_X --store-dir /data/wacli/users/user_X/store`.

**Requisito de wacli:** Verificar que la versión de `openclaw/wacli` soporte `--store-dir` además de `--account` para aislar stores completamente. Si no lo soporta, los stores de cada cuenta se aíslan mediante `--account` únicamente (wacli usa `{store_dir}/{account}` como subdirectorio implícito).

### 3.2 Gestión de cuentas de usuario

**Nuevas columnas en `wp_usermeta`:**

| Meta key | Valor | Propósito |
|---|---|---|
| `glory_whatsapp_primary` | `+584141234567` | Número primario del usuario (sin JID) |
| `glory_whatsapp_secondary` | `+584147654321` | Número secundario del usuario |
| `glory_whatsapp_jid_primary` | `584141234567@s.whatsapp.net` | JID primario (se resuelve en webhook) |
| `glory_whatsapp_jid_secondary` | `584147654321@s.whatsapp.net` | JID secundario |
| `glory_whatsapp_account_name` | `user_42` | Nombre de cuenta wacli |
| `glory_whatsapp_authenticated` | `1` | Si el QR fue escaneado y vinculado |
| `glory_whatsapp_linked_jid` | `584141234567@s.whatsapp.net` | JID real del dispositivo vinculado (lo reporta `auth status`) |
| `glory_whatsapp_enabled` | `1` | Si el chatbot está activo para este usuario |
| `glory_whatsapp_created_at` | `2026-05-11 12:00:00` | Timestamp de registro |
| `glory_whatsapp_last_sync` | `2026-05-11 14:00:00` | Último sync exitoso |

**Nuevo endpoint `POST /glory/v1/whatsapp/register`:**
```php
// Espera:
{
  "primary": "+584141234567",
  "secondary": "+584147654321"
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
- `POST /glory/v1/whatsapp/renew-qr` — regenera QR si expiró.
- `GET /glory/v1/whatsapp/auth-status` — estado de autenticación del usuario actual.
- `POST /glory/v1/whatsapp/unlink` — desvincula y elimina store.
- `GET /glory/v1/whatsapp/recipients` — lista los números registrados (enmascarados).

**Control de acceso a endpoints:**
- `register`, `renew-qr`, `auth-status`, `unlink`: `is_user_logged_in` + verificación de capacidad (`subscriber` o superior).
- `register` debe verificar que los números no estén ya registrados por otro usuario (UNIQUE constraint lógica).
- Límite: 1 cuenta por usuario (a menos que se configure plan pago).

### 3.3 Hook de registro de usuario

Al crear/registrar un usuario en WordPress, no se crea automáticamente la cuenta wacli. Debe ser un paso explícito (self-service desde el frontend). Sin embargo, se puede agregar un:

- **Hook opcional:** `whatsapp_user_registered` action en WordPress que permita a un admin registrar usuarios en lote.
- **Batch admin endpoint:** `POST /glory/v1/admin/whatsapp/batch-register` para que el admin registre varios usuarios de una vez.

### 3.4 Webhook multi-tenant

**Estado actual:** Un solo endpoint `POST /glory/v1/whatsapp/webhook` procesa todos los eventos NDJSON de `wacli sync --webhook`. La función `resolverAdminDesdeRemitente()` busca solo admins.

**Lo que cambia:** Necesitamos un sistema de **ruteo por JID remitente** que:

1. Extraiga el `Chat`/`SenderJID` del evento.
2. Busque en `wp_usermeta` si ese JID pertenece a algún usuario registrado (`glory_whatsapp_jid_primary` o `glory_whatsapp_jid_secondary`).
3. Si encuentra match → carga el contexto del usuario correcto → procesa con su propio `AgentChatProcessor`.
4. Si no encuentra match → responde con mensaje genérico o ignora.

**Pero hay un problema de diseño:** Actualmente hay un solo `wacli sync --follow` que envía eventos de UNA cuenta al webhook. Si cada usuario tiene su propia cuenta wacli, necesitamos:

**Opción A (Recomendada): Un sync por cuenta**

Ejecutar N instancias de `wacli sync --webhook`, una por cada usuario autenticado. El webhook de cada una apunta al mismo endpoint pero incluye el account name como metadata:

```bash
# Servicio por usuario (systemd template)
wacli --account user_42 sync --webhook https://task.nakomi.studio/wp-json/glory/v1/whatsapp/webhook?account=user_42 --webhook-secret SECRET
```

El endpoint recibe `?account=user_42` y sabe qué usuario procesar. El webhook secret puede ser el mismo (HMAC verificado contra el body, el account name no necesita ser secreto porque es público en la URL).

**Opción B (Simplificada pero menos escalable): Un solo sync + discriminación interna**

El endpoint actual recibe TODOS los eventos y por cada JID resuelve el usuario. Esto funciona si todas las cuentas comparten el mismo webhook wacli, pero wacli `sync` solo escucha UNA cuenta a la vez. Inviable.

**Conclusión:** Se requiere la Opción A. El webhook handler existente debe modificarse mínimamente:

```php
// WhatsAppWebhookService::procesarEvento() - modificar:
// 1. Obtener accountName de $_GET['account']
// 2. Resolver userId desde glory_whatsapp_account_name en usermeta
// 3. Cargar servicios con userId correcto
// 4. Procesar el evento con el contexto del usuario correcto
```

**Systemd service template (`wacli-sync@.service`):**
```ini
[Unit]
Description=wacli sync for user %i
After=network.target

[Service]
Type=simple
User=www-data
Environment="WACLI_STORE_DIR=/data/wacli/users/%i"
ExecStart=/usr/local/bin/wacli --account %i --store-dir /data/wacli/users/%i sync --webhook https://task.nakomi.studio/wp-json/glory/v1/whatsapp/webhook?account=%i --webhook-secret WH_SECRET --lock-wait 30s
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Controller PHP que gestiona servicios systemd:**
```php
// WacliManagerService::iniciarSync(userId)
// -> systemctl start wacli-sync@user_{userId}
// WacliManagerService::detenerSync(userId)
// -> systemctl stop wacli-sync@user_{userId}
```

Esto requiere que PHP tenga permiso sudo para `systemctl` (configurable via sudoers: `www-data ALL=(root) NOPASSWD: /usr/bin/systemctl start wacli-sync@*, /usr/bin/systemctl stop wacli-sync@*, /usr/bin/systemctl restart wacli-sync@*`).

### 3.5 Aislamiento de datos por usuario

**Ya aislado actualmente:**
- `glory_agent_chat_messages` → filtrado por `user_id` + `session_id`
- `glory_agent_actions` → filtrado por `user_id`
- MemPalace → namespace `user_{userId}`
- Contexto maestro → `wp_usermeta` clave `glory_chatbot_master_context`
- OpenCode jobs → `glory_agent_actions` tipo `opencode_job` con `user_id`

**Aislar adicionalmente:**
- `GloryProactiveService` → debe iterar TODOS los usuarios con `glory_whatsapp_enabled = 1`, no solo admins.
- `AgentSchedulerService` → verificar recordatorios de todos los usuarios.
- `AgentRateLimitService` → ya está por usuario (clave transiente incluye userId).
- **Configuración LLM por usuario:** Actualmente `glory_chatbot_proveedor` y `glory_chatbot_modelo` son WP options globales. Para multi-usuario, deben ser por usuario:
  - Moverse a `wp_usermeta` clave `glory_chatbot_proveedor`, `glory_chatbot_modelo`.
  - `AgentChatProcessor` debe leer de `get_user_meta()` en lugar de `get_option()`.
  - El panel React debe enviar `userId` en las llamadas de configuración.

### 3.6 UX para registro y vinculación

**Flujo desde el frontend React (dentro del dashboard del usuario):**

1. **Paso 1 — Configuración:**
   - El usuario va a "Mi Chatbot" → "Conectar WhatsApp".
   - Ingresa su número primario y secundario (con validación de formato internacional).
   - El sistema verifica que los números no estén ocupados por otro usuario.

2. **Paso 2 — QR:**
   - Backend crea la cuenta wacli (`wacli --account user_X auth`).
   - Captura y devuelve el QR (wacli en modo `--qr` o `auth --json` + extraer pairing code).
   - El frontend muestra el QR en pantalla con instrucciones.
   - El frontend hace pooling cada 5s a `GET /auth-status` hasta que `authenticated = true`.

3. **Paso 3 — Verificación:**
   - Una vez escaneado, se muestra estado "✅ Conectado".
   - Se habilita el interruptor "Activar chatbot".
   - Opcional: el agente envía un mensaje de bienvenida al número primario.

4. **Paso 4 — Gestión:**
   - El usuario puede ver sus números, cambiar el secundario, desvincular, reconectar.

**Componentes React necesarios:**
- `WhatsappConnect.tsx` — paso a paso para conectar.
- `WhatsappQRDisplay.tsx` — muestra QR con estado de espera.
- `WhatsappStatus.tsx` — estado actual (conectado, expirado, errores).
- `WhatsappSettings.tsx` — números, activar/desactivar, plan.

**Añadir a `iaStore.ts`:**
```typescript
whatsappStatus: 'disconnected' | 'connecting' | 'scan_qr' | 'pairing' | 'connected' | 'error'
whatsappQr: string | null
whatsappPrimary: string
whatsappSecondary: string
```

### 3.7 Manejo del segundo número

Cada usuario puede registrar **dos números**. El propósito del segundo número es permitir que, por ejemplo, un miembro de la familia o un socio también interactúe con el mismo agente (mismas tareas, hábitos, memoria, contexto maestro).

**Reglas:**
- Ambos números comparten el **mismo `user_id`** → mismos datos, misma sesión de chat (o sesiones separadas pero mismo contexto).
- El webhook resuelve ambos JIDs → mismo usuario.
- El agente sabe qué número escribió (para responder al mismo).
- El segundo número **no puede** registrar otro chatbot independiente (no puede tener su propio agente, comparte el del primario).

**Experiencia:**
- Si la esposa escribe desde el segundo número: el agente responde con los datos (tareas, hábitos, notas) del usuario titular. El agente debe entender que quien escribe es "la esposa/usuario-secundario" para dar contexto adecuado.
- Opcional: inyectar en el prompt del sistema: `"Estás hablando con el usuario {nombre}, que tiene un segundo número asociado: {nombre_secundario}. Si el mensaje viene del segundo número, ten en cuenta que puede no ser el titular."`

**Sesiones separadas vs compartidas:**
- Recomendado: **sesiones separadas** (una sesión por JID) de modo que cada número tenga su propio hilo de conversación.
- El contexto maestro y la memoria semántica se **comparten** (son del usuario, no del número).
- Las tareas, hábitos y notas también se comparten.
- El agente debe saber qué número escribió y ajustar el tono si es necesario.

### 3.8 Seguridad: consideraciones críticas

| Riesgo | Mitigación |
|---|---|
| **Un usuario registra el número de otro** | Verificación SMS/call antes de activar. Enviar código OTP al número primario antes de habilitar el chatbot. Alternativa: el número debe ser verificado vía wacli (el QR real del número solo lo puede escanear el dueño). |
| **Fuga de datos entre sesiones** | Aislamiento por `user_id` en TODAS las queries. `AgentChatProcessor` recibe `userId` como parámetro fijo durante el lifecycle del request. |
| **Escalado de privilegios** | Los endpoints de registro y gestión requieren nonce + cookie WP. Capacidad mínima: `subscriber`. El webhook es público pero requiere HMAC. |
| **Uso malicioso del QR** | El QR expira después de ~60 segundos (wacli lo maneja). El endpoint `renew-qr` solo es accesible por el dueño de la cuenta. Log de cada generación de QR con IP y timestamp. |
| **Almacenamiento inseguro de stores** | Los stores wacli contienen sesiones activas de WhatsApp. Proteger con permisos de archivo 600, dueño www-data. Almacenar bajo `/data/wacli/users/` con aislamiento de directorio por usuario. |
| **Consumo de recursos** | Límite duro de cuentas por servidor (ej: 50). Monitorear uso de CPU/memoria de procesos wacli. Desactivar cuentas inactivas (>30 días sin sync). |
| **Rate limiting por usuario** | Ya existe en `AgentRateLimitService` (20 msg/5 min). Mantener por usuario, no por JID. |
| **Números bloqueados globalmente** | Mantener `WHATSAPP_BLOCKED_JIDS` a nivel global (spam, abuso). Agregar campo `blocked` booleano por usuario. |
| **Acceso a OpenCode desde chatbot no-admin** | `solicitar_opencode` requiere autorización explícita. Para no-admins, debe requerir aprobación admin o estar deshabilitado. La acción `solicitar_opencode` debería verificar capacidad `manage_options` o un permiso personalizado. |
| **LLM costos** | Cada mensaje de chatbot de usuario no-admin consume tokens. Implementar límite de mensajes/día por usuario (env var `WHATSAPP_DAILY_MSG_LIMIT`, default 50). Superado el límite, responder que se alcanzó el máximo diario. |

### 3.9 Nuevo permiso de WordPress

Agregar capability personalizada:
```php
// functions.php o plugin de membresía
$role = get_role('subscriber');
$role->add_cap('glory_whatsapp_chatbot', true);
```
- `subscriber`: por defecto tiene acceso.
- `administrator`: acceso completo + admin de cuentas ajenas.
- Nueva capability `glory_whatsapp_admin` para moderación multi-usuario.

**Endpoints que verifican:**
- `register`, `renew-qr`, `auth-status`, `unlink`: `current_user_can('glory_whatsapp_chatbot')`
- Admin endpoints de listado/gestión: `current_user_can('manage_options')` o `current_user_can('glory_whatsapp_admin')`

### 3.10 Costos y limitaciones técnicas

**Por usuario:**
- 1 proceso `wacli sync` en background (consumo: ~5-15 MB RAM, CPU mínimo).
- 1 store wacli en disco (~1-5 MB inicial, crece con uso).
- 1 par de claves de sesión WhatsApp.

**Para 100 usuarios:**
- 100 procesos sync → ~1-1.5 GB RAM.
- 100 stores → ~100-500 MB en disco.
- 100 webhooks concurrentes → ancho de banda manejable.

**Límite recomendado inicial: 20 usuarios.**
**Escalado:** A partir de 50-100 usuarios, considerar:
- Servidor dedicado para wacli processes.
- Webhook queue (SQS/RabbitMQ) para desacoplar.
- Pool de workers PHP (no depender de un solo webhook por request).

### 3.11 Resumen de endpoints a crear/modificar

| Método | Ruta | Auth | Propósito |
|---|---|---|---|
| `POST` | `/glory/v1/whatsapp/register` | logueado + `glory_whatsapp_chatbot` | Registrar números + crear cuenta wacli + devolver QR |
| `POST` | `/glory/v1/whatsapp/renew-qr` | logueado + `glory_whatsapp_chatbot` | Regenerar QR expirado |
| `GET` | `/glory/v1/whatsapp/auth-status` | logueado + `glory_whatsapp_chatbot` | Estado de autenticación |
| `POST` | `/glory/v1/whatsapp/unlink` | logueado + `glory_whatsapp_chatbot` | Desvincular WhatsApp y detener sync |
| `GET` | `/glory/v1/whatsapp/recipients` | logueado + `glory_whatsapp_chatbot` | Números registrados (enmascarados) |
| `POST` | `/glory/v1/whatsapp/webhook?account={name}` | HMAC público | Webhook entrante multi-tenant (modificar existente) |
| `GET` | `/glory/v1/admin/whatsapp/users` | `manage_options` | Listar todos los usuarios con WhatsApp registrado |
| `POST` | `/glory/v1/admin/whatsapp/disable/{userId}` | `manage_options` | Deshabilitar chatbot de un usuario |
| `POST` | `/glory/v1/admin/whatsapp/batch-register` | `manage_options` | Registro batch por admin |
| `GET` | `/glory/v1/whatsapp/daily-usage` | logueado | Consumo de mensajes del día |

---

## 4. Flujo detallado de un mensaje entrante (multi-tenant)

```
1. Usuario escribe desde su WhatsApp número primario
       │
2. wacli --account user_42 sync  (proceso systemd)
       │ recibe el mensaje vía WhatsApp Web
       │
3. wacli envía evento NDJSON via POST a:
       /wp-json/glory/v1/whatsapp/webhook?account=user_42
       │ headers: X-Wacli-Signature, Content-Type: application/x-ndjson
       │
4. WhatsAppWebhookService::validarFirma()
       │ → HMAC-SHA256 contra WACLI_WEBHOOK_SECRET (global)
       │
5. WhatsAppWebhookService::procesarEventoMultiTenant()
       │ 5.1 Extraer accountName de $_GET['account']
       │ 5.2 Buscar userId en wp_usermeta: 
       │       SELECT user_id FROM wp_usermeta
       │       WHERE meta_key = 'glory_whatsapp_account_name'
       │       AND meta_value = 'user_42'
       │ 5.3 Si no encuentra → log + ignorar
       │ 5.4 Si encuentra → setear userId en el contexto
       │ 5.5 Extraer JID remitente del evento
       │ 5.6 Verificar que el JID coincida con glory_whatsapp_jid_primary
       │       o glory_whatsapp_jid_secondary del usuario
       │ 5.7 Verificar glory_whatsapp_enabled = true
       │ 5.8 Rate limit check por userId
       │ 5.9 Verificar daily message limit
       │
6. AgentChatProcessor::procesar(userId, mensaje, sessionId)
       │ 6.1 Cargar contexto del usuario (tareas, hábitos, notas, etc.)
       │ 6.2 Cargar contexto maestro (glory_chatbot_master_context)
       │ 6.3 Buscar memorias relevantes en MemPalace (namespace user_{userId})
       │ 6.4 Construir system prompt con datos del usuario
       │ 6.5 Leer proveedor/modelo de user_meta (no global option)
       │ 6.6 Enviar a LLM
       │ 6.7 Parsear respuesta + ejecutar acciones
       │ 6.8 Guardar en glory_agent_chat_messages con userId correcto
       │ 6.9 Guardar en MemPalace si aplica
       │
7. WacliService::enviarTexto(userId, toJid, respuesta)
       │ → proc_open wacli --account user_42 send text ...
       │
8. Usuario recibe respuesta en su WhatsApp
```

---

## 5. Consideraciones sobre OpenCode para no-admins

**La acción `solicitar_opencode` ejecuta código real en la máquina del desarrollador.** No puede estar disponible para usuarios no-administradores sin restricciones severas.

**Propuesta:**
- `solicitar_opencode` verifica `current_user_can('manage_options')` antes de ejecutarse.
- Para no-admins, el agente responde: *"Lo siento, la ejecución de código remoto solo está disponible para administradores."*
- En el futuro, se podría implementar un sandbox (contenedor aislado por usuario, comandos permitidos limitados, approval manual del admin para cada ejecución).
- El `allowlist` de comandos debe ser por usuario (actualmente es global).

---

## 6. Plan de implementación por fases

### Fase 1: Base de datos y modelo
- [ ] Agregar columnas en `wp_usermeta` para WhatsApp multi-usuario.
- [ ] Agregar capability `glory_whatsapp_chatbot` al rol subscriber.
- [ ] Crear tabla o metadatos para límite diario de mensajes si se requiere.

### Fase 2: WacliManagerService
- [ ] Crear `App/Services/WacliManagerService.php`:
  - `registrarUsuario()` — crea estructura de directorios, ejecuta `wacli --account user_X auth`.
  - `generarCodigoQR()` — captura QR desde wacli.
  - `verificarAuth()` — comprueba estado de vinculación.
  - `iniciarSync()` / `detenerSync()` — systemd.
  - `enviarTexto()` / `descargarMedia()` — delegar en cuenta correcta.
- [ ] Crear template systemd `wacli-sync@.service`.
- [ ] Configurar sudoers para PHP.

### Fase 3: Endpoints REST
- [ ] Crear `App/Api/WhatsappUserApiController.php` con endpoints de registro, QR, estado.
- [ ] Modificar `WhatsAppWebhookService.php`:
  - `procesarEventoMultiTenant()` con resolución por `?account=`.
  - Mantener compatibilidad hacia atrás con account global.
- [ ] Modificar `AgentRestHandlers.php` para rutear correctamente.
- [ ] Agregar endpoints admin.

### Fase 4: Frontend React
- [ ] Crear componentes de conexión WhatsApp (`WhatsappConnect`, `WhatsappQRDisplay`, etc.).
- [ ] Agregar sección "Mi Chatbot" en el dashboard del usuario.
- [ ] Agregar estado al `iaStore.ts`.
- [ ] Agregar servicios REST en `iaService.ts`.

### Fase 5: Aislamiento de LLM config
- [ ] Modificar `AgentChatProcessor` para leer config de LLM de `user_meta`.
- [ ] Sincronizar panel React con config por usuario (no global).

### Fase 6: Procesos batch multi-usuario
- [ ] Modificar `AgentProactiveService` para iterar usuarios habilitados.
- [ ] Modificar `AgentSchedulerService` para verificar recordatorios de todos los usuarios.

### Fase 7: Seguridad y monitoreo
- [ ] Implementar límite diario de mensajes.
- [ ] Agregar logging de conexiones, QR generados, errores de auth.
- [ ] Dashboard admin para monitorear cuentas activas.
- [ ] Sistema de alertas para cuentas inactivas o errores de sincronización.

### Fase 8: Testing y rollout
- [ ] Probar con 1-2 usuarios reales.
- [ ] Verificar aislamiento de datos entre usuarios.
- [ ] Prueba de carga con 5-10 syncs concurrentes.
- [ ] Documentar para el usuario final.

---

## 7. Archivos a crear/modificar

| Archivo | Acción |
|---|---|
| `App/Services/WacliManagerService.php` | **CREAR** — Gestión multi-account wacli |
| `App/Api/WhatsappUserApiController.php` | **CREAR** — Endpoints de usuario para WhatsApp |
| `App/Api/AdminApiController.php` | **MODIFICAR** — Agregar endpoints admin multi-usuario |
| `App/Services/WhatsAppWebhookService.php` | **MODIFICAR** — Soporte multi-tenant en webhook |
| `App/Services/AgentChatProcessor.php` | **MODIFICAR** — Aceptar userId dinámico + leer config de user_meta |
| `App/Services/WacliService.php` | **MODIFICAR** — Agregar overloads que acepten userId |
| `App/Services/AgentChatService.php` | **MODIFICAR** — Verify isolation by userId (ya lo hace) |
| `App/Services/AgentProactiveService.php` | **MODIFICAR** — Iterar todos los usuarios con WhatsApp |
| `App/Services/AgentSchedulerService.php` | **MODIFICAR** — Procesar recordatorios de todos los usuarios |
| `App/Services/AgentRestHandlers.php` | **MODIFICAR** — Agregar handlers nuevos |
| `App/React/components/whatsapp/WhatsappConnect.tsx` | **CREAR** — Flujo de conexión |
| `App/React/components/whatsapp/WhatsappQRDisplay.tsx` | **CREAR** — Visualizador QR |
| `App/React/components/whatsapp/WhatsappStatus.tsx` | **CREAR** — Estado de conexión |
| `App/React/components/whatsapp/WhatsappSettings.tsx` | **CREAR** — Configuración de números |
| `App/React/stores/iaStore.ts` | **MODIFICAR** — Agregar estado WhatsApp |
| `App/React/services/iaService.ts` | **MODIFICAR** — Agregar endpoints WhatsApp |
| `App/Database/Schema.php` | **MODIFICAR** — Si se requiere nueva tabla |
| `functions.php` | **MODIFICAR** — Agregar capability |
| `Agente/documentacion/ia/wacli-multi-usuario-2026-05-11.md` | **CREAR** — Documentación técnica |

---

## 8. Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| wacli no soporta `--store-dir` | Media | Alto | Usar solo `--account` (wacli aísla por account name). Verificar documentación antes de implementar. |
| systemd template para N usuarios no escala | Alta | Medio | Límite inicial de 20 usuarios. Evaluar Docker por usuario si se necesita más. |
| Un usuario abusa del LLM (costos) | Media | Alto | Límite diario de mensajes (env var configurable). Límite de tokens por mensaje. Alertas de consumo anómalo. |
| QR expira antes de escanear | Baja | Bajo | Frontend hace pooling cada 5s y regenera QR automáticamente si expira. |
| Conflicto de números entre usuarios | Baja | Alto | Validación al registrar: buscar en usermeta si el número ya existe. Verificación OTP opcional. |
| wacli sync se cae sin notificar | Media | Medio | Systemd `Restart=always` + monitoreo externo + heartbeat endpoint que verifique estado del sync. |
| Fuga de datos si un userId se mezcla | Baja | Crítico | `AgentChatProcessor` recibe userId como parámetro inmutable. Prohibido usar `get_current_user_id()` en contextos webhook. |

---

## 9. Preguntas abiertas para resolver antes de implementar

1. **wacli `--store-dir`:** ¿La versión actual de `openclaw/wacli` soporta `--store-dir` para aislar stores completamente? Si no, ¿cómo maneja el aislamiento entre accounts?

2. **Webhook único vs múltiples:** ¿wacli permite que múltiples instancias `sync` apunten al mismo webhook URL (con diferentes `?account=`)? ¿Hay conflictos de concurrencia?

3. **QR output format:** ¿wacli `auth` sin flags devuelve el QR como ASCII art, como base64 PNG, o como pairing code? Esto afecta cómo se captura y muestra en frontend.

4. **Rate limits de Meta:** ¿Hay algún límite de Meta/WhatsApp sobre cuántos dispositivos vinculados puede tener un mismo servidor IP? Cada usuario es un dispositivo vinculado independiente.

5. **Verificación OTP:** ¿Es necesario enviar un código SMS/call al número antes de habilitar el chatbot, o el hecho de escanear el QR (que requiere acceso físico al teléfono) es suficiente verificación de propiedad?

6. **Modelo de negocio:** ¿Los usuarios pagan por el chatbot? ¿Cuántos usuarios se esperan en el corto, mediano y largo plazo? Esto impacta el diseño de escalabilidad.

7. **OpenCode para no-admins:** ¿Se requiere o no? Si sí, ¿qué comandos pueden ejecutar? ¿Con qué sandbox?

---

## 10. Conclusión

El sistema actual tiene una base sólida para extender a multi-usuario:
- El aislamiento por `user_id` ya existe en la capa de datos.
- wacli soporta nativamente `--account` para múltiples cuentas.
- El webhook puede adaptarse para rutear por account name.
- La infraestructura systemd permite templates por usuario.

**Complejidad estimada:** Media-alta (8-12 días de desarrollo full-stack).
**Esfuerzo principal:** `WacliManagerService` + endpoints REST + frontend de conexión.
**Riesgo más crítico:** Aislamiento correcto de stores wacli + verificación de que wacli soporte el esquema multi-cuenta en el mismo servidor.

**Se recomienda comenzar con una POC de 1-2 días:**
1. Crear manualmente dos cuentas wacli en servidor de pruebas.
2. Verificar que ambos syncs funcionan simultáneamente con webhooks independientes.
3. Procesar un mensaje de cada cuenta y verificar aislamiento.
4. Con los resultados, ajustar el plan antes de implementar el sistema completo.
