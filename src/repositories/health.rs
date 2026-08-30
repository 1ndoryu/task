// sentinel-disable-file sqlx-query-sin-macro sqlx-query-as-sin-macro
// [por que] sqlx sin feature "macros" ni DB en compile-time: query! rompe el build.
// [01-09-2026] Probre de conectividad de PostgreSQL extraído del handler de
// readiness a la capa de repositorio (DIP / handler-accede-bd-rs).
use sqlx::PgPool;

pub struct HealthRepository;

impl HealthRepository {
    /// Confirma que la base responde (`SELECT 1`) para el readiness check.
    pub async fn ping(pool: &PgPool) -> Result<(), sqlx::Error> {
        sqlx::query("SELECT 1")
            .execute(pool)
            .await
            .map(|_| ())
    }
}