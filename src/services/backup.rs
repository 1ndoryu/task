use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;

use crate::errors::AppError;
use crate::models::{
    BackupMetadata, BackupRow, CreateBackupRequest, CreateBackupResponse, RestoreBackupResponse,
};
use crate::repositories::{BackupRepository, SubscriptionRepository};
use crate::services::DashboardService;

pub struct BackupService;

impl BackupService {
    /// Paridad con BackupsApiController::checkPermission (WP): las copias de
    /// seguridad son un beneficio Premium (trial incluido).
    async fn ensure_premium(pool: &PgPool, user_id: Uuid) -> Result<(), AppError> {
        let row = SubscriptionRepository::ensure(pool, user_id).await?;
        SubscriptionRepository::expire_if_due(pool, user_id).await?;
        let row = SubscriptionRepository::get(pool, user_id)
            .await?
            .unwrap_or(row);
        if !row.es_premium() {
            return Err(AppError::Forbidden(
                "Las copias de seguridad son un beneficio Premium".into(),
            ));
        }
        Ok(())
    }

    /// Crea un snapshot completo del estado del dashboard del usuario.
    pub async fn create(
        pool: &PgPool,
        user_id: Uuid,
        req: CreateBackupRequest,
    ) -> Result<CreateBackupResponse, AppError> {
        Self::ensure_premium(pool, user_id).await?;
        let trigger = if ["manual", "auto", "sync"].contains(&req.trigger.as_str()) {
            req.trigger
        } else {
            return Err(AppError::Validation(
                "trigger debe ser manual, auto o sync".into(),
            ));
        };

        // Paridad con BackupsRepository::puedeCrearBackup (WP): máximo una
        // copia cada 30 minutos; el exceso se ignora sin romper la UI.
        if let Some(ultimo) = BackupRepository::last_created_at(pool, user_id).await? {
            let intervalo = chrono::Duration::minutes(BackupRepository::INTERVALO_MINUTOS);
            if Utc::now().signed_duration_since(ultimo) < intervalo {
                return Ok(CreateBackupResponse {
                    success: false,
                    backup: None,
                    message: Some(format!(
                        "Espera {} minutos entre copias de seguridad",
                        BackupRepository::INTERVALO_MINUTOS
                    )),
                });
            }
        }

        let snapshot = DashboardService::read(pool, user_id).await?;
        let datos = serde_json::to_value(&snapshot)
            .map_err(|error| AppError::Internal(format!("No se pudo serializar el backup: {error}")))?;

        let serialized = serde_json::to_string(&datos)
            .map_err(|error| AppError::Internal(format!("No se pudo serializar el backup: {error}")))?;
        let hash = fingerprint(&serialized);
        let tamano = i64::try_from(serialized.len()).unwrap_or(i64::MAX);

        let row = BackupRepository::create(pool, user_id, &trigger, tamano, &hash, &datos).await?;
        // Paridad con cleanupOldBackups (WP): retención 30 días + máx 50 copias.
        BackupRepository::cleanup(pool, user_id).await?;
        Ok(CreateBackupResponse {
            success: true,
            backup: Some(row.into_metadata()),
            message: None,
        })
    }

    pub async fn list(pool: &PgPool, user_id: Uuid) -> Result<Vec<BackupMetadata>, AppError> {
        Self::ensure_premium(pool, user_id).await?;
        let rows = BackupRepository::list(pool, user_id).await?;
        Ok(rows.into_iter().map(BackupRow::into_metadata).collect())
    }

    pub async fn get(pool: &PgPool, user_id: Uuid, id: Uuid) -> Result<BackupRow, AppError> {
        Self::ensure_premium(pool, user_id).await?;
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
        Self::ensure_premium(pool, user_id).await?;
        Ok(BackupRepository::delete(pool, user_id, id).await?)
    }
}

/// Fingerprint determinista (FNV-1a 64) del snapshot: los mismos datos
/// producen el mismo hash entre procesos, como el md5() de WordPress.
/// No es un hash criptográfico; sirve para detectar copias idénticas.
fn fingerprint(serialized: &str) -> String {
    const OFFSET: u64 = 0xcbf29ce484222325;
    const PRIME: u64 = 0x100000001b3;
    let mut hash = OFFSET;
    for byte in serialized.as_bytes() {
        hash ^= u64::from(*byte);
        hash = hash.wrapping_mul(PRIME);
    }
    format!("{hash:016x}")
}
