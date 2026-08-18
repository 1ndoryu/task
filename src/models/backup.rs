use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use utoipa::ToSchema;
use uuid::Uuid;

/// Metadata de un backup (shape BackupMetadata del front).
#[derive(Debug, Clone, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct BackupMetadata {
    pub id: Uuid,
    pub timestamp: i64,
    pub size_bytes: i64,
    pub device: String,
    pub hash: String,
    pub trigger: String,
}

/// Fila de la tabla backups.
#[derive(Debug, Clone, sqlx::FromRow)]
pub struct BackupRow {
    pub id: Uuid,
    pub user_id: Uuid,
    pub trigger_origen: String,
    pub tamano: i64,
    pub hash: String,
    pub datos: Value,
    pub creado_en: DateTime<Utc>,
}

impl BackupRow {
    #[must_use]
    pub fn into_metadata(self) -> BackupMetadata {
        BackupMetadata {
            id: self.id,
            timestamp: self.creado_en.timestamp_millis(),
            size_bytes: self.tamano,
            device: "this-device".to_string(),
            hash: self.hash,
            trigger: self.trigger_origen,
        }
    }
}

/// Request para crear un backup.
#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CreateBackupRequest {
    #[serde(default = "default_trigger")]
    pub trigger: String,
    pub device: Option<String>,
}

fn default_trigger() -> String {
    "manual".to_string()
}

/// Respuesta de creación de backup.
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CreateBackupResponse {
    pub success: bool,
    pub backup: BackupMetadata,
}

/// Respuesta de restauración.
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct RestoreBackupResponse {
    pub success: bool,
    pub message: String,
}
