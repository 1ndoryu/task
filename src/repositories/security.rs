use sqlx::PgPool;
use uuid::Uuid;

use crate::models::security::{ApiTokenRow, E2eKeyRow};

pub struct SecurityRepository;

impl SecurityRepository {
    pub async fn get_key(pool: &PgPool, user_id: Uuid) -> Result<Option<E2eKeyRow>, sqlx::Error> {
        sqlx::query_as::<_, E2eKeyRow>(
            "SELECT user_id, clave_cifrada, algoritmo, derivacion, actualizado_en
             FROM e2e_keys WHERE user_id = $1",
        )
        .bind(user_id)
        .fetch_optional(pool)
        .await
    }

    pub async fn upsert_key(
        pool: &PgPool,
        user_id: Uuid,
        clave_cifrada: &str,
    ) -> Result<E2eKeyRow, sqlx::Error> {
        sqlx::query_as::<_, E2eKeyRow>(
            "INSERT INTO e2e_keys (user_id, clave_cifrada)
             VALUES ($1, $2)
             ON CONFLICT (user_id) DO UPDATE
               SET clave_cifrada = EXCLUDED.clave_cifrada,
                   actualizado_en = NOW()
             RETURNING user_id, clave_cifrada, algoritmo, derivacion, actualizado_en",
        )
        .bind(user_id)
        .bind(clave_cifrada)
        .fetch_one(pool)
        .await
    }

    pub async fn create_token(
        pool: &PgPool,
        user_id: Uuid,
        token_hash: &str,
        nombre: &str,
    ) -> Result<ApiTokenRow, sqlx::Error> {
        sqlx::query_as::<_, ApiTokenRow>(
            "INSERT INTO api_tokens (user_id, token_hash, nombre)
             VALUES ($1, $2, $3)
             RETURNING id, user_id, token_hash, nombre, creado_en, revocado_en",
        )
        .bind(user_id)
        .bind(token_hash)
        .bind(nombre)
        .fetch_one(pool)
        .await
    }

    pub async fn list_tokens(pool: &PgPool, user_id: Uuid) -> Result<Vec<ApiTokenRow>, sqlx::Error> {
        sqlx::query_as::<_, ApiTokenRow>(
            "SELECT id, user_id, token_hash, nombre, creado_en, revocado_en
             FROM api_tokens WHERE user_id = $1 AND revocado_en IS NULL
             ORDER BY creado_en DESC",
        )
        .bind(user_id)
        .fetch_all(pool)
        .await
    }

    pub async fn revoke_token(pool: &PgPool, user_id: Uuid, id: Uuid) -> Result<bool, sqlx::Error> {
        let res = sqlx::query(
            "UPDATE api_tokens SET revocado_en = NOW()
             WHERE id = $1 AND user_id = $2 AND revocado_en IS NULL",
        )
        .bind(id)
        .bind(user_id)
        .execute(pool)
        .await?;
        Ok(res.rows_affected() > 0)
    }
}
