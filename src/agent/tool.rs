/* [29-08-2026] Framework de tools del agente (plan-agente-ia-plugin, Fase 0).
 * OCP: las tools se registran en `AgentToolRegistry`; el runtime solo conoce el
 * trait. El LLM solo ve el JSON Schema; el runtime solo ve `ejecutar`. */

use async_trait::async_trait;
use serde_json::Value;
use sqlx::PgPool;
use std::collections::HashMap;
use uuid::Uuid;

use crate::errors::AppError;
use crate::services::ai::LlmProviderService;
use crate::services::web_search::WebSearchService;

/// Contexto que recibe cada tool al ejecutarse. Solo lo que una tool de
/// dominio necesita; el runtime no pasa estado interno.
pub struct AgentToolContext<'a> {
    pub user_id: Uuid,
    pub pool: &'a PgPool,
    pub web_search: &'a WebSearchService,
    pub ai_provider: &'a LlmProviderService,
}

/// Resultado de ejecutar una tool: texto legible para el LLM + estado.
#[derive(Debug, Clone)]
pub struct AgentToolResult {
    pub ok: bool,
    pub contenido: String,
    /// Resumen corto para auditoría (sin secretos, sin contenido largo).
    pub resumen: String,
}

impl AgentToolResult {
    #[must_use]
    pub fn ok(contenido: impl Into<String>, resumen: impl Into<String>) -> Self {
        Self {
            ok: true,
            contenido: contenido.into(),
            resumen: resumen.into(),
        }
    }

    #[must_use]
    pub fn error(contenido: impl Into<String>) -> Self {
        Self {
            ok: false,
            contenido: contenido.into(),
            resumen: "error".to_string(),
        }
    }
}

/// Contrato de una tool del agente. `schema` es JSON Schema (objeto con
/// `properties`/`required`); el runtime valida los argumentos contra él antes
/// de ejecutar.
#[async_trait]
pub trait AgentTool: Send + Sync {
    fn id(&self) -> &'static str;
    fn descripcion(&self) -> &'static str;
    fn schema(&self) -> Value;
    /// ¿Tiene efectos (escribe/borra)? Las tools con efecto en modo
    /// predeterminado requieren aprobación (diferenciado por la política de
    /// modos, sección 9.2). Por defecto false: la mayoría de las tools de
    /// dominio del v1 son de datos propios y se auditan, no se bloquean.
    fn efecto(&self) -> bool {
        false
    }
    async fn ejecutar(
        &self,
        ctx: &AgentToolContext<'_>,
        argumentos: Value,
    ) -> Result<AgentToolResult, AppError>;
}

/// Registro de tools: registrar_tool() en el arranque; listar_schemas() para el
/// request al LLM; ejecutar() con validación de schema.
pub struct AgentToolRegistry {
    tools: HashMap<&'static str, Box<dyn AgentTool>>,
}

impl Default for AgentToolRegistry {
    fn default() -> Self {
        Self::new()
    }
}

impl AgentToolRegistry {
    #[must_use]
    pub fn new() -> Self {
        Self {
            tools: HashMap::new(),
        }
    }

    pub fn registrar(&mut self, tool: Box<dyn AgentTool>) {
        self.tools.insert(tool.id(), tool);
    }

    #[must_use]
    pub fn ids(&self) -> Vec<&'static str> {
        let mut ids: Vec<&'static str> = self.tools.keys().copied().collect();
        ids.sort_unstable();
        ids
    }

    /// Schemas en formato OpenAI `tools` para el request al LLM.
    #[must_use]
    pub fn schemas_openai(&self, solo_ids: Option<&[&str]>) -> Vec<Value> {
        let mut schemas: Vec<Value> = self
            .tools
            .iter()
            .filter(|(id, _)| {
                solo_ids
                    .map(|ids| ids.contains(id))
                    .unwrap_or(true)
            })
            .map(|(id, tool)| {
                serde_json::json!({
                    "type": "function",
                    "function": {
                        "name": id,
                        "description": tool.descripcion(),
                        "parameters": tool.schema(),
                    }
                })
            })
            .collect();
        schemas.sort_by(|a, b| {
            a["function"]["name"]
                .as_str()
                .unwrap_or("")
                .cmp(b["function"]["name"].as_str().unwrap_or(""))
        });
        schemas
    }

    /// ¿La tool tiene efectos (escribe/borra)? Para la política de modos.
    #[must_use]
    pub fn tiene_efecto(&self, tool_id: &str) -> bool {
        self.tools
            .get(tool_id)
            .map(|tool| tool.efecto())
            .unwrap_or(false)
    }

    pub async fn ejecutar(
        &self,
        tool_id: &str,
        ctx: &AgentToolContext<'_>,
        argumentos: Value,
    ) -> Result<AgentToolResult, AppError> {
        let tool = self
            .tools
            .get(tool_id)
            .ok_or_else(|| AppError::BadRequest(format!("Tool desconocida: {tool_id}")))?;
        validar_contra_schema(tool.schema(), &argumentos)?;
        tool.ejecutar(ctx, argumentos).await
    }
}

/// Validación mínima de JSON Schema (object + properties + required). Suficiente
/// para el contrato declarativo de v1; se puede ampliar sin romper el trait.
fn validar_contra_schema(schema: Value, argumentos: &Value) -> Result<(), AppError> {
    if !argumentos.is_object() {
        return Err(AppError::BadRequest(
            "Los argumentos de la tool deben ser un objeto JSON".into(),
        ));
    }
    if let Some(requeridos) = schema.get("required").and_then(Value::as_array) {
        for requerido in requeridos {
            if let Some(nombre) = requerido.as_str() {
                if argumentos.get(nombre).is_none() {
                    return Err(AppError::BadRequest(format!(
                        "Falta el argumento requerido: {nombre}"
                    )));
                }
            }
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    struct ToolEcho;

    #[async_trait]
    impl AgentTool for ToolEcho {
        fn id(&self) -> &'static str {
            "echo"
        }
        fn descripcion(&self) -> &'static str {
            "Devuelve el texto recibido"
        }
        fn schema(&self) -> Value {
            json!({
                "type": "object",
                "properties": {"texto": {"type": "string"}},
                "required": ["texto"]
            })
        }
        async fn ejecutar(
            &self,
            _ctx: &AgentToolContext<'_>,
            argumentos: Value,
        ) -> Result<AgentToolResult, AppError> {
            let texto = argumentos["texto"].as_str().unwrap_or("").to_string();
            Ok(AgentToolResult::ok(texto.clone(), "echo"))
        }
    }

    #[tokio::test]
    async fn registra_y_lista_schemas() {
        let mut registry = AgentToolRegistry::new();
        registry.registrar(Box::new(ToolEcho));
        assert_eq!(registry.ids(), vec!["echo"]);
        let schemas = registry.schemas_openai(None);
        assert_eq!(schemas.len(), 1);
        assert_eq!(schemas[0]["function"]["name"], "echo");
    }

    #[test]
    fn valida_argumentos_requeridos() {
        let schema = json!({
            "type": "object",
            "properties": {"texto": {"type": "string"}},
            "required": ["texto"]
        });
        let err = validar_contra_schema(schema.clone(), &json!({})).unwrap_err();
        assert!(err.to_string().contains("argumento requerido"));
        // Con el argumento presente, pasa.
        assert!(validar_contra_schema(schema, &json!({ "texto": "hola" })).is_ok());
        // No-objeto rechazado.
        assert!(validar_contra_schema(json!({}), &json!([1, 2])).is_err());
    }
}
