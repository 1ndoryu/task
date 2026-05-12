# Auditoría WhatsApp multiusuario — 2026-05-12

## Riesgos corregidos
- **Compatibilidad admin:** el webhook conserva el flujo legacy cuando no llega `account` o cuando `account` coincide con `WACLI_ACCOUNT`/`OPENCLAW_WACLI_ACCOUNT`. Solo `account=user_X` entra a cola multiusuario.
- **Cola y reintentos:** locks ocupados, rate limit temporal y falta de slots LLM reencolan sin consumir `attempts`. Los intentos se consumen solo ante fallos reales de procesamiento.
- **Locks SQL:** los `GET_LOCK` y `RELEASE_LOCK` del worker usan `$wpdb->prepare()`.
- **Gating de pago:** `subscriber` ya no recibe `glory_whatsapp_chatbot` por rol global. Admin mantiene bypass; usuarios normales dependen de capability por suscripción.
- **Sync tras QR:** cuando `auth-status` detecta transición a autenticado, intenta iniciar `wacli-sync@user_X` y marca `degraded` si systemd no está disponible.
- **Frontend:** uso diario toma el límite real del endpoint, sin constante local de 20 mensajes ni estilos inline para los iconos/barra.
- **Separación de responsabilidades:** `WacliSystemdService`, `WacliAlertService` y `WhatsAppAccountRepository` separan systemd, alertas y lectura de datos del manager/controller.
- **Admin REST:** los endpoints `/admin/whatsapp/*` quedaron en `WhatsappAdminApiController` y las consultas en `WhatsAppAdminRepository`, evitando query directa y crecimiento del controlador general.

## Pendientes de infraestructura
- Crear y probar `wacli-sync@.service` y sudoers en servidor antes de habilitar usuarios reales.
- Probar POC con dos cuentas reales, dos syncs concurrentes y eventos simultáneos del mismo usuario.
- Definir quién concede/revoca `glory_whatsapp_chatbot` desde el sistema de suscripciones.
- Confirmar formato real de QR de `wacli auth` en producción y adaptar el frontend si no retorna imagen `data:`.

## Validación local
- `php -l` en controllers, services, schema, repository, `functions.php` y runner worker: OK.
- `npm run type-check:glory`: OK.
- `get_errors` en archivos auditados principales: OK.