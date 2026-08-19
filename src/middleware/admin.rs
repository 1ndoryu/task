use uuid::Uuid;

use crate::errors::AppError;
use crate::repositories::UserRepository;
use crate::AppState;

/// Guard para endpoints de administración: solo usuarios con es_admin.
/// [H-B05-05] Vive en middleware (no en un handler concreto) para que
/// cualquier recurso admin lo use sin importarlo desde feedback.
pub async fn require_admin(state: &AppState, user_id: Uuid) -> Result<(), AppError> {
    let user = UserRepository::find_by_id(&state.pool, user_id)
        .await?
        .ok_or(AppError::Unauthorized)?;
    if !user.es_admin {
        return Err(AppError::Forbidden("Se requiere rol de administrador".into()));
    }
    Ok(())
}
