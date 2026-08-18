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

use sqlx::PgPool;
use std::sync::Arc;
use tokio::sync::Semaphore;

use crate::services::FixedWindowLimiter;

/// Estado compartido de la aplicación — accesible desde handlers y middleware
#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub cookie_secure: bool,
    pub trust_proxy_headers: bool,
    pub cookie_domain: Option<String>,
    pub auth_rate_limiter: Arc<FixedWindowLimiter>,
    pub auth_crypto_semaphore: Arc<Semaphore>,
}
