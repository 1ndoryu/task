use sqlx::PgPool;
use uuid::Uuid;

use crate::errors::AppError;
use crate::models::productivity::{
    ProductivityWriteResponse, UpsertProjectRequest, UpsertTaskRequest,
};
use crate::repositories::{ProductivityRepository, ProductivityWriteRow, TaskUpsertOutcome};

pub struct ProductivityService;

impl ProductivityService {
    pub async fn upsert_project(
        pool: &PgPool,
        user_id: Uuid,
        legacy_id: i64,
        request: UpsertProjectRequest,
    ) -> Result<ProductivityWriteResponse, AppError> {
        let row = ProductivityRepository::upsert_project(pool, user_id, legacy_id, &request)
            .await?
            .ok_or_else(|| AppError::Conflict("El proyecto cambió; vuelve a cargarlo".into()))?;
        Ok(response(row))
    }

    pub async fn upsert_task(
        pool: &PgPool,
        user_id: Uuid,
        legacy_id: i64,
        request: UpsertTaskRequest,
    ) -> Result<ProductivityWriteResponse, AppError> {
        match ProductivityRepository::upsert_task(pool, user_id, legacy_id, &request).await? {
            TaskUpsertOutcome::Written(row) => Ok(response(row)),
            TaskUpsertOutcome::Conflict => {
                Err(AppError::Conflict("La tarea cambió; vuelve a cargarla".into()))
            }
            TaskUpsertOutcome::InvalidParent => Err(AppError::Validation(
                "La tarea padre debe existir, pertenecer al usuario y ser principal; una tarea con subtareas no puede convertirse en hija".into(),
            )),
        }
    }
}

fn response(row: ProductivityWriteRow) -> ProductivityWriteResponse {
    ProductivityWriteResponse {
        id: row.legacy_id,
        item: row.payload,
        updated_at: row.updated_at,
    }
}
