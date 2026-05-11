# WhatsApp con wacli — 2026-05-11

## Decisión
- Usar `openclaw/wacli` para mensajes personales del agente.
- `wacli` funciona como dispositivo vinculado de WhatsApp Web y permite `send text`, archivos, búsqueda, sync y cuentas aisladas.
- No se ejecuta desde el prompt del LLM: se expone detrás de endpoints admin-only y acciones aprobables.

## Endpoints añadidos
- `GET /wp-json/glory/v1/agent/wacli/status`: comprueba binario, cuenta, destinatario por defecto y auth sin exponer números completos.
- `GET /wp-json/glory/v1/agent/actions`: lista acciones del agente del usuario admin.
- `POST /wp-json/glory/v1/agent/actions/whatsapp`: crea propuesta `whatsapp_send_text`.
- `POST /wp-json/glory/v1/agent/actions/{id}/approve`: aprueba y ejecuta la acción.

## Env soportado
- `WACLI_BIN`: ruta del binario, default `wacli` en PATH.
- `WACLI_ACCOUNT`: cuenta wacli opcional para stores con varios números.
- `WHATSAPP_AGENT_TO`, `WHATSAPP_TO` o `WHATSAPP`: destinatario por defecto.

## Setup servidor pendiente
1. Instalar wacli en el contenedor/host donde PHP pueda ejecutarlo.
2. Autenticar como dispositivo vinculado: `wacli --account personal auth`.
3. Probar estado: `wacli --account personal --json auth status`.
4. Configurar env en Coolify y sincronizar.
5. Usar UI futura de aprobación para enviar mensajes.

## Seguridad
- Solo `manage_options` puede consultar estado, crear propuestas o aprobar envíos.
- Los números se devuelven enmascarados en estado/resultado.
- `wacli send` solo se ejecuta después de aprobar una acción persistida.
