# WhatsApp con wacli — 2026-05-11

## Decisión
- Usar `openclaw/wacli` para mensajes personales del agente.
- `wacli` funciona como dispositivo vinculado de WhatsApp Web y permite `send text`, archivos, búsqueda, sync y cuentas aisladas.
- No se ejecuta desde el prompt del LLM: se expone detrás de endpoints admin-only y acciones aprobables.

## Endpoints añadidos
- `GET /wp-json/glory/v1/agent/wacli/status`: comprueba binario, cuenta, destinatario por defecto y auth sin exponer números completos.
- `GET /wp-json/glory/v1/agent/actions`: lista acciones del agente del usuario admin.
- `POST /wp-json/glory/v1/agent/actions/whatsapp`: crea propuesta `whatsapp_send_text`.
- `POST /wp-json/glory/v1/agent/actions/reminder`: programa recordatorios persistidos.
- `POST /wp-json/glory/v1/agent/actions/{id}/approve`: aprueba y ejecuta la acción.

## Env soportado
- `WACLI_BIN`: ruta del binario, default `wacli` en PATH.
- `WACLI_ACCOUNT`: cuenta wacli opcional para stores con varios números.
- `WHATSAPP_AGENT_TO`, `WHATSAPP_TO` o `WHATSAPP`: destinatario por defecto.
- Timezone usuario: desde [125A-RT], `UserTimeService` usa meta por usuario (`glory_user_timezone` / `glory_whatsapp_timezone`), `X-Glory-Timezone` del dashboard y fallback de país del número WhatsApp. `WHATSAPP_USER_TIMEZONE` queda legacy y no debe usarse para usuarios nuevos.
- `WACLI_LOCAL_MODE=true`: permite aprobar la acción en local aunque no exista `wacli`; devuelve `wacli-local` y no manda WhatsApp real.

## Modo local
- Si `WACLI_LOCAL_MODE`, `LOCAL` o `DEV` están activos y el binario no existe, `WacliService` simula el envío y registra resultado exitoso.
- Esto permite probar el flujo completo chat -> propuesta -> aprobación -> resultado sin depender de pairing ni de WhatsApp real.
- El destinatario sigue siendo obligatorio para evitar que una prueba local oculte configuración incompleta.

## Setup servidor pendiente
1. Instalar wacli en el contenedor/host donde PHP pueda ejecutarlo.
2. Autenticar como dispositivo vinculado: `wacli --account personal auth`.
3. Probar estado: `wacli --account personal --json auth status`.
4. Configurar env en Coolify y sincronizar.
5. Usar la aprobación del chat para enviar mensajes o programar recordatorios.

## Seguridad
- Solo `manage_options` puede consultar estado, crear propuestas o aprobar envíos.
- Los números se devuelven enmascarados en estado/resultado.
- `wacli send` solo se ejecuta después de aprobar una acción persistida.
- Los comandos se ejecutan con `proc_open` y argumentos separados, sin shell interpolation.
- `WacliService` pasa `--lock-wait` en cada comando para tolerar bloqueos breves del store cuando `wacli sync --follow` está activo.

## Media entrante
- `wacli media download` usa la API actual `--chat <jid> --id <messageId> --output <file>`.
- Los eventos nuevos de wacli proveen `Chat` e `ID`; no usar `DirectPath`/`MediaKey` como flags porque la versión actual los rechaza.
- `Media.Type` es el kind (`audio`, `image`, `video`) y `Media.MimeType` es el MIME real (`audio/ogg; codecs=opus`). Whisper y visión deben usar `MimeType`.
- Si el store está ocupado, `--lock-wait` debe esperar antes de fallar; sin esto, audios e imágenes caen al fallback del chatbot.

## Hábitos por WhatsApp
- Las acciones de hábitos usan la fecha local real del usuario vía `UserTimeService`, no la fecha PHP/WordPress, para coincidir con el día que ve en web y teléfono.
- Toda marca de hábito debe renovar `updatedAt`, guardar parcial y verificar por relectura antes de responder éxito.

## Recordatorios dinamicos
- Los recordatorios `reminder_notify` cuyo titulo/mensaje indiquen `Habito pendiente` o cuyo payload use `dynamic_type=habit_pending` se resuelven al momento de ejecutarse.
- `AgentSchedulerService` consulta `HabitosRepository`, descarta habitos pausados y completados hoy, ordena por `importancia` (`muy_alta`, `alta`, `media`, `baja`, `muy_baja`) y envia el primer pendiente.
- El mensaje WhatsApp queda como `Hábito pendiente: Tu hábito pendiente de mayor prioridad es: {nombre} ({importancia}).`.
- Si no hay habitos pendientes, se omite la notificacion para no enviar recordatorios falsos.
- Desde [125A-RT], cada recordatorio nuevo guarda `payload.timezone`; los legacy sin timezone se interpretan con la timezone WordPress original para no desplazar recordatorios ya creados.
