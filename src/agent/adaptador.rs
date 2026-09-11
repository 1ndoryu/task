// sentinel-disable-file sqlx-query-sin-macro sqlx-query-as-sin-macro
// [por que] sqlx sin feature "macros" ni DB en compile-time: query! rompe el build.
/* [03-09-2026] Adaptador de persistencia del agente (plan Glory Harness, Fase
 * 2): implementa el puerto `AgentPersistence` del núcleo con el SQL real de
 * task. El núcleo nunca persiste por su cuenta (R3 del plan); todo acceso a
 * estado durable pasa por aquí. El SQL es el mismo que vivía en
 * `src/agent/runtime.rs` / `src/agent/scheduler.rs` (verbatim, con los nombres
 * reales de columnas de las migraciones `agente_*`). */

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use serde_json::Value;
use sqlx::PgPool;
use uuid::Uuid;

use glory_harness_core::context::estimar_tokens;
use glory_harness_core::ports::{
    AccionAuditable, AgentPersistence, AmbitoMemoria, MemoriaEntrada, MensajePersistido,
    SkillEntrada, TareaProgramadaPendiente, TurnoPersistido,
};
use glory_harness_core::scheduler::HEARTBEAT_STALE;
use glory_harness_core::HarnessResult;

use crate::errors::AppError;

use super::adaptador_base::{estado_turno_db, harness_err};

/// Adaptador concreto: `PersistenciaAgente` envuelve el `PgPool` de task e
/// implementa el puerto del núcleo. Además expone los helpers de consulta que
/// el handler usaba como funciones libres (`cargar_historial`,
/// `guardar_mensaje_usuario`, etc.) para no cambiar el flujo del handler.
pub struct PersistenciaAgente {
    pub pool: PgPool,
}

impl PersistenciaAgente {
    #[must_use]
    pub fn nuevo(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Guarda el mensaje del usuario. Fase 4: idempotente — si el cliente
    /// envía la misma `clave_idempotencia` (mismo turno reintentado),
    /// `ON CONFLICT DO NOTHING` evita duplicar la fila; `NULL` hace un insert
    /// normal.
    pub async fn guardar_mensaje_usuario(
        &self,
        conversacion_id: Uuid,
        user_id: Uuid,
        contenido: &str,
        clave_idempotencia: Option<Uuid>,
    ) -> Result<(), AppError> {
        sqlx::query(
            "INSERT INTO agente_mensajes (conversacion_id, user_id, rol, contenido, tokens_estimados, clave_idempotencia)
             VALUES ($1, $2, 'user', $3, $4, $5)
             ON CONFLICT (conversacion_id, user_id, clave_idempotencia)
               WHERE clave_idempotencia IS NOT NULL
             DO NOTHING",
        )
        .bind(conversacion_id)
        .bind(user_id)
        .bind(contenido)
        .bind(estimar_tokens(contenido) as i32)
        .bind(clave_idempotencia)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    /// Contexto de productividad del usuario (notas/tareas/hábitos) según los
    /// flags de la config del turno; respeta completadas/pausados y limita el
    /// tamaño total (12 000 chars). Verbatim del runtime original.
    pub async fn cargar_contexto_productividad(
        &self,
        user_id: Uuid,
        incluir_notas: bool,
        incluir_tareas_completadas: bool,
        incluir_habitos_pausados: bool,
    ) -> Result<String, AppError> {
        let mut secciones = Vec::new();
        if incluir_notas {
            let filas: Vec<(String, String)> = sqlx::query_as(
                "SELECT title, LEFT(content, 1200) FROM notes WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 20",
            )
            .bind(user_id)
            .fetch_all(&self.pool)
            .await?;
            if !filas.is_empty() {
                secciones.push(format!(
                    "NOTAS:\n{}",
                    filas
                        .into_iter()
                        .map(|(t, c)| format!("- {t}: {c}"))
                        .collect::<Vec<_>>()
                        .join("\n")
                ));
            }
        }
        let tareas: Vec<(String, bool)> = sqlx::query_as(
            "SELECT text, completed FROM dashboard_tasks WHERE user_id = $1 AND deleted_at IS NULL AND (completed = FALSE OR $2) ORDER BY updated_at DESC LIMIT 50",
        )
        .bind(user_id)
        .bind(incluir_tareas_completadas)
        .fetch_all(&self.pool)
        .await?;
        if !tareas.is_empty() {
            secciones.push(format!(
                "TAREAS:\n{}",
                tareas
                    .into_iter()
                    .map(|(t, c)| format!(
                        "- [{}] {t}",
                        if c { "completada" } else { "pendiente" }
                    ))
                    .collect::<Vec<_>>()
                    .join("\n")
            ));
        }
        let habitos: Vec<(String, String, Value)> = sqlx::query_as(
            "SELECT name, frequency_type, payload FROM dashboard_habits WHERE user_id = $1 AND deleted_at IS NULL ORDER BY updated_at DESC LIMIT 50",
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await?;
        let habitos: Vec<_> = habitos
            .into_iter()
            .filter(|(_, _, payload)| {
                incluir_habitos_pausados
                    || !payload
                        .get("paused")
                        .and_then(Value::as_bool)
                        .unwrap_or(false)
            })
            .collect();
        if !habitos.is_empty() {
            secciones.push(format!(
                "HÁBITOS:\n{}",
                habitos
                    .into_iter()
                    .map(|(n, f, p)| format!(
                        "- {n} ({f}){}",
                        if p.get("paused").and_then(Value::as_bool).unwrap_or(false) {
                            " [pausado]"
                        } else {
                            ""
                        }
                    ))
                    .collect::<Vec<_>>()
                    .join("\n")
            ));
        }
        Ok(secciones.join("\n\n").chars().take(12_000).collect())
    }
}

#[async_trait]
impl AgentPersistence for PersistenciaAgente {
    async fn guardar_turno(&self, turno: &TurnoPersistido) -> HarnessResult<()> {
        let estado = estado_turno_db(&turno.estado);
        let conversacion_id: Option<Uuid> = if turno.conversacion_id.is_nil() {
            None
        } else {
            Some(turno.conversacion_id)
        };
        let prompt = turno.resumen.clone().unwrap_or_default();
        sqlx::query(
            "INSERT INTO agente_turnos
             (id, user_id, conversacion_id, estado, prompt, proveedor, modelo, tokens_prompt, tokens_complecion, tools_ejecutadas, duracion_ms, error)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             ON CONFLICT (id) DO UPDATE SET
               estado = EXCLUDED.estado,
               proveedor = EXCLUDED.proveedor,
               modelo = EXCLUDED.modelo,
               tokens_prompt = EXCLUDED.tokens_prompt,
               tokens_complecion = EXCLUDED.tokens_complecion,
               tools_ejecutadas = EXCLUDED.tools_ejecutadas,
               duracion_ms = EXCLUDED.duracion_ms,
               error = EXCLUDED.error,
               actualizado_en = NOW()",
        )
        .bind(turno.id)
        .bind(turno.user_id)
        .bind(conversacion_id)
        .bind(estado)
        .bind(prompt)
        .bind(&turno.provider)
        .bind(&turno.modelo)
        .bind(turno.tokens_prompt as i64)
        .bind(turno.tokens_complecion as i64)
        .bind(turno.tools_ejecutadas as i64)
        .bind(turno.duracion_ms as i64)
        .bind(&turno.error)
        .execute(&self.pool)
        .await
        .map_err(harness_err)?;
        Ok(())
    }

    async fn finalizar_turno(
        &self,
        turno_id: Uuid,
        estado: &str,
        resumen: Option<&str>,
    ) -> HarnessResult<()> {
        let estado = estado_turno_db(estado);
        sqlx::query(
            "UPDATE agente_turnos SET estado = $2, error = $3, actualizado_en = NOW() WHERE id = $1",
        )
        .bind(turno_id)
        .bind(estado)
        .bind(resumen)
        .execute(&self.pool)
        .await
        .map_err(harness_err)?;
        Ok(())
    }

    async fn guardar_mensaje(&self, mensaje: &MensajePersistido) -> HarnessResult<()> {
        /* El contrato del núcleo no trae user_id (lo conoce la conversación);
         * se resuelve desde `agente_conversaciones` (FK garantiza que exista).
         * El id BIGSERIAL de la tabla se genera solo; el id UUID del contrato
         * no se persiste. */
        sqlx::query(
            "INSERT INTO agente_mensajes (conversacion_id, user_id, rol, contenido, tokens_estimados, creado_en)
             SELECT $1, user_id, $2, $3, $4, $5
             FROM agente_conversaciones WHERE id = $1",
        )
        .bind(mensaje.conversacion_id)
        .bind(&mensaje.rol)
        .bind(&mensaje.contenido)
        .bind(estimar_tokens(&mensaje.contenido) as i32)
        .bind(mensaje.creado_en)
        .execute(&self.pool)
        .await
        .map_err(harness_err)?;
        Ok(())
    }

    async fn listar_mensajes(&self, conversacion_id: Uuid) -> HarnessResult<Vec<MensajePersistido>> {
        let filas: Vec<(String, String, DateTime<Utc>)> = sqlx::query_as(
            "SELECT rol, contenido, creado_en FROM agente_mensajes
             WHERE conversacion_id = $1 AND NOT compactado
             ORDER BY id ASC",
        )
        .bind(conversacion_id)
        .fetch_all(&self.pool)
        .await
        .map_err(harness_err)?;
        Ok(filas
            .into_iter()
            .map(|(rol, contenido, creado_en)| MensajePersistido {
                /* El id BIGSERIAL de la tabla no es UUID; el contrato exige un
                 * id para ordenar/identificar en memoria. No se persiste. */
                id: Uuid::new_v4(),
                conversacion_id,
                rol,
                contenido,
                creado_en,
            })
            .collect())
    }

    async fn conversacion_tocar(&self, conversacion_id: Uuid) -> HarnessResult<()> {
        sqlx::query("UPDATE agente_conversaciones SET actualizado_en = NOW() WHERE id = $1")
            .bind(conversacion_id)
            .execute(&self.pool)
            .await
            .map_err(harness_err)?;
        Ok(())
    }

    async fn registrar_accion(&self, accion: &AccionAuditable) -> HarnessResult<()> {
        let argumentos = accion
            .argumentos_json
            .as_deref()
            .and_then(|s| serde_json::from_str::<Value>(s).ok())
            .unwrap_or(Value::Null);
        /* user_id se resuelve desde el turno (el contrato no lo trae). */
        sqlx::query(
            "INSERT INTO agente_acciones (user_id, turno_id, tool_id, argumentos, resultado_resumen, estado)
             SELECT user_id, $1, $2, $3, $4, $5 FROM agente_turnos WHERE id = $1",
        )
        .bind(accion.turno_id)
        .bind(&accion.tool)
        .bind(argumentos)
        .bind(&accion.resumen)
        .bind(if accion.ok { "ok" } else { "error" })
        .execute(&self.pool)
        .await
        .map_err(harness_err)?;
        Ok(())
    }

    async fn memoria_listar(
        &self,
        user_id: Uuid,
        ambito: AmbitoMemoria,
    ) -> HarnessResult<Vec<MemoriaEntrada>> {
        /* [11-09-2026] 109A-8 (F0 Global temporal): la tienda aún no separa
         * ámbitos (`UNIQUE(user_id, clave)`, un solo ámbito lógico); el turno
         * corre siempre en global y el default de `memoria_ambitos` ya
         * devuelve `[Global]`. El parámetro se acepta por contrato y se ignora
         * hasta la fase de aislamiento real. */
        let _ = ambito;
        /* [07-09-2026] 069A-4: el contrato de `MemoriaEntrada` incluye los
         * metadatos de auditoría (actualizada_en/origen/usos/ultimo_uso) que
         * el proveedor y el curador del núcleo mantienen. La columna `usos`
         * es INTEGER en Postgres; se decodifica a i32 y se eleva a u32 del
         * contrato sin perder el orden (el curador ordena por usos desc). */
        let filas: Vec<(String, String, DateTime<Utc>, String, i32, Option<DateTime<Utc>>)> =
            sqlx::query_as(
                "SELECT clave, contenido, actualizado_en, origen, usos, ultimo_uso
                 FROM agente_memoria
                 WHERE user_id = $1 ORDER BY actualizado_en DESC LIMIT 100",
            )
            .bind(user_id)
            .fetch_all(&self.pool)
            .await
            .map_err(harness_err)?;
        Ok(filas
            .into_iter()
            .map(
                |(clave, contenido, actualizada_en, origen, usos, ultimo_uso)| MemoriaEntrada {
                    clave,
                    contenido,
                    actualizada_en,
                    origen,
                    usos: usize::try_from(usos).unwrap_or(0) as u32,
                    ultimo_uso,
                },
            )
            .collect())
    }

    async fn memoria_upsert(
        &self,
        user_id: Uuid,
        ambito: AmbitoMemoria,
        entrada: &MemoriaEntrada,
    ) -> HarnessResult<()> {
        /* [11-09-2026] 109A-8 (F0 Global temporal): ver `memoria_listar`. */
        let _ = ambito;
        /* [07-09-2026] 069A-4: se persisten también los metadatos de
         * auditoría. Se usa `actualizada_en`/`origen`/`usos`/`ultimo_uso` de
         * la entrada (el proveedor del núcleo los mantiene: incrementa usos y
         * fija ultimo_uso al recordar); `NOW()` solo como fallback del default
         * de la columna cuando la entrada no los trae. `usos` se enlaza como
         * i32 (columna INTEGER; el contrato usa u32, acotado al rango de la
         * columna). */
        sqlx::query(
            "INSERT INTO agente_memoria
               (user_id, clave, contenido, actualizado_en, origen, usos, ultimo_uso)
             VALUES ($1, $2, $3, COALESCE($4, NOW()), $5, $6, $7)
             ON CONFLICT (user_id, clave) DO UPDATE SET
               contenido = EXCLUDED.contenido,
               actualizado_en = EXCLUDED.actualizado_en,
               origen = EXCLUDED.origen,
               usos = EXCLUDED.usos,
               ultimo_uso = EXCLUDED.ultimo_uso",
        )
        .bind(user_id)
        .bind(&entrada.clave)
        .bind(&entrada.contenido)
        .bind(entrada.actualizada_en)
        .bind(&entrada.origen)
        .bind(entrada.usos as i32)
        .bind(entrada.ultimo_uso)
        .execute(&self.pool)
        .await
        .map_err(harness_err)?;
        Ok(())
    }

    async fn memoria_borrar(
        &self,
        user_id: Uuid,
        ambito: AmbitoMemoria,
        clave: &str,
    ) -> HarnessResult<()> {
        /* [11-09-2026] 109A-8 (F0 Global temporal): ver `memoria_listar`. */
        let _ = ambito;
        sqlx::query("DELETE FROM agente_memoria WHERE user_id = $1 AND clave = $2")
            .bind(user_id)
            .bind(clave)
            .execute(&self.pool)
            .await
            .map_err(harness_err)?;
        Ok(())
    }

    async fn skills_listar(&self, user_id: Uuid) -> HarnessResult<Vec<SkillEntrada>> {
        let filas: Vec<(Uuid, String, String, String, bool)> = sqlx::query_as(
            "SELECT id, nombre, descripcion, instrucciones, activa FROM agente_skills
             WHERE user_id = $1 ORDER BY nombre",
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await
        .map_err(harness_err)?;
        Ok(filas
            .into_iter()
            .map(
                |(id, nombre, descripcion, instrucciones, activa)| SkillEntrada {
                    id,
                    nombre,
                    descripcion,
                    instrucciones,
                    activa,
                },
            )
            .collect())
    }

    async fn tareas_recuperar_interrumpidas(&self) -> HarnessResult<u64> {
        sqlx::query(
            "UPDATE agente_tareas_programadas
             SET estado = 'pendiente', actualizado_en = NOW()
             WHERE estado = 'ejecutando'
               AND actualizado_en < NOW() - ($1 * INTERVAL '1 second')",
        )
        .bind(HEARTBEAT_STALE.as_secs() as i64)
        .execute(&self.pool)
        .await
        .map_err(harness_err)
        .map(|r| r.rows_affected())
    }

    async fn tareas_pendientes(
        &self,
        limite: u32,
    ) -> HarnessResult<Vec<TareaProgramadaPendiente>> {
        let filas: Vec<(Uuid, Uuid, String, String, String, Option<String>)> = sqlx::query_as(
            "SELECT id, user_id, nombre, prompt, tipo, cron_expr
             FROM agente_tareas_programadas
             WHERE estado = 'pendiente'
               AND (ejecutar_en IS NULL OR ejecutar_en <= NOW())
               AND (proxima_ejecucion IS NULL OR proxima_ejecucion <= NOW())
             ORDER BY COALESCE(ejecutar_en, proxima_ejecucion) ASC
             LIMIT $1",
        )
        .bind(limite as i64)
        .fetch_all(&self.pool)
        .await
        .map_err(harness_err)?;
        Ok(filas
            .into_iter()
            .map(
                |(id, user_id, nombre, prompt, tipo, cron_expr)| TareaProgramadaPendiente {
                    id,
                    user_id,
                    nombre,
                    prompt,
                    tipo,
                    cron_expr,
                    /* Sin columna `programacion` en el esquema TASKS: fila legacy;
                    el scheduler cae a `tipo` + `cron_expr` (119A-6 F2). */
                    programacion: None,
                },
            )
            .collect())
    }

    async fn tarea_tomar(&self, id: Uuid) -> HarnessResult<bool> {
        let tomada = sqlx::query(
            "UPDATE agente_tareas_programadas
             SET estado = 'ejecutando', actualizado_en = NOW()
             WHERE id = $1 AND estado = 'pendiente'",
        )
        .bind(id)
        .execute(&self.pool)
        .await
        .map_err(harness_err)?
        .rows_affected();
        Ok(tomada == 1)
    }

    async fn tarea_finalizar(
        &self,
        id: Uuid,
        ok: bool,
        resumen: Option<&str>,
    ) -> HarnessResult<()> {
        sqlx::query(
            "UPDATE agente_tareas_programadas
             SET estado = $2, result_summary = $3, ultima_ejecucion = NOW(), actualizado_en = NOW()
             WHERE id = $1",
        )
        .bind(id)
        .bind(if ok { "completada" } else { "fallida" })
        .bind(resumen)
        .execute(&self.pool)
        .await
        .map_err(harness_err)?;
        Ok(())
    }

    async fn tarea_reprogramar(
        &self,
        id: Uuid,
        user_id: Uuid,
        proxima: Option<DateTime<Utc>>,
    ) -> HarnessResult<()> {
        sqlx::query(
            "UPDATE agente_tareas_programadas
             SET proxima_ejecucion = $3, estado = 'pendiente', actualizado_en = NOW()
             WHERE id = $1 AND user_id = $2",
        )
        .bind(id)
        .bind(user_id)
        .bind(proxima)
        .execute(&self.pool)
        .await
        .map_err(harness_err)?;
        Ok(())
    }
}
