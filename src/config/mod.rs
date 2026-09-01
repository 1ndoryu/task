use axum::http::HeaderValue;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ConfigError {
    #[error("Variable de entorno requerida no encontrada: {0}")]
    MissingEnvVar(String),
    #[error("Puerto inválido: {0}")]
    InvalidPort(#[from] std::num::ParseIntError),
    #[error("Origen CORS inválido: {0}")]
    InvalidCorsOrigin(String),
    #[error("COOKIE_SECURE inválido: {0}")]
    InvalidCookieSecure(String),
    #[error("COOKIE_SECURE=false no está permitido fuera de loopback: {0}")]
    InsecureCookieConfiguration(String),
    #[error("{0} debe ser un número de segundos positivo")]
    InvalidSeconds(String),
    #[error("Cantidad de conexiones inválida: {0}")]
    InvalidConnectionCount(String),
    #[error("Valor de configuración inválido: {0}")]
    InvalidConfigValue(String),
    #[error("DB_MIN_CONNECTIONS no puede superar DB_MAX_CONNECTIONS")]
    InvalidPoolBounds,
}

/// Claves API de los proveedores LLM, leídas con los MISMOS nombres de entorno
/// que usaba el proyecto anterior (WordPress/Coolify): CEREBRAS_API_KEY,
/// GROQ_API/GROQ_API_1..3 y DEEPSEEK_API/DEEPSEEK-API/DEEPSEEK_API_KEY.
/// Varias claves por proveedor = rotación (se prueban en orden hasta que una
/// responde), igual que en el LLMProviderService.php original.
#[derive(Debug, Clone, Default)]
pub struct AiProviderKeys {
    pub cerebras: Vec<String>,
    pub groq: Vec<String>,
    pub deepseek: Vec<String>,
    pub glory: Vec<String>,
    /// [02-09-2026] Command Code Provider API directa (api.commandcode.ai).
    /// Env: COMMAND_CODE_API_KEY (la misma key del Studio/CLI).
    pub commandcode: Vec<String>,
}

impl AiProviderKeys {
    pub fn from_env() -> Self {
        fn env_list(names: &[&str]) -> Vec<String> {
            names
                .iter()
                .filter_map(|name| std::env::var(name).ok())
                .map(|value| value.trim().to_string())
                .filter(|value| !value.is_empty())
                .collect()
        }
        Self {
            cerebras: env_list(&["CEREBRAS_API_KEY"]),
            groq: env_list(&["GROQ_API", "GROQ_API_1", "GROQ_API_2", "GROQ_API_3"]),
            deepseek: env_list(&["DEEPSEEK_API", "DEEPSEEK-API", "DEEPSEEK_API_KEY"]),
            glory: env_list(&["GLORY_API_KEY", "GLORY_API", "EMPERO_API_KEY"]),
            commandcode: env_list(&["COMMAND_CODE_API_KEY"]),
        }
    }
}

/// Configuración de la aplicación cargada desde variables de entorno
#[derive(Debug, Clone)]
pub struct AppConfig {
    pub database_url: String,
    pub host: String,
    pub port: u16,
    pub db_max_connections: u32,
    pub db_min_connections: u32,
    pub db_acquire_timeout_seconds: u64,
    pub db_idle_timeout_seconds: u64,
    pub db_max_lifetime_seconds: u64,
    pub request_timeout_seconds: u64,
    pub auth_rate_limit_per_minute: u32,
    pub auth_crypto_semaphore_permits: usize,
    pub max_body_bytes: usize,
    pub cors_origins: Vec<HeaderValue>,
    pub cookie_secure: bool,
    pub trust_proxy_headers: bool,
    pub cookie_domain: Option<String>,
    pub frontend_dist: Option<String>,
    /// Claves LLM de los proveedores IA (envs del proyecto anterior).
    pub ai_provider_keys: AiProviderKeys,
    /// Límites por usuario/hora de los endpoints proxy IA (contrato PHP: 80 chat, 60 nutrición).
    pub ai_chat_rate_limit_per_hour: u32,
    pub ai_nutrition_rate_limit_per_hour: u32,
}

impl AppConfig {
    /// Carga la configuración desde variables de entorno.
    /// Requiere `DATABASE_URL`. El resto de opciones tienen valores locales seguros.
    pub fn from_env() -> Result<Self, ConfigError> {
        let host = std::env::var("HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
        let cookie_secure =
            resolve_cookie_secure(&host, std::env::var("COOKIE_SECURE").ok().as_deref())?;

        let config = Self {
            database_url: std::env::var("DATABASE_URL")
                .map_err(|_| ConfigError::MissingEnvVar("DATABASE_URL".into()))?,
            host,
            port: std::env::var("PORT")
                .unwrap_or_else(|_| "3000".to_string())
                .parse()?,
            db_max_connections: std::env::var("DB_MAX_CONNECTIONS")
                .unwrap_or_else(|_| "10".to_string())
                .parse()
                .map_err(|_| {
                    ConfigError::InvalidConnectionCount("DB_MAX_CONNECTIONS".into())
                })?,
            db_min_connections: std::env::var("DB_MIN_CONNECTIONS")
                .unwrap_or_else(|_| "2".to_string())
                .parse()
                .map_err(|_| {
                    ConfigError::InvalidConnectionCount("DB_MIN_CONNECTIONS".into())
                })?,
            db_acquire_timeout_seconds: env_seconds("DB_ACQUIRE_TIMEOUT_SECONDS", 5)?,
            db_idle_timeout_seconds: env_seconds("DB_IDLE_TIMEOUT_SECONDS", 600)?,
            db_max_lifetime_seconds: env_seconds("DB_MAX_LIFETIME_SECONDS", 1800)?,
            /* [AI] 60s de margen: los proxies LLM (chat/nutrición) pueden tardar
             * más que el resto de rutas; antes 30s cortaba llamadas legítimas. */
            request_timeout_seconds: env_seconds("REQUEST_TIMEOUT_SECONDS", 60)?,
            /* [H-B05-08] Límites operativos configurables (antes hardcodeados en
             * handlers/mod.rs): auth 10 req/min, semáforo crypto 4, body 6 MB. */
            auth_rate_limit_per_minute: env_positive("AUTH_RATE_LIMIT_PER_MINUTE", 10)?
                .try_into()
                .map_err(|_| ConfigError::InvalidConfigValue("AUTH_RATE_LIMIT_PER_MINUTE".into()))?,
            auth_crypto_semaphore_permits: env_positive("AUTH_CRYPTO_SEMAPHORE_PERMITS", 4)?
                .try_into()
                .map_err(|_| {
                    ConfigError::InvalidConfigValue("AUTH_CRYPTO_SEMAPHORE_PERMITS".into())
                })?,
            max_body_bytes: env_positive("MAX_BODY_BYTES", 6 * 1024 * 1024)?
                .try_into()
                .map_err(|_| ConfigError::InvalidConfigValue("MAX_BODY_BYTES".into()))?,
            cors_origins: std::env::var("CORS_ORIGINS")
                .unwrap_or_else(|_| "http://localhost:5173,http://127.0.0.1:5173".to_string())
                .split(',')
                .map(str::trim)
                .filter(|origin| !origin.is_empty())
                .map(|origin| {
                    origin
                        .parse::<HeaderValue>()
                        .map_err(|_| ConfigError::InvalidCorsOrigin(origin.to_owned()))
                })
                .collect::<Result<Vec<_>, _>>()?,
            cookie_secure,
            trust_proxy_headers: std::env::var("TRUST_PROXY_HEADERS")
                .is_ok_and(|value| value.eq_ignore_ascii_case("true")),
            cookie_domain: std::env::var("COOKIE_DOMAIN")
                .ok()
                .filter(|domain| !domain.trim().is_empty()),
            frontend_dist: std::env::var("FRONTEND_DIST")
                .ok()
                .filter(|path| !path.trim().is_empty()),
            ai_provider_keys: AiProviderKeys::from_env(),
            ai_chat_rate_limit_per_hour: env_positive("AI_CHAT_RATE_LIMIT_PER_HOUR", 80)?
                .try_into()
                .map_err(|_| ConfigError::InvalidConfigValue("AI_CHAT_RATE_LIMIT_PER_HOUR".into()))?,
            ai_nutrition_rate_limit_per_hour: env_positive("AI_NUTRITION_RATE_LIMIT_PER_HOUR", 60)?
                .try_into()
                .map_err(|_| {
                    ConfigError::InvalidConfigValue("AI_NUTRITION_RATE_LIMIT_PER_HOUR".into())
                })?,
        };
        if config.db_min_connections > config.db_max_connections {
            return Err(ConfigError::InvalidPoolBounds);
        }
        Ok(config)
    }
}

/// Parsea una variable de entorno numérica positiva (default si falta).
fn env_positive(name: &str, default: u64) -> Result<u64, ConfigError> {
    let value = std::env::var(name)
        .unwrap_or_else(|_| default.to_string())
        .parse::<u64>()
        .map_err(|_| ConfigError::InvalidConfigValue(name.to_owned()))?;
    if value == 0 {
        return Err(ConfigError::InvalidConfigValue(name.to_owned()));
    }
    Ok(value)
}

fn env_seconds(name: &str, default: u64) -> Result<u64, ConfigError> {
    let value = std::env::var(name)
        .unwrap_or_else(|_| default.to_string())
        .parse()
        .map_err(|_| ConfigError::InvalidSeconds(name.to_owned()))?;
    if value == 0 {
        return Err(ConfigError::InvalidSeconds(name.to_owned()));
    }
    Ok(value)
}

fn resolve_cookie_secure(host: &str, configured: Option<&str>) -> Result<bool, ConfigError> {
    let is_loopback = matches!(host, "127.0.0.1" | "localhost" | "::1");
    match configured {
        Some(value) if value.eq_ignore_ascii_case("true") => Ok(true),
        Some(value) if value.eq_ignore_ascii_case("false") && is_loopback => Ok(false),
        Some(value) if value.eq_ignore_ascii_case("false") => {
            Err(ConfigError::InsecureCookieConfiguration(host.to_owned()))
        }
        Some(value) => Err(ConfigError::InvalidCookieSecure(value.to_owned())),
        None => Ok(!is_loopback),
    }
}

#[cfg(test)]
mod tests {
    use super::{env_seconds, resolve_cookie_secure, ConfigError};

    #[test]
    fn secure_cookie_defaults_to_true_outside_loopback() {
        assert!(resolve_cookie_secure("0.0.0.0", None).unwrap());
        assert!(!resolve_cookie_secure("127.0.0.1", None).unwrap());
        assert!(matches!(
            resolve_cookie_secure("0.0.0.0", Some("false")),
            Err(ConfigError::InsecureCookieConfiguration(_))
        ));
        assert!(matches!(
            resolve_cookie_secure("0.0.0.0", Some("maybe")),
            Err(ConfigError::InvalidCookieSecure(_))
        ));
    }

    #[test]
    fn default_operational_timeouts_are_positive() {
        assert!(env_seconds("MISSING_TIMEOUT_FOR_TEST", 5).unwrap() > 0);
        assert!(matches!(
            env_seconds("MISSING_TIMEOUT_FOR_TEST", 0),
            Err(ConfigError::InvalidSeconds(_))
        ));
    }
}
