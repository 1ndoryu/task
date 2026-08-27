#![deny(clippy::all)]
#![warn(clippy::pedantic)]
#![allow(clippy::module_name_repetitions)]
#![allow(clippy::missing_errors_doc)]
#![allow(clippy::missing_panics_doc)]

pub mod config;
pub mod errors;
pub mod handlers;
pub mod middleware;
pub mod models;
pub mod repositories;
pub mod services;

use axum::http::HeaderValue;
use sqlx::PgPool;
use std::sync::Arc;
use tokio::sync::Semaphore;

use crate::services::FixedWindowLimiter;
use crate::services::ai::LlmProviderService;
use crate::services::web_search::WebSearchService;

/// Estado compartido de la aplicación — accesible desde handlers y middleware
#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub cookie_secure: bool,
    pub trust_proxy_headers: bool,
    pub cookie_domain: Option<String>,
    /// [H-B05-09] Orígenes CORS permitidos (validación de Origin en WebSocket).
    pub cors_origins: Vec<HeaderValue>,
    pub auth_rate_limiter: Arc<FixedWindowLimiter>,
    pub auth_crypto_semaphore: Arc<Semaphore>,
    /// [AI] Proxy LLM del admin (keys de las envs del proyecto anterior).
    pub ai_provider: LlmProviderService,
    /// [AI] Límites por usuario/hora de los endpoints proxy IA.
    pub ai_chat_limiter: Arc<FixedWindowLimiter>,
    pub ai_nutrition_limiter: Arc<FixedWindowLimiter>,
    /// [AI] Búsqueda web autenticada (Serper/Tavily según env).
    pub web_search: WebSearchService,
}
