// sentinel-disable-file sqlx-query-sin-macro sqlx-query-as-sin-macro
// [por que] sqlx sin feature "macros" ni DB en compile-time: query! rompe el build.
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
use serde::Deserialize;
use std::convert::Infallible;
use std::sync::Arc;
use tokio::sync::mpsc;
use tokio_stream::wrappers::ReceiverStream;
use uuid::Uuid;

use crate::agent::adaptador::PersistenciaAgente;
use crate::agent::tools::{BuscadorWeb, DominioAgente, registrar_tools};
use crate::agent::{
    AgenteEvento, AgentRuntime, AgentToolRegistry, PuertosHarness, TurnoConfig,
};
use crate::services::ai::AiMessage;
use crate::errors::AppError;
use crate::middleware::auth::AuthUser;
use crate::repositories::AgenteRepository;
use crate::AppState;
use glory_harness_core::ports::{PersistenciaTurnos, TurnoPersistido};
use glory_harness_core::AgentPersistence;

use super::agente_config::config_desde_guardada;
use super::agente_historial::{historial_enriquecido, MensajeHistorial};

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
        return Err(AppError::TooManyRequests(
            state.agente_limiter.ventana_secs(),
        ));
    }

    /* Verificar propiedad de la conversación (nunca confiar en el front) y
     * leer su modo de operación (sección 9.2). */
    let conversacion: Option<(Uuid, String, serde_json::Value)> = AgenteRepository::buscar_conversacion(
        &state.pool,
        req.conversacionId,
        auth.user_id,
    )
    .await?;
    let Some((_, modo, config_guardada)) = conversacion else {
        return Err(AppError::NotFound("Conversación no encontrada".into()));
    };

    let turno_id = Uuid::new_v4();
    let (tx, rx) = mpsc::channel::<AgenteEvento>(128);
    /* Glory/commandcode es política del servidor. Los parámetros avanzados se
     * toman de la conversación; el request solo conserva compatibilidad con
     * clientes antiguos y no puede cambiar proveedor/modelo. Fase 2 (Glory
     * Harness): el runtime del núcleo recibe el registro de tools de dominio
     * (task) y los puertos (persistencia = adaptador, LLM = provider del
     * estado, web = BuscadorWeb, dominio = pool para downcast). */
    let persistencia = Arc::new(PersistenciaAgente::nuevo(state.pool.clone()));
    let persistencia_port: Arc<dyn AgentPersistence> = persistencia.clone();
    let mut registry = AgentToolRegistry::new();
    registrar_tools(&mut registry);
    let puertos = PuertosHarness {
        persistencia: persistencia_port,
        llm: Arc::new(state.ai_provider.clone()),
        web_search: Some(Arc::new(BuscadorWeb(state.web_search.clone()))),
        /* [318A-16 F3/F6] task-IA nunca ejecuta comandos, programa tareas ni
         * navega/lee URLs (invariante de seguridad): sin runner, programador,
         * navegador ni web_fetch, el núcleo no registra las tools
         * `comando`/`programar_tarea`/`navegador`/`web_fetch`. */
        ejecutor_comando: None,
        programador_tareas: None,
        web_fetch: None,
        navegador: None,
        dominio: Some(Arc::new(DominioAgente { pool: state.pool.clone() })),
    };
    let runtime = AgentRuntime::nuevo(
        registry,
        puertos,
        config_desde_guardada(config_guardada, modo)?,
    );

    /* [318A-16 F2] Sembrar permisos por conversación: el runtime se
     * reconstruye POR TURNO en PT, así que las decisiones de los botones de
     * aprobación (endpoint agente_aprobacion) se inyectan aquí, antes de la
     * primera tool_call: reglas de clase (Siempre/Rechazar) y tokens de una
     * vez (Permitir). El token se consume en la primera llamada cuya clase
     * coincida; la regla persiste mientras no se borre. */
    {
        use glory_harness_core::permiso::Permiso as PermisoCore;
        use glory_harness_core::regla::ReglaPermiso;
        for regla in state.agente_permisos.reglas_de(req.conversacionId) {
            let accion = if regla.accion == "deny" {
                PermisoCore::Deny
            } else {
                PermisoCore::Allow
            };
            runtime.registry.establecer_regla(ReglaPermiso::nueva(
                regla.categoria,
                regla.patron,
                accion,
            ));
        }
        for (categoria, patron) in state.agente_permisos.tomar_tokens_una_vez(req.conversacionId) {
            runtime.registry.aprobacion_una_vez(categoria, patron);
        }
    }

    /* Persistir el turno como ejecutando y el mensaje del usuario ANTES de
     * arrancar (recuperación de fallos). */
    persistir_turno_y_mensaje(
        &persistencia,
        turno_id,
        auth.user_id,
        &req,
        &runtime.turno_config.provider,
        &runtime.turno_config.modelo,
    )
    .await?;

    let mut historial = persistencia
        .cargar_historial(req.conversacionId, auth.user_id)
        .await?;
    inyectar_contexto(
        &persistencia,
        auth.user_id,
        &runtime.turno_config,
        &tx,
        &mut historial,
        &runtime,
    )
    .await?;
    let persistencia_loop = Arc::clone(&persistencia);
    let tx_clone = tx.clone();
    let mensaje = req.mensaje.clone();
    let user_id = auth.user_id;
    let conversacion_id = req.conversacionId;

    /* Loop del agente en background; al terminar cierra el canal. */
    tokio::spawn(async move {
        let resultado = runtime
            .ejecutar_turno(
                user_id,
                turno_id,
                conversacion_id,
                historial,
                mensaje.clone(),
                &tx_clone,
            )
            .await;
        if let Err(error) = resultado {
            let app_error: AppError = error.into();
            let retryable = matches!(
                &app_error,
                AppError::Upstream(_) | AppError::ServiceUnavailable(_) | AppError::NotConfigured(_)
            );
            let _ = tx_clone
                .send(AgenteEvento::Error {
                    mensaje: app_error.to_string(),
                    retryable,
                })
                .await;
            /* [29-08-2026] R7 cola de reintentos: un fallo retryable deja el
             * turno en 'pendiente' (no 'fallido') con el prompt reconstruido,
             * para que un reintento del usuario (o worker) lo retome. El
             * front ofrece "reintentar" cuando `retryable` es true. */
            let _ = persistencia_loop
                .finalizar_turno(
                    turno_id,
                    if retryable { "pendiente" } else { "fallido" },
                    Some(&app_error.to_string()),
                )
                .await;
        }
    });

    let stream: std::pin::Pin<Box<dyn Stream<Item = Result<Event, Infallible>> + Send>> =
        Box::pin(ReceiverStream::new(rx).map(|evento| {
            /* Un evento que no serialice no debe tumbar el stream: un pánico
             * dentro del mapper cortaría el SSE a medias. Se degrada a un
             * evento de error observable para que el cliente sepa que se perdió
             * un mensaje en lugar de quedarse esperando uno que nunca llega. */
            let evento = match Event::default().json_data(evento) {
                Ok(evento) => evento,
                Err(error) => {
                    tracing::error!(%error, "evento SSE del agente no serializable");
                    Event::default()
                        .event("error")
                        .data("evento no serializable")
                }
            };
            Ok(evento)
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

/* Mapea la config_guardada (serde_json) de una conversación a TurnoConfig
 * con validaciones y defaults. Extraída de agente_stream para acortarla
 * (funcion-larga-rs).
 * [02-09-2026] provider/modelo se leen de la config guardada (el selector del
 * front los persiste) para permitir elegir el modelo directo gratuito
 * `commandcode/poolside/laguna-s-2.1-free`; el default sigue siendo glory/commandcode
 * (ruta auto -> DeepSeek Flash), política previa del servidor. */
/* [029A-1] `config_desde_guardada` + validadores → `handlers/agente_config.rs`. */

/* [memoria/skills] Inyecta la memoria persistente y las skills activas como
 * contexto system al inicio del historial, si el turno las tiene habilitadas;
 * emite el evento observable de cuántas skills entraron. [318A-15 F2] Las
 * skills ya no van como mensaje system suelto: entran por la capa [REGLAS]
 * del núcleo (protegida en compactación, F1); la memoria persiste en el
 * historial como antes. Extraída de agente_stream para acortarla
 * (funcion-larga-rs). Las consultas viven en el adaptador `PersistenciaAgente`
 * (Fase 2 Glory Harness). */
async fn inyectar_contexto(
    persistencia: &PersistenciaAgente,
    user_id: Uuid,
    turno: &TurnoConfig,
    tx: &mpsc::Sender<AgenteEvento>,
    historial: &mut Vec<AiMessage>,
    runtime: &AgentRuntime,
) -> Result<(), AppError> {
    /* [29-08-2026] Fase 3 (memoria v1): inyectar la memoria persistente del
     * usuario como mensajes system al inicio del historial (tras el
     * SYSTEM_PROMPT) para que el agente recuerde preferencias/lecciones. */
    if turno.incluir_memoria {
        let memoria = persistencia.cargar_memoria_agente(user_id, 50).await?;
        historial.splice(0..0, memoria);
    }
    /* [31-08-2026] Fase 3 (skills v1): inyectar las skills activas como
     * contexto system y emitir el evento observable de cuántas entraron.
     * [318A-15 F2]: en vez de ensuciar el historial, el bloque entra en la
     * ranura [REGLAS] del núcleo (interior mutable, no persiste) — misma
     * capa que AGENTS.md en el CLI; compactación nunca lo toca (F1). */
    if turno.incluir_skills {
        let skills = persistencia.cargar_skills_agente(user_id, 20).await?;
        let cantidad = skills.len();
        if cantidad > 0 {
            let _ = tx.send(AgenteEvento::Contexto { skills: cantidad }).await;
            let reglas = skills
                .iter()
                .filter_map(|m| m.content.as_str())
                .collect::<Vec<_>>()
                .join("\n\n");
            runtime.establecer_reglas(reglas);
        }
    }
    Ok(())
}

/* Persiste el turno (estado ejecutando) y el mensaje del usuario ANTES de
 * arrancar el loop, para recuperación de fallos. Extraída de agente_stream
 * para acortarla (funcion-larga-rs). Fase 2 (Glory Harness): la persistencia
 * entra por `PersistenciaAgente` (adaptador del puerto del núcleo). */
async fn persistir_turno_y_mensaje(
    persistencia: &PersistenciaAgente,
    turno_id: Uuid,
    user_id: Uuid,
    req: &AgenteStreamRequest,
    proveedor: &str,
    modelo: &str,
) -> Result<(), AppError> {
    persistencia
        .guardar_turno(&TurnoPersistido {
            id: turno_id,
            conversacion_id: req.conversacionId,
            user_id,
            estado: "ejecutando".into(),
            resumen: Some(req.mensaje.clone()),
            creado_en: chrono::Utc::now(),
            provider: Some(proveedor.to_string()),
            modelo: Some(modelo.to_string()),
            tokens_prompt: 0,
            tokens_complecion: 0,
            tools_ejecutadas: 0,
            duracion_ms: 0,
            error: None,
        })
        .await?;
    persistencia
        .guardar_mensaje_usuario(
            req.conversacionId,
            user_id,
            &req.mensaje,
            req.clave_idempotencia,
        )
        .await?;
    Ok(())
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
    AgenteRepository::crear_conversacion(&state.pool, id, auth.user_id, titulo, &modo, &config)
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
    let filas: Vec<(Uuid, String, String, serde_json::Value)> =
        AgenteRepository::listar_conversaciones(&state.pool, auth.user_id).await?;
    Ok(Json(
        filas
            .into_iter()
            .map(|(id, titulo, modo, config)| ConversacionResponse { id, titulo, modo, config })
            .collect(),
    ))
}

/// [29-08-2026] Fase 4: historial completo de una conversación (persistencia
/// de chats en el servidor). El front carga los mensajes al abrir una tab.
/// [039A-2] Enriquecido con las tarjetas de tools y el contexto del turno (el
/// tipo `MensajeHistorial` vive en `agente_historial`).
pub async fn listar_mensajes_conversacion(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(conversacion_id): Path<Uuid>,
) -> Result<Json<Vec<MensajeHistorial>>, AppError> {
    Ok(Json(historial_enriquecido(&state.pool, conversacion_id, &auth).await?))
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
    let afectadas = AgenteRepository::renombrar(&state.pool, &titulo, conversacion_id, auth.user_id)
        .await?;
    if afectadas == 0 {
        return Err(AppError::NotFound("Conversación no encontrada".into()));
    }
    let config: serde_json::Value =
        AgenteRepository::cargar_config(&state.pool, conversacion_id, auth.user_id).await?;
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
    /* [318A-4] El modo de operación (predeterminado|meta|autonomo) se lee de la
     * columna `modo` en cada turno (no del JSON config). Antes el selector de
     * modo del front persistía el valor solo en config y quedaba inerte; ahora
     * el request puede traer `modo` y se persiste en la columna real. */
    let modo = req.get("modo")
        .and_then(serde_json::Value::as_str)
        .map(str::trim)
        .filter(|m| matches!(*m, "predeterminado" | "meta" | "autonomo"))
        .map(str::to_owned);
    let fila: Option<(Uuid, String, String, serde_json::Value)> =
        AgenteRepository::actualizar_config(&state.pool, &config, modo.as_deref(), id, auth.user_id).await?;
    let Some((id, titulo, modo, config)) = fila else { return Err(AppError::NotFound("Conversación no encontrada".into())); };
    Ok(Json(ConversacionResponse { id, titulo, modo, config }))
}

/// Elimina una conversación (tabs: cerrar).
pub async fn eliminar_conversacion(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(conversacion_id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let afectadas = AgenteRepository::eliminar(&state.pool, conversacion_id, auth.user_id).await?;
    if afectadas == 0 {
        return Err(AppError::NotFound("Conversación no encontrada".into()));
    }
    Ok(axum::http::StatusCode::NO_CONTENT)
}

/// [318A-5] Rebobina la conversación hasta un mensaje (volver atrás / editar):
/// borra los mensajes posteriores (o desde, si es editar) a `hastaId`. El front
/// recarga el historial tras rebobinar. Se verifica propiedad de la conversación
/// (el DELETE con USING ya lo garantiza).
#[derive(Debug, Deserialize)]
#[allow(non_snake_case)]
pub struct RebobinarRequest {
    pub hastaId: i64,
    /// true = editar (borra también el mensaje objetivo); false/ausente = volver.
    #[serde(default)]
    pub editar: bool,
}

pub async fn rebobinar_conversacion(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(conversacion_id): Path<Uuid>,
    Json(req): Json<RebobinarRequest>,
) -> Result<Json<Vec<MensajeHistorial>>, AppError> {
    if req.hastaId <= 0 {
        return Err(AppError::BadRequest("hastaId inválido".into()));
    }
    let borradas = AgenteRepository::rebobinar_hasta(
        &state.pool,
        conversacion_id,
        auth.user_id,
        req.hastaId,
        req.editar,
    )
    .await?;
    if borradas == 0 {
        /* Sin mensajes posteriores = nada que borrar (idempotente); el front
         * siempre recarga el historial actual. */
    }
    Ok(Json(historial_enriquecido(&state.pool, conversacion_id, &auth).await?))
}

/// [318A-7] Compacta la conversación de forma persistente: marca los mensajes
/// antiguos (excepto el último turno) como `compactado = TRUE` y guarda un
/// resumen system. Devuelve el historial resultante (como listar mensajes).
pub async fn compactar_conversacion(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(conversacion_id): Path<Uuid>,
) -> Result<Json<Vec<MensajeHistorial>>, AppError> {
    /* Propiedad: nunca confiar en el front. */
    let filas: Vec<(i64, String, String, chrono::DateTime<chrono::Utc>)> =
        AgenteRepository::listar_mensajes(&state.pool, conversacion_id, auth.user_id).await?;
    if filas.len() < 4 {
        /* Historias muy cortas: compactar no aporta; devolver tal cual
         * (enriquecido con sus tools, como el resto de respuestas). */
        return Ok(Json(historial_enriquecido(&state.pool, conversacion_id, &auth).await?));
    }

    /* Dejar el último turno verbatim (el último par user+assistant). Retroceder
     * desde el final hasta el último mensaje `user` (inicio del último turno). */
    let mut umbral = filas.last().map(|(id, _, _, _)| *id).unwrap_or(0);
    for (id, rol, _, _) in filas.iter().rev() {
        if rol == "user" {
            umbral = *id;
            break;
        }
    }
    let hasta_id = umbral.saturating_sub(1);
    if hasta_id <= 0 {
        /* Solo hay un turno: nada que compactar. */
        return Ok(Json(historial_enriquecido(&state.pool, conversacion_id, &auth).await?));
    }

    /* Resumen de los mensajes que se van a marcar. */
    let a_resumir: Vec<AiMessage> = filas
        .iter()
        .filter(|(id, _, _, _)| *id <= hasta_id)
        .map(|(_, rol, contenido, _)| AiMessage::texto(rol, contenido))
        .collect();
    let resumen = glory_harness_core::context::resumen_de_mensajes(&a_resumir);

    AgenteRepository::marcar_compactados(&state.pool, conversacion_id, auth.user_id, hasta_id)
        .await?;
    AgenteRepository::insertar_resumen(&state.pool, conversacion_id, auth.user_id, &resumen)
        .await?;

    /* Devolver el historial visible (enriquecido con tools y contexto). */
    Ok(Json(historial_enriquecido(&state.pool, conversacion_id, &auth).await?))
}

/* [029A-1] Tareas programadas → `handlers/agente_tareas.rs`, memoria →
 * `handlers/agente_memoria.rs`, skills → `handlers/agente_skills.rs`
 * (limite-lineas: este controlador superaba 500 líneas efectivas).
 * `TareaProgramadaResponse` + `crear_tarea_programada` también movidos. */

/* [029A-1] `listar_tareas_programadas` + `eliminar_tarea_programada` →
 * `handlers/agente_tareas.rs`. */

/* [029A-1] `MemoriaResponse`/`GuardarMemoriaRequest` +
 * `listar/guardar/eliminar_memoria` → `handlers/agente_memoria.rs`. */

/* [029A-1] Skills (`SkillResponse`, requests, validación y endpoints) +
 * `tipo_clave_invalido` (solo lo usaba `guardar_memoria`) →
 * `handlers/agente_skills.rs` y `handlers/agente_memoria.rs`. */

/* [029A-1] Validadores de config (`validar_idioma`, `validar_prompt_sistema`,
 * `validar_estilo`, `validar_nivel_razonamiento`, `validar_preferencias`) →
 * `handlers/agente_config.rs` (los usa `config_desde_guardada`). */

pub fn routes(state: &AppState) -> Router<AppState> {
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
        /* [318A-5] Rebobinar: borra los mensajes posteriores a un mensaje
         * (volver atrás / editar un mensaje reescribe el contexto a ese punto). */
        .route(
            "/agente/conversaciones/:id/rebobinar",
            axum::routing::post(rebobinar_conversacion),
        )
        /* [318A-7] Compactar: marca los mensajes antiguos como compactados y
         * guarda un resumen system (persistente). */
        .route(
            "/agente/conversaciones/:id/compactar",
            axum::routing::post(compactar_conversacion),
        )
        /* [029A-1] Tareas, memoria y skills viven en sus submódulos
         * (limite-lineas); las rutas y handlers son los mismos. */
        .merge(super::agente_tareas::rutas_tareas())
        .merge(super::agente_memoria::rutas_memoria())
        .merge(super::agente_skills::rutas_skills())
        /* [249A-1] Cuota del grupo IA (IP/min): ver `ai.rs`. */
        .route_layer(axum::middleware::from_fn_with_state(
            (
                state.api_ia_limiter.clone(),
                state.trust_proxy_headers,
            ),
            crate::middleware::rate_limit::limite_ia_api,
        ))
}
