use sqlx::PgPool;
use uuid::Uuid;

use crate::models::{Note, NoteFolder};
use crate::repositories::escape::escape_like_literal;

pub struct NoteRepository;

impl NoteRepository {
    pub async fn create(
        pool: &PgPool,
        user_id: Uuid,
        title: &str,
        content: &str,
        folder_id: Option<Uuid>,
    ) -> Result<Note, sqlx::Error> {
        let id = Uuid::new_v4();
        sqlx::query_as::<_, Note>(
            "INSERT INTO notes (id, user_id, folder_id, title, content) \
             VALUES ($1, $2, $3, $4, $5) \
             RETURNING id, user_id, folder_id, title, content, created_at, updated_at",
        )
        .bind(id)
        .bind(user_id)
        .bind(folder_id)
        .bind(title)
        .bind(content)
        .fetch_one(pool)
        .await
    }

    pub async fn find_by_id(
        pool: &PgPool,
        id: Uuid,
        user_id: Uuid,
    ) -> Result<Option<Note>, sqlx::Error> {
        sqlx::query_as::<_, Note>(
            "SELECT id, user_id, folder_id, title, content, created_at, updated_at \
             FROM notes WHERE id = $1 AND user_id = $2",
        )
        .bind(id)
        .bind(user_id)
        .fetch_optional(pool)
        .await
    }

    pub async fn list(
        pool: &PgPool,
        user_id: Uuid,
        page: i64,
        per_page: i64,
        folder_id: Option<Uuid>,
        search: Option<&str>,
    ) -> Result<(Vec<Note>, i64), sqlx::Error> {
        let offset = page.saturating_sub(1).saturating_mul(per_page);
        let escaped_search = search.map(escape_like_literal);

        let notes = sqlx::query_as::<_, Note>(
            "SELECT id, user_id, folder_id, title, content, created_at, updated_at \
             FROM notes WHERE user_id = $1 \
               AND ($4::uuid IS NULL OR folder_id = $4) \
               AND ($5::text IS NULL OR title ILIKE '%' || $5 || '%' ESCAPE '\\' OR content ILIKE '%' || $5 || '%' ESCAPE '\\') \
             ORDER BY created_at DESC LIMIT $2 OFFSET $3",
        )
        .bind(user_id)
        .bind(per_page)
        .bind(offset)
        .bind(folder_id)
        .bind(escaped_search.as_deref())
        .fetch_all(pool)
        .await?;

        let (total,): (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM notes
             WHERE user_id = $1
               AND ($2::uuid IS NULL OR folder_id = $2)
               AND ($3::text IS NULL OR title ILIKE '%' || $3 || '%' ESCAPE '\\' OR content ILIKE '%' || $3 || '%' ESCAPE '\\')",
        )
            .bind(user_id)
            .bind(folder_id)
            .bind(escaped_search.as_deref())
            .fetch_one(pool)
            .await?;

        Ok((notes, total))
    }

    pub async fn update(
        pool: &PgPool,
        id: Uuid,
        user_id: Uuid,
        title: Option<&str>,
        content: Option<&str>,
    ) -> Result<Option<Note>, sqlx::Error> {
        sqlx::query_as::<_, Note>(
            "UPDATE notes \
             SET title = COALESCE($1, title), \
                 content = COALESCE($2, content), \
                 updated_at = NOW() \
             WHERE id = $3 AND user_id = $4 \
             RETURNING id, user_id, folder_id, title, content, created_at, updated_at",
        )
        .bind(title)
        .bind(content)
        .bind(id)
        .bind(user_id)
        .fetch_optional(pool)
        .await
    }

    pub async fn delete(pool: &PgPool, id: Uuid, user_id: Uuid) -> Result<bool, sqlx::Error> {
        let result = sqlx::query("DELETE FROM notes WHERE id = $1 AND user_id = $2")
            .bind(id)
            .bind(user_id)
            .execute(pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    pub async fn folder_belongs_to_user(
        pool: &PgPool,
        folder_id: Uuid,
        user_id: Uuid,
    ) -> Result<bool, sqlx::Error> {
        let (exists,): (bool,) = sqlx::query_as(
            "SELECT EXISTS(SELECT 1 FROM note_folders WHERE id = $1 AND user_id = $2)",
        )
        .bind(folder_id)
        .bind(user_id)
        .fetch_one(pool)
        .await?;
        Ok(exists)
    }

    pub async fn list_folders(
        pool: &PgPool,
        user_id: Uuid,
    ) -> Result<Vec<NoteFolder>, sqlx::Error> {
        sqlx::query_as::<_, NoteFolder>(
            "SELECT id, user_id, name, created_at, updated_at
             FROM note_folders WHERE user_id = $1 ORDER BY name ASC, id ASC",
        )
        .bind(user_id)
        .fetch_all(pool)
        .await
    }

    pub async fn create_folder(
        pool: &PgPool,
        user_id: Uuid,
        name: &str,
    ) -> Result<NoteFolder, sqlx::Error> {
        sqlx::query_as::<_, NoteFolder>(
            "INSERT INTO note_folders (user_id, name) VALUES ($1, $2)
             RETURNING id, user_id, name, created_at, updated_at",
        )
        .bind(user_id)
        .bind(name)
        .fetch_one(pool)
        .await
    }

    pub async fn rename_folder(
        pool: &PgPool,
        folder_id: Uuid,
        user_id: Uuid,
        name: &str,
    ) -> Result<Option<NoteFolder>, sqlx::Error> {
        sqlx::query_as::<_, NoteFolder>(
            "UPDATE note_folders SET name = $1, updated_at = NOW()
             WHERE id = $2 AND user_id = $3
             RETURNING id, user_id, name, created_at, updated_at",
        )
        .bind(name)
        .bind(folder_id)
        .bind(user_id)
        .fetch_optional(pool)
        .await
    }

    pub async fn delete_folder(
        pool: &PgPool,
        folder_id: Uuid,
        user_id: Uuid,
    ) -> Result<bool, sqlx::Error> {
        let result = sqlx::query("DELETE FROM note_folders WHERE id = $1 AND user_id = $2")
            .bind(folder_id)
            .bind(user_id)
            .execute(pool)
            .await?;
        Ok(result.rows_affected() > 0)
    }

    pub async fn move_to_folder(
        pool: &PgPool,
        note_id: Uuid,
        user_id: Uuid,
        folder_id: Option<Uuid>,
    ) -> Result<Option<Note>, sqlx::Error> {
        sqlx::query_as::<_, Note>(
            "UPDATE notes SET folder_id = $1, updated_at = NOW()
             WHERE id = $2 AND user_id = $3
             RETURNING id, user_id, folder_id, title, content, created_at, updated_at",
        )
        .bind(folder_id)
        .bind(note_id)
        .bind(user_id)
        .fetch_optional(pool)
        .await
    }
}

// [H-B03-06] `escape_like_literal` vive ahora en `repositories/escape.rs`
// (compartido con admin.rs).
