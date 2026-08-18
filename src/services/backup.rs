use sqlx::PgPool;
use uuid::Uuid;

use crate::errors::AppError;
use crate::models::{
    BackupMetadata, BackupRow, CreateBackupRequest, CreateBackupResponse, RestoreBackupResponse,
};
use crate::repositories::BackupRepository;
use crate::services::DashboardService;

pub struct BackupService;

impl BackupService {
    /// Crea un snapshot completo del estado del dashboard del usuario.
    pub async fn create(
        pool: &PgPool,
        user_id: Uuid,
        req: CreateBackupRequest,
    ) -> Result<CreateBackupResponse, AppError> {
        let trigger = if ["manual", "auto", "sync"].contains(&req.trigger.as_str()) {
            req.trigger
        } else {
            return Err(AppError::Validation(
                "trigger debe ser manual, auto o sync".into(),
            ));
        };

        let snapshot = DashboardService::read(pool, user_id).await?;
        let datos = serde_json::to_value(&snapshot)
            .map_err(|error| AppError::Internal(format!("No se pudo serializar el backup: {error}")))?;

        let serialized = serde_json::to_string(&datos)
            .map_err(|error| AppError::Internal(format!("No se pudo serializar el backup: {error}")))?;
        let hash = fingerprint(&serialized);
        let tamano = i64::try_from(serialized.len()).unwrap_or(i64::MAX);

        let row = BackupRepository::create(pool, user_id, &trigger, tamano, &hash, &datos).await?;
        Ok(CreateBackupResponse {
            success: true,
            backup: row.into_metadata(),
        })
    }

    pub async fn list(pool: &PgPool, user_id: Uuid) -> Result<Vec<BackupMetadata>, AppError> {
        let rows = BackupRepository::list(pool, user_id).await?;
        Ok(rows.into_iter().map(BackupRow::into_metadata).collect())
    }

    pub async fn get(pool: &PgPool, user_id: Uuid, id: Uuid) -> Result<BackupRow, AppError> {
        BackupRepository::get(pool, user_id, id)
            .await?
            .ok_or_else(|| AppError::NotFound("Backup no encontrado".into()))
    }

    /// Restaura el snapshot del dashboard: reescribe settings (notas + config)
    /// y hace upsert de tareas/proyectos/hábitos presentes en el backup.
    pub async fn restore(
        pool: &PgPool,
        user_id: Uuid,
        id: Uuid,
    ) -> Result<RestoreBackupResponse, AppError> {
        let backup = Self::get(pool, user_id, id).await?;
        let data = backup
            .datos
            .get("data")
            .cloned()
            .unwrap_or_else(|| backup.datos.clone());

        let notas = data
            .get("notas")
            .and_then(serde_json::Value::as_str)
            .unwrap_or_default()
            .to_string();
        let configuracion = data.get("configuracion").cloned().unwrap_or_default();

        let mut restored = 0;
        // Tareas y proyectos: upsert por legacy_id (id local del front).
        for tarea in data
            .get("tareas")
            .and_then(serde_json::Value::as_array)
            .into_iter()
            .flatten()
        {
            if let Some(legacy_id) = tarea.get("id").and_then(serde_json::Value::as_i64) {
                if let Ok(request) = serde_json::from_value::<crate::models::productivity::UpsertTaskRequest>(
                    tarea.clone(),
                ) {
                    let _ = crate::services::ProductivityService::upsert_task(
                        pool,
                        user_id,
                        legacy_id,
                        request,
                    )
                    .await;
                    restored += 1;
                }
            }
        }
        for proyecto in data
            .get("proyectos")
            .and_then(serde_json::Value::as_array)
            .into_iter()
            .flatten()
        {
            if let Some(legacy_id) = proyecto.get("id").and_then(serde_json::Value::as_i64) {
                if let Ok(request) = serde_json::from_value::<crate::models::productivity::UpsertProjectRequest>(
                    proyecto.clone(),
                ) {
                    let _ = crate::services::ProductivityService::upsert_project(
                        pool,
                        user_id,
                        legacy_id,
                        request,
                    )
                    .await;
                    restored += 1;
                }
            }
        }
        for habito in data
            .get("habitos")
            .and_then(serde_json::Value::as_array)
            .into_iter()
            .flatten()
        {
            if let Some(legacy_id) = habito.get("id").and_then(serde_json::Value::as_i64) {
                if let Ok(request) = serde_json::from_value::<crate::models::productivity::UpsertHabitRequest>(
                    habito.clone(),
                ) {
                    let _ = crate::services::ProductivityService::upsert_habit(
                        pool,
                        user_id,
                        legacy_id,
                        request,
                    )
                    .await;
                    restored += 1;
                }
            }
        }

        crate::repositories::DashboardRepository::upsert_settings(
            pool,
            user_id,
            &notas,
            configuracion,
        )
        .await?;

        Ok(RestoreBackupResponse {
            success: true,
            message: format!("Restaurados {restored} elementos y la configuración"),
        })
    }

    pub async fn delete(pool: &PgPool, user_id: Uuid, id: Uuid) -> Result<bool, AppError> {
        Ok(BackupRepository::delete(pool, user_id, id).await?)
    }
}

/// Fingerprint estable dentro del proceso para detectar backups idénticos.
/// Suficiente para un snapshot de usuario; no es un hash criptográfico.
fn fingerprint(serialized: &str) -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    let mut hasher = DefaultHasher::new();
    serialized.hash(&mut hasher);
    format!("{:016x}", hasher.finish())
}
