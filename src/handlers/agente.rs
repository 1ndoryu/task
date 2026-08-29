/* [29-08-2026] Endpoint SSE del agente (plan-agente-ia-plugin, Fase 0/1).
 * POST /api/agente/stream con require_auth (no admin: el coste del LLM lo
 * absorbe el servidor para cualquier usuario autenticado, con rate limit y
 * techo del proveedor). Respuesta text/event-stream con eventos tipados:
 * token, tool_start, tool_result, usage, error, done.
 *
 * Cancelación server-side: si el cliente corta, el mpsc receiver se cae y el
 * runtime aborta el loop (no sigue ejecutando tools ni consumiendo tokens). */

use axum::extract::{Path, State};
use axum::response::sse::{Event, KeepAlive, Sse};
use axum::response::IntoResponse;
use axum::routing::{delete, post};
use axum::{Json, Router};
use futures_util::stream::Stream;
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use std::convert::Infallible;
use tokio::sync::mpsc;
use tokio_stream::wrappers::ReceiverStream;
use uuid::Uuid;

use crate::agent::runtime::{
    cargar_historial, cargar_memoria_agente, cargar_skills_agente, guardar_mensaje_usuario,
    persistir_turno, AgenteEvento, AgentRuntime, TurnoConfig,
};
use crate::errors::AppError;
use crate::middleware::auth::AuthUser;
use crate::AppState;

#[derive(Debug, Deserialize)]
#[allow(non_snake_case)] // contrato del front (camelCase)
pub struct AgenteStreamRequest {
    pub conversacionId: Uuid,
    pub mensaje: String,
    /// [01-09-2026] Fase 4: clave de idempotencia del cliente; un reintento
    /// con la misma clave no duplica el mensaje en BD.
    pub clave_idempotencia: Option<Uuid>,
    pub provider: Option<String>,
    pub modelo: Option<String>,
    pub temperatura: Option<f32>,
    pub max_tokens: Option<u32>,
    pub idioma: Option<String>,
    pub incluir_notas: Option<bool>,
    pub incluir_tareas_completadas: Option<bool>,
    pub incluir_habitos_pausados: Option<bool>,
    pub permitir_busqueda_web: Option<bool>,
    pub permitir_recordatorios: Option<bool>,
    pub prompt_sistema: Option<String>,
    pub max_turns: Option<usize>,
    pub timeout_tool_secs: Option<u64>,
    pub incluir_memoria: Option<bool>,
    pub incluir_skills: Option<bool>,
}

/// Límite por usuario/hora de turnos de agente (reutiliza el patrón del chat).
pub const MAX_TURNOS_HORA: u32 = 30;

#[utoipa::path(
    post,
    tag = "agente",
    path = "/api/agente/stream",
    request_body = AgenteStreamRequest,
    responses(
        (status = 200, description = "Stream SSE de eventos del agente"),
        (status = 401, description = "No autorizado"),
        (status = 429, description = "Rate limit por hora excedido")
    ),
    security(("session_cookie" = []))
)]
pub async fn agente_stream(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(req): Json<AgenteStreamRequest>,
) -> Result<impl IntoResponse, AppError> {
    if req.mensaje.trim().is_empty() {
        return Err(AppError::BadRequest("El mensaje no puede estar vacío".into()));
    }
    if req.mensaje.chars().count() > 4000 {
        return Err(AppError::BadRequest("El mensaje no puede exceder 4000 caracteres".into()));
    }
    if !state.agente_limiter.check(&auth.user_id.to_string()) {
        return Err(AppError::TooManyRequests);
    }

    /* Verificar propiedad de la conversación (nunca confiar en el front) y
     * leer su modo de operación (sección 9.2). */
    let conversacion: Option<(Uuid, String, serde_json::Value)> = sqlx::query_as(
        "SELECT id, modo, config FROM agente_conversaciones WHERE id = $1 AND user_id = $2",
    )
    .bind(req.conversacionId)
    .bind(auth.user_id)
    .fetch_optional(&state.pool)
    .await?;
    let Some((_, modo, config_guardada)) = conversacion else {
        return Err(AppError::NotFound("Conversación no encontrada".into()));
    };

    let turno_id = Uuid::new_v4();
    let (tx, rx) = mpsc::channel::<AgenteEvento>(128);
    /* Glory/commandcode es política del servidor. Los parámetros avanzados se
     * toman de la conversación; el request solo conserva compatibilidad con
     * clientes antiguos y no puede cambiar proveedor/modelo. */
    let defaults = TurnoConfig::default();
    let config = config_guardada;
    let runtime = AgentRuntime::nuevo(TurnoConfig {
        provider: "glory".into(),
        modelo: "commandcode".into(),
        temperatura: config.get("temperatura").and_then(serde_json::Value::as_f64).unwrap_or(defaults.temperatura as f64).clamp(0.0, 2.0) as f32,
        max_tokens: config.get("max_tokens").and_then(serde_json::Value::as_u64).unwrap_or(defaults.max_tokens as u64).clamp(64, 4096) as u32,
        idioma: validar_idioma(config.get("idioma").and_then(serde_json::Value::as_str).map(str::to_owned))?,
        incluir_notas: config.get("incluir_notas").and_then(serde_json::Value::as_bool).unwrap_or(false),
        incluir_tareas_completadas: config.get("incluir_tareas_completadas").and_then(serde_json::Value::as_bool).unwrap_or(false),
        incluir_habitos_pausados: config.get("incluir_habitos_pausados").and_then(serde_json::Value::as_bool).unwrap_or(false),
        permitir_busqueda_web: config.get("permitir_busqueda_web").and_then(serde_json::Value::as_bool).unwrap_or(true),
        permitir_recordatorios: config.get("permitir_recordatorios").and_then(serde_json::Value::as_bool).unwrap_or(true),
        prompt_sistema: validar_prompt_sistema(config.get("prompt_sistema").and_then(serde_json::Value::as_str).map(str::to_owned))?,
        incluir_memoria: config.get("incluir_memoria").and_then(serde_json::Value::as_bool).unwrap_or(true),
        incluir_skills: config.get("incluir_skills").and_then(serde_json::Value::as_bool).unwrap_or(true),
        max_turns: config.get("max_turns").and_then(serde_json::Value::as_u64).unwrap_or(defaults.max_turns as u64).clamp(1, 10) as usize,
        timeout_tool: std::time::Duration::from_secs(config.get("timeout_tool_secs").and_then(serde_json::Value::as_u64).unwrap_or(defaults.timeout_tool.as_secs()).clamp(1, 15)),
        modo,
        ..defaults
    });

    /* Persistir el turno como ejecutando y el mensaje del usuario ANTES de
     * arrancar (recuperación de fallos). */
    persistir_turno(
        &state,
        turno_id,
        auth.user_id,
        "ejecutando",
        &req.mensaje,
        &runtime.turno_config.provider,
        &runtime.turno_config.modelo,
        0,
        0,
        0,
        0,
        None,
    )
    .await?;
    guardar_mensaje_usuario(
        &state.pool,
        req.conversacionId,
        auth.user_id,
        &req.mensaje,
        req.clave_idempotencia,
    )
    .await?;

    let mut historial = cargar_historial(&state.pool, req.conversacionId, auth.user_id).await?;
    /* [29-08-2026] Fase 3 (memoria v1): inyectar la memoria persistente del
     * usuario como mensajes system al inicio del historial (tras el
     * SYSTEM_PROMPT) para que el agente recuerde preferencias/lecciones. */
    if runtime.turno_config.incluir_memoria {
        let memoria = cargar_memoria_agente(&state.pool, auth.user_id, 50).await?;
        historial.splice(0..0, memoria);
    }
    /* [31-08-2026] Fase 3 (skills v1): inyectar las skills activas como
     * contexto system y emitir el evento observable de cuántas entraron. */
    if runtime.turno_config.incluir_skills {
        let skills = cargar_skills_agente(&state.pool, auth.user_id, 20).await?;
        let cantidad = skills.len();
        if cantidad > 0 {
            let _ = tx.send(AgenteEvento::Contexto { skills: cantidad }).await;
            historial.splice(0..0, skills);
        }
    }
    let state_clone = state.clone();
    let tx_clone = tx.clone();
    let mensaje = req.mensaje.clone();
    let user_id = auth.user_id;
    let conversacion_id = req.conversacionId;
    let provider = runtime.turno_config.provider.clone();
    let modelo = runtime.turno_config.modelo.clone();

    /* Loop del agente en background; al terminar cierra el canal. */
    tokio::spawn(async move {
        let resultado = runtime
            .ejecutar_turno(
                &state_clone,
                user_id,
                turno_id,
                conversacion_id,
                historial,
                mensaje.clone(),
                &tx_clone,
            )
            .await;
        if let Err(error) = resultado {
            let retryable = matches!(
                error,
                AppError::Upstream(_) | AppError::ServiceUnavailable(_) | AppError::NotConfigured(_)
            );
            let _ = tx_clone
                .send(AgenteEvento::Error {
                    mensaje: error.to_string(),
                    retryable,
                })
                .await;
            /* [29-08-2026] R7 cola de reintentos: un fallo retryable deja el
             * turno en 'pendiente' (no 'fallido') con el prompt reconstruido,
             * para que un reintento del usuario (o worker) lo retome. El
             * front ofrece "reintentar" cuando `retryable` es true. */
            let _ = persistir_turno(
                &state_clone,
                turno_id,
                user_id,
                if retryable { "pendiente" } else { "fallido" },
                &mensaje,
                &provider,
                &modelo,
                0,
                0,
                0,
                0,
                Some(&error.to_string()),
            )
            .await;
        }
    });

    let stream: std::pin::Pin<Box<dyn Stream<Item = Result<Event, Infallible>> + Send>> =
        Box::pin(ReceiverStream::new(rx).map(|evento| {
            Ok(Event::default().json_data(evento).expect("evento serializable"))
        }));
    Ok(Sse::new(stream).keep_alive(KeepAlive::default()))
}

#[derive(Debug, Deserialize)]
#[allow(non_snake_case)]
pub struct CrearConversacionRequest {
    pub titulo: Option<String>,
    /// Modo de operación de la conversación (predeterminado|meta|autonomo).
    #[serde(default)]
    pub modo: Option<String>,
    pub config: Option<serde_json::Value>,
}

#[derive(Debug, serde::Serialize)]
#[allow(non_snake_case)]
pub struct ConversacionResponse {
    pub id: Uuid,
    pub titulo: String,
    pub modo: String,
    pub config: serde_json::Value,
}

/// Crea una conversación del agente para el usuario (Fase 0: el front abre
/// tabs/conversaciones y este endpoint persiste la cabecera).
pub async fn crear_conversacion(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(req): Json<CrearConversacionRequest>,
) -> Result<Json<ConversacionResponse>, AppError> {
    let titulo = req
        .titulo
        .unwrap_or_else(|| "Nueva conversación".to_string());
    let titulo = titulo.trim();
    if titulo.is_empty() || titulo.chars().count() > 255 {
        return Err(AppError::BadRequest("Título inválido".into()));
    }
    /* [29-08-2026] Modo de operación (sección 9.2): predeterminado (default),
     * meta, autonomo. Se valida contra la lista cerrada de la BD. */
    let modo = req
        .modo
        .unwrap_or_else(|| "predeterminado".to_string());
    if !matches!(modo.as_str(), "predeterminado" | "meta" | "autonomo") {
        return Err(AppError::BadRequest("Modo inválido (predeterminado|meta|autonomo)".into()));
    }
    let id = Uuid::new_v4();
    let config = req.config.unwrap_or_else(|| serde_json::json!({}));
    sqlx::query(
        "INSERT INTO agente_conversaciones (id, user_id, titulo, modo, config) VALUES ($1, $2, $3, $4, $5)",
    )
    .bind(id)
    .bind(auth.user_id)
    .bind(titulo)
    .bind(&modo)
    .bind(&config)
    .execute(&state.pool)
    .await?;
    Ok(Json(ConversacionResponse {
        id,
        titulo: titulo.to_string(),
        modo,
        config,
    }))
}

/// Lista las conversaciones del usuario (para reanudar en el front).
pub async fn listar_conversaciones(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<Json<Vec<ConversacionResponse>>, AppError> {
    let filas: Vec<(Uuid, String, String, serde_json::Value)> = sqlx::query_as(
        "SELECT id, titulo, modo, config FROM agente_conversaciones
         WHERE user_id = $1 ORDER BY actualizado_en DESC LIMIT 50",
    )
    .bind(auth.user_id)
    .fetch_all(&state.pool)
    .await?;
    Ok(Json(
        filas
            .into_iter()
            .map(|(id, titulo, modo, config)| ConversacionResponse { id, titulo, modo, config })
            .collect(),
    ))
}

/// Mensaje de una conversación (para historial en el front).
#[derive(Debug, Serialize)]
#[allow(non_snake_case)]
pub struct MensajeConversacionResponse {
    pub id: i64,
    pub rol: String,
    pub contenido: String,
    pub creadoEn: String,
}

/// [29-08-2026] Fase 4: historial completo de una conversación (persistencia
/// de chats en el servidor). El front carga los mensajes al abrir una tab.
pub async fn listar_mensajes_conversacion(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(conversacion_id): Path<Uuid>,
) -> Result<Json<Vec<MensajeConversacionResponse>>, AppError> {
    /* Propiedad: nunca confiar en el front. */
    let filas: Vec<(i64, String, String, chrono::DateTime<chrono::Utc>)> = sqlx::query_as(
        "SELECT m.id, m.rol, m.contenido, m.creado_en
         FROM agente_mensajes m
         JOIN agente_conversaciones c ON c.id = m.conversacion_id
         WHERE m.conversacion_id = $1 AND c.user_id = $2
         ORDER BY m.id ASC",
    )
    .bind(conversacion_id)
    .bind(auth.user_id)
    .fetch_all(&state.pool)
    .await?;
    Ok(Json(
        filas
            .into_iter()
            .map(|(id, rol, contenido, creado_en)| MensajeConversacionResponse {
                id,
                rol,
                contenido,
                creadoEn: creado_en.to_rfc3339(),
            })
            .collect(),
    ))
}

/// Renombra una conversación (tabs: editar nombre).
#[derive(Debug, Deserialize)]
#[allow(non_snake_case)]
pub struct RenombrarConversacionRequest {
    pub titulo: String,
}

pub async fn renombrar_conversacion(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(conversacion_id): Path<Uuid>,
    Json(req): Json<RenombrarConversacionRequest>,
) -> Result<Json<ConversacionResponse>, AppError> {
    let titulo = req.titulo.trim().to_string();
    if titulo.is_empty() || titulo.chars().count() > 255 {
        return Err(AppError::BadRequest("Título inválido".into()));
    }
    let resultado = sqlx::query(
        "UPDATE agente_conversaciones SET titulo = $1, actualizado_en = NOW()
         WHERE id = $2 AND user_id = $3",
    )
    .bind(&titulo)
    .bind(conversacion_id)
    .bind(auth.user_id)
    .execute(&state.pool)
    .await?;
    if resultado.rows_affected() == 0 {
        return Err(AppError::NotFound("Conversación no encontrada".into()));
    }
    let config: serde_json::Value = sqlx::query_scalar("SELECT config FROM agente_conversaciones WHERE id = $1 AND user_id = $2")
        .bind(conversacion_id).bind(auth.user_id).fetch_one(&state.pool).await?;
    Ok(Json(ConversacionResponse { id: conversacion_id, titulo, modo: String::new(), config }))
}

pub async fn guardar_config_conversacion(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
    Json(req): Json<serde_json::Value>,
) -> Result<Json<ConversacionResponse>, AppError> {
    let config = req.get("config").cloned().unwrap_or_else(|| serde_json::json!({}));
    let json = serde_json::to_string(&config).map_err(|_| AppError::BadRequest("Configuración inválida".into()))?;
    if json.len() > 8000 { return Err(AppError::BadRequest("Configuración demasiado grande".into())); }
    let fila: Option<(Uuid, String, String, serde_json::Value)> = sqlx::query_as("UPDATE agente_conversaciones SET config = $1, actualizado_en = NOW() WHERE id = $2 AND user_id = $3 RETURNING id, titulo, modo, config")
        .bind(&config).bind(id).bind(auth.user_id).fetch_optional(&state.pool).await?;
    let Some((id, titulo, modo, config)) = fila else { return Err(AppError::NotFound("Conversación no encontrada".into())); };
    Ok(Json(ConversacionResponse { id, titulo, modo, config }))
}

/// Elimina una conversación (tabs: cerrar).
pub async fn eliminar_conversacion(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(conversacion_id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let resultado = sqlx::query(
        "DELETE FROM agente_conversaciones WHERE id = $1 AND user_id = $2",
    )
    .bind(conversacion_id)
    .bind(auth.user_id)
    .execute(&state.pool)
    .await?;
    if resultado.rows_affected() == 0 {
        return Err(AppError::NotFound("Conversación no encontrada".into()));
    }
    Ok(axum::http::StatusCode::NO_CONTENT)
}

/// Límite de tareas programadas activas por usuario.
const MAX_TAREAS_PROGRAMADAS: i64 = 20;

#[derive(Debug, Deserialize)]
#[allow(non_snake_case)]
pub struct CrearTareaProgramadaRequest {
    pub nombre: String,
    pub prompt: String,
    #[serde(default = "default_tipo")]
    pub tipo: String,
    pub cron_expr: Option<String>,
    pub ejecutar_en: Option<chrono::DateTime<chrono::Utc>>,
}

fn default_tipo() -> String {
    "una_vez".to_string()
}

#[derive(Debug, serde::Serialize)]
#[allow(non_snake_case)]
pub struct TareaProgramadaResponse {
    pub id: Uuid,
    pub nombre: String,
    pub prompt: String,
    pub tipo: String,
    pub cron_expr: Option<String>,
    pub estado: String,
    pub proxima_ejecucion: Option<chrono::DateTime<chrono::Utc>>,
    pub result_summary: Option<String>,
}

/// Crea una tarea programada (el usuario programa; el agente ejecuta como
/// turno). Valida nombre/prompt y el límite de activas por usuario.
pub async fn crear_tarea_programada(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(req): Json<CrearTareaProgramadaRequest>,
) -> Result<Json<TareaProgramadaResponse>, AppError> {
    let nombre = req.nombre.trim();
    if nombre.is_empty() || nombre.chars().count() > 255 {
        return Err(AppError::BadRequest("Nombre inválido".into()));
    }
    let prompt = req.prompt.trim();
    if prompt.is_empty() || prompt.chars().count() > 4000 {
        return Err(AppError::BadRequest("Prompt inválido".into()));
    }
    if !matches!(req.tipo.as_str(), "una_vez" | "recurrente") {
        return Err(AppError::BadRequest("Tipo inválido (una_vez|recurrente)".into()));
    }
    if req.tipo == "recurrente" && req.cron_expr.is_none() {
        return Err(AppError::BadRequest(
            "Las tareas recurrentes requieren cron_expr (diario, cada{N}min, cada{N}h, cada{N}d)".into(),
        ));
    }
    let activas: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM agente_tareas_programadas
         WHERE user_id = $1 AND estado IN ('pendiente', 'ejecutando', 'completada')",
    )
    .bind(auth.user_id)
    .fetch_one(&state.pool)
    .await?;
    if activas.0 >= MAX_TAREAS_PROGRAMADAS {
        return Err(AppError::Validation(format!(
            "Límite de tareas programadas alcanzado ({MAX_TAREAS_PROGRAMADAS})"
        )));
    }

    let id = Uuid::new_v4();
    let proxima: Option<chrono::DateTime<chrono::Utc>> = if req.tipo == "recurrente" {
        Some(chrono::Utc::now() + chrono::Duration::minutes(1))
    } else {
        req.ejecutar_en
    };
    sqlx::query(
        "INSERT INTO agente_tareas_programadas
         (id, user_id, nombre, prompt, tipo, cron_expr, ejecutar_en, proxima_ejecucion)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
    )
    .bind(id)
    .bind(auth.user_id)
    .bind(nombre)
    .bind(prompt)
    .bind(&req.tipo)
    .bind(&req.cron_expr)
    .bind(req.ejecutar_en)
    .bind(proxima)
    .execute(&state.pool)
    .await?;

    Ok(Json(TareaProgramadaResponse {
        id,
        nombre: nombre.to_string(),
        prompt: prompt.to_string(),
        tipo: req.tipo.clone(),
        cron_expr: req.cron_expr,
        estado: "pendiente".to_string(),
        proxima_ejecucion: proxima,
        result_summary: None,
    }))
}

/// Lista las tareas programadas del usuario.
pub async fn listar_tareas_programadas(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<Json<Vec<TareaProgramadaResponse>>, AppError> {
    let filas: Vec<(Uuid, String, String, String, Option<String>, String, Option<chrono::DateTime<chrono::Utc>>, Option<String>)> =
        sqlx::query_as(
            "SELECT id, nombre, prompt, tipo, cron_expr, estado, proxima_ejecucion, result_summary
             FROM agente_tareas_programadas
             WHERE user_id = $1
             ORDER BY creado_en DESC LIMIT 50",
        )
        .bind(auth.user_id)
        .fetch_all(&state.pool)
        .await?;
    Ok(Json(
        filas
            .into_iter()
            .map(
                |(id, nombre, prompt, tipo, cron_expr, estado, proxima_ejecucion, result_summary)| {
                    TareaProgramadaResponse {
                        id,
                        nombre,
                        prompt,
                        tipo,
                        cron_expr,
                        estado,
                        proxima_ejecucion,
                        result_summary,
                    }
                },
            )
            .collect(),
    ))
}

/// Elimina una tarea programada (solo del propietario).
pub async fn eliminar_tarea_programada(
    State(state): State<AppState>,
    auth: AuthUser,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
) -> Result<axum::http::StatusCode, AppError> {
    let borrada = sqlx::query(
        "DELETE FROM agente_tareas_programadas WHERE id = $1 AND user_id = $2",
    )
    .bind(id)
    .bind(auth.user_id)
    .execute(&state.pool)
    .await?
    .rows_affected();
    if borrada == 0 {
        return Err(AppError::NotFound("Tarea programada no encontrada".into()));
    }
    Ok(axum::http::StatusCode::NO_CONTENT)
}

#[derive(Debug, serde::Serialize)]
#[allow(non_snake_case)]
pub struct MemoriaResponse {
    pub clave: String,
    pub contenido: String,
}

#[derive(Debug, Deserialize)]
#[allow(non_snake_case)]
pub struct GuardarMemoriaRequest {
    pub clave: String,
    pub contenido: String,
}

/// Lista la memoria persistente del usuario (preferencias/lecciones).
pub async fn listar_memoria(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<Json<Vec<MemoriaResponse>>, AppError> {
    let filas: Vec<(String, String)> = sqlx::query_as(
        "SELECT clave, contenido FROM agente_memoria
         WHERE user_id = $1 ORDER BY actualizado_en DESC LIMIT 200",
    )
    .bind(auth.user_id)
    .fetch_all(&state.pool)
    .await?;
    Ok(Json(
        filas.into_iter()
            .map(|(clave, contenido)| MemoriaResponse { clave, contenido })
            .collect(),
    ))
}

/// U ata actualiza una entrada de memoria (upsert por clave, idempotente).
pub async fn guardar_memoria(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(req): Json<GuardarMemoriaRequest>,
) -> Result<Json<MemoriaResponse>, AppError> {
    let clave = req.clave.trim();
    let contenido = req.contenido.trim();
    if clave.is_empty() || tipo_clave_invalido(clave) {
        return Err(AppError::BadRequest("Clave inválida (1-128 chars alfanumérica/._-".into()));
    }
    if contenido.is_empty() || contenido.chars().count() > 4000 {
        return Err(AppError::BadRequest("El contenido debe tener entre 1 y 4000 caracteres".into()));
    }
    sqlx::query(
        "INSERT INTO agente_memoria (user_id, clave, contenido)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, clave)
         DO UPDATE SET contenido = EXCLUDED.contenido, actualizado_en = NOW()",
    )
    .bind(auth.user_id)
    .bind(clave)
    .bind(contenido)
    .execute(&state.pool)
    .await?;
    Ok(Json(MemoriaResponse { clave: clave.into(), contenido: contenido.into() }))
}

/// Borra una entrada de memoria (solo del propietario).
pub async fn eliminar_memoria(
    State(state): State<AppState>,
    auth: AuthUser,
    axum::extract::Path(clave): axum::extract::Path<String>,
) -> Result<axum::http::StatusCode, AppError> {
    let borrada = sqlx::query("DELETE FROM agente_memoria WHERE user_id = $1 AND clave = $2")
        .bind(auth.user_id)
        .bind(&clave)
        .execute(&state.pool)
        .await?
        .rows_affected();
    if borrada == 0 {
        return Err(AppError::NotFound("Entrada de memoria no encontrada".into()));
    }
    Ok(axum::http::StatusCode::NO_CONTENT)
}

#[derive(Debug, serde::Serialize)]
#[allow(non_snake_case)]
pub struct SkillResponse {
    pub id: Uuid,
    pub nombre: String,
    pub descripcion: String,
    pub activa: bool,
}

#[derive(Debug, Deserialize)]
#[allow(non_snake_case)]
pub struct CrearSkillRequest {
    pub nombre: String,
    pub descripcion: String,
    #[serde(default = "default_activa")]
    pub activa: bool,
}

#[derive(Debug, Deserialize)]
#[allow(non_snake_case)]
pub struct ActualizarSkillRequest {
    pub nombre: Option<String>,
    pub descripcion: Option<String>,
    pub activa: Option<bool>,
}

fn default_activa() -> bool {
    true
}

fn validar_skill(nombre: &str, descripcion: &str) -> Result<(), AppError> {
    let nombre = nombre.trim();
    if nombre.is_empty() || nombre.chars().count() > 128 {
        return Err(AppError::BadRequest("El nombre de la skill debe tener entre 1 y 128 caracteres".into()));
    }
    if descripcion.trim().is_empty() || descripcion.chars().count() > 4000 {
        return Err(AppError::BadRequest("La descripción de la skill debe tener entre 1 y 4000 caracteres".into()));
    }
    Ok(())
}

/// Lista las skills del usuario (activas e inactivas).
pub async fn listar_skills(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<Json<Vec<SkillResponse>>, AppError> {
    let filas: Vec<(Uuid, String, String, bool)> = sqlx::query_as(
        "SELECT id, nombre, descripcion, activa FROM agente_skills
         WHERE user_id = $1 ORDER BY nombre LIMIT 200",
    )
    .bind(auth.user_id)
    .fetch_all(&state.pool)
    .await?;
    Ok(Json(
        filas.into_iter()
            .map(|(id, nombre, descripcion, activa)| SkillResponse {
                id,
                nombre,
                descripcion,
                activa,
            })
            .collect(),
    ))
}

/// Crea o actualiza una skill por nombre (idempotente: misma clave => misma
/// fila, sin duplicados). La crea inactiva si `activa=false`.
pub async fn crear_skill(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(req): Json<CrearSkillRequest>,
) -> Result<Json<SkillResponse>, AppError> {
    let nombre = req.nombre.trim();
    let descripcion = req.descripcion.trim();
    validar_skill(nombre, descripcion)?;
    let fila: (Uuid, String, String, bool) = sqlx::query_as(
        "INSERT INTO agente_skills (user_id, nombre, descripcion, activa)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, nombre)
         DO UPDATE SET descripcion = EXCLUDED.descripcion, activa = EXCLUDED.activa, actualizado_en = NOW()
         RETURNING id, nombre, descripcion, activa",
    )
    .bind(auth.user_id)
    .bind(nombre)
    .bind(descripcion)
    .bind(req.activa)
    .fetch_one(&state.pool)
    .await?;
    Ok(Json(fila_a_skill(fila)))
}

/// Actualiza nombre/descripción/activa de una skill (solo del propietario).
pub async fn actualizar_skill(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
    Json(req): Json<ActualizarSkillRequest>,
) -> Result<Json<SkillResponse>, AppError> {
    let actual: (String, String, bool) = sqlx::query_as(
        "SELECT nombre, descripcion, activa FROM agente_skills WHERE id = $1 AND user_id = $2",
    )
    .bind(id)
    .bind(auth.user_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Skill no encontrada".into()))?;
    let nombre = req.nombre.as_deref().unwrap_or(&actual.0).trim().to_string();
    let descripcion = req.descripcion.as_deref().unwrap_or(&actual.1).trim().to_string();
    let activa = req.activa.unwrap_or(actual.2);
    validar_skill(&nombre, &descripcion)?;
    let fila: (Uuid, String, String, bool) = sqlx::query_as(
        "UPDATE agente_skills SET nombre = $1, descripcion = $2, activa = $3, actualizado_en = NOW()
         WHERE id = $4 AND user_id = $5
         RETURNING id, nombre, descripcion, activa",
    )
    .bind(&nombre)
    .bind(&descripcion)
    .bind(activa)
    .bind(id)
    .bind(auth.user_id)
    .fetch_one(&state.pool)
    .await?;
    Ok(Json(fila_a_skill(fila)))
}

/// Borra una skill (solo del propietario).
pub async fn eliminar_skill(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<axum::http::StatusCode, AppError> {
    let borrada = sqlx::query("DELETE FROM agente_skills WHERE id = $1 AND user_id = $2")
        .bind(id)
        .bind(auth.user_id)
        .execute(&state.pool)
        .await?
        .rows_affected();
    if borrada == 0 {
        return Err(AppError::NotFound("Skill no encontrada".into()));
    }
    Ok(axum::http::StatusCode::NO_CONTENT)
}

fn fila_a_skill((id, nombre, descripcion, activa): (Uuid, String, String, bool)) -> SkillResponse {
    SkillResponse {
        id,
        nombre,
        descripcion,
        activa,
    }
}

/// Valida una clave de memoria: 1-128 chars, alfanumérico + . _ -
/// Rechaza claves de solo puntos o con `..` (para evitar ambigüedad de ruta
/// en el DELETE /:clave y colisiones de segmentos).
fn tipo_clave_invalido(clave: &str) -> bool {
    clave.len() > 128
        || clave.contains("..")
        || clave.chars().all(|c| c == '.')
        || !clave.chars().all(|c| c.is_alphanumeric() || c == '.' || c == '_' || c == '-')
}

fn validar_idioma(idioma: Option<String>) -> Result<String, AppError> {
    let valor = idioma.unwrap_or_else(|| "es".into());
    if !matches!(valor.as_str(), "es" | "en" | "pt" | "fr") {
        return Err(AppError::BadRequest("Idioma inválido (es|en|pt|fr)".into()));
    }
    Ok(valor)
}

fn validar_prompt_sistema(prompt: Option<String>) -> Result<String, AppError> {
    let valor = prompt.unwrap_or_default().trim().to_string();
    if valor.chars().count() > 4000 {
        return Err(AppError::BadRequest("El prompt de sistema no puede exceder 4000 caracteres".into()));
    }
    Ok(valor)
}

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/agente/stream", post(agente_stream))
        .route(
            "/agente/conversaciones",
            post(crear_conversacion).get(listar_conversaciones),
        )
        .route(
            "/agente/conversaciones/:id",
            delete(eliminar_conversacion)
                .put(renombrar_conversacion)
                .get(listar_mensajes_conversacion),
        )
        .route("/agente/conversaciones/:id/config", axum::routing::put(guardar_config_conversacion))
        .route(
            "/agente/tareas-programadas",
            post(crear_tarea_programada).get(listar_tareas_programadas),
        )
        .route(
            "/agente/tareas-programadas/:id",
            axum::routing::delete(eliminar_tarea_programada),
        )
        .route(
            "/agente/memoria",
            axum::routing::get(listar_memoria).put(guardar_memoria),
        )
        .route(
            "/agente/memoria/:clave",
            axum::routing::delete(eliminar_memoria),
        )
        .route(
            "/agente/skills",
            axum::routing::get(listar_skills).post(crear_skill),
        )
        .route(
            "/agente/skills/:id",
            axum::routing::put(actualizar_skill).delete(eliminar_skill),
        )
}
