use axum::extract::{Path, Query, State};
use axum::routing::{get, post};
use axum::{Json, Router};
use chrono::{Duration, Utc};
use serde::Deserialize;
use uuid::Uuid;

use crate::errors::AppError;
use crate::handlers::feedback::require_admin;
use crate::middleware::auth::AuthUser;
use crate::models::admin::{
    AdminActionResponse, AdminPremiumRequest, AdminStatsResponse, AdminTrialRequest, AdminUser,
    AdminUsersResponse, AdminPagination,
};
use crate::repositories::{AdminRepository, SubscriptionRepository};
use crate::models::{ESTADO_ACTIVA, ESTADO_TRIAL, PLAN_PREMIUM};
use crate::AppState;

#[derive(Debug, Deserialize)]
#[allow(non_snake_case)] // campos query en camelCase para el contrato del front
pub struct AdminUsersQuery {
    pub plan: Option<String>,
    pub busqueda: Option<String>,
    pub ordenarPor: Option<String>,
    pub orden: Option<String>,
    pub pagina: Option<i64>,
    pub porPagina: Option<i64>,
}

#[utoipa::path(
    get,
    tag = "admin",
    path = "/api/admin/users",
    responses((status = 200, description = "Listado admin de usuarios", body = AdminUsersResponse)),
    security(("session_cookie" = []))
)]
pub async fn list_users(
    State(state): State<AppState>,
    auth: AuthUser,
    Query(query): Query<AdminUsersQuery>,
) -> Result<Json<AdminUsersResponse>, AppError> {
    require_admin(&state, auth.user_id).await?;
    let pagina = query.pagina.unwrap_or(1).max(1);
    let por_pagina = query.porPagina.unwrap_or(20).clamp(1, 100);
    let (usuarios, total) = AdminRepository::list_users(
        &state.pool,
        query.plan.as_deref().unwrap_or("todos"),
        query.busqueda.as_deref().unwrap_or(""),
        query.ordenarPor.as_deref().unwrap_or("fechaRegistro"),
        query.orden.as_deref().unwrap_or("desc"),
        pagina,
        por_pagina,
    )
    .await?;
    let total_paginas = ((total + por_pagina - 1) / por_pagina).max(1);
    Ok(Json(AdminUsersResponse {
        usuarios,
        total,
        paginacion: AdminPagination {
            pagina,
            por_pagina,
            total_paginas,
        },
    }))
}

#[utoipa::path(
    get,
    tag = "admin",
    path = "/api/admin/users/:id",
    responses((status = 200, description = "Detalle de usuario", body = AdminUser)),
    security(("session_cookie" = []))
)]
pub async fn get_user(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<AdminUser>, AppError> {
    require_admin(&state, auth.user_id).await?;
    let user = AdminRepository::get_user(&state.pool, id)
        .await?
        .ok_or_else(|| AppError::NotFound("Usuario no encontrado".into()))?;
    Ok(Json(user))
}

#[utoipa::path(
    get,
    tag = "admin",
    path = "/api/admin/stats",
    responses((status = 200, description = "Resumen admin", body = AdminStatsResponse)),
    security(("session_cookie" = []))
)]
pub async fn admin_stats(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<Json<AdminStatsResponse>, AppError> {
    require_admin(&state, auth.user_id).await?;
    let (total_usuarios, premium, trial, free) = AdminRepository::stats(&state.pool).await?;
    Ok(Json(AdminStatsResponse {
        total_usuarios,
        premium,
        trial,
        free,
    }))
}

#[utoipa::path(
    post,
    tag = "admin",
    path = "/api/admin/users/:id/premium",
    request_body = AdminPremiumRequest,
    responses((status = 200, description = "Premium activado", body = AdminActionResponse)),
    security(("session_cookie" = []))
)]
pub async fn activate_premium(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
    Json(req): Json<AdminPremiumRequest>,
) -> Result<Json<AdminActionResponse>, AppError> {
    require_admin(&state, auth.user_id).await?;
    let expiracion = req.duracion.map(|dias| Utc::now() + Duration::days(dias));
    SubscriptionRepository::ensure(&state.pool, id).await?;
    SubscriptionRepository::set_plan(&state.pool, id, PLAN_PREMIUM, ESTADO_ACTIVA, expiracion)
        .await?;
    Ok(Json(AdminActionResponse {
        success: true,
        message: "Plan premium activado".into(),
    }))
}

#[utoipa::path(
    post,
    tag = "admin",
    path = "/api/admin/users/:id/cancel-premium",
    responses((status = 200, description = "Premium cancelado", body = AdminActionResponse)),
    security(("session_cookie" = []))
)]
pub async fn cancel_premium(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<AdminActionResponse>, AppError> {
    require_admin(&state, auth.user_id).await?;
    SubscriptionRepository::ensure(&state.pool, id).await?;
    SubscriptionRepository::set_plan(&state.pool, id, crate::models::PLAN_FREE, ESTADO_ACTIVA, None)
        .await?;
    Ok(Json(AdminActionResponse {
        success: true,
        message: "Premium cancelado; el usuario vuelve a free".into(),
    }))
}

#[utoipa::path(
    post,
    tag = "admin",
    path = "/api/admin/users/:id/trial",
    request_body = AdminTrialRequest,
    responses((status = 200, description = "Trial extendido", body = AdminActionResponse)),
    security(("session_cookie" = []))
)]
pub async fn extend_trial(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
    Json(req): Json<AdminTrialRequest>,
) -> Result<Json<AdminActionResponse>, AppError> {
    require_admin(&state, auth.user_id).await?;
    if !(1..=365).contains(&req.dias) {
        return Err(AppError::Validation(
            "dias debe estar entre 1 y 365".into(),
        ));
    }
    SubscriptionRepository::ensure(&state.pool, id).await?;
    let ahora = Utc::now();
    let fin = ahora + Duration::days(req.dias);
    // Trial con fecha de expiración propia (no pasa por activate_trial porque ya pudo usarse).
    sqlx::query(
        "UPDATE subscriptions
         SET estado = $2, trial_inicio = $3, trial_fin = $4, plan = 'free',
             fecha_expiracion = NULL
         WHERE user_id = $1",
    )
    .bind(id)
    .bind(ESTADO_TRIAL)
    .bind(ahora)
    .bind(fin)
    .execute(&state.pool)
    .await?;
    Ok(Json(AdminActionResponse {
        success: true,
        message: format!("Trial extendido {} días", req.dias),
    }))
}

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/admin/users", get(list_users))
        .route("/admin/users/:id", get(get_user))
        .route("/admin/stats", get(admin_stats))
        .route("/admin/users/:id/premium", post(activate_premium))
        .route("/admin/users/:id/cancel-premium", post(cancel_premium))
        .route("/admin/users/:id/trial", post(extend_trial))
}
