// sentinel-disable-file sqlx-query-sin-macro sqlx-query-as-sin-macro
// [por que] sqlx sin feature "macros" ni DB en compile-time: query! rompe el build.
use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;

use crate::errors::AppError;
use crate::models::{
    es_estado_valido, CreateReminderRequest, Reminder, ReminderListResponse,
    UpdateReminderRequest,
};
use crate::repositories::{ReminderCreateOutcome, ReminderRepository};

pub struct ReminderService;

/// Máximo de recordatorios activos (pendientes) por usuario: evita que la IA o
/// un bucle de confirmaciones acumule filas sin límite.
const MAX_PENDIENTES: i64 = 200;

impl ReminderService {
    pub async fn create(
        pool: &PgPool,
        user_id: Uuid,
        req: CreateReminderRequest,
    ) -> Result<Reminder, AppError> {
        validar_fecha_futura(req.programado_para)?;

        match ReminderRepository::create(pool, user_id, &req).await? {
            ReminderCreateOutcome::Created(reminder) => {
                /* Límite de pendientes: si la inserción nueva supera el tope,
                 * se revierte y se informa (los replays idempotentes no llegan
                 * aquí). */
                let (pendientes,): (i64,) = sqlx::query_as(
                    "SELECT COUNT(*) FROM reminders WHERE user_id = $1 AND estado = 'pendiente'",
                )
                .bind(user_id)
                .fetch_one(pool)
                .await?;
                if pendientes > MAX_PENDIENTES {
                    ReminderRepository::delete(pool, reminder.id, user_id).await?;
                    return Err(AppError::Validation(
                        "Límite de recordatorios pendientes alcanzado (200)".into(),
                    ));
                }
                Ok(reminder)
            }
            /* Repetir la misma confirmación devuelve la fila ya creada (201,
             * como el resto de creaciones), no un 409: la operación es
             * idempotente por diseño. */
            ReminderCreateOutcome::Idempotent(reminder) => Ok(reminder),
        }
    }

    pub async fn list(
        pool: &PgPool,
        user_id: Uuid,
        estado: Option<String>,
    ) -> Result<ReminderListResponse, AppError> {
        if let Some(estado) = &estado {
            if !es_estado_valido(estado) {
                return Err(AppError::Validation(format!(
                    "Estado inválido: {estado}"
                )));
            }
        }
        let (items, total) = ReminderRepository::list(pool, user_id, estado.as_deref()).await?;
        Ok(ReminderListResponse { items, total })
    }

    pub async fn update(
        pool: &PgPool,
        id: Uuid,
        user_id: Uuid,
        req: UpdateReminderRequest,
    ) -> Result<Reminder, AppError> {
        if let Some(fecha) = req.programado_para {
            validar_fecha_futura(fecha)?;
        }
        ReminderRepository::update(
            pool,
            id,
            user_id,
            req.titulo.as_deref(),
            req.mensaje.as_deref(),
            req.programado_para,
        )
        .await?
        .ok_or_else(|| AppError::NotFound("Recordatorio no encontrado".into()))
    }

    pub async fn complete(
        pool: &PgPool,
        id: Uuid,
        user_id: Uuid,
    ) -> Result<Reminder, AppError> {
        ReminderRepository::set_estado(pool, id, user_id, "completado")
            .await?
            .ok_or_else(|| AppError::NotFound("Recordatorio no encontrado".into()))
    }

    pub async fn cancel(
        pool: &PgPool,
        id: Uuid,
        user_id: Uuid,
    ) -> Result<Reminder, AppError> {
        ReminderRepository::set_estado(pool, id, user_id, "cancelado")
            .await?
            .ok_or_else(|| AppError::NotFound("Recordatorio no encontrado".into()))
    }

    pub async fn delete(pool: &PgPool, id: Uuid, user_id: Uuid) -> Result<(), AppError> {
        if !ReminderRepository::delete(pool, id, user_id).await? {
            return Err(AppError::NotFound("Recordatorio no encontrado".into()));
        }
        Ok(())
    }
}

fn validar_fecha_futura(fecha: chrono::DateTime<Utc>) -> Result<(), AppError> {
    if fecha <= Utc::now() + chrono::Duration::minutes(1) {
        return Err(AppError::Validation(
            "La fecha programada debe estar en el futuro".into(),
        ));
    }
    Ok(())
}
