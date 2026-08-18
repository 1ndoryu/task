use sqlx::PgPool;
use uuid::Uuid;

use crate::errors::AppError;
use crate::models::dashboard::UpdateDashboardSettingsRequest;
use crate::models::DashboardReadResponse;
use crate::repositories::DashboardRepository;

pub struct DashboardService;

impl DashboardService {
    pub async fn read(pool: &PgPool, user_id: Uuid) -> Result<DashboardReadResponse, AppError> {
        DashboardRepository::read(pool, user_id)
            .await
            .map_err(AppError::from)
    }

    pub async fn update_settings(
        pool: &PgPool,
        user_id: Uuid,
        request: UpdateDashboardSettingsRequest,
    ) -> Result<(), AppError> {
        DashboardRepository::upsert_settings(
            pool,
            user_id,
            &request.notas,
            request.configuracion,
        )
        .await?;
        Ok(())
    }
}
