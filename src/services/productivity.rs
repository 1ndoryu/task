use sqlx::PgPool;
use uuid::Uuid;

use crate::errors::AppError;
use crate::models::productivity::{
    BulkReorderRequest, BulkReorderResponse, ProductivityWriteResponse, ProjectTasksResponse,
    UpsertHabitRequest, UpsertProjectRequest, UpsertTaskRequest,
};
use crate::repositories::{
    BulkReorderOutcome, ProductivityRepository, ProductivityWriteRow, TaskUpsertOutcome,
};

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

    pub async fn upsert_habit(
        pool: &PgPool,
        user_id: Uuid,
        legacy_id: i64,
        request: UpsertHabitRequest,
    ) -> Result<ProductivityWriteResponse, AppError> {
        let row = ProductivityRepository::upsert_habit(pool, user_id, legacy_id, &request)
            .await?
            .ok_or_else(|| AppError::Conflict("El hábito cambió; vuelve a cargarlo".into()))?;
        Ok(response(row))
    }

    /// Soft-delete idempotente: borra si existe y es del usuario; si no existe
    /// (ya borrado o ajeno) no es error — el objetivo es converger a "ausente".
    pub async fn delete_project(
        pool: &PgPool,
        user_id: Uuid,
        legacy_id: i64,
    ) -> Result<(), AppError> {
        ProductivityRepository::delete_project(pool, user_id, legacy_id).await?;
        Ok(())
    }

    pub async fn delete_task(
        pool: &PgPool,
        user_id: Uuid,
        legacy_id: i64,
    ) -> Result<(), AppError> {
        ProductivityRepository::delete_task(pool, user_id, legacy_id).await?;
        Ok(())
    }

    pub async fn delete_habit(
        pool: &PgPool,
        user_id: Uuid,
        legacy_id: i64,
    ) -> Result<(), AppError> {
        ProductivityRepository::delete_habit(pool, user_id, legacy_id).await?;
        Ok(())
    }

    /// [07AA-1] Columna del kanban: falla explícito si el proyecto no existe,
    /// es ajeno o está borrado (la columna se define por `legacy_id`).
    pub async fn list_project_tasks(
        pool: &PgPool,
        user_id: Uuid,
        project_legacy_id: i64,
    ) -> Result<ProjectTasksResponse, AppError> {
        if !ProductivityRepository::project_exists(pool, user_id, project_legacy_id).await? {
            return Err(AppError::NotFound("Proyecto no encontrado".into()));
        }
        let rows =
            ProductivityRepository::list_tasks_by_project(pool, user_id, project_legacy_id).await?;
        Ok(ProjectTasksResponse {
            tareas: rows.into_iter().map(response).collect(),
        })
    }

    /// [07AA-1] Bulk atómico: valida destinos positivos antes de tocar la BD;
    /// el repositorio garantiza todo-o-nada y mapea cada fallo a su causa.
    pub async fn bulk_reorder(
        pool: &PgPool,
        user_id: Uuid,
        request: BulkReorderRequest,
    ) -> Result<BulkReorderResponse, AppError> {
        if !request.ids_validos() {
            return Err(AppError::Validation(
                "legacyId y proyectoId deben ser positivos".into(),
            ));
        }
        let movimientos: Vec<(i64, i32, Option<i64>)> = request
            .movimientos
            .iter()
            .map(|m| (m.legacy_id, m.orden, m.proyecto_id))
            .collect();
        match ProductivityRepository::bulk_reorder(pool, user_id, &movimientos).await? {
            BulkReorderOutcome::Applied(rows) => Ok(BulkReorderResponse {
                actualizadas: rows.into_iter().map(response).collect(),
            }),
            BulkReorderOutcome::UnknownTask(id) => {
                Err(AppError::NotFound(format!("Tarea {id} no encontrada")))
            }
            BulkReorderOutcome::UnknownProject(id) => Err(AppError::NotFound(format!(
                "Proyecto destino {id} no encontrado"
            ))),
            BulkReorderOutcome::DuplicateTask(id) => Err(AppError::Validation(format!(
                "Tarea {id} duplicada en el lote"
            ))),
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
