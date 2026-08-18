use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;

use crate::errors::AppError;
use crate::models::{TeamConnection, TeamCounts, TeamMember, TeamOverview, TeamUser};
use crate::repositories::{
    CollaborationRepository, TeamConnectionRow, TeamConnectionViewRow, TeamResponseOutcome,
    UserRepository,
};
use crate::services::NotificationService;

pub struct CollaborationService;

impl CollaborationService {
    pub async fn activate_pending(
        pool: &PgPool,
        addressee_id: Uuid,
        addressee_email: &str,
    ) -> Result<u64, AppError> {
        Ok(CollaborationRepository::activate_pending(pool, addressee_id, addressee_email).await?)
    }

    pub async fn send_request(
        pool: &PgPool,
        requester_id: Uuid,
        email: &str,
    ) -> Result<TeamConnection, AppError> {
        let email = email.trim().to_lowercase();
        let target = UserRepository::find_by_email(pool, &email).await?;
        if target.as_ref().is_some_and(|user| user.id == requester_id) {
            return Err(AppError::Validation(
                "No puedes enviarte una solicitud a ti mismo".into(),
            ));
        }

        let row = CollaborationRepository::create_request(
            pool,
            requester_id,
            target.as_ref().map(|user| user.id),
            &email,
        )
        .await
        .map_err(map_collaboration_error)?
        .ok_or_else(|| {
            AppError::Conflict("Ya existe una conexión activa o solicitud pendiente".into())
        })?;

        let (row, created) = row;
        if !created {
            return Err(AppError::Conflict(
                "Ya existe una conexión activa o solicitud pendiente".into(),
            ));
        }

        let connection_id = row.id;
        let addressee_id = row.addressee_id;
        let response = Self::connection(pool, row, requester_id, true).await?;
        if let Some(addressee_id) = addressee_id {
            NotificationService::emit(
                pool,
                addressee_id,
                "solicitud_equipo",
                "Nueva solicitud de equipo",
                Some("Has recibido una nueva solicitud de conexión."),
                json!({ "connectionId": connection_id, "actorId": requester_id }),
                Some(format!("team-request:{connection_id}:received")),
            )
            .await;
        }
        Ok(response)
    }

    pub async fn overview(pool: &PgPool, user_id: Uuid) -> Result<TeamOverview, AppError> {
        Self::overview_page(pool, user_id, 1, 50).await
    }

    pub async fn overview_page(
        pool: &PgPool,
        user_id: Uuid,
        page: i64,
        per_page: i64,
    ) -> Result<TeamOverview, AppError> {
        if !(1..=100).contains(&per_page) || page < 1 {
            return Err(AppError::Validation(
                "la página y el tamaño de página no son válidos".into(),
            ));
        }
        let offset = (page - 1)
            .checked_mul(per_page)
            .ok_or_else(|| AppError::Validation("página de equipo demasiado grande".into()))?;
        let received =
            CollaborationRepository::list_received(pool, user_id, per_page, offset).await?;
        let sent = CollaborationRepository::list_sent(pool, user_id, per_page, offset).await?;
        let members =
            CollaborationRepository::list_members(pool, user_id, per_page, offset).await?;
        let (received_count, sent_count, member_count) =
            CollaborationRepository::counts(pool, user_id).await?;

        let mut received_response = Vec::with_capacity(received.len());
        for row in received {
            received_response.push(Self::connection_view(row, false));
        }
        let mut sent_response = Vec::with_capacity(sent.len());
        for row in sent {
            sent_response.push(Self::connection_view(row, true));
        }
        let mut member_response = Vec::with_capacity(members.len());
        for row in members {
            if let Some(user_id) = row.user_id {
                if let (Some(display_name), Some(email)) = (row.user_display_name, row.user_email) {
                    member_response.push(TeamMember {
                        id: user_id,
                        connection_id: row.id,
                        user: TeamUser {
                            id: user_id,
                            display_name,
                            email,
                            avatar_url: row.user_avatar_url,
                        },
                        connected_at: row.responded_at,
                    });
                }
            }
        }

        let received_len = i64::try_from(received_response.len()).unwrap_or(i64::MAX);
        let sent_len = i64::try_from(sent_response.len()).unwrap_or(i64::MAX);
        let member_len = i64::try_from(member_response.len()).unwrap_or(i64::MAX);

        Ok(TeamOverview {
            received: received_response,
            sent: sent_response,
            members: member_response,
            counts: TeamCounts {
                received: received_count,
                sent: sent_count,
                members: member_count,
            },
            page,
            per_page,
            has_more: received_count > offset.saturating_add(received_len)
                || sent_count > offset.saturating_add(sent_len)
                || member_count > offset.saturating_add(member_len),
        })
    }

    pub async fn pending_count(pool: &PgPool, user_id: Uuid) -> Result<i64, AppError> {
        Ok(CollaborationRepository::pending_count(pool, user_id).await?)
    }

    pub async fn respond(
        pool: &PgPool,
        user_id: Uuid,
        id: Uuid,
        action: &str,
    ) -> Result<TeamConnection, AppError> {
        match CollaborationRepository::respond(pool, id, user_id, action).await? {
            TeamResponseOutcome::Updated(row) => {
                let connection_id = row.id;
                let requester_id = row.requester_id;
                let response = Self::connection(pool, row, user_id, false).await?;
                if action == "accept" {
                    NotificationService::emit(
                        pool,
                        requester_id,
                        "solicitud_aceptada",
                        "Solicitud de equipo aceptada",
                        Some("Tu solicitud de conexión fue aceptada."),
                        json!({ "connectionId": connection_id, "actorId": user_id }),
                        Some(format!("team-request:{connection_id}:accepted")),
                    )
                    .await;
                }
                Ok(response)
            }
            TeamResponseOutcome::NotFound => {
                Err(AppError::NotFound("Solicitud no encontrada".into()))
            }
            TeamResponseOutcome::Forbidden => Err(AppError::Forbidden(
                "Solo el destinatario puede responder esta solicitud".into(),
            )),
            TeamResponseOutcome::AlreadyHandled => Err(AppError::Conflict(
                "Esta solicitud ya fue respondida".into(),
            )),
        }
    }

    pub async fn remove(pool: &PgPool, user_id: Uuid, id: Uuid) -> Result<(), AppError> {
        if CollaborationRepository::remove(pool, id, user_id).await? {
            Ok(())
        } else {
            Err(AppError::NotFound("Conexión no encontrada".into()))
        }
    }

    async fn connection(
        pool: &PgPool,
        row: TeamConnectionRow,
        user_id: Uuid,
        is_mine: bool,
    ) -> Result<TeamConnection, AppError> {
        let other_id = if row.requester_id == user_id {
            row.addressee_id
        } else {
            Some(row.requester_id)
        };
        let user = match other_id {
            Some(id) => UserRepository::find_by_id(pool, id)
                .await?
                .map(|user| TeamUser {
                    id: user.id,
                    display_name: user.display_name,
                    email: user.email,
                    avatar_url: user.avatar_url,
                }),
            None => None,
        };
        Ok(TeamConnection {
            id: row.id,
            status: row.status,
            requested_at: row.requested_at,
            responded_at: row.responded_at,
            email: row.addressee_email,
            user,
            is_mine,
        })
    }

    fn connection_view(row: TeamConnectionViewRow, is_mine: bool) -> TeamConnection {
        TeamConnection {
            id: row.id,
            status: row.status,
            requested_at: row.requested_at,
            responded_at: row.responded_at,
            email: row.addressee_email,
            user: row.user_id.and_then(|id| {
                Some(TeamUser {
                    id,
                    display_name: row.user_display_name?,
                    email: row.user_email?,
                    avatar_url: row.user_avatar_url,
                })
            }),
            is_mine,
        }
    }
}

fn map_collaboration_error(error: sqlx::Error) -> AppError {
    if let sqlx::Error::Database(database_error) = &error {
        if database_error.code().as_deref() == Some("23505") {
            return AppError::Conflict(
                "Ya existe una conexión activa o solicitud pendiente".into(),
            );
        }
    }
    AppError::Database(error)
}
