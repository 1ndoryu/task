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
#[derive(Debug, Clone, Deserialize, Serialize, utoipa::ToSchema)]
pub struct AiMessage {
    pub role: String,
    pub content: serde_json::Value,
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

/// Servicio LLM con las keys del entorno. `Clone` es barato (reqwest::Client
/// comparte el pool internamente), así que vive directo en `AppState`.
#[derive(Debug, Clone)]
pub struct LlmProviderService {
    keys: AiProviderKeys,
    client: reqwest::Client,
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
        Self { keys, client }
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
            let keys = self.keys_para(proveedor);
            if keys.is_empty() {
                errores.push(format!(
                    "No hay API key configurada para {proveedor} en el entorno"
                ));
                continue;
            }
            for key in keys {
                match self
                    .ejecutar_request(proveedor, key, modelo, &mensajes_validos, &opciones)
                    .await
                {
                    Ok(resultado) => return Ok(resultado),
                    Err(error) => {
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
            AiMessage {
                role: "system".into(),
                content: serde_json::Value::String(PROMPT_NUTRICION.to_string()),
            },
            AiMessage {
                role: "user".into(),
                content: serde_json::Value::String(descripcion.clone()),
            },
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

    fn keys_para(&self, proveedor: &str) -> &[String] {
        match proveedor {
            "cerebras" => &self.keys.cerebras,
            "groq" => &self.keys.groq,
            "deepseek" => &self.keys.deepseek,
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

        let respuesta = self
            .client
            .post(url)
            .bearer_auth(api_key)
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
        .filter(|mensaje| {
            if !matches!(mensaje.role.as_str(), "system" | "user" | "assistant") {
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
