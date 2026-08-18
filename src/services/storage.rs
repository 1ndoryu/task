use sqlx::PgPool;
use uuid::Uuid;

use crate::errors::AppError;
use crate::models::{
    Attachment, AttachmentRow, StorageInfo, VerifySpaceRequest, VerifySpaceResponse,
};
use crate::repositories::{StorageRepository, SubscriptionRepository};

pub struct StorageService;

impl StorageService {
    async fn is_premium(pool: &PgPool, user_id: Uuid) -> Result<bool, AppError> {
        let row = SubscriptionRepository::ensure(pool, user_id).await?;
        Ok(row.es_premium())
    }

    async fn used_bytes(pool: &PgPool, user_id: Uuid) -> Result<i64, AppError> {
        Ok(StorageRepository::sum_size(pool, user_id).await?)
    }

    pub async fn info(pool: &PgPool, user_id: Uuid) -> Result<StorageInfo, AppError> {
        let es_premium = Self::is_premium(pool, user_id).await?;
        let usado = Self::used_bytes(pool, user_id).await?;
        Ok(StorageInfo::nuevo(usado, es_premium))
    }

    pub async fn verify_space(
        pool: &PgPool,
        user_id: Uuid,
        req: VerifySpaceRequest,
    ) -> Result<VerifySpaceResponse, AppError> {
        if req.tamano <= 0 || req.tamano > crate::models::MAX_FILE_BYTES as i64 {
            return Err(AppError::Validation(
                "El archivo supera el tamaño máximo permitido (5 MB)".into(),
            ));
        }
        let info = Self::info(pool, user_id).await?;
        if req.tamano > info.disponible {
            return Ok(VerifySpaceResponse {
                success: false,
                puede_subir: false,
                message: Some("No tienes espacio suficiente".into()),
            });
        }
        Ok(VerifySpaceResponse {
            success: true,
            puede_subir: true,
            message: None,
        })
    }

    pub async fn list(
        pool: &PgPool,
        user_id: Uuid,
        entity_type: Option<&str>,
        entity_id: Option<i64>,
    ) -> Result<Vec<Attachment>, AppError> {
        let rows = StorageRepository::list(pool, user_id, entity_type, entity_id).await?;
        Ok(rows.into_iter().map(Self::to_attachment).collect())
    }

    pub async fn get(pool: &PgPool, user_id: Uuid, id: Uuid) -> Result<AttachmentRow, AppError> {
        StorageRepository::get(pool, user_id, id)
            .await?
            .ok_or_else(|| AppError::NotFound("Adjunto no encontrado".into()))
    }

    pub async fn delete(pool: &PgPool, user_id: Uuid, id: Uuid) -> Result<bool, AppError> {
        let row = Self::get(pool, user_id, id).await?;
        let path = std::path::PathBuf::from(&row.ruta);
        let _ = tokio::fs::remove_file(path).await;
        Ok(StorageRepository::delete(pool, user_id, id).await?)
    }

    fn to_attachment(row: AttachmentRow) -> Attachment {
        Attachment {
            id: row.id,
            tipo: row.tipo,
            url: format!("/api/storage/files/{}", row.id),
            nombre: row.nombre,
            tamano: row.tamano,
            fecha_subida: row.creado_en,
            thumbnail_url: row.thumbnail_ruta.map(|t| format!("/api/storage/files/{t}")),
        }
    }
}
