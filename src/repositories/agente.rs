// sentinel-disable-file sqlx-query-sin-macro sqlx-query-as-sin-macro
// [por que] sqlx sin feature "macros" ni DB en compile-time: query! rompe el build.
// [01-09-2026] Consultas del dominio agente (conversaciones, tareas programadas,
// memoria y skills) movidas del handler a la capa de repositorio (DIP /
// handler-accede-bd-rs). El handler ya no toca `sqlx` directamente.
use chrono::{DateTime, Utc};
use serde_json::Value;
use sqlx::PgPool;
use uuid::Uuid;

/// Payload de inserción de una tarea programada del agente ([parametros-excesivos]
/// exige <=8 params en `crear_tarea`; se agrupan en este struct).
pub struct TareaInsert<'a> {
    pub id: Uuid,
    pub user_id: Uuid,
    pub nombre: &'a str,
    pub prompt: &'a str,
    pub tipo: &'a str,
    pub cron_expr: Option<&'a str>,
    pub ejecutar_en: Option<DateTime<Utc>>,
    pub proxima: Option<DateTime<Utc>>,
}

pub struct AgenteRepository;

impl AgenteRepository {
    /// Conversación por id y propietario: `(id, modo, config)`.
    pub async fn buscar_conversacion(
        pool: &PgPool,
        id: Uuid,
        user_id: Uuid,
    ) -> Result<Option<(Uuid, String, Value)>, sqlx::Error> {
        sqlx::query_as(
            "SELECT id, modo, config FROM agente_conversaciones WHERE id = $1 AND user_id = $2",
        )
        .bind(id)
        .bind(user_id)
        .fetch_optional(pool)
        .await
    }

    pub async fn crear_conversacion(
        pool: &PgPool,
        id: Uuid,
        user_id: Uuid,
        titulo: &str,
        modo: &str,
        config: &Value,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            "INSERT INTO agente_conversaciones (id, user_id, titulo, modo, config) VALUES ($1, $2, $3, $4, $5)",
        )
        .bind(id)
        .bind(user_id)
        .bind(titulo)
        .bind(modo)
        .bind(config)
        .execute(pool)
        .await
        .map(|_| ())
    }

    /// Últimas 50 conversaciones del usuario: `(id, titulo, modo, config)`.
    pub async fn listar_conversaciones(
        pool: &PgPool,
        user_id: Uuid,
    ) -> Result<Vec<(Uuid, String, String, Value)>, sqlx::Error> {
        sqlx::query_as(
            "SELECT id, titulo, modo, config FROM agente_conversaciones
             WHERE user_id = $1 ORDER BY actualizado_en DESC LIMIT 50",
        )
        .bind(user_id)
        .fetch_all(pool)
        .await
    }

    /// Mensajes de una conversación (verificando propiedad): `(id, rol, contenido, creado_en)`.
    pub async fn listar_mensajes(
        pool: &PgPool,
        conversacion_id: Uuid,
        user_id: Uuid,
    ) -> Result<Vec<(i64, String, String, DateTime<Utc>)>, sqlx::Error> {
        sqlx::query_as(
            "SELECT m.id, m.rol, m.contenido, m.creado_en
             FROM agente_mensajes m
             JOIN agente_conversaciones c ON c.id = m.conversacion_id
             WHERE m.conversacion_id = $1 AND c.user_id = $2
             ORDER BY m.id ASC",
        )
        .bind(conversacion_id)
        .bind(user_id)
        .fetch_all(pool)
        .await
    }

    /// Renombra una conversación; devuelve filas afectadas (0 = no encontrada).
    pub async fn renombrar(
        pool: &PgPool,
        titulo: &str,
        id: Uuid,
        user_id: Uuid,
    ) -> Result<u64, sqlx::Error> {
        sqlx::query(
            "UPDATE agente_conversaciones SET titulo = $1, actualizado_en = NOW()
             WHERE id = $2 AND user_id = $3",
        )
        .bind(titulo)
        .bind(id)
        .bind(user_id)
        .execute(pool)
        .await
        .map(|r| r.rows_affected())
    }

    /// Config guardada de una conversación (para el reanudar).
    pub async fn cargar_config(
        pool: &PgPool,
        id: Uuid,
        user_id: Uuid,
    ) -> Result<Value, sqlx::Error> {
        sqlx::query_scalar("SELECT config FROM agente_conversaciones WHERE id = $1 AND user_id = $2")
            .bind(id)
            .bind(user_id)
            .fetch_one(pool)
            .await
    }

    /// Actualiza la config de una conversación; devuelve la fila si el propietario existía.
    /// `modo` opcional: si es `Some`, actualiza también la columna `modo` (de
    /// donde el runtime lee el modo de operación real en cada turno). Antes el
    /// modo solo viajaba en el JSON `config` y quedaba inerte.
    pub async fn actualizar_config(
        pool: &PgPool,
        config: &Value,
        modo: Option<&str>,
        id: Uuid,
        user_id: Uuid,
    ) -> Result<Option<(Uuid, String, String, Value)>, sqlx::Error> {
        match modo {
            Some(modo) => {
                sqlx::query_as(
                    "UPDATE agente_conversaciones SET config = $1, modo = $2, actualizado_en = NOW()
                     WHERE id = $3 AND user_id = $4 RETURNING id, titulo, modo, config",
                )
                .bind(config)
                .bind(modo)
                .bind(id)
                .bind(user_id)
                .fetch_optional(pool)
                .await
            }
            None => {
                sqlx::query_as(
                    "UPDATE agente_conversaciones SET config = $1, actualizado_en = NOW()
                     WHERE id = $2 AND user_id = $3 RETURNING id, titulo, modo, config",
                )
                .bind(config)
                .bind(id)
                .bind(user_id)
                .fetch_optional(pool)
                .await
            }
        }
    }

    /// Elimina una conversación; devuelve filas afectadas.
    pub async fn eliminar(pool: &PgPool, id: Uuid, user_id: Uuid) -> Result<u64, sqlx::Error> {
        sqlx::query("DELETE FROM agente_conversaciones WHERE id = $1 AND user_id = $2")
            .bind(id)
            .bind(user_id)
            .execute(pool)
            .await
            .map(|r| r.rows_affected())
    }

    /// Tareas programadas en estados activos (para el límite por usuario).
    pub async fn contar_tareas_activas(pool: &PgPool, user_id: Uuid) -> Result<i64, sqlx::Error> {
        let (n,): (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM agente_tareas_programadas
             WHERE user_id = $1 AND estado IN ('pendiente', 'ejecutando', 'completada')",
        )
        .bind(user_id)
        .fetch_one(pool)
        .await?;
        Ok(n)
    }

    pub async fn crear_tarea(pool: &PgPool, tarea: &TareaInsert<'_>) -> Result<(), sqlx::Error> {
        sqlx::query(
            "INSERT INTO agente_tareas_programadas
             (id, user_id, nombre, prompt, tipo, cron_expr, ejecutar_en, proxima_ejecucion)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        )
        .bind(tarea.id)
        .bind(tarea.user_id)
        .bind(tarea.nombre)
        .bind(tarea.prompt)
        .bind(tarea.tipo)
        .bind(tarea.cron_expr)
        .bind(tarea.ejecutar_en)
        .bind(tarea.proxima)
        .execute(pool)
        .await
        .map(|_| ())
    }

    /// Últimas 50 tareas del usuario con todos sus campos.
    pub async fn listar_tareas(
        pool: &PgPool,
        user_id: Uuid,
    ) -> Result<Vec<(Uuid, String, String, String, Option<String>, String, Option<DateTime<Utc>>, Option<String>)>, sqlx::Error> {
        sqlx::query_as(
            "SELECT id, nombre, prompt, tipo, cron_expr, estado, proxima_ejecucion, result_summary
             FROM agente_tareas_programadas
             WHERE user_id = $1
             ORDER BY creado_en DESC LIMIT 50",
        )
        .bind(user_id)
        .fetch_all(pool)
        .await
    }

    /// Elimina una tarea programada; devuelve filas afectadas.
    pub async fn eliminar_tarea(pool: &PgPool, id: Uuid, user_id: Uuid) -> Result<u64, sqlx::Error> {
        sqlx::query("DELETE FROM agente_tareas_programadas WHERE id = $1 AND user_id = $2")
            .bind(id)
            .bind(user_id)
            .execute(pool)
            .await
            .map(|r| r.rows_affected())
    }

    /// Entradas de memoria del usuario: `(clave, contenido)`.
    pub async fn listar_memoria(pool: &PgPool, user_id: Uuid) -> Result<Vec<(String, String)>, sqlx::Error> {
        sqlx::query_as(
            "SELECT clave, contenido FROM agente_memoria
             WHERE user_id = $1 ORDER BY actualizado_en DESC LIMIT 200",
        )
        .bind(user_id)
        .fetch_all(pool)
        .await
    }

    /// Upsert idempotente de una entrada de memoria por `(user_id, clave)`.
    pub async fn guardar_memoria(
        pool: &PgPool,
        user_id: Uuid,
        clave: &str,
        contenido: &str,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            "INSERT INTO agente_memoria (user_id, clave, contenido)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id, clave)
             DO UPDATE SET contenido = EXCLUDED.contenido, actualizado_en = NOW()",
        )
        .bind(user_id)
        .bind(clave)
        .bind(contenido)
        .execute(pool)
        .await
        .map(|_| ())
    }

    /// Elimina una entrada de memoria; devuelve filas afectadas.
    pub async fn eliminar_memoria(pool: &PgPool, user_id: Uuid, clave: &str) -> Result<u64, sqlx::Error> {
        sqlx::query("DELETE FROM agente_memoria WHERE user_id = $1 AND clave = $2")
            .bind(user_id)
            .bind(clave)
            .execute(pool)
            .await
            .map(|r| r.rows_affected())
    }

    /// Skills del usuario: `(id, nombre, descripcion, activa)`.
    pub async fn listar_skills(
        pool: &PgPool,
        user_id: Uuid,
    ) -> Result<Vec<(Uuid, String, String, bool)>, sqlx::Error> {
        sqlx::query_as(
            "SELECT id, nombre, descripcion, activa FROM agente_skills
             WHERE user_id = $1 ORDER BY nombre LIMIT 200",
        )
        .bind(user_id)
        .fetch_all(pool)
        .await
    }

    /// Crea o actualiza una skill por `(user_id, nombre)`; devuelve la fila resultante.
    pub async fn crear_skill(
        pool: &PgPool,
        user_id: Uuid,
        nombre: &str,
        descripcion: &str,
        activa: bool,
    ) -> Result<(Uuid, String, String, bool), sqlx::Error> {
        sqlx::query_as(
            "INSERT INTO agente_skills (user_id, nombre, descripcion, activa)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_id, nombre)
             DO UPDATE SET descripcion = EXCLUDED.descripcion, activa = EXCLUDED.activa, actualizado_en = NOW()
             RETURNING id, nombre, descripcion, activa",
        )
        .bind(user_id)
        .bind(nombre)
        .bind(descripcion)
        .bind(activa)
        .fetch_one(pool)
        .await
    }

    /// Skill actual del propietario: `(nombre, descripcion, activa)`.
    pub async fn cargar_skill(
        pool: &PgPool,
        id: Uuid,
        user_id: Uuid,
    ) -> Result<Option<(String, String, bool)>, sqlx::Error> {
        sqlx::query_as(
            "SELECT nombre, descripcion, activa FROM agente_skills WHERE id = $1 AND user_id = $2",
        )
        .bind(id)
        .bind(user_id)
        .fetch_optional(pool)
        .await
    }

    /// Actualiza una skill del propietario; devuelve la fila resultante.
    pub async fn actualizar_skill(
        pool: &PgPool,
        nombre: &str,
        descripcion: &str,
        activa: bool,
        id: Uuid,
        user_id: Uuid,
    ) -> Result<(Uuid, String, String, bool), sqlx::Error> {
        sqlx::query_as(
            "UPDATE agente_skills SET nombre = $1, descripcion = $2, activa = $3, actualizado_en = NOW()
             WHERE id = $4 AND user_id = $5
             RETURNING id, nombre, descripcion, activa",
        )
        .bind(nombre)
        .bind(descripcion)
        .bind(activa)
        .bind(id)
        .bind(user_id)
        .fetch_one(pool)
        .await
    }

    /// Elimina una skill; devuelve filas afectadas.
    pub async fn eliminar_skill(pool: &PgPool, id: Uuid, user_id: Uuid) -> Result<u64, sqlx::Error> {
        sqlx::query("DELETE FROM agente_skills WHERE id = $1 AND user_id = $2")
            .bind(id)
            .bind(user_id)
            .execute(pool)
            .await
            .map(|r| r.rows_affected())
    }
}