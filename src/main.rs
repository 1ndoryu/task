use glory_backend::config::AppConfig;
use glory_backend::handlers;
use glory_backend::services::SessionService;
use std::time::Duration;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| {
                tracing_subscriber::EnvFilter::new("glory_backend=debug,tower_http=debug")
            }),
        )
        .init();

    let config = AppConfig::from_env()?;

    let pool = sqlx::postgres::PgPoolOptions::new()
        .max_connections(config.db_max_connections)
        .min_connections(config.db_min_connections)
        .acquire_timeout(Duration::from_secs(config.db_acquire_timeout_seconds))
        .idle_timeout(Duration::from_secs(config.db_idle_timeout_seconds))
        .max_lifetime(Duration::from_secs(config.db_max_lifetime_seconds))
        .connect(&config.database_url)
        .await?;

    sqlx::migrate!().run(&pool).await?;

    let cleanup_pool = pool.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_mins(15));
        loop {
            interval.tick().await;
            match SessionService::cleanup_expired(&cleanup_pool).await {
                Ok(count) if count > 0 => {
                    tracing::info!(removed = count, "Sesiones expiradas limpiadas");
                }
                Ok(_) => {}
                Err(error) => tracing::warn!(%error, "No se pudieron limpiar sesiones expiradas"),
            }
        }
    });

    let addr = format!("{}:{}", config.host, config.port);
    tracing::info!("Servidor iniciando en {addr}");
    tracing::info!("Swagger UI disponible en http://{addr}/swagger-ui/");

    let app = handlers::create_router(pool, config);
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<std::net::SocketAddr>(),
    )
    .await?;

    Ok(())
}
