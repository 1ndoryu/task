# Proveedores IA y claves — 2026-05-10

## Contrato
- Usuarios normales configuran su propia API key en Configuración → Asistente IA.
- Admin puede dejar vacío el campo local: el frontend llama al backend y el backend usa variables de entorno.
- Groq lee `GROQ_API`, `GROQ_API_1`, `GROQ_API_2`, `GROQ_API_3` con rotación por intento.
- DeepSeek lee `DEEPSEEK_API`, `DEEPSEEK-API`, `DEEPSEEK_API_KEY`.

## Endpoints admin-only
- `POST /wp-json/glory/v1/ai/chat`
- `POST /wp-json/glory/v1/ai/nutricion`

## Frontend
- `iaStore` persiste `proveedor`, `apiKey`, `apiKeyDeepseek`, `modelo`, `preferenciasUsuario` y `promptSistema`.
- `iaService` decide si usa API directa del usuario o proxy backend admin.
- Déficit Calórico usa el mismo contrato y mantiene `apiKeyGemini` solo como campo legacy.

## Seguridad
- Las claves admin nunca se serializan en `window.gloryDashboard` ni en localStorage.
- Los endpoints backend verifican `current_user_can('manage_options')` antes de usar env.