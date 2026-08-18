use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

pub const LIMITE_FREE_BYTES: i64 = 107_374_1824; // 1 GB
pub const LIMITE_PREMIUM_BYTES: i64 = 10_737_418_240; // 10 GB
pub const MAX_FILE_BYTES: usize = 5 * 1024 * 1024; // 5 MB por archivo

/// Respuesta de uso de almacenamiento (igual shape que InfoAlmacenamiento del front).
#[derive(Debug, Clone, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct StorageInfo {
    pub usado: i64,
    pub usado_formateado: String,
    pub limite: i64,
    pub limite_formateado: String,
    pub disponible: i64,
    pub disponible_formateado: String,
    pub porcentaje: i64,
    pub cerca_del_limite: bool,
    pub limite_excedido: bool,
    pub es_premium: bool,
}

impl StorageInfo {
    #[must_use]
    pub fn nuevo(usado: i64, es_premium: bool) -> Self {
        let limite = if es_premium {
            LIMITE_PREMIUM_BYTES
        } else {
            LIMITE_FREE_BYTES
        };
        let disponible = (limite - usado).max(0);
        let porcentaje = if limite > 0 {
            ((usado as f64 / limite as f64) * 100.0) as i64
        } else {
            0
        };
        Self {
            usado,
            usado_formateado: formatear_bytes(usado),
            limite,
            limite_formateado: formatear_bytes(limite),
            disponible,
            disponible_formateado: formatear_bytes(disponible),
            porcentaje,
            cerca_del_limite: porcentaje >= 80,
            limite_excedido: disponible == 0,
            es_premium,
        }
    }
}

/// Adjunto tal como lo consume el front original (camelCase).
#[derive(Debug, Clone, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct Attachment {
    pub id: Uuid,
    pub tipo: String,
    pub url: String,
    pub nombre: String,
    pub tamano: i64,
    pub fecha_subida: DateTime<Utc>,
    pub thumbnail_url: Option<String>,
}

/// Fila de la tabla attachments.
#[derive(Debug, Clone, sqlx::FromRow)]
pub struct AttachmentRow {
    pub id: Uuid,
    pub user_id: Uuid,
    pub entity_type: Option<String>,
    pub entity_id: Option<i64>,
    pub nombre: String,
    pub tipo: String,
    pub mime: String,
    pub tamano: i64,
    pub ruta: String,
    pub thumbnail_ruta: Option<String>,
    pub creado_en: DateTime<Utc>,
}

/// Request de verificación de espacio.
#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct VerifySpaceRequest {
    pub tamano: i64,
}

/// Respuesta de verificación de espacio.
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct VerifySpaceResponse {
    pub success: bool,
    pub puede_subir: bool,
    pub message: Option<String>,
}

fn formatear_bytes(bytes: i64) -> String {
    const KB: f64 = 1024.0;
    const MB: f64 = KB * 1024.0;
    const GB: f64 = MB * 1024.0;
    let bytes = bytes as f64;
    if bytes >= GB {
        format!("{:.1} GB", bytes / GB)
    } else if bytes >= MB {
        format!("{:.1} MB", bytes / MB)
    } else if bytes >= KB {
        format!("{:.1} KB", bytes / KB)
    } else {
        format!("{bytes:.0} B")
    }
}
