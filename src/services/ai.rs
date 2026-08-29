/* [AI] Proxy LLM OpenAI-compatible (Cerebras/Groq/DeepSeek) que sustituye al
 * LLMProviderService.php del proyecto WordPress: mismas envs, misma cadena de
 * fallback, misma rotación de keys y mismas validaciones. El front ya no llama
 * a los proveedores directamente para el admin (la key no sale del servidor).
 *
 * [SEC-001] Solo el backend tiene las keys (envs del proyecto anterior).
 * El flujo: mensajes -> candidato solicitado (si el modelo es válido) ->
 * cadena de fallback -> rotación de keys del proveedor hasta una respuesta. */

use crate::config::AiProviderKeys;
use crate::errors::AppError;
use serde::{Deserialize, Serialize};

/// Proveedores soportados: url de la API y modelos permitidos (allowlist).
/// Los nombres de env replican exactamente LLMProviderService.php (Coolify).
const PROVIDERS: &[(&str, &str, &[&str])] = &[
    (
        "groq",
        "https://api.groq.com/openai/v1/chat/completions",
        &[
            "groq/compound",
            "groq/compound-mini",
            "openai/gpt-oss-20b",
            "openai/gpt-oss-120b",
            "qwen/qwen3.6-27b",
        ],
    ),
    (
        "deepseek",
        "https://api.deepseek.com/chat/completions",
        &["deepseek-v4-flash"],
    ),
    /* [27-08-2026] Glory API (free.empero.org) responde sin API key. La ruta
     * "auto" del proveedor usa el modelo `commandcode`, que resuelve
     * internamente a DeepSeek Flash (la vía que el usuario prefiere usar por
     * ser la que siempre funciona). `glm-5.3-flash` se mantiene como modelo
     * disponible. */
    (
        "glory",
        "https://free.empero.org/v1/chat/completions",
        &["commandcode", "glm-5.3-flash"],
    ),
    (
        "cerebras",
        "https://api.cerebras.ai/v1/chat/completions",
        &["gemma-4-31b", "gpt-oss-120b"],
    ),
];

/// Cadena de fallback cuando el candidato solicitado falla (PHP CHAT_FALLBACK_CHAIN).
/* [26-08-2026] Cadena actualizada a modelos reales de la cuenta (verificados
 * contra /models de cada proveedor el 26-08): groq/compound-mini responde
 * JSON en pocos tokens (ideal nutrición); gpt-oss son de razonamiento y
 * agotan el presupuesto corto dejando content vacío, por eso van detrás. */
const CHAT_FALLBACK_CHAIN: &[(&str, &str)] = &[
    /* [29-08-2026] Glory API/`commandcode` (ruta auto -> DeepSeek Flash) sin
     * clave va PRIMERO: es la vía que siempre funciona y el default del agente.
     * La nutrición no cambia: pasa un modelo groq válido, que `candidato_valido`
     * pone antes de esta cadena (la cadena solo rige cuando el candidato
     * solicitado es inválido/ausente). */
    ("glory", "commandcode"),
    ("glory", "glm-5.3-flash"),
    ("groq", "groq/compound-mini"),
    ("groq", "groq/compound"),
    ("cerebras", "gemma-4-31b"),
    ("groq", "openai/gpt-oss-20b"),
    ("groq", "openai/gpt-oss-120b"),
    ("groq", "qwen/qwen3.6-27b"),
    ("deepseek", "deepseek-v4-flash"),
];

/// Prompt de nutrición calibrado regional (mismo que el front para que el
/// admin reciba el mismo comportamiento que un usuario con key propia).
const PROMPT_NUTRICION: &str = "You are a certified nutritionist estimating macros for a home-cooked Latin American diet.
Rules:
- Use USDA FoodData Central values. For Venezuelan/Latin foods use accurate regional data.
- Assume food is COOKED unless explicitly stated raw. This is critical for rice, pasta, grains (cooked rice ≈ 130 kcal/100g, NOT 360 kcal/100g raw).
- If fried (frito), account for absorbed oil. If with skin (con cuero), include it.
- Be conservative: use home-portion sizes, not restaurant. When uncertain, pick the lower reasonable estimate.
- Never fabricate values. Use the closest known food if exact data is unavailable.

Informal measurements (common in casual Spanish input):
- \"puño\" (handful) ≈ 75-85g of cooked grains/rice/pasta
- \"tajada\" (slice of fried ripe plantain) ≈ 35-45g per slice (~50-60 kcal each)
- \"media arepa\" = half an arepa. A standard homemade arepa (corn, no filling) ≈ 120-150 kcal, so half ≈ 60-75 kcal.
- \"cucharada\" (tablespoon) ≈ 15ml/15g. \"Cucharadita\" (teaspoon) ≈ 5ml.
- \"pedazo\"/\"trozo\" (piece) = a modest single portion unless context says otherwise.
- \"plato\" (plate) = a normal home serving, not heaped.
- If no quantity is specified, use ONE standard home serving.

Calibration references (use these as anchors):
- 1 arepa de maíz sin relleno: ~130 kcal
- 1 huevo entero: ~72 kcal
- 1 tajada de plátano maduro frito: ~55 kcal
- 100g arroz blanco cocido: ~130 kcal
- 1 puño arroz cocido (~80g): ~104 kcal

Respond ONLY with valid JSON, no markdown, no explanation.
JSON format:
{\"calorias\":<kcal>,\"proteinas\":<g>,\"carbohidratos\":<g>,\"grasas\":<g>,\"azucar\":<g>}";

/// Mensaje del chat (contrato del front). `content` puede ser string (texto)
/// o array (multimodal, p. ej. vision) — igual que en PHP validarMensajes().
/// `tool_calls`/`tool_call_id` son del agente (contrato OpenAI para tools);
/// el front los omite (default).
#[derive(Debug, Clone, Deserialize, Serialize, utoipa::ToSchema)]
pub struct AiMessage {
    pub role: String,
    pub content: serde_json::Value,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tool_calls: Option<Vec<AiToolCall>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tool_call_id: Option<String>,
}

impl AiMessage {
    #[must_use]
    pub fn texto(role: &str, contenido: impl Into<String>) -> Self {
        Self {
            role: role.into(),
            content: serde_json::Value::String(contenido.into()),
            tool_calls: None,
            tool_call_id: None,
        }
    }
}

/// Tool call propuesta por el modelo (agente): id + nombre + argumentos JSON.
/// Serializa al formato OpenAI de `tool_calls` en un mensaje assistant
/// (`function.name` + `function.arguments` como string JSON), que es lo que
/// exige el proveedor al reenviar el historial con tools.
#[derive(Debug, Clone, Deserialize)]
pub struct AiToolCall {
    pub id: String,
    pub nombre: String,
    pub argumentos: serde_json::Value,
}

impl Serialize for AiToolCall {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        use serde::ser::SerializeStruct;
        let mut state = serializer.serialize_struct("AiToolCall", 3)?;
        state.serialize_field("id", &self.id)?;
        state.serialize_field("type", "function")?;
        state.serialize_field(
            "function",
            &serde_json::json!({
                "name": self.nombre,
                "arguments": self.argumentos.to_string(),
            }),
        )?;
        state.end()
    }
}

/// Resultado de una llamada con streaming y tool calls (agente).
#[derive(Debug, Clone)]
pub struct AiStreamResult {
    pub contenido: String,
    pub tool_calls: Vec<AiToolCall>,
    pub tokens_prompt: u32,
    pub tokens_complecion: u32,
    pub finish_reason: String,
    pub provider: String,
    pub modelo: String,
}

#[derive(Debug, Clone)]
pub struct AiChatOptions {
    pub temperature: f32,
    pub max_tokens: u32,
}

#[derive(Debug, Clone)]
pub struct AiChatResult {
    pub contenido: String,
    pub tokens_prompt: u32,
    pub tokens_complecion: u32,
    pub finish_reason: String,
    pub provider: String,
    pub modelo: String,
}

#[derive(Debug, Clone)]
pub struct AiNutritionResult {
    pub calorias: i64,
    pub proteinas: i64,
    pub carbohidratos: i64,
    pub grasas: i64,
    pub azucar: i64,
    pub descripcion: String,
    pub provider: String,
    pub modelo: String,
}

/// Estado del circuit breaker por proveedor (R7 del plan agente).
#[derive(Debug, Clone)]
struct CircuitoProveedor {
    fallos_consecutivos: u32,
    hasta: Option<std::time::Instant>,
}

/// Umbral de fallos consecutivos antes de abrir el circuito (cooldown 60s).
const CIRCUITO_UMBRAL: u32 = 3;
const CIRCUITO_COOLDOWN: std::time::Duration = std::time::Duration::from_secs(60);

/// Servicio LLM con las keys del entorno. `Clone` es barato (reqwest::Client
/// comparte el pool internamente), así que vive directo en `AppState`.
/// El circuit breaker (fallos consecutivos por proveedor) vive en un `Mutex`
/// compartido: `Clone` no duplica el estado.
#[derive(Debug, Clone)]
pub struct LlmProviderService {
    keys: AiProviderKeys,
    client: reqwest::Client,
    circuito: std::sync::Arc<std::sync::Mutex<std::collections::HashMap<String, CircuitoProveedor>>>,
}

impl LlmProviderService {
    #[must_use]
    pub fn new(keys: AiProviderKeys) -> Self {
        /* Timeout de 45s por llamada al proveedor (paridad con wp_remote_post
         * del PHP); el TimeoutLayer global da el margen de la petición. */
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(45))
            .build()
            .expect("reqwest client builder is infallible");
        Self {
            keys,
            client,
            circuito: std::sync::Arc::new(std::sync::Mutex::new(std::collections::HashMap::new())),
        }
    }

    /// ¿Está el proveedor en cooldown por fallos consecutivos?
    fn proveedor_abierto(&self, proveedor: &str) -> bool {
        let estado = self
            .circuito
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        match estado.get(proveedor) {
            Some(c) => c
                .hasta
                .map(|hasta| std::time::Instant::now() < hasta)
                .unwrap_or(false),
            None => false,
        }
    }

    /// Registra un fallo (abre el circuito tras N consecutivos) o un acierto
    /// (cierra el circuito y resetea el contador).
    fn registrar_fallo(&self, proveedor: &str) {
        let mut estado = self
            .circuito
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        let entrada = estado.entry(proveedor.to_string()).or_insert(CircuitoProveedor {
            fallos_consecutivos: 0,
            hasta: None,
        });
        entrada.fallos_consecutivos += 1;
        if entrada.fallos_consecutivos >= CIRCUITO_UMBRAL {
            entrada.hasta = Some(std::time::Instant::now() + CIRCUITO_COOLDOWN);
            tracing::warn!(proveedor, fallos = entrada.fallos_consecutivos, cooldown_s = 60, "circuit breaker abierto");
        }
    }

    fn registrar_acierto(&self, proveedor: &str) {
        let mut estado = self
            .circuito
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        if let Some(entrada) = estado.get_mut(proveedor) {
            entrada.fallos_consecutivos = 0;
            entrada.hasta = None;
        }
    }

    pub async fn enviar_chat(
        &self,
        mensajes: Vec<AiMessage>,
        provider: &str,
        modelo: &str,
        opciones: AiChatOptions,
    ) -> Result<AiChatResult, AppError> {
        let mensajes_validos = validar_mensajes(mensajes)?;
        let mut errores: Vec<String> = Vec::new();

        for (proveedor, modelo) in resolver_candidatos(provider, modelo) {
            /* [29-08-2026] Circuit breaker (R7): si el proveedor lleva N fallos
             * consecutivos, se aparta 60s y se prueba el siguiente de la cadena. */
            if self.proveedor_abierto(proveedor) {
                errores.push(format!(
                    "{proveedor}/{modelo}: proveedor en cooldown por fallos consecutivos"
                ));
                continue;
            }
            let keys = self.keys_para(proveedor);
            /* [27-08-2026] Glory API (free.empero.org) responde sin API key
             * (verificado contra /models y /chat/completions). Para ese
             * proveedor, sin clave configurada se prueba una llamada sin
             * Authorization en vez de fallar por ausencia de key. */
            if keys.is_empty() {
                if proveedor == "glory" {
                    match self
                        .ejecutar_request(proveedor, "", modelo, &mensajes_validos, &opciones)
                        .await
                    {
                        Ok(resultado) => {
                            self.registrar_acierto(proveedor);
                            return Ok(resultado);
                        }
                        Err(error) => {
                            tracing::warn!(%error, proveedor, modelo, "glory sin key falló");
                            self.registrar_fallo(proveedor);
                            errores.push(format!("{proveedor}/{modelo}: {error}"));
                        }
                    }
                } else {
                    errores.push(format!(
                        "No hay API key configurada para {proveedor} en el entorno"
                    ));
                }
                continue;
            }
            for key in keys {
                match self
                    .ejecutar_request(proveedor, key, modelo, &mensajes_validos, &opciones)
                    .await
                {
                    Ok(resultado) => {
                        self.registrar_acierto(proveedor);
                        return Ok(resultado);
                    }
                    Err(error) => {
                        self.registrar_fallo(proveedor);
                        errores.push(format!("{proveedor}/{modelo}: {error}"));
                    }
                }
            }
        }

        /* [26-08-2026] Reportar TODA la cadena de errores (sin duplicados por
         * proveedor/modelo), no solo el último: ocultar los fallos previos
         * impedía diagnosticar por qué cerebras/groq no respondían. */
        let mut unicos: Vec<String> = Vec::new();
        for e in &errores {
            if !unicos.contains(e) {
                unicos.push(e.clone());
            }
        }
        let detalle = if unicos.is_empty() {
            "sin errores de proveedor".to_string()
        } else {
            unicos.join(" | ")
        };
        Err(AppError::Upstream(format!(
            "No se pudo contactar un modelo IA disponible: {detalle}"
        )))
    }

    pub async fn estimar_nutricion(
        &self,
        descripcion: String,
        provider: &str,
        modelo: &str,
    ) -> Result<AiNutritionResult, AppError> {
        let descripcion = descripcion.trim().to_string();
        if descripcion.is_empty() || descripcion.chars().count() > 1200 {
            return Err(AppError::BadRequest(
                "Descripción de comida inválida".into(),
            ));
        }

        let mensajes = vec![
            AiMessage::texto("system", PROMPT_NUTRICION),
            AiMessage::texto("user", descripcion.clone()),
        ];
        let respuesta = self
            .enviar_chat(
                mensajes,
                provider,
                modelo,
                AiChatOptions {
                    temperature: 0.1,
                    /* [26-08-2026] 180 era el contrato PHP, pero los modelos
                     * actuales (compound-mini, gpt-oss, qwen) razonan antes de
                     * responder: con presupuesto corto se cortan en <think> y
                     * devuelven content vacío o JSON truncado. 512 deja margen. */
                    max_tokens: 512,
                },
            )
            .await?;

        /* El modelo puede devolver el JSON envuelto en backticks de markdown
         * y/o precedido de un bloque <think>...</think> (modelos que razonan
         * en voz alta). Se limpia todo eso antes de parsear. */
        let contenido = respuesta.contenido.trim();
        /* [26-08-2026] Los modelos que razonan en voz alta (compound-mini,
         * qwen, gpt-oss) pueden envolver su razonamiento en <think>...</think>
         * ANTES del JSON. Hay que remover el bloque COMPLETO (etiquetas y
         * contenido interior), no solo las etiquetas: si el texto del
         * razonamiento queda pegado al JSON, el parseo falla. */
        let mut sin_think = contenido.to_string();
        loop {
            let inicio = sin_think.find("<think");
            let fin = sin_think.find("</think>");
            match (inicio, fin) {
                (Some(i), Some(f)) if f > i => {
                    let antes = &sin_think[..i];
                    let despues = &sin_think[f + "</think>".len()..];
                    sin_think = format!("{antes}{despues}");
                }
                _ => break,
            }
        }
        let sin_think = sin_think.trim();
        let json = sin_think
            .strip_prefix("```json")
            .or_else(|| sin_think.strip_prefix("```"))
            .map(str::trim_start)
            .unwrap_or(sin_think)
            .trim_end_matches("```")
            .trim();

        let datos: serde_json::Value = serde_json::from_str(json).map_err(|_| {
            AppError::Upstream(format!(
                "La IA no devolvió macros válidos. Reintenta con una descripción más concreta (JSON: {})",
                contenido.chars().take(120).collect::<String>()
            ))
        })?;

        let numero = |clave: &str| -> Option<i64> {
            datos
                .get(clave)
                .and_then(serde_json::Value::as_f64)
                .map(|v| v.round() as i64)
        };
        let calorias = numero("calorias")
            .ok_or_else(|| {
                AppError::Upstream(
                    "La IA no devolvió macros válidos. Reintenta con una descripción más concreta"
                        .into(),
                )
            })?;

        Ok(AiNutritionResult {
            calorias,
            proteinas: numero("proteinas").unwrap_or(0),
            carbohidratos: numero("carbohidratos").unwrap_or(0),
            grasas: numero("grasas").unwrap_or(0),
            azucar: numero("azucar").unwrap_or(0),
            descripcion: mayuscula_primera(&descripcion),
            provider: respuesta.provider,
            modelo: respuesta.modelo,
        })
    }

    /// [29-08-2026] Streaming SSE hacia el proveedor (agente, plan Fase 0/1).
    /// Emite cada token vía `on_token` (para el contrato SSE del agente) y
    /// acumula tool_calls en streaming. `tools` es la lista de schemas OpenAI
    /// (vacía = llamada sin tools). Fallback: si el proveedor no soporta
    /// streaming (o falla al abrir el stream), se hace una llamada no-stream y
    /// se emite un único `on_token` con la respuesta completa.
    pub async fn enviar_chat_stream(
        &self,
        mensajes: Vec<AiMessage>,
        provider: &str,
        modelo: &str,
        opciones: AiChatOptions,
        tools: Vec<serde_json::Value>,
        on_token: &mut (dyn FnMut(&str) -> bool + Send),
    ) -> Result<AiStreamResult, AppError> {
        let mensajes_validos = validar_mensajes(mensajes)?;
        let mut errores: Vec<String> = Vec::new();

        for (proveedor, modelo) in resolver_candidatos(provider, modelo) {
            /* [29-08-2026] Circuit breaker (R7): mismo criterio que enviar_chat. */
            if self.proveedor_abierto(proveedor) {
                errores.push(format!(
                    "{proveedor}/{modelo}: proveedor en cooldown por fallos consecutivos"
                ));
                continue;
            }
            let keys = self.keys_para(proveedor);
            if keys.is_empty() && proveedor != "glory" {
                errores.push(format!(
                    "No hay API key configurada para {proveedor} en el entorno"
                ));
                continue;
            }
            let keys: Vec<String> = if keys.is_empty() {
                vec![String::new()]
            } else {
                keys.to_vec()
            };
            for key in &keys {
                match self
                    .ejecutar_request_stream(proveedor, key, modelo, &mensajes_validos, &opciones, &tools, on_token)
                    .await
                {
                    Ok(resultado) => {
                        self.registrar_acierto(proveedor);
                        return Ok(resultado);
                    }
                    /* Cancelación del cliente: no es fallo del proveedor y no
                     * hay que probar el siguiente — abortar el stream. */
                    Err(AppError::Cancelado) => return Err(AppError::Cancelado),
                    Err(error) => {
                        self.registrar_fallo(proveedor);
                        tracing::warn!(%error, proveedor, modelo, "stream del proveedor falló");
                        errores.push(format!("{proveedor}/{modelo}: {error}"));
                    }
                }
            }
        }

        let mut unicos: Vec<String> = Vec::new();
        for e in &errores {
            if !unicos.contains(e) {
                unicos.push(e.clone());
            }
        }
        let detalle = if unicos.is_empty() {
            "sin errores de proveedor".to_string()
        } else {
            unicos.join(" | ")
        };
        Err(AppError::Upstream(format!(
            "No se pudo contactar un modelo IA disponible: {detalle}"
        )))
    }

    /// Request con stream=true; parsea líneas SSE `data: {...}` acumulando
    /// content y tool_calls. Fallback interno a no-stream si el proveedor
    /// responde sin SSE (algunos proxies devuelven JSON directo).
    async fn ejecutar_request_stream(
        &self,
        proveedor: &str,
        api_key: &str,
        modelo: &str,
        mensajes: &[AiMessage],
        opciones: &AiChatOptions,
        tools: &[serde_json::Value],
        on_token: &mut (dyn FnMut(&str) -> bool + Send),
    ) -> Result<AiStreamResult, AppError> {
        let (_, url, _) = PROVIDERS
            .iter()
            .find(|(id, _, _)| *id == proveedor)
            .ok_or_else(|| AppError::BadRequest("Proveedor IA no soportado".into()))?;
        let url = *url;

        let mut body = serde_json::json!({
            "model": modelo,
            "messages": mensajes,
            "temperature": opciones.temperature,
            "stream": true,
        });
        if !tools.is_empty() {
            body["tools"] = serde_json::Value::Array(tools.to_vec());
        }
        if proveedor == "groq" {
            body["max_completion_tokens"] = serde_json::json!(opciones.max_tokens);
        } else {
            body["max_tokens"] = serde_json::json!(opciones.max_tokens);
        }

        let mut request = self.client.post(url);
        if !api_key.is_empty() {
            request = request.bearer_auth(api_key);
        }
        let respuesta = request
            .json(&body)
            .send()
            .await
            .map_err(|error| AppError::Upstream(format!("Error de red: {error}")))?;
        let status = respuesta.status();
        if !status.is_success() {
            let datos: serde_json::Value = respuesta.json().await.unwrap_or_default();
            let mensaje = datos
                .get("error")
                .and_then(|error| error.get("message"))
                .and_then(serde_json::Value::as_str)
                .unwrap_or("Error del proveedor");
            return Err(AppError::Upstream(format!(
                "{proveedor} {status}: {mensaje}"
            )));
        }

        let content_type = respuesta
            .headers()
            .get("content-type")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("")
            .to_string();

        /* Fallback no-stream: si el proveedor no devuelve text/event-stream
         * (p. ej. un proxy que responde JSON directo), se hace la llamada
         * normal y se emite un único token. */
        if !content_type.contains("text/event-stream") {
            let datos: serde_json::Value = respuesta.json().await.map_err(|error| {
                AppError::Upstream(format!("Respuesta no JSON del proveedor: {error}"))
            })?;
            let contenido = datos
                .pointer("/choices/0/message/content")
                .and_then(serde_json::Value::as_str)
                .unwrap_or("")
                .to_string();
            /* Fase 4: si el cliente canceló (on_token → false), se aborta y
             * no se devuelve una respuesta parcial como resultado exitoso. */
            if !on_token(&contenido) {
                return Err(AppError::Cancelado);
            }
            return Ok(AiStreamResult {
                contenido,
                tool_calls: Vec::new(),
                tokens_prompt: datos
                    .pointer("/usage/prompt_tokens")
                    .and_then(serde_json::Value::as_u64)
                    .unwrap_or(0) as u32,
                tokens_complecion: datos
                    .pointer("/usage/completion_tokens")
                    .and_then(serde_json::Value::as_u64)
                    .unwrap_or(0) as u32,
                finish_reason: datos
                    .pointer("/choices/0/finish_reason")
                    .and_then(serde_json::Value::as_str)
                    .unwrap_or("")
                    .to_string(),
                provider: proveedor.to_string(),
                modelo: modelo.to_string(),
            });
        }

        let mut contenido = String::new();
        let mut tool_calls: Vec<serde_json::Value> = Vec::new();
        let mut tokens_prompt = 0u32;
        let mut tokens_complecion = 0u32;
        let mut finish_reason = String::new();

        let mut bytes = respuesta.bytes_stream();
        use futures_util::StreamExt;
        while let Some(chunk) = bytes.next().await {
            let chunk = chunk.map_err(|error| {
                AppError::Upstream(format!("Error leyendo el stream del proveedor: {error}"))
            })?;
            let texto = String::from_utf8_lossy(&chunk);
            for linea in texto.lines() {
                let linea = linea.trim();
                if !linea.starts_with("data:") {
                    continue;
                }
                let data = linea.trim_start_matches("data:").trim();
                if data == "[DONE]" {
                    continue;
                }
                let Ok(evento) = serde_json::from_str::<serde_json::Value>(data) else {
                    continue;
                };
                if let Some(usage) = evento.get("usage") {
                    tokens_prompt = usage.get("prompt_tokens").and_then(serde_json::Value::as_u64).unwrap_or(0) as u32;
                    tokens_complecion = usage.get("completion_tokens").and_then(serde_json::Value::as_u64).unwrap_or(0) as u32;
                }
                if let Some(delta) = evento.pointer("/choices/0/delta") {
                    if let Some(texto_delta) = delta.get("content").and_then(serde_json::Value::as_str) {
                        contenido.push_str(texto_delta);
                        /* Fase 4: cancelación real — si el cliente cortó el SSE,
                         * dejar de consumir el stream del proveedor de inmediato. */
                        if !on_token(texto_delta) {
                            return Err(AppError::Cancelado);
                        }
                    }
                    if let Some(calls) = delta.get("tool_calls").and_then(serde_json::Value::as_array) {
                        for call in calls {
                            let index = call.get("index").and_then(serde_json::Value::as_u64).unwrap_or(0) as usize;
                            if tool_calls.len() <= index {
                                tool_calls.resize(index + 1, serde_json::json!({ "function": { "name": "", "arguments": "" } }));
                            }
                            if let Some(nombre) = call.pointer("/function/name").and_then(serde_json::Value::as_str) {
                                tool_calls[index]["function"]["name"] = serde_json::Value::String(nombre.to_string());
                            }
                            if let Some(args) = call.pointer("/function/arguments").and_then(serde_json::Value::as_str) {
                                let actual = tool_calls[index]["function"]["arguments"].as_str().unwrap_or("").to_string();
                                tool_calls[index]["function"]["arguments"] =
                                    serde_json::Value::String(format!("{actual}{args}"));
                            }
                            if let Some(id) = call.get("id").and_then(serde_json::Value::as_str) {
                                tool_calls[index]["id"] = serde_json::Value::String(id.to_string());
                            }
                        }
                    }
                }
                if let Some(fr) = evento.pointer("/choices/0/finish_reason").and_then(serde_json::Value::as_str) {
                    if !fr.is_empty() && fr != "null" {
                        finish_reason = fr.to_string();
                    }
                }
            }
        }

        let tool_calls = tool_calls
            .into_iter()
            .filter_map(|call| {
                let nombre = call.pointer("/function/name")?.as_str()?.to_string();
                let id = call.get("id").and_then(serde_json::Value::as_str).unwrap_or("").to_string();
                let argumentos: serde_json::Value = call
                    .pointer("/function/arguments")
                    .and_then(serde_json::Value::as_str)
                    .and_then(|args| serde_json::from_str(args).ok())
                    .unwrap_or_else(|| serde_json::json!({}));
                Some(AiToolCall { id, nombre, argumentos })
            })
            .collect();

        Ok(AiStreamResult {
            contenido,
            tool_calls,
            tokens_prompt,
            tokens_complecion,
            finish_reason,
            provider: proveedor.to_string(),
            modelo: modelo.to_string(),
        })
    }

    fn keys_para(&self, proveedor: &str) -> &[String] {
        match proveedor {
            "cerebras" => &self.keys.cerebras,
            "groq" => &self.keys.groq,
            "deepseek" => &self.keys.deepseek,
            "glory" => &self.keys.glory,
            _ => &[],
        }
    }

    async fn ejecutar_request(
        &self,
        proveedor: &str,
        api_key: &str,
        modelo: &str,
        mensajes: &[AiMessage],
        opciones: &AiChatOptions,
    ) -> Result<AiChatResult, AppError> {
        let (_, url, _) = PROVIDERS
            .iter()
            .find(|(id, _, _)| *id == proveedor)
            .ok_or_else(|| AppError::BadRequest("Proveedor IA no soportado".into()))?;
        let url = *url;

        /* Groq usa max_completion_tokens; el resto max_tokens (paridad PHP). */
        let mut body = serde_json::json!({
            "model": modelo,
            "messages": mensajes,
            "temperature": opciones.temperature,
        });
        if proveedor == "groq" {
            body["max_completion_tokens"] = serde_json::json!(opciones.max_tokens);
        } else {
            body["max_tokens"] = serde_json::json!(opciones.max_tokens);
        }

        /* [27-08-2026] Glory API (free.empero.org) responde sin API key y
         * REJECTA un header Authorization vacío (400). Con key presente se
         * envía el header; sin key no se envía Authorization en absoluto. */
        let mut request = self.client.post(url);
        if !api_key.is_empty() {
            request = request.bearer_auth(api_key);
        }
        let respuesta = request
            .json(&body)
            .send()
            .await
            .map_err(|error| AppError::Upstream(format!("Error de red: {error}")))?;

        let status = respuesta.status();
        let datos: serde_json::Value = respuesta.json().await.map_err(|error| {
            AppError::Upstream(format!("Respuesta no JSON del proveedor: {error}"))
        })?;

        if !status.is_success() {
            let mensaje = datos
                .get("error")
                .and_then(|error| error.get("message"))
                .and_then(serde_json::Value::as_str)
                .or_else(|| datos.get("message").and_then(serde_json::Value::as_str))
                .unwrap_or("Error del proveedor");
            tracing::warn!(%proveedor, %status, %mensaje, detalle = %datos, "proveedor LLM rechazó el request");
            return Err(AppError::Upstream(format!(
                "{proveedor} {status}: {mensaje}"
            )));
        }

        let contenido = datos
            .pointer("/choices/0/message/content")
            .and_then(serde_json::Value::as_str)
            .map(str::trim)
            .filter(|contenido| !contenido.is_empty())
            .ok_or_else(|| AppError::Upstream("Respuesta vacía del modelo".into()))?
            .to_string();

        Ok(AiChatResult {
            contenido,
            tokens_prompt: datos
                .pointer("/usage/prompt_tokens")
                .and_then(serde_json::Value::as_u64)
                .unwrap_or(0) as u32,
            tokens_complecion: datos
                .pointer("/usage/completion_tokens")
                .and_then(serde_json::Value::as_u64)
                .unwrap_or(0) as u32,
            finish_reason: datos
                .pointer("/choices/0/finish_reason")
                .and_then(serde_json::Value::as_str)
                .unwrap_or("")
                .to_string(),
            provider: proveedor.to_string(),
            modelo: modelo.to_string(),
        })
    }
}

/// Valida roles y contenido, recorta a los últimos 25 mensajes y limita el
/// contenido de texto a 12000 caracteres (paridad con PHP validarMensajes()).
fn validar_mensajes(mensajes: Vec<AiMessage>) -> Result<Vec<AiMessage>, AppError> {
    let validos: Vec<AiMessage> = mensajes
        .into_iter()
        .rev()
        .take(25)
        /* [27-08-2026] El rev().take(25) anterior dejaba el historial EN ORDEN
         * INVERSO: el último mensaje enviado al proveedor era el más antiguo
         * (system), y groq/glory rechazaban con "last message role must be
         * 'user'". Se vuelve a invertir para restaurar el orden cronológico. */
        .rev()
        .filter(|mensaje| {
            /* [29-08-2026] El agente usa role `tool` (resultado de tool con
             * tool_call_id); sin él el modelo no ve el resultado y repite la
             * llamada. Los mensajes de tool van junto a su assistant previo. */
            if !matches!(
                mensaje.role.as_str(),
                "system" | "user" | "assistant" | "tool"
            ) {
                return false;
            }
            match &mensaje.content {
                serde_json::Value::String(texto) => !texto.trim().is_empty(),
                serde_json::Value::Array(items) => !items.is_empty(),
                _ => false,
            }
        })
        .map(|mut mensaje| {
            if let serde_json::Value::String(texto) = &mensaje.content {
                let recortado: String = texto.chars().take(12_000).collect();
                mensaje.content = serde_json::Value::String(recortado);
            }
            mensaje
        })
        .collect();

    if validos.is_empty() {
        return Err(AppError::BadRequest(
            "No hay mensajes válidos para enviar a la IA".into(),
        ));
    }
    Ok(validos)
}

/// Candidatos a probar: el solicitado (si el modelo es válido para el
/// proveedor) primero, luego la cadena de fallback, sin duplicados.
fn resolver_candidatos(provider: &str, modelo: &str) -> Vec<(&'static str, &'static str)> {
    let mut candidatos: Vec<(&'static str, &'static str)> = Vec::new();
    if let Some((proveedor, modelo)) = candidato_valido(provider, modelo) {
        candidatos.push((proveedor, modelo));
    }
    for (proveedor, modelo) in CHAT_FALLBACK_CHAIN {
        if !candidatos
            .iter()
            .any(|(p, m)| *p == *proveedor && *m == *modelo)
        {
            candidatos.push((*proveedor, *modelo));
        }
    }
    candidatos
}

/// Devuelve el candidato solicitado solo si el proveedor y el modelo pasan la
/// allowlist. Si la configuración del front es inválida, se usa la cadena.
fn candidato_valido(provider: &str, modelo: &str) -> Option<(&'static str, &'static str)> {
    let proveedor = provider.trim().to_ascii_lowercase();
    let (id, _, modelos) = PROVIDERS.iter().find(|(id, _, _)| *id == proveedor)?;
    let modelo_trim = modelo.trim();
    if modelo_trim.is_empty() || !modelos.iter().copied().any(|m| m == modelo_trim) {
        return None;
    }
    /* El modelo validado es estático (allowlist), así que se devuelve el
     * &'static str del slice original. */
    let modelo_estatico = modelos.iter().copied().find(|m| *m == modelo_trim)?;
    Some((*id, modelo_estatico))
}

fn mayuscula_primera(texto: &str) -> String {
    let mut chars = texto.chars();
    match chars.next() {
        Some(primera) => primera.to_uppercase().collect::<String>() + chars.as_str(),
        None => String::new(),
    }
}

#[cfg(test)]
mod tests {
    use super::LlmProviderService;
    use crate::config::AiProviderKeys;

    #[test]
    fn circuito_abre_tras_fallos_y_cierra_con_acierto() {
        let servicio = LlmProviderService::new(AiProviderKeys::default());
        // Sin fallos: abierto = false.
        assert!(!servicio.proveedor_abierto("groq"));
        // 2 fallos: aún cerrado (umbral 3).
        servicio.registrar_fallo("groq");
        servicio.registrar_fallo("groq");
        assert!(!servicio.proveedor_abierto("groq"));
        // 3er fallo: abre.
        servicio.registrar_fallo("groq");
        assert!(servicio.proveedor_abierto("groq"));
        // Un acierto cierra y resetea.
        servicio.registrar_acierto("groq");
        assert!(!servicio.proveedor_abierto("groq"));
    }

    #[test]
    fn circuitos_son_independientes_por_proveedor() {
        let servicio = LlmProviderService::new(AiProviderKeys::default());
        for _ in 0..3 {
            servicio.registrar_fallo("cerebras");
        }
        assert!(servicio.proveedor_abierto("cerebras"));
        assert!(!servicio.proveedor_abierto("groq"));
    }
}
