# 109A+109B: MemPalace + WhatsApp bidireccional ✅

**Fecha:** 2026-05-11  
**Branch:** glory-react-logic  
**Commit final:** 9a83d72e3

## Lo que se implementó

### 109A — MemPalace memoria semántica
- Flask+gunicorn systemd service `mempalace-api` en `0.0.0.0:4001` (host)
- `MemPalaceService.php`: GET /search + POST /remember + GET /health
- `AgentChatProcessor.php`: motor PHP server-side (Groq llama-3.3-70b-versatile)
- Sistema integrado en flujo WhatsApp y `/api/glory/v1/chat/server-side`

### 109B — WhatsApp bidireccional
- `wacli-daemon` systemd service: `wacli sync --follow --webhook URL --webhook-secret SECRET`
- `WhatsAppWebhookService.php`: HMAC-SHA256 verify + parseo NDJSON + ruteo a AgentChatProcessor
- Endpoint: `POST /wp-json/glory/v1/whatsapp/webhook`
- Respuestas vía `WacliService::enviarTexto()`

## Bugs corregidos durante el deploy

1. **phpdotenv `createImmutable` no llama `putenv()`** → usar `$_ENV[key] ?? getenv(key)`
2. **`WHATSAPP-SEGUNDO-NUMERO` con guiones** → renombrar a `WHATSAPP_SEGUNDO_NUMERO` (phpdotenv strict)
3. **`$llmResult['content']`** → clave incorrecta; LLMProviderService devuelve `'contenido'`
4. **gunicorn en 127.0.0.1** → cambiar a `0.0.0.0:4001` para acceso desde Docker
5. **UFW bloqueaba Docker subnets** → añadir reglas para `10.0.5.0/24` y `10.0.0.0/24`
6. **.env con basura** (heredoc fallido) → siempre usar `tee << MARKER` desde el host, luego `docker cp`

## Estado verificado
- Firma HMAC válida ✅
- LLM responde (Groq) ✅
- Mensajes guardados en DB (`wp_glory_agent_chat_messages`) ✅
- wacli envía respuesta por WhatsApp desde contenedor ✅
- MemPalace accesible vía `host.docker.internal:4001` ✅ (timeout transitorio no crítico)

## Lecciones clave
- `EnvService::get()` lee `$_ENV → $_SERVER → getenv() → .env file directo` — siempre funciona
- Para `WhatsAppWebhookService` (instanciado fuera del ciclo normal), usar `$_ENV` directamente
- `wp_strip_all_tags()` en `guardarMensaje` puede dejar vacío si la respuesta tiene markup
- MemPalace timeout (8s) no bloquea el flujo — `search()` captura y retorna ''
