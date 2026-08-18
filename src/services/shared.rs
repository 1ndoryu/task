use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;

use crate::errors::AppError;
use crate::models::{
    PaginatedSharedItems, SharedAccess, SharedAccessResponse, SharedCounts, SharedCreateRequest,
    SharedItem, SharedParticipant, SharedParticipantsResponse, SharedRoleRequest, SharedUser,
};
use crate::repositories::{SharedCreateOutcome, SharedItemRow, SharedRepository, UserRepository};
use crate::services::NotificationService;

pub struct SharedService;

impl SharedService {
    pub async fn create(
        pool: &PgPool,
        owner_id: Uuid,
        request: SharedCreateRequest,
    ) -> Result<SharedItem, AppError> {
        if owner_id == request.user_id {
            return Err(AppError::Validation(
                "No puedes compartir contigo mismo".into(),
            ));
        }
        if UserRepository::find_by_id(pool, request.user_id)
            .await?
            .is_none()
        {
            return Err(AppError::NotFound(
                "Usuario destinatario no encontrado".into(),
            ));
        }
        match SharedRepository::create(
            pool,
            owner_id,
            request.user_id,
            &request.item_type,
            request.item_id,
            &request.role,
        )
        .await
        .map_err(map_shared_error)?
        {
            SharedCreateOutcome::Created(row) => {
                let recipient_id = row.recipient_id;
                let shared_id = row.id;
                NotificationService::emit(
                    pool,
                    recipient_id,
                    "elemento_compartido",
                    "Elemento compartido contigo",
                    Some("Alguien compartió un elemento contigo."),
                    json!({
                        "sharedId": shared_id,
                        "itemType": row.item_type,
                        "itemId": row.item_legacy_id,
                        "ownerId": row.owner_id
                    }),
                    Some(format!("share:{shared_id}:created")),
                )
                .await;
                Ok(Self::item(*row))
            }
            SharedCreateOutcome::ItemNotFound => {
                Err(AppError::NotFound("Elemento no encontrado".into()))
            }
            SharedCreateOutcome::NotTeammates => Err(AppError::Forbidden(
                "Solo puedes compartir con compañeros aceptados".into(),
            )),
        }
    }

    pub async fn received(
        pool: &PgPool,
        user_id: Uuid,
        page: i64,
        per_page: i64,
        item_type: Option<&str>,
    ) -> Result<PaginatedSharedItems, AppError> {
        Self::list(pool, user_id, page, per_page, item_type, false).await
    }
    pub async fn owned(
        pool: &PgPool,
        user_id: Uuid,
        page: i64,
        per_page: i64,
        item_type: Option<&str>,
    ) -> Result<PaginatedSharedItems, AppError> {
        Self::list(pool, user_id, page, per_page, item_type, true).await
    }

    async fn list(
        pool: &PgPool,
        user_id: Uuid,
        page: i64,
        per_page: i64,
        item_type: Option<&str>,
        owned: bool,
    ) -> Result<PaginatedSharedItems, AppError> {
        if page < 1 || !(1..=100).contains(&per_page) {
            return Err(AppError::Validation(
                "página o tamaño de página inválidos".into(),
            ));
        }
        let offset = (page - 1)
            .checked_mul(per_page)
            .ok_or_else(|| AppError::Validation("página demasiado grande".into()))?;
        let items = if owned {
            SharedRepository::list_owned(pool, user_id, item_type, per_page, offset).await?
        } else {
            SharedRepository::list_received(pool, user_id, item_type, per_page, offset).await?
        };
        let total = if owned {
            SharedRepository::count_owned(pool, user_id, item_type).await?
        } else {
            SharedRepository::count_received(pool, user_id, item_type).await?
        };
        let has_more =
            total > offset.saturating_add(i64::try_from(items.len()).unwrap_or(i64::MAX));
        Ok(PaginatedSharedItems {
            items: items.into_iter().map(Self::item).collect(),
            page,
            per_page,
            has_more,
            total,
        })
    }

    pub async fn counts(pool: &PgPool, user_id: Uuid) -> Result<SharedCounts, AppError> {
        let (tasks, projects, habits) = SharedRepository::counts_received(pool, user_id).await?;
        Ok(SharedCounts {
            tasks,
            projects,
            habits,
            total: tasks + projects + habits,
        })
    }

    pub async fn participants(
        pool: &PgPool,
        user_id: Uuid,
        item_type: &str,
        item_id: i64,
        owner_id: Uuid,
    ) -> Result<SharedParticipantsResponse, AppError> {
        if !SharedRepository::item_exists(pool, owner_id, item_type, item_id).await? {
            return Err(AppError::NotFound("Elemento no encontrado".into()));
        }
        if SharedRepository::access(pool, user_id, item_type, item_id, owner_id)
            .await?
            .is_none()
        {
            return Err(AppError::Forbidden(
                "No tienes acceso a los participantes".into(),
            ));
        }
        let owner = UserRepository::find_by_id(pool, owner_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Propietario no encontrado".into()))?;
        let mut participants = vec![SharedParticipant {
            id: None,
            user: SharedUser {
                id: owner.id,
                display_name: owner.display_name,
                email: owner.email,
                avatar_url: owner.avatar_url,
            },
            role: "propietario".into(),
            is_owner: true,
            can_edit: true,
            can_delete: true,
        }];
        participants.extend(
            SharedRepository::participants(pool, owner_id, item_type, item_id)
                .await?
                .into_iter()
                .map(|row| {
                    let can_edit = row.role == "colaborador";
                    SharedParticipant {
                        id: Some(row.id),
                        user: SharedUser {
                            id: row.user_id,
                            display_name: row.display_name,
                            email: row.email,
                            avatar_url: row.avatar_url,
                        },
                        role: row.role,
                        is_owner: false,
                        can_edit,
                        can_delete: false,
                    }
                }),
        );
        Ok(SharedParticipantsResponse {
            item_type: item_type.into(),
            item_id,
            owner_id,
            participants,
        })
    }

    pub async fn update_role(
        pool: &PgPool,
        owner_id: Uuid,
        id: Uuid,
        request: SharedRoleRequest,
    ) -> Result<SharedItem, AppError> {
        let existing = SharedRepository::get(pool, id)
            .await?
            .ok_or_else(|| AppError::NotFound("Compartido no encontrado".into()))?;
        if existing.owner_id != owner_id {
            return Err(AppError::Forbidden(
                "Solo el propietario puede cambiar el rol".into(),
            ));
        }
        if !SharedRepository::update_role(pool, id, owner_id, &request.role).await? {
            return Err(AppError::NotFound("Compartido no encontrado".into()));
        }
        Ok(Self::item(
            SharedRepository::get(pool, id)
                .await?
                .ok_or_else(|| AppError::NotFound("Compartido no encontrado".into()))?,
        ))
    }

    pub async fn remove(pool: &PgPool, user_id: Uuid, id: Uuid) -> Result<(), AppError> {
        if SharedRepository::remove(pool, id, user_id).await? {
            Ok(())
        } else {
            Err(AppError::NotFound("Compartido no encontrado".into()))
        }
    }

    pub async fn access(
        pool: &PgPool,
        user_id: Uuid,
        item_type: &str,
        item_id: i64,
        owner_id: Uuid,
    ) -> Result<SharedAccessResponse, AppError> {
        let role = SharedRepository::access(pool, user_id, item_type, item_id, owner_id).await?;
        Ok(SharedAccessResponse {
            has_access: role.is_some(),
            access: role.map(|role| SharedAccess {
                can_edit: role == "propietario" || role == "colaborador",
                can_delete: role == "propietario",
                role,
            }),
        })
    }

    fn item(row: SharedItemRow) -> SharedItem {
        SharedItem {
            id: row.id,
            item_type: row.item_type,
            item_id: row.item_legacy_id,
            owner: SharedUser {
                id: row.owner_id,
                display_name: row.owner_display_name,
                email: row.owner_email,
                avatar_url: row.owner_avatar_url,
            },
            recipient: SharedUser {
                id: row.recipient_id,
                display_name: row.recipient_display_name,
                email: row.recipient_email,
                avatar_url: row.recipient_avatar_url,
            },
            role: row.role,
            created_at: row.created_at,
            updated_at: row.updated_at,
        }
    }
}

fn map_shared_error(error: sqlx::Error) -> AppError {
    if let sqlx::Error::Database(database_error) = &error {
        if database_error.code().as_deref() == Some("23505") {
            return AppError::Conflict("Este elemento ya está compartido con este usuario".into());
        }
    }
    AppError::Database(error)
}
