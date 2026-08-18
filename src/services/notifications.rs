use serde_json::Value;
use sqlx::PgPool;
use uuid::Uuid;

use crate::errors::AppError;
use crate::models::{
    is_valid_notification_type, MarkAllNotificationsReadResponse, Notification, NotificationCreate,
    NotificationListQuery, PaginatedNotifications, UnreadNotificationCount,
};
use crate::repositories::{NotificationRepository, NotificationRow};

pub struct NotificationService;

impl NotificationService {
    pub async fn list(
        pool: &PgPool,
        user_id: Uuid,
        query: NotificationListQuery,
    ) -> Result<PaginatedNotifications, AppError> {
        if query.page < 1 || !(1..=50).contains(&query.per_page) {
            return Err(AppError::Validation(
                "la página y el tamaño de notificaciones no son válidos".into(),
            ));
        }
        let offset = (query.page - 1)
            .checked_mul(query.per_page)
            .ok_or_else(|| {
                AppError::Validation("página de notificaciones demasiado grande".into())
            })?;
        let rows =
            NotificationRepository::list(pool, user_id, query.unread_only, query.per_page, offset)
                .await?;
        let total = NotificationRepository::count(pool, user_id, query.unread_only).await?;
        let item_count = i64::try_from(rows.len()).unwrap_or(i64::MAX);
        Ok(PaginatedNotifications {
            items: rows.into_iter().map(Self::notification).collect(),
            page: query.page,
            per_page: query.per_page,
            has_more: total > offset.saturating_add(item_count),
            total,
        })
    }

    pub async fn unread_count(
        pool: &PgPool,
        user_id: Uuid,
    ) -> Result<UnreadNotificationCount, AppError> {
        Ok(UnreadNotificationCount {
            unread: NotificationRepository::count(pool, user_id, true).await?,
        })
    }

    pub async fn mark_read(
        pool: &PgPool,
        user_id: Uuid,
        id: Uuid,
    ) -> Result<Notification, AppError> {
        NotificationRepository::mark_read(pool, user_id, id)
            .await?
            .map(Self::notification)
            .ok_or_else(|| AppError::NotFound("Notificación no encontrada".into()))
    }

    pub async fn mark_all_read(
        pool: &PgPool,
        user_id: Uuid,
    ) -> Result<MarkAllNotificationsReadResponse, AppError> {
        Ok(MarkAllNotificationsReadResponse {
            marked: NotificationRepository::mark_all_read(pool, user_id).await?,
        })
    }

    pub async fn delete(pool: &PgPool, user_id: Uuid, id: Uuid) -> Result<(), AppError> {
        if NotificationRepository::delete(pool, user_id, id).await? {
            Ok(())
        } else {
            Err(AppError::NotFound("Notificación no encontrada".into()))
        }
    }

    /// Emite una notificación de dominio sin hacer fallar la mutación principal.
    /// `dedupe_key` permite reintentos seguros de efectos secundarios.
    pub async fn emit(
        pool: &PgPool,
        user_id: Uuid,
        notification_type: &str,
        title: &str,
        content: Option<&str>,
        metadata: Value,
        dedupe_key: Option<String>,
    ) {
        if !is_valid_notification_type(notification_type) {
            tracing::warn!(notification_type, "se omitió tipo de notificación inválido");
            return;
        }
        let input = NotificationCreate {
            user_id,
            notification_type: notification_type.to_owned(),
            title: title.to_owned(),
            content: content.map(str::to_owned),
            metadata,
            dedupe_key,
        };
        if let Err(error) = NotificationRepository::create(pool, input).await {
            tracing::warn!(%error, user_id = %user_id, notification_type, "no se pudo emitir notificación de dominio");
        }
    }

    fn notification(row: NotificationRow) -> Notification {
        Notification {
            id: row.id,
            notification_type: row.notification_type,
            title: row.title,
            content: row.content,
            read: row.read_at.is_some(),
            created_at: row.created_at,
            read_at: row.read_at,
            metadata: row.metadata,
        }
    }
}
