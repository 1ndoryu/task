use sqlx::PgPool;
use uuid::Uuid;

use crate::models::User;

pub struct UserRepository;

impl UserRepository {
    /// Crea un usuario y retorna el registro completo
    pub async fn create(
        pool: &PgPool,
        email: &str,
        password_hash: &str,
    ) -> Result<User, sqlx::Error> {
        let id = Uuid::new_v4();
        let email = email.trim().to_lowercase();
        sqlx::query_as::<_, User>(
            "INSERT INTO users (id, email, password_hash) \
             VALUES ($1, $2, $3) \
             RETURNING id, email, password_hash, display_name, avatar_url, es_admin, created_at",
        )
        .bind(id)
        .bind(email)
        .bind(password_hash)
        .fetch_one(pool)
        .await
    }

    /// Busca un usuario por email
    pub async fn find_by_email(pool: &PgPool, email: &str) -> Result<Option<User>, sqlx::Error> {
        sqlx::query_as::<_, User>(
            "SELECT id, email, password_hash, display_name, avatar_url, es_admin, created_at \
             FROM users WHERE lower(email) = lower($1)",
        )
        .bind(email)
        .fetch_optional(pool)
        .await
    }

    /// Busca un usuario por ID
    pub async fn find_by_id(pool: &PgPool, id: Uuid) -> Result<Option<User>, sqlx::Error> {
        sqlx::query_as::<_, User>(
            "SELECT id, email, password_hash, display_name, avatar_url, es_admin, created_at \
             FROM users WHERE id = $1",
        )
        .bind(id)
        .fetch_optional(pool)
        .await
    }

    pub async fn update_profile(
        pool: &PgPool,
        id: Uuid,
        display_name: &str,
        avatar_url: Option<&str>,
    ) -> Result<Option<User>, sqlx::Error> {
        sqlx::query_as::<_, User>(
            "UPDATE users SET display_name = $1, avatar_url = $2 \
             WHERE id = $3 \
             RETURNING id, email, password_hash, display_name, avatar_url, es_admin, created_at",
        )
        .bind(display_name)
        .bind(avatar_url)
        .bind(id)
        .fetch_optional(pool)
        .await
    }

    /// Actualiza el hash de contraseña (cambio de contraseña del perfil).
    pub async fn update_password(
        pool: &PgPool,
        id: Uuid,
        password_hash: &str,
    ) -> Result<Option<User>, sqlx::Error> {
        sqlx::query_as::<_, User>(
            "UPDATE users SET password_hash = $1 \
             WHERE id = $2 \
             RETURNING id, email, password_hash, display_name, avatar_url, es_admin, created_at",
        )
        .bind(password_hash)
        .bind(id)
        .fetch_optional(pool)
        .await
    }
}
