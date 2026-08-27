/* [29-08-2026] Tools de dominio del agente (plan-agente-ia-plugin, Fase 1).
 * Cada tool valida por user_id (nunca confía en el front) y reutiliza los
 * servicios existentes (misma validación que los handlers HTTP). En v1 no hay
 * tools de archivo (Fase 2, solo AGENTE_MODO=local) ni execute_code. */

use async_trait::async_trait;
use serde_json::{json, Value};

use crate::agent::tool::{AgentTool, AgentToolContext, AgentToolResult};
use crate::errors::AppError;
use crate::models::productivity::{
    ProductivityWriteResponse, UpsertHabitRequest, UpsertTaskRequest,
};
use crate::models::{CreateNoteRequest, CreateReminderRequest};
use crate::services::{NoteService, ProductivityService, ReminderService};

/// ID legacy para crear: la BD exige `legacy_id > 0`. Se usa el timestamp
/// actual en ms (positivo). El front real genera IDs tipo `Date.now()*1000+n`;
/// aquí es suficiente un timestamp en ms (colisión improbable en uso personal).
fn legacy_id_de(argumentos: &Value) -> i64 {
    argumentos
        .get("legacy_id")
        .and_then(Value::as_i64)
        .unwrap_or_else(|| chrono::Utc::now().timestamp_millis())
}

/// Crea o actualiza una tarea del usuario (upsert por legacy_id).
pub struct ToolTarea;

#[async_trait]
impl AgentTool for ToolTarea {
    fn id(&self) -> &'static str {
        "crear_tarea"
    }
    fn descripcion(&self) -> &'static str {
        "Crea o actualiza una tarea del usuario (texto, prioridad, urgencia, proyecto, parent)."
    }
    fn schema(&self) -> Value {
        json!({
            "type": "object",
            "properties": {
                "texto": {"type": "string", "description": "Texto de la tarea"},
                "legacy_id": {"type": "integer", "description": "ID legacy si se actualiza una existente"},
                "prioridad": {"type": "string"},
                "urgencia": {"type": "string"},
                "proyectoId": {"type": "integer"},
                "parentId": {"type": "integer"},
                "completado": {"type": "boolean"}
            },
            "required": ["texto"]
        })
    }
    async fn ejecutar(
        &self,
        ctx: &AgentToolContext<'_>,
        argumentos: Value,
    ) -> Result<AgentToolResult, AppError> {
        let texto = argumentos
            .get("texto")
            .and_then(Value::as_str)
            .ok_or_else(|| AppError::BadRequest("texto requerido".into()))?
            .to_string();
        let legacy_id = legacy_id_de(&argumentos);
        let request = UpsertTaskRequest {
            texto,
            completado: argumentos.get("completado").and_then(Value::as_bool).unwrap_or(false),
            prioridad: argumentos.get("prioridad").and_then(Value::as_str).map(str::to_string),
            urgencia: argumentos
                .get("urgencia")
                .and_then(Value::as_str)
                .unwrap_or("media")
                .to_string(),
            proyecto_id: argumentos.get("proyectoId").and_then(Value::as_i64),
            parent_id: argumentos.get("parentId").and_then(Value::as_i64),
            orden: 0,
            payload: json!({}),
            expected_updated_at: None,
        };
        let respuesta: ProductivityWriteResponse =
            ProductivityService::upsert_task(ctx.pool, ctx.user_id, legacy_id, request).await?;
        Ok(AgentToolResult::ok(
            format!("Tarea '{}' guardada (id {}).", respuesta.item["texto"], respuesta.id),
            format!("tarea {}", respuesta.id),
        ))
    }
}

/// Crea o actualiza un hábito del usuario.
pub struct ToolHabito;

#[async_trait]
impl AgentTool for ToolHabito {
    fn id(&self) -> &'static str {
        "crear_habito"
    }
    fn descripcion(&self) -> &'static str {
        "Crea o actualiza un hábito del usuario (nombre, importancia, frecuencia)."
    }
    fn schema(&self) -> Value {
        json!({
            "type": "object",
            "properties": {
                "nombre": {"type": "string", "description": "Nombre del hábito"},
                "legacy_id": {"type": "integer"},
                "importancia": {"type": "string"},
                "frecuencia": {"type": "string", "description": "diario, semanal, cadaXDias"},
                "cadaDias": {"type": "integer"}
            },
            "required": ["nombre"]
        })
    }
    async fn ejecutar(
        &self,
        ctx: &AgentToolContext<'_>,
        argumentos: Value,
    ) -> Result<AgentToolResult, AppError> {
        let nombre = argumentos
            .get("nombre")
            .and_then(Value::as_str)
            .ok_or_else(|| AppError::BadRequest("nombre requerido".into()))?
            .to_string();
        let legacy_id = legacy_id_de(&argumentos);
        /* Frecuencia: si viene {tipo, cadaDias} se conserva el objeto completo
         * en el payload (paridad con el fix de frecuencia, ver
         * payload_for_storage de UpsertHabitRequest). */
        let mut payload = json!({});
        if let Some(tipo) = argumentos.get("frecuencia").and_then(Value::as_str) {
            let mut objeto = serde_json::Map::new();
            objeto.insert("tipo".into(), Value::String(tipo.to_string()));
            if let Some(cada_dias) = argumentos.get("cadaDias").and_then(Value::as_i64) {
                objeto.insert("cadaDias".into(), Value::from(cada_dias));
            }
            payload = Value::Object(objeto);
        }
        let request = UpsertHabitRequest {
            nombre,
            importancia: argumentos
                .get("importancia")
                .and_then(Value::as_str)
                .unwrap_or("media")
                .to_string(),
            frecuencia: "diario".to_string(),
            orden: 0,
            payload,
            expected_updated_at: None,
        };
        let respuesta =
            ProductivityService::upsert_habit(ctx.pool, ctx.user_id, legacy_id, request).await?;
        Ok(AgentToolResult::ok(
            format!("Hábito '{}' guardado (id {}).", respuesta.item["nombre"], respuesta.id),
            format!("hábito {}", respuesta.id),
        ))
    }
}

/// Crea un recordatorio con fecha/hora (ISO 8601 en hora local del usuario).
/// Idempotente vía idempotency_key (repetir la confirmación no duplica).
pub struct ToolRecordatorio;

#[async_trait]
impl AgentTool for ToolRecordatorio {
    fn id(&self) -> &'static str {
        "crear_recordatorio"
    }
    fn descripcion(&self) -> &'static str {
        "Crea un recordatorio con fecha/hora. La fecha va en hora LOCAL del usuario (ISO 8601 sin sufijo, ej. 2026-08-30T09:00:00)."
    }
    fn schema(&self) -> Value {
        json!({
            "type": "object",
            "properties": {
                "titulo": {"type": "string"},
                "mensaje": {"type": "string"},
                "programado_para": {"type": "string", "description": "ISO 8601 hora local, ej. 2026-08-30T09:00:00"},
                "idempotency_key": {"type": "string"}
            },
            "required": ["titulo", "programado_para"]
        })
    }
    async fn ejecutar(
        &self,
        ctx: &AgentToolContext<'_>,
        argumentos: Value,
    ) -> Result<AgentToolResult, AppError> {
        let titulo = argumentos
            .get("titulo")
            .and_then(Value::as_str)
            .ok_or_else(|| AppError::BadRequest("titulo requerido".into()))?
            .to_string();
        let fecha_str = argumentos
            .get("programado_para")
            .and_then(Value::as_str)
            .ok_or_else(|| AppError::BadRequest("programado_para requerido".into()))?
            .to_string();
        let programado_para = parse_fecha_local(&fecha_str)?;
        let request = CreateReminderRequest {
            titulo,
            mensaje: argumentos
                .get("mensaje")
                .and_then(Value::as_str)
                .unwrap_or("")
                .to_string(),
            programado_para,
            idempotency_key: argumentos
                .get("idempotency_key")
                .and_then(Value::as_str)
                .map(str::to_string),
        };
        let reminder = ReminderService::create(ctx.pool, ctx.user_id, request).await?;
        Ok(AgentToolResult::ok(
            format!(
                "Recordatorio '{}' programado para {}.",
                reminder.titulo, reminder.programado_para
            ),
            format!("recordatorio {}", reminder.id),
        ))
    }
}

/// Crea una nota del usuario.
pub struct ToolNota;

#[async_trait]
impl AgentTool for ToolNota {
    fn id(&self) -> &'static str {
        "crear_nota"
    }
    fn descripcion(&self) -> &'static str {
        "Crea una nota del usuario (titulo, contenido)."
    }
    fn schema(&self) -> Value {
        json!({
            "type": "object",
            "properties": {
                "titulo": {"type": "string"},
                "contenido": {"type": "string"}
            },
            "required": ["titulo", "contenido"]
        })
    }
    async fn ejecutar(
        &self,
        ctx: &AgentToolContext<'_>,
        argumentos: Value,
    ) -> Result<AgentToolResult, AppError> {
        let titulo = argumentos
            .get("titulo")
            .and_then(Value::as_str)
            .unwrap_or("Sin título")
            .to_string();
        let contenido = argumentos
            .get("contenido")
            .and_then(Value::as_str)
            .unwrap_or("")
            .to_string();
        let nota = NoteService::create(
            ctx.pool,
            ctx.user_id,
            CreateNoteRequest {
                title: titulo,
                content: contenido,
                folder_id: None,
            },
        )
        .await?;
        Ok(AgentToolResult::ok(
            format!("Nota '{}' creada (id {}).", nota.title, nota.id),
            format!("nota {}", nota.id),
        ))
    }
}

/// Búsqueda web con límites (timeout y tamaño los pone WebSearchService).
pub struct ToolWebSearch;

#[async_trait]
impl AgentTool for ToolWebSearch {
    fn id(&self) -> &'static str {
        "web_search"
    }
    fn descripcion(&self) -> &'static str {
        "Busca información actual en internet y devuelve resultados resumidos."
    }
    fn schema(&self) -> Value {
        json!({
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Consulta de búsqueda"}
            },
            "required": ["query"]
        })
    }
    async fn ejecutar(
        &self,
        ctx: &AgentToolContext<'_>,
        argumentos: Value,
    ) -> Result<AgentToolResult, AppError> {
        let query = argumentos
            .get("query")
            .and_then(Value::as_str)
            .ok_or_else(|| AppError::BadRequest("query requerido".into()))?
            .to_string();
        let resultado = ctx
            .web_search
            .search(&crate::services::web_search::WebSearchRequest {
                query,
                limit: 5,
            })
            .await?;
        let resumen = format!(
            "{} resultados para '{}'",
            resultado.results.len(),
            resultado.query
        );
        let contenido = if resultado.results.is_empty() {
            "Sin resultados.".to_string()
        } else {
            resultado
                .results
                .iter()
                .take(5)
                .map(|r| format!("- {}: {}", r.title, r.url))
                .collect::<Vec<_>>()
                .join("\n")
        };
        Ok(AgentToolResult::ok(contenido, resumen))
    }
}

/// Fecha ISO local (sin sufijo de zona) → UTC. El contrato del front es hora
/// local sin sufijo; el backend persiste UTC y el front muestra en hora local.
fn parse_fecha_local(fecha: &str) -> Result<chrono::DateTime<chrono::Utc>, AppError> {
    let fecha = fecha.trim();
    let naive = chrono::NaiveDateTime::parse_from_str(fecha, "%Y-%m-%dT%H:%M:%S")
        .or_else(|_| {
            chrono::NaiveDate::parse_from_str(fecha, "%Y-%m-%d")
                .map(|d| d.and_hms_opt(9, 0, 0).expect("hora fija"))
        })
        .map_err(|_| {
            AppError::BadRequest(format!(
                "Fecha inválida: {fecha} (use ISO 8601 local, ej. 2026-08-30T09:00:00)"
            ))
        })?;
    /* UTC-5 fijo (zona del usuario real): una hora local 09:00 (sin sufijo)
     * significa 09:00 en la zona del usuario, que en UTC es 14:00. Cuando el
     * front envíe offset explícito se respeta; hoy el contrato es hora local
     * sin sufijo, así que se suma el desplazamiento para obtener UTC. */
    Ok(chrono::TimeZone::from_utc_datetime(&chrono::Utc, &naive) + chrono::Duration::hours(5))
}

/// Registro de las tools de dominio en el registry.
pub fn registrar_tools(registry: &mut crate::agent::tool::AgentToolRegistry) {
    registry.registrar(Box::new(ToolTarea));
    registry.registrar(Box::new(ToolHabito));
    registry.registrar(Box::new(ToolRecordatorio));
    registry.registrar(Box::new(ToolNota));
    registry.registrar(Box::new(ToolWebSearch));
}

#[cfg(test)]
mod tests {
    use super::parse_fecha_local;

    #[test]
    fn parsea_fecha_iso_local() {
        let utc = parse_fecha_local("2026-08-30T09:00:00").expect("fecha válida");
        // 09:00 local (UTC-5) → 14:00 UTC.
        assert_eq!(utc.to_rfc3339(), "2026-08-30T14:00:00+00:00");
    }

    #[test]
    fn parsea_solo_fecha_a_las_9() {
        let utc = parse_fecha_local("2026-08-30").expect("fecha válida");
        assert_eq!(utc.to_rfc3339(), "2026-08-30T14:00:00+00:00");
    }

    #[test]
    fn rechaza_fecha_invalida() {
        assert!(parse_fecha_local("no-es-fecha").is_err());
    }
}
