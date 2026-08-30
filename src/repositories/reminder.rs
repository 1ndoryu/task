// sentinel-disable-file sqlx-query-sin-macro sqlx-query-as-sin-macro
// [por que] sqlx sin feature "macros" ni DB en compile-time: query! rompe el build.
use chrono::{DateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::{CreateReminderRequest, Reminder};

pub struct ReminderRepository;

/// Resultado de una creación: `Created` (fila nueva) o `Idempotent` (ya existía
/// una fila con la misma clave de idempotencia del usuario — se devuelve la que
/// hay, sin duplicar).
pub enum ReminderCreateOutcome {
    Created(Reminder),
    Idempotent(Reminder),
}

impl ReminderRepository {
    /// Crea un recordatorio. La clave `(user_id, idempotency_key)` es única:
    /// si la propuesta se confirma dos veces, la segunda consulta encuentra la
    /// fila creada por la primera y la devuelve sin insertar otra.
    pub async fn create(
        pool: &PgPool,
        user_id: Uuid,
        req: &CreateReminderRequest,
    ) -> Result<ReminderCreateOutcome, sqlx::Error> {
        /* [28-08-2026] Inserción atómica con ON CONFLICT: el find-then-insert
         * anterior tenía una carrera — dos confirmaciones concurrentes con la
         * misma key pasaban ambas el find, y la segunda chocaba con el UNIQUE
         * (user_id, idempotency_key) devolviendo 500 en vez de la fila ya
         * creada. ON CONFLICT DO NOTHING + fetch posterior lo hace libre de
         * carrera. Las filas sin key (NULL) nunca entran en conflicto. */
        let fila = sqlx::query_as::<_, Reminder>(
            "INSERT INTO reminders (user_id, titulo, mensaje, programado_para, idempotency_key) \
             VALUES ($1, $2, $3, $4, $5) \
             ON CONFLICT (user_id, idempotency_key) DO NOTHING \
             RETURNING id, user_id, titulo, mensaje, programado_para, estado, creado_en, actualizado_en",
        )
        .bind(user_id)
        .bind(&req.titulo)
        .bind(&req.mensaje)
        .bind(req.programado_para)
        .bind(req.idempotency_key.as_deref())
        .fetch_optional(pool)
        .await?;
        match fila {
            Some(fila) => Ok(ReminderCreateOutcome::Created(fila)),
            None => {
                let key = req.idempotency_key.as_deref().unwrap_or_default();
                let existente = Self::find_by_idempotency_key(pool, user_id, key).await?;
                match existente {
                    Some(existente) => Ok(ReminderCreateOutcome::Idempotent(existente)),
                    None => Err(sqlx::Error::RowNotFound),
                }
            }
        }
    }

    pub async fn find_by_id(
        pool: &PgPool,
        id: Uuid,
        user_id: Uuid,
    ) -> Result<Option<Reminder>, sqlx::Error> {
        sqlx::query_as::<_, Reminder>(
            "SELECT id, user_id, titulo, mensaje, programado_para, estado, creado_en, actualizado_en \
             FROM reminders WHERE id = $1 AND user_id = $2",
        )
        .bind(id)
        .bind(user_id)
        .fetch_optional(pool)
        .await
    }

    async fn find_by_idempotency_key(
        pool: &PgPool,
        user_id: Uuid,
        key: &str,
    ) -> Result<Option<Reminder>, sqlx::Error> {
        sqlx::query_as::<_, Reminder>(
            "SELECT id, user_id, titulo, mensaje, programado_para, estado, creado_en, actualizado_en \
             FROM reminders WHERE user_id = $1 AND idempotency_key = $2",
        )
        .bind(user_id)
        .bind(key)
        .fetch_optional(pool)
        .await
    }

    pub async fn list(
        pool: &PgPool,
        user_id: Uuid,
        estado: Option<&str>,
    ) -> Result<(Vec<Reminder>, i64), sqlx::Error> {
        let items = sqlx::query_as::<_, Reminder>(
            "SELECT id, user_id, titulo, mensaje, programado_para, estado, creado_en, actualizado_en \
             FROM reminders \
             WHERE user_id = $1 AND ($2::text IS NULL OR estado = $2) \
             ORDER BY programado_para ASC, creado_en DESC",
        )
        .bind(user_id)
        .bind(estado)
        .fetch_all(pool)
        .await?;
        let (total,): (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM reminders \
             WHERE user_id = $1 AND ($2::text IS NULL OR estado = $2)",
        )
        .bind(user_id)
        .bind(estado)
        .fetch_one(pool)
        .await?;
        Ok((items, total))
    }

    /// Actualización parcial (COALESCE) sobre campos opcionales; solo afecta a
    /// filas del usuario. Devuelve `None` si no existe o es ajena.
    pub async fn update(
        pool: &PgPool,
        id: Uuid,
        user_id: Uuid,
        titulo: Option<&str>,
        mensaje: Option<&str>,
        programado_para: Option<DateTime<Utc>>,
    ) -> Result<Option<Reminder>, sqlx::Error> {
        sqlx::query_as::<_, Reminder>(
            "UPDATE reminders \
             SET titulo = COALESCE($1, titulo), \
                 mensaje = COALESCE($2, mensaje), \
                 programado_para = COALESCE($3, programado_para), \
                 actualizado_en = NOW() \
             WHERE id = $4 AND user_id = $5 \
             RETURNING id, user_id, titulo, mensaje, programado_para, estado, creado_en, actualizado_en",
        )
        .bind(titulo)
        .bind(mensaje)
        .bind(programado_para)
        .bind(id)
        .bind(user_id)
        .fetch_optional(pool)
        .await
    }

    pub async fn set_estado(
        pool: &PgPool,
        id: Uuid,
        user_id: Uuid,
        estado: &str,
    ) -> Result<Option<Reminder>, sqlx::Error> {
        sqlx::query_as::<_, Reminder>(
            "UPDATE reminders \
             SET estado = $1, actualizado_en = NOW() \
             WHERE id = $2 AND user_id = $3 \
             RETURNING id, user_id, titulo, mensaje, programado_para, estado, creado_en, actualizado_en",
        )
        .bind(estado)
        .bind(id)
        .bind(user_id)
        .fetch_optional(pool)
        .await
    }

    pub async fn delete(pool: &PgPool, id: Uuid, user_id: Uuid) -> Result<bool, sqlx::Error> {
        let resultado = sqlx::query("DELETE FROM reminders WHERE id = $1 AND user_id = $2")
            .bind(id)
            .bind(user_id)
            .execute(pool)
            .await?;
        Ok(resultado.rows_affected() > 0)
    }
}
