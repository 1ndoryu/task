/* [29-08-2026] Endpoint SSE del agente (plan-agente-ia-plugin, Fase 0/1).
 * POST /api/agente/stream con require_auth (no admin: el coste del LLM lo
 * absorbe el servidor para cualquier usuario autenticado, con rate limit y
 * techo del proveedor). Respuesta text/event-stream con eventos tipados:
 * token, tool_start, tool_result, usage, error, done.
 *
 * Cancelación server-side: si el cliente corta, el mpsc receiver se cae y el
 * runtime aborta el loop (no sigue ejecutando tools ni consumiendo tokens). */

use axum::extract::State;
use axum::response::sse::{Event, KeepAlive, Sse};
use axum::response::IntoResponse;
use axum::routing::post;
use axum::{Json, Router};
use futures_util::stream::Stream;
use futures_util::StreamExt;
use serde::Deserialize;
use std::convert::Infallible;
use tokio::sync::mpsc;
use tokio_stream::wrappers::ReceiverStream;
use uuid::Uuid;

use crate::agent::runtime::{
    cargar_historial, guardar_mensaje_usuario, persistir_turno, AgenteEvento, AgentRuntime,
    TurnoConfig,
};
use crate::errors::AppError;
use crate::middleware::auth::AuthUser;
use crate::AppState;

#[derive(Debug, Deserialize)]
#[allow(non_snake_case)] // contrato del front (camelCase)
pub struct AgenteStreamRequest {
    pub conversacionId: Uuid,
    pub mensaje: String,
    pub provider: Option<String>,
    pub modelo: Option<String>,
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
    let conversacion: Option<(Uuid, String)> = sqlx::query_as(
        "SELECT id, modo FROM agente_conversaciones WHERE id = $1 AND user_id = $2",
    )
    .bind(req.conversacionId)
    .bind(auth.user_id)
    .fetch_optional(&state.pool)
    .await?;
    let Some((_, modo)) = conversacion else {
        return Err(AppError::NotFound("Conversación no encontrada".into()));
    };

    let turno_id = Uuid::new_v4();
    let (tx, rx) = mpsc::channel::<AgenteEvento>(128);
    let runtime = AgentRuntime::nuevo(TurnoConfig {
        provider: req.provider.unwrap_or_else(|| "groq".into()),
        modelo: req.modelo.unwrap_or_else(|| "groq/compound-mini".into()),
        modo,
        ..TurnoConfig::default()
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
    guardar_mensaje_usuario(&state.pool, req.conversacionId, auth.user_id, &req.mensaje).await?;

    let historial = cargar_historial(&state.pool, req.conversacionId, auth.user_id).await?;
    let state_clone = state.clone();
    let tx_clone = tx.clone();
    let mensaje = req.mensaje.clone();
    let user_id = auth.user_id;
    let provider = runtime.turno_config.provider.clone();
    let modelo = runtime.turno_config.modelo.clone();

    /* Loop del agente en background; al terminar cierra el canal. */
    tokio::spawn(async move {
        let resultado = runtime
            .ejecutar_turno(&state_clone, user_id, turno_id, historial, mensaje.clone(), &tx_clone)
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
}

#[derive(Debug, serde::Serialize)]
#[allow(non_snake_case)]
pub struct ConversacionResponse {
    pub id: Uuid,
    pub titulo: String,
    pub modo: String,
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
    sqlx::query(
        "INSERT INTO agente_conversaciones (id, user_id, titulo, modo) VALUES ($1, $2, $3, $4)",
    )
    .bind(id)
    .bind(auth.user_id)
    .bind(titulo)
    .bind(&modo)
    .execute(&state.pool)
    .await?;
    Ok(Json(ConversacionResponse {
        id,
        titulo: titulo.to_string(),
        modo,
    }))
}

/// Lista las conversaciones del usuario (para reanudar en el front).
pub async fn listar_conversaciones(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<Json<Vec<ConversacionResponse>>, AppError> {
    let filas: Vec<(Uuid, String, String)> = sqlx::query_as(
        "SELECT id, titulo, modo FROM agente_conversaciones
         WHERE user_id = $1 ORDER BY actualizado_en DESC LIMIT 50",
    )
    .bind(auth.user_id)
    .fetch_all(&state.pool)
    .await?;
    Ok(Json(
        filas
            .into_iter()
            .map(|(id, titulo, modo)| ConversacionResponse { id, titulo, modo })
            .collect(),
    ))
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

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/agente/stream", post(agente_stream))
        .route(
            "/agente/conversaciones",
            post(crear_conversacion).get(listar_conversaciones),
        )
        .route(
            "/agente/tareas-programadas",
            post(crear_tarea_programada).get(listar_tareas_programadas),
        )
        .route(
            "/agente/tareas-programadas/:id",
            axum::routing::delete(eliminar_tarea_programada),
        )
}
