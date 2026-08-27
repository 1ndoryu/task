#![allow(clippy::needless_for_each)] // Generado por utoipa OpenApi derive

mod activity;
pub mod admin;
pub mod ai;
pub mod auth;
mod backup;
mod collaboration;
mod dashboard;
mod feedback;
mod habit_history;
mod health;
mod notes;
mod notifications;
mod productivity;
mod realtime;
mod reminders;
mod security;
mod shared;
mod storage;
mod subscription;
mod timeline;

use axum::body::Body;
use axum::error_handling::HandleErrorLayer;
use axum::http::{header::CONTENT_TYPE, HeaderName, HeaderValue, Request, StatusCode};
use axum::middleware::from_fn_with_state;
use axum::response::Response;
use axum::Router;
use std::time::Duration;
use tower::{timeout::TimeoutLayer, BoxError, ServiceBuilder};
use tower_http::cors::{AllowHeaders, AllowMethods, AllowOrigin, CorsLayer};
use tower_http::limit::RequestBodyLimitLayer;
use tower_http::services::ServeDir;
use tower_http::set_header::SetResponseHeaderLayer;
use tower_http::trace::TraceLayer;
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;

use crate::services::FixedWindowLimiter;
use crate::AppState;

/// Define el esquema de seguridad por cookie para Swagger UI.
struct SecurityAddon;

impl utoipa::Modify for SecurityAddon {
    fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
        /* components existe porque el derive ya registra schemas */
        if let Some(components) = openapi.components.as_mut() {
            components.add_security_scheme(
                "session_cookie",
                utoipa::openapi::security::SecurityScheme::ApiKey(
                    utoipa::openapi::security::ApiKey::Cookie(
                        utoipa::openapi::security::ApiKeyValue::new("session_id"),
                    ),
                ),
            );
        }
    }
}

#[derive(OpenApi)]
#[openapi(
    paths(
        health::health_check,
        health::readiness_check,
        ai::ai_chat,
        ai::ai_nutricion,
        ai::ai_web_search,
        collaboration::send_request,
        collaboration::get_team,
        collaboration::pending_count,
        collaboration::respond_request,
        collaboration::remove_connection,
        auth::register,
        auth::login,
        auth::me,
        auth::logout,
        auth::profile,
        auth::update_profile,
        activity::heatmap,
        activity::stats,
        activity::day,
        activity::record,
        activity::delete,
        notes::create_note,
        notes::list_folders,
        notes::create_folder,
        notes::rename_folder,
        notes::delete_folder,
        notes::move_note,
        notes::get_note,
        notes::list_notes,
        notes::update_note,
        notes::delete_note,
        dashboard::get_dashboard,
        dashboard::update_settings,
        habit_history::get_history,
        habit_history::mark_day,
        habit_history::delete_day,
        productivity::upsert_project,
        productivity::upsert_task,
        shared::create,
        shared::received,
        shared::owned,
        shared::participants,
        shared::update_role,
        shared::remove,
        shared::counts,
        shared::access,
        notifications::list,
        notifications::unread_count,
        reminders::list,
        reminders::create,
        reminders::update,
        reminders::complete,
        reminders::cancel,
        reminders::remove,
        notifications::mark_read,
        notifications::mark_all_read,
        notifications::remove_notification,
        timeline::list,
        timeline::send,
        timeline::event,
        timeline::count,
        timeline::unread,
        timeline::mark_read,
        subscription::get_subscription,
        subscription::activate_trial,
        subscription::checkout,
        storage::storage_info,
        storage::verify_space,
        storage::list_files,
        storage::upload_file,
        storage::delete_file,
        backup::list_backups,
        backup::create_backup,
        backup::restore_backup,
        backup::delete_backup,
        feedback::create_feedback,
        feedback::feedback_state,
        feedback::my_feedback,
        feedback::admin_feedback,
        feedback::admin_feedback_stats,
        feedback::admin_feedback_read,
        security::get_e2e,
        security::save_e2e,
        security::change_password,
        security::mcp_token_state,
        security::mcp_token_generate,
        security::mcp_token_revoke,
        admin::list_users,
        admin::get_user,
        admin::admin_stats,
        admin::activate_premium,
        admin::cancel_premium,
        admin::extend_trial,
    ),
    components(schemas(
        health::HealthResponse,
        crate::models::RegisterRequest,
        crate::models::LoginRequest,
        crate::models::AuthResponse,
        crate::models::UserResponse,
        crate::models::UpdateProfileRequest,
        crate::models::ActivityDayResponse,
        crate::models::ActivityDetailItem,
        crate::models::ActivityHeatmapDay,
        crate::models::ActivityHeatmapResponse,
        crate::models::ActivityPeriod,
        crate::models::ActivityStats,
        crate::models::ActivityStatsResponse,
        crate::models::RecordActivityRequest,
        crate::models::RecordActivityResponse,
        crate::models::DeleteActivityResponse,
        crate::models::TeamRequest,
        crate::models::TeamResponseRequest,
        crate::models::TeamUser,
        crate::models::TeamConnection,
        crate::models::TeamMember,
        crate::models::TeamCounts,
        crate::models::TeamOverview,
        crate::models::PendingTeamCount,
        crate::models::SharedCreateRequest,
        crate::models::SharedRoleRequest,
        crate::models::SharedUser,
        crate::models::SharedItem,
        crate::models::SharedParticipant,
        crate::models::SharedAccess,
        crate::models::SharedAccessResponse,
        crate::models::SharedCounts,
        crate::models::PaginatedSharedItems,
        crate::models::SharedParticipantsResponse,
        crate::models::Notification,
        crate::models::PaginatedNotifications,
        crate::models::UnreadNotificationCount,
        crate::models::MarkAllNotificationsReadResponse,
        crate::models::TimelineItem,
        crate::models::CreateTimelineMessageRequest,
        crate::models::CreateTimelineEventRequest,
        crate::models::MarkTimelineReadRequest,
        crate::models::NotificationListQuery,
        crate::models::TimelineQuery,
        crate::models::TimelineResponse,
        crate::models::TimelineCountResponse,
        crate::models::TimelineUnreadResponse,
        crate::models::TimelineMutationResponse,
        crate::models::Note,
        crate::models::NoteFolder,
        crate::models::CreateNoteRequest,
        crate::models::CreateNoteFolderRequest,
        crate::models::UpdateNoteFolderRequest,
        notes::MoveNoteRequest,
        crate::models::UpdateNoteRequest,
        crate::models::PaginatedNotes,
        crate::models::DashboardReadResponse,
        crate::models::habit_history::HabitHistoryEntry,
        crate::models::habit_history::HabitHistorySummaryDay,
        crate::models::habit_history::HabitHistoryStats,
        crate::models::habit_history::HabitHistoryResponse,
        crate::models::habit_history::MarkHabitDayRequest,
        crate::models::dashboard::DashboardData,
        crate::models::dashboard::DashboardMeta,
        crate::models::dashboard::UpdateDashboardSettingsRequest,
        crate::models::productivity::ProductivityWriteResponse,
        crate::models::productivity::UpsertProjectRequest,
        crate::models::productivity::UpsertTaskRequest,
        crate::models::subscription::SubscriptionInfo,
        crate::models::subscription::TrialResponse,
        crate::models::subscription::CheckoutResponse,
        crate::models::subscription::PlanLimits,
        crate::models::storage::StorageInfo,
        crate::models::storage::Attachment,
        crate::models::storage::VerifySpaceRequest,
        crate::models::storage::VerifySpaceResponse,
        crate::models::backup::BackupMetadata,
        crate::models::backup::CreateBackupRequest,
        crate::models::backup::CreateBackupResponse,
        crate::models::backup::RestoreBackupResponse,
        crate::models::feedback::CreateFeedbackRequest,
        crate::models::feedback::CreateFeedbackResponse,
        crate::models::feedback::FeedbackItem,
        crate::models::feedback::FeedbackState,
        crate::models::feedback::FeedbackStats,
        crate::models::feedback::PaginatedFeedback,
        crate::models::security::E2EState,
        crate::models::security::SaveE2ERequest,
        crate::models::security::SaveE2EResponse,
        crate::models::security::ChangePasswordRequest,
        crate::models::security::ChangePasswordResponse,
        crate::models::security::McpTokenState,
        crate::models::security::McpTokenGenerated,
        crate::models::security::McpTokenRevoked,
        crate::models::admin::AdminUser,
        crate::models::admin::AdminSubscription,
        crate::models::admin::AdminUserStats,
        crate::models::admin::AdminPagination,
        crate::models::admin::AdminUsersResponse,
        crate::models::admin::AdminStatsResponse,
        crate::models::admin::AdminPremiumRequest,
        crate::models::admin::AdminTrialRequest,
        crate::models::admin::AdminActionResponse,
        ai::AiChatRequest,
        ai::AiChatResponse,
        ai::AiNutricionRequest,
        ai::AiNutritionResponse,
        crate::models::reminder::CreateReminderRequest,
        crate::models::reminder::Reminder,
        crate::models::reminder::ReminderListQuery,
        crate::models::reminder::ReminderListResponse,
        crate::models::reminder::UpdateReminderRequest,
        crate::services::web_search::WebSearchRequest,
        crate::services::web_search::WebSearchResult,
        crate::services::web_search::WebSearchResultItem,
        crate::services::ai::AiMessage,
        crate::errors::ErrorResponse,
    )),
    modifiers(&SecurityAddon),
    info(
        title = "Glory RS API",
        version = "0.1.0",
        description = "Template API — Rust + Axum + OpenAPI"
    )
)]
#[allow(clippy::needless_for_each)]
pub struct ApiDoc;

/// Crea el router principal con CORS, tracing, Swagger UI y todas las rutas
pub fn create_router(pool: sqlx::PgPool, config: crate::config::AppConfig) -> Router {
    let state = AppState {
        pool,
        cookie_secure: config.cookie_secure,
        trust_proxy_headers: config.trust_proxy_headers,
        cookie_domain: config.cookie_domain,
        cors_origins: config.cors_origins.clone(),
        auth_rate_limiter: std::sync::Arc::new(FixedWindowLimiter::new(
            config.auth_rate_limit_per_minute,
            std::time::Duration::from_mins(1),
        )),
        auth_crypto_semaphore: std::sync::Arc::new(tokio::sync::Semaphore::new(
            config.auth_crypto_semaphore_permits,
        )),
        ai_provider: crate::services::LlmProviderService::new(config.ai_provider_keys),
        ai_chat_limiter: std::sync::Arc::new(FixedWindowLimiter::new(
            config.ai_chat_rate_limit_per_hour,
            std::time::Duration::from_secs(60 * 60),
        )),
        ai_nutrition_limiter: std::sync::Arc::new(FixedWindowLimiter::new(
            config.ai_nutrition_rate_limit_per_hour,
            std::time::Duration::from_secs(60 * 60),
        )),
        web_search: crate::services::WebSearchService::from_env(),
    };

    let cors = CorsLayer::new()
        .allow_origin(AllowOrigin::list(config.cors_origins))
        .allow_methods(AllowMethods::list([
            axum::http::Method::GET,
            axum::http::Method::POST,
            axum::http::Method::PUT,
            axum::http::Method::PATCH,
            axum::http::Method::DELETE,
            axum::http::Method::OPTIONS,
        ]))
        .allow_headers(AllowHeaders::list([
            axum::http::header::CONTENT_TYPE,
            axum::http::header::ACCEPT,
            axum::http::HeaderName::from_static("x-csrf-token"),
        ]))
        .allow_credentials(true);

    let router = Router::new()
        .merge(SwaggerUi::new("/swagger-ui").url("/api-docs/openapi.json", ApiDoc::openapi()))
        .nest("/api", api_routes(&state))
        .layer(TraceLayer::new_for_http())
        // [H-B05-08] Límite de body configurable (default 6 MB: adjuntos 5 MB + multipart).
        .layer(RequestBodyLimitLayer::new(config.max_body_bytes))
        .layer(
            ServiceBuilder::new()
                .layer(HandleErrorLayer::new(|_: BoxError| async {
                    StatusCode::REQUEST_TIMEOUT
                }))
                .layer(TimeoutLayer::new(Duration::from_secs(
                    config.request_timeout_seconds,
                ))),
        )
        .layer(cors)
        .with_state(state);

    let router = match config.frontend_dist {
        Some(frontend_dist) => {
            let index = std::path::Path::new(&frontend_dist).join("index.html");
            let static_dir = ServeDir::new(frontend_dist).append_index_html_on_directories(true);
            let fallback = tower::service_fn(move |request: Request<Body>| {
                let index = index.clone();
                let static_dir = static_dir.clone();
                async move {
                    let static_response = tower::ServiceExt::oneshot(static_dir, request)
                        .await
                        .expect("static directory service is infallible");
                    if static_response.status() != axum::http::StatusCode::NOT_FOUND {
                        let (parts, body) = static_response.into_parts();
                        return Ok::<_, std::convert::Infallible>(Response::from_parts(
                            parts,
                            Body::new(body),
                        ));
                    }
                    let response = match tokio::fs::read(index).await {
                        Ok(contents) => Response::builder()
                            .header(CONTENT_TYPE, "text/html; charset=utf-8")
                            .body(Body::from(contents))
                            .expect("static fallback response is valid"),
                        Err(_) => Response::builder()
                            .status(axum::http::StatusCode::NOT_FOUND)
                            .body(Body::empty())
                            .expect("static 404 response is valid"),
                    };
                    Ok::<_, std::convert::Infallible>(response)
                }
            });
            router.fallback_service(fallback)
        }
        None => router,
    };

    router
        .layer(SetResponseHeaderLayer::if_not_present(
            HeaderName::from_static("x-content-type-options"),
            HeaderValue::from_static("nosniff"),
        ))
        .layer(SetResponseHeaderLayer::if_not_present(
            HeaderName::from_static("x-frame-options"),
            HeaderValue::from_static("DENY"),
        ))
        .layer(SetResponseHeaderLayer::if_not_present(
            HeaderName::from_static("referrer-policy"),
            HeaderValue::from_static("strict-origin-when-cross-origin"),
        ))
        .layer(SetResponseHeaderLayer::if_not_present(
            HeaderName::from_static("permissions-policy"),
            HeaderValue::from_static("camera=(), microphone=(), geolocation=()"),
        ))
}

fn api_routes(state: &AppState) -> Router<AppState> {
    let public_auth = auth::public_routes().layer(from_fn_with_state(
        state.clone(),
        crate::middleware::rate_limit::auth_rate_limit,
    ));
    Router::new()
        .merge(health::routes())
        .merge(ai::routes())
        .merge(public_auth)
        .merge(auth::protected_routes())
        .merge(dashboard::routes())
        .merge(habit_history::routes())
        .merge(activity::routes())
        .merge(productivity::routes())
        .merge(collaboration::routes())
        .merge(shared::routes())
        .merge(notifications::routes())
        .merge(timeline::routes())
        .merge(notes::routes())
        .merge(reminders::routes())
        .merge(subscription::routes())
        .merge(storage::routes())
        .merge(backup::routes())
        .merge(feedback::routes())
        .merge(security::routes())
        .merge(realtime::routes())
        .merge(admin::routes())
}
