use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::errors::AppError;

/// Resultado de búsqueda web normalizado (independiente del proveedor).
#[derive(Debug, Clone, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct WebSearchResultItem {
    pub title: String,
    pub url: String,
    pub summary: String,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct WebSearchResult {
    pub provider: String,
    pub query: String,
    pub results: Vec<WebSearchResultItem>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct WebSearchRequest {
    pub query: String,
    #[serde(default = "default_limit")]
    pub limit: u32,
}

fn default_limit() -> u32 {
    5
}

/// Servicio de búsqueda web autenticado. El proveedor se configura por env:
/// `SERPER_API_KEY` (Serper, API Google Search) o `TAVILY_API_KEY` (Tavily).
/// Si no hay clave configurada, devuelve un error observable y claro — nunca
/// un falso éxito (regla del plan IA: no simular capacidades ausentes).
#[derive(Debug, Clone)]
pub struct WebSearchService {
    serper_key: Option<String>,
    tavily_key: Option<String>,
    client: reqwest::Client,
}

impl WebSearchService {
    #[must_use]
    pub fn from_env() -> Self {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(15))
            .build()
            .expect("reqwest client builder is infallible");
        Self {
            serper_key: env_var("SERPER_API_KEY"),
            tavily_key: env_var("TAVILY_API_KEY"),
            client,
        }
    }

    pub async fn search(&self, req: &WebSearchRequest) -> Result<WebSearchResult, AppError> {
        let query = req.query.trim().to_string();
        if query.is_empty() {
            return Err(AppError::BadRequest("Consulta de búsqueda vacía".into()));
        }
        let limit = req.limit.clamp(1, 10);

        if let Some(key) = &self.serper_key {
            return self.serper(&query, limit, key).await;
        }
        if let Some(key) = &self.tavily_key {
            return self.tavily(&query, limit, key).await;
        }
        Err(AppError::NotConfigured(
            "Búsqueda web no configurada: falta SERPER_API_KEY o TAVILY_API_KEY en el servidor".into(),
        ))
    }

    async fn serper(
        &self,
        query: &str,
        limit: u32,
        key: &str,
    ) -> Result<WebSearchResult, AppError> {
        let respuesta = self
            .client
            .post("https://google.serper.dev/search")
            .header("X-API-KEY", key)
            .json(&serde_json::json!({ "q": query, "num": limit }))
            .send()
            .await
            .map_err(|error| AppError::Upstream(format!("Error de red con Serper: {error}")))?;

        let status = respuesta.status();
        let datos: serde_json::Value = respuesta.json().await.map_err(|error| {
            AppError::Upstream(format!("Respuesta no JSON de Serper: {error}"))
        })?;
        if !status.is_success() {
            return Err(AppError::Upstream(format!(
                "Serper {status}: {}",
                datos
                    .get("message")
                    .and_then(serde_json::Value::as_str)
                    .unwrap_or("error del proveedor de búsqueda")
            )));
        }

        let items = datos
            .get("organic")
            .and_then(serde_json::Value::as_array)
            .map(|rows| {
                rows.iter()
                    .filter_map(|row| {
                        let title = row.get("title")?.as_str()?.trim().to_string();
                        let url = row.get("link")?.as_str()?.trim().to_string();
                        if title.is_empty() || url.is_empty() {
                            return None;
                        }
                        let summary = row
                            .get("snippet")
                            .and_then(serde_json::Value::as_str)
                            .unwrap_or("")
                            .trim()
                            .to_string();
                        Some(WebSearchResultItem {
                            title,
                            url,
                            summary,
                        })
                    })
                    .take(limit as usize)
                    .collect()
            })
            .unwrap_or_default();

        Ok(WebSearchResult {
            provider: "serper".into(),
            query: query.to_string(),
            results: items,
        })
    }

    async fn tavily(
        &self,
        query: &str,
        limit: u32,
        key: &str,
    ) -> Result<WebSearchResult, AppError> {
        let respuesta = self
            .client
            .post("https://api.tavily.com/search")
            .json(&serde_json::json!({
                "api_key": key,
                "query": query,
                "max_results": limit,
            }))
            .send()
            .await
            .map_err(|error| AppError::Upstream(format!("Error de red con Tavily: {error}")))?;

        let status = respuesta.status();
        let datos: serde_json::Value = respuesta.json().await.map_err(|error| {
            AppError::Upstream(format!("Respuesta no JSON de Tavily: {error}"))
        })?;
        if !status.is_success() {
            return Err(AppError::Upstream(format!(
                "Tavily {status}: {}",
                datos
                    .get("message")
                    .and_then(serde_json::Value::as_str)
                    .unwrap_or("error del proveedor de búsqueda")
            )));
        }

        let items = datos
            .get("results")
            .and_then(serde_json::Value::as_array)
            .map(|rows| {
                rows.iter()
                    .filter_map(|row| {
                        let title = row.get("title")?.as_str()?.trim().to_string();
                        let url = row.get("url")?.as_str()?.trim().to_string();
                        if title.is_empty() || url.is_empty() {
                            return None;
                        }
                        let summary = row
                            .get("content")
                            .and_then(serde_json::Value::as_str)
                            .unwrap_or("")
                            .trim()
                            .to_string();
                        Some(WebSearchResultItem {
                            title,
                            url,
                            summary,
                        })
                    })
                    .take(limit as usize)
                    .collect()
            })
            .unwrap_or_default();

        Ok(WebSearchResult {
            provider: "tavily".into(),
            query: query.to_string(),
            results: items,
        })
    }
}

fn env_var(name: &str) -> Option<String> {
    std::env::var(name)
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}
