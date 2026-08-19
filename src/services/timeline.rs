use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;

use crate::errors::AppError;
use crate::models::{
    CreateTimelineEventRequest, CreateTimelineMessageRequest, MarkTimelineReadRequest,
    TimelineCountResponse, TimelineItem, TimelineMutationResponse, TimelineQuery, TimelineResponse,
    TimelineUnreadResponse,
};
use crate::repositories::{
    SharedRepository, TimelineRepository, TimelineRow, TimelineSystemInsert, UserRepository,
};
use crate::services::NotificationService;

pub struct TimelineService;

impl TimelineService {
    pub async fn list(
        pool: &PgPool,
        viewer_id: Uuid,
        item_type: &str,
        item_id: i64,
        query: TimelineQuery,
    ) -> Result<TimelineResponse, AppError> {
        let owner_id = Self::authorized_owner(pool, viewer_id, item_type, item_id).await?;
        /* [H-B03-05] viewer_id ya no se pasa a list (no se usaba); la
         * autorización queda en authorized_owner. */
        let items = TimelineRepository::list(
            pool,
            owner_id,
            item_type,
            item_id,
            query.limit,
            query.offset,
        )
        .await?;
        let total = TimelineRepository::count(pool, owner_id, item_type, item_id).await?;
        TimelineRepository::mark_read(pool, viewer_id, owner_id, item_type, item_id).await?;
        let count = i64::try_from(items.len()).unwrap_or(i64::MAX);
        Ok(TimelineResponse {
            items: items
                .into_iter()
                .map(|row| Self::item(row, viewer_id))
                .collect(),
            total,
            limit: query.limit,
            offset: query.offset,
            has_more: total > query.offset.saturating_add(count),
        })
    }

    pub async fn send(
        pool: &PgPool,
        user_id: Uuid,
        request: CreateTimelineMessageRequest,
    ) -> Result<TimelineItem, AppError> {
        let owner_id =
            Self::authorized_owner(pool, user_id, &request.item_type, request.item_id).await?;
        let row = TimelineRepository::insert_user(
            pool,
            owner_id,
            &request.item_type,
            request.item_id,
            user_id,
            request.content.trim(),
        )
        .await?;
        Self::notify_participants(
            pool,
            owner_id,
            &request.item_type,
            request.item_id,
            user_id,
            &row,
        )
        .await;
        Self::broadcast_event(
            pool,
            owner_id,
            &request.item_type,
            request.item_id,
            user_id,
            &row,
        )
        .await;
        Ok(Self::item(row, user_id))
    }

    /// [H-B04-05] `authorized_owner` distingue 404 (elemento inexistente) de
    /// 403 (sin acceso), igual que list/send/count: el front puede diferenciar
    /// "no pasó nada" de "no tienes permiso" (ya tolera errores vía catch).
    pub async fn event(
        pool: &PgPool,
        user_id: Uuid,
        request: CreateTimelineEventRequest,
    ) -> Result<TimelineMutationResponse, AppError> {
        let owner_id =
            Self::authorized_owner(pool, user_id, &request.item_type, request.item_id).await?;
        let actor = UserRepository::find_by_id(pool, user_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Usuario no encontrado".into()))?;
        let description = action_description(&request.action);
        let content = match request.detail.as_deref() {
            Some(detail) if !detail.trim().is_empty() => {
                format!("{} {}: {}", actor.display_name, description, detail.trim())
            }
            _ => format!("{} {}", actor.display_name, description),
        };
        let metadata = request.metadata.unwrap_or_else(|| json!({}));
        TimelineRepository::insert_system(
            pool,
            TimelineSystemInsert {
                owner_id,
                item_type: &request.item_type,
                item_id: request.item_id,
                user_id,
                action: &request.action,
                content: &content,
                metadata: &metadata,
            },
        )
        .await?;
        Ok(TimelineMutationResponse {
            success: true,
            created: true,
        })
    }

    pub async fn count(
        pool: &PgPool,
        viewer_id: Uuid,
        item_type: &str,
        item_id: i64,
    ) -> Result<TimelineCountResponse, AppError> {
        let owner_id = Self::authorized_owner(pool, viewer_id, item_type, item_id).await?;
        Ok(TimelineCountResponse {
            total: TimelineRepository::count(pool, owner_id, item_type, item_id).await?,
        })
    }

    pub async fn unread(
        pool: &PgPool,
        viewer_id: Uuid,
        item_type: &str,
        item_id: i64,
    ) -> Result<TimelineUnreadResponse, AppError> {
        let owner_id = Self::authorized_owner(pool, viewer_id, item_type, item_id).await?;
        Ok(TimelineUnreadResponse {
            unread: TimelineRepository::unread(pool, viewer_id, owner_id, item_type, item_id)
                .await?,
        })
    }

    pub async fn mark_read(
        pool: &PgPool,
        viewer_id: Uuid,
        request: MarkTimelineReadRequest,
    ) -> Result<TimelineMutationResponse, AppError> {
        let owner_id =
            Self::authorized_owner(pool, viewer_id, &request.item_type, request.item_id).await?;
        let marked = TimelineRepository::mark_read(
            pool,
            viewer_id,
            owner_id,
            &request.item_type,
            request.item_id,
        )
        .await?;
        Ok(TimelineMutationResponse {
            success: true,
            created: marked,
        })
    }

    async fn authorized_owner(
        pool: &PgPool,
        viewer_id: Uuid,
        item_type: &str,
        item_id: i64,
    ) -> Result<Uuid, AppError> {
        let owner_id = TimelineRepository::owner_id(pool, viewer_id, item_type, item_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Elemento no encontrado".into()))?;
        if Self::has_access(pool, viewer_id, owner_id, item_type, item_id).await? {
            Ok(owner_id)
        } else {
            Err(AppError::Forbidden(
                "No tienes acceso a este elemento".into(),
            ))
        }
    }

    async fn has_access(
        pool: &PgPool,
        viewer_id: Uuid,
        owner_id: Uuid,
        item_type: &str,
        item_id: i64,
    ) -> Result<bool, AppError> {
        Ok(
            SharedRepository::access(pool, viewer_id, item_type, item_id, owner_id)
                .await?
                .is_some(),
        )
    }

    async fn notify_participants(
        pool: &PgPool,
        owner_id: Uuid,
        item_type: &str,
        item_id: i64,
        sender_id: Uuid,
        row: &TimelineRow,
    ) {
        let Ok(participants) =
            TimelineRepository::participant_ids(pool, owner_id, item_type, item_id).await
        else {
            return;
        };
        for participant_id in participants.into_iter().filter(|id| *id != sender_id) {
            NotificationService::emit(pool, participant_id, "mensaje_chat", "Nuevo mensaje", Some(row.content.as_str()), json!({ "messageId": row.id, "itemType": item_type, "itemId": item_id, "senderId": sender_id }), Some(format!("timeline:{}:{}", row.id, participant_id))).await;
        }
    }

    /// Emite el evento por WebSocket a los participantes conectados del item.
    async fn broadcast_event(
        pool: &PgPool,
        owner_id: Uuid,
        item_type: &str,
        item_id: i64,
        sender_id: Uuid,
        row: &TimelineRow,
    ) {
        let Ok(mut participants) =
            TimelineRepository::participant_ids(pool, owner_id, item_type, item_id).await
        else {
            return;
        };
        participants.push(sender_id);
        let event = serde_json::json!({
            "type": "timeline",
            "data": {
                "id": row.id,
                "itemType": item_type,
                "itemId": item_id,
                "messageType": row.message_type,
                "content": row.content,
                "userId": row.user_id,
                "userName": row.user_name,
                "createdAt": row.created_at,
            }
        });
        crate::services::RealtimeHub::global().publish_to(&participants, event);
    }

    fn item(row: TimelineRow, viewer_id: Uuid) -> TimelineItem {
        TimelineItem {
            id: row.id,
            item_type: row.item_type,
            item_id: row.item_id,
            user_id: row.user_id,
            user_name: row.user_name,
            avatar_url: row.avatar_url,
            message_type: row.message_type,
            content: row.content,
            system_action: row.system_action,
            metadata: row.metadata,
            created_at: row.created_at,
            is_own: row.user_id == viewer_id,
        }
    }
}

fn action_description(action: &str) -> &str {
    match action {
        "creado" => "creó este elemento",
        "editado" => "editó",
        "completado" => "marcó como completado",
        "reabierto" => "reabrió el elemento",
        "asignado" => "asignó",
        "desasignado" => "quitó la asignación de",
        "adjunto_agregado" => "agregó un adjunto",
        "adjunto_eliminado" => "eliminó un adjunto",
        "prioridad" => "cambió la prioridad a",
        "urgencia" => "cambió la urgencia a",
        "fecha_limite" => "cambió la fecha límite",
        "participante_agregado" => "agregó a",
        "participante_removido" => "removió a",
        "compartido" => "compartió el elemento",
        "descripcion" => "modificó la descripción",
        "nombre" => "cambió el nombre a",
        "repeticion" => "cambió la repetición",
        _ => "actualizó el elemento",
    }
}
