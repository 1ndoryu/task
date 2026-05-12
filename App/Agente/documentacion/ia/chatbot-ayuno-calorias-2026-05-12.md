# Chatbot con ayuno y calorías — 2026-05-12

## Objetivo

Hacer que el chatbot pueda operar sobre el ayuno y el déficit calórico sin crear una verdad paralela. Antes, ambos plugins persistían solo en Zustand/localStorage; por eso WhatsApp podía calcular una respuesta, pero no dejar cambios visibles para el panel.

## Diseño implementado

- `PluginStateRepository` guarda estados por usuario en user_meta cifrable: `_glory_plugin_ayuno` y `_glory_plugin_deficit_calorico`.
- `DashboardRepository::loadAll()` y `saveAll()` incluyen `ayuno` y `deficitCalorico` en el payload de sincronización.
- `DashboardApiController::saveDashboard()` acepta esos campos en el endpoint REST existente.
- `useDashboardSync()` sube y baja los estados de `ayunoStore` y `deficitCaloricoStore` junto al resto del dashboard.
- Los stores React agregan `sincronizarDesdeServidor()` para hidratarse desde el backend sin perder el fallback localStorage.
- La API key legacy `apiKeyGemini` no se sincroniza al servidor; el store conserva su valor local cuando el backend devuelve vacío.

## Acciones del agente

- `iniciar_ayuno`: crea sesión activa con `duracion_horas` y una `hora_ultima_comida` opcional en ISO8601.
- `terminar_ayuno`: cierra sesión activa con `fin` opcional, calcula duración real y registra historial.
- `estado_ayuno`: devuelve estado activo/inactivo, transcurrido, restante y último ayuno.
- `registrar_comida`: guarda descripción, calorías manuales si existen o estimación nutricional via `LLMProviderService::estimarNutricion()`.
- `resumen_calorias_hoy`: suma comidas del día, macros y objetivo calórico si existe configuración suficiente para TDEE.

## Reglas importantes

- El tiempo del ayuno se almacena en milisegundos y se formatea con la zona horaria del canal (`WHATSAPP_USER_TIMEZONE` para WhatsApp).
- Un ayuno de 12h o más marca/completa el hábito `Ayuno`; si no existe, el backend crea el hábito especial de forma incremental.
- Las metas calóricas usan el mismo enfoque del frontend: TDEE Mifflin-St Jeor o estimación por cintura/altura y déficit `bajo|moderado|alto|peligroso`.
- El contexto del agente incluye un resumen breve de ayuno y calorías para reducir tool calls, pero en modo privacidad oculta detalles.

## Validación

- `php -l` limpio en `PluginStateRepository.php`, `DashboardRepository.php`, `DashboardApiController.php`, `AgentWellnessService.php`, `AgentChatProcessor.php`.
- `npm run type-check:glory` limpio.
- `scripts/self-check.ps1 -TareaId 115A-7` limpio.