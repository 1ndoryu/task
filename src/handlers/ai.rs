/* [AI] Endpoints proxy LLM para el admin: /api/ai/chat y /api/ai/nutricion.
 * Sustituyen a AIApiController.php (WordPress): solo admin (la key vive en el
 * servidor), rate limit por usuario/hora (80 chat, 60 nutrición) y respuesta
 * directa del modelo (el front ya usa apiFetch, sin envoltorio {success}). */

use axum::extract::State;
use axum::routing::post;
use axum::{Json, Router};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::errors::AppError;
use crate::middleware::admin::require_admin;
use crate::middleware::auth::AuthUser;
use crate::services::ai::{AiChatOptions, AiChatResult, AiMessage, AiNutritionResult};
use crate::services::web_search::{WebSearchRequest, WebSearchResult};
use crate::AppState;

#[derive(Debug, Deserialize, ToSchema)]
#[allow(non_snake_case)] // contrato del front (camelCase)
pub struct AiChatRequest {
    pub provider: Option<String>,
    pub model: Option<String>,
    pub messages: Vec<AiMessage>,
    pub temperature: Option<f32>,
    pub maxTokens: Option<u32>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct AiNutricionRequest {
    pub descripcion: String,
    pub provider: Option<String>,
    pub model: Option<String>,
}

#[derive(Debug, Serialize, ToSchema)]
#[allow(non_snake_case)] // contrato del front (camelCase)
pub struct AiChatResponse {
    pub contenido: String,
    pub tokensPrompt: u32,
    pub tokensComplecion: u32,
    pub finishReason: String,
    pub provider: String,
    pub model: String,
}

#[derive(Debug, Serialize, ToSchema)]
#[allow(non_snake_case)] // contrato del front (camelCase)
pub struct AiNutritionResponse {
    pub calorias: i64,
    pub proteinas: i64,
    pub carbohidratos: i64,
    pub grasas: i64,
    pub azucar: i64,
    pub descripcion: String,
    pub provider: String,
    pub model: String,
}

impl From<AiChatResult> for AiChatResponse {
    fn from(resultado: AiChatResult) -> Self {
        Self {
            contenido: resultado.contenido,
            tokensPrompt: resultado.tokens_prompt,
            tokensComplecion: resultado.tokens_complecion,
            finishReason: resultado.finish_reason,
            provider: resultado.provider,
            model: resultado.modelo,
        }
    }
}

impl From<AiNutritionResult> for AiNutritionResponse {
    fn from(resultado: AiNutritionResult) -> Self {
        Self {
            calorias: resultado.calorias,
            proteinas: resultado.proteinas,
            carbohidratos: resultado.carbohidratos,
            grasas: resultado.grasas,
            azucar: resultado.azucar,
            descripcion: resultado.descripcion,
            provider: resultado.provider,
            model: resultado.modelo,
        }
    }
}

#[utoipa::path(
    post,
    tag = "ai",
    path = "/api/ai/chat",
    request_body = AiChatRequest,
    responses(
        (status = 200, description = "Respuesta del modelo", body = AiChatResponse),
        (status = 403, description = "Requiere admin (la key vive en el servidor)"),
        (status = 429, description = "Rate limit por hora excedido")
    ),
    security(("session_cookie" = []))
)]
pub async fn ai_chat(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(req): Json<AiChatRequest>,
) -> Result<Json<AiChatResponse>, AppError> {
    require_admin(&state, auth.user_id).await?;
    if !state
        .ai_chat_limiter
        .check(&auth.user_id.to_string())
    {
        return Err(AppError::TooManyRequests);
    }
    let resultado = state
        .ai_provider
        .enviar_chat(
            req.messages,
            req.provider.as_deref().unwrap_or("groq"),
            req.model
                .as_deref()
                .unwrap_or("meta-llama/llama-4-scout-17b-16e-instruct"),
            AiChatOptions {
                temperature: req.temperature.unwrap_or(0.7),
                max_tokens: req.maxTokens.unwrap_or(2048).clamp(64, 4096),
            },
        )
        .await?;
    Ok(Json(resultado.into()))
}

#[utoipa::path(
    post,
    tag = "ai",
    path = "/api/ai/nutricion",
    request_body = AiNutricionRequest,
    responses(
        (status = 200, description = "Macros estimados", body = AiNutritionResponse),
        (status = 403, description = "Requiere admin"),
        (status = 429, description = "Rate limit por hora excedido")
    ),
    security(("session_cookie" = []))
)]
pub async fn ai_nutricion(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(req): Json<AiNutricionRequest>,
) -> Result<Json<AiNutritionResponse>, AppError> {
    require_admin(&state, auth.user_id).await?;
    if !state
        .ai_nutrition_limiter
        .check(&auth.user_id.to_string())
    {
        return Err(AppError::TooManyRequests);
    }
    let resultado = state
        .ai_provider
        .estimar_nutricion(
            req.descripcion,
            req.provider.as_deref().unwrap_or("groq"),
            req.model
                .as_deref()
                .unwrap_or("meta-llama/llama-4-scout-17b-16e-instruct"),
        )
        .await?;
    Ok(Json(resultado.into()))
}

#[utoipa::path(
    post,
    tag = "ai",
    path = "/api/ai/tools/web-search",
    request_body = WebSearchRequest,
    responses(
        (status = 200, description = "Resultados de búsqueda", body = WebSearchResult),
        (status = 401, description = "No autorizado"),
        (status = 503, description = "Búsqueda web no configurada (falta clave de proveedor)"),
        (status = 422, description = "Error de validación")
    ),
    security(("session_cookie" = []))
)]
pub async fn ai_web_search(
    State(state): State<AppState>,
    _auth: AuthUser,
    Json(req): Json<WebSearchRequest>,
) -> Result<Json<WebSearchResult>, AppError> {
    if req.query.trim().is_empty() {
        return Err(AppError::BadRequest("Consulta de búsqueda vacía".into()));
    }
    Ok(Json(state.web_search.search(&req).await?))
}

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/ai/chat", post(ai_chat))
        .route("/ai/nutricion", post(ai_nutricion))
        .route("/ai/tools/web-search", post(ai_web_search))
}
