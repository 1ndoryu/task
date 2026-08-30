// sentinel-disable-file sqlx-query-sin-macro sqlx-query-as-sin-macro
// [por que] sqlx sin feature "macros" ni DB en compile-time: query! rompe el build.
/* [29-08-2026] Scheduler de tareas programadas (plan-agente-ia-plugin, Fase 1,
 * sección 8.1). Worker tokio ligero que consulta `agente_tareas_programadas`
 * y ejecuta las que están pendientes de ejecutar como un turno de agente.
 *
 * A prueba de reinicios: al arrancar, el worker recupera las ejecuciones
 * interrumpidas (estado 'ejecutando' con heartbeat vencido → 'pendiente') y
 * recalcula `proxima_ejecucion`. La ejecución marca 'ejecutando' ANTES de
 * llamar al LLM, así un crash no duplica (el heartbeat vencido la vuelve a
 * encolar, nunca se lanza dos veces el mismo turno simultáneamente). */

use chrono::{DateTime, Utc};
use sqlx::PgPool;
use std::time::Duration;
use uuid::Uuid;

use crate::agent::runtime::AgentRuntime;
use crate::errors::AppError;
use crate::AppState;

/// Heartbeat: una tarea en 'ejecutando' más vieja que esto se considera
/// interrumpida y vuelve a 'pendiente' (recuperación post-reinicio).
const HEARTBEAT_STALE: Duration = Duration::from_secs(10 * 60);

/// Worker del scheduler: loop cada `intervalo`. Se ejecuta en background desde
/// main.rs; los errores se loguean y el loop continúa (nunca muere).
pub async fn correr_scheduler(state: AppState, intervalo: Duration) {
    let mut ticker = tokio::time::interval(intervalo);
    loop {
        ticker.tick().await;
        if let Err(error) = ciclo_scheduler(&state).await {
            tracing::warn!(%error, "ciclo del scheduler de tareas programadas falló");
        }
    }
}

/// Un ciclo: recuperar interrumpidas + ejecutar las que tocan.
async fn ciclo_scheduler(state: &AppState) -> Result<(), AppError> {
    recuperar_interrumpidas(&state.pool).await?;

    let tareas: Vec<(Uuid, Uuid, String, String, String, Option<String>)> = sqlx::query_as(
        "SELECT id, user_id, nombre, prompt, tipo, cron_expr
         FROM agente_tareas_programadas
         WHERE estado = 'pendiente'
           AND (ejecutar_en IS NULL OR ejecutar_en <= NOW())
           AND (proxima_ejecucion IS NULL OR proxima_ejecucion <= NOW())
         ORDER BY COALESCE(ejecutar_en, proxima_ejecucion) ASC
         LIMIT 5",
    )
    .fetch_all(&state.pool)
    .await?;

    for (id, user_id, nombre, prompt, tipo, cron_expr) in tareas {
        /* Marcar 'ejecutando' con actualizado_en = NOW() (heartbeat) de forma
         * atómica: si otra réplica la tomó primero, el UPDATE no afecta filas
         * y se salta (no duplica). */
        let tomada = sqlx::query(
            "UPDATE agente_tareas_programadas
             SET estado = 'ejecutando', actualizado_en = NOW()
             WHERE id = $1 AND estado = 'pendiente'",
        )
        .bind(id)
        .execute(&state.pool)
        .await?
        .rows_affected();
        if tomada == 0 {
            continue; // otra réplica la tomó
        }

        match ejecutar_tarea(state, id, user_id, &nombre, &prompt, &tipo, cron_expr.as_deref()).await {
            Ok(resumen) => {
                tracing::info!(tarea = %id, %nombre, "tarea programada ejecutada");
                let _ = resumen;
            }
            Err(error) => {
                tracing::warn!(tarea = %id, %nombre, %error, "tarea programada falló");
                let _ = sqlx::query(
                    "UPDATE agente_tareas_programadas
                     SET estado = 'fallida', result_summary = $3, actualizado_en = NOW()
                     WHERE id = $1 AND user_id = $2",
                )
                .bind(id)
                .bind(user_id)
                .bind(format!("Error: {error}"))
                .execute(&state.pool)
                .await;
            }
        }
    }
    Ok(())
}

/// Recupera ejecuciones interrumpidas: 'ejecutando' con heartbeat vencido →
/// 'pendiente' (sin perder el historial del resultado anterior).
async fn recuperar_interrumpidas(pool: &sqlx::PgPool) -> Result<(), AppError> {
    sqlx::query(
        "UPDATE agente_tareas_programadas
         SET estado = 'pendiente', actualizado_en = NOW()
         WHERE estado = 'ejecutando'
           AND actualizado_en < NOW() - ($1 * INTERVAL '1 second')",
    )
    .bind(HEARTBEAT_STALE.as_secs() as i64)
    .execute(pool)
    .await?;
    Ok(())
}

/// Ejecuta la tarea como un turno de agente (mismo runtime, sin tools de
/// archivo en prod — el runtime ya solo registra tools de dominio en v1).
async fn ejecutar_tarea(
    state: &AppState,
    tarea_id: Uuid,
    user_id: Uuid,
    nombre: &str,
    prompt: &str,
    tipo: &str,
    cron_expr: Option<&str>,
) -> Result<String, AppError> {
    /* Turno de agente: reutiliza el mismo runtime. Sin conversación (las tareas
     * programadas no tienen chat); el turno se registra con estado y resumen. */
    let turno_id = Uuid::new_v4();
    let conversacion_id = Uuid::nil();
    let (tx, _rx) = tokio::sync::mpsc::channel::<crate::agent::runtime::AgenteEvento>(8);

    let runtime = AgentRuntime::nuevo(crate::agent::runtime::TurnoConfig::default());
    match runtime
        .ejecutar_turno(
            state,
            user_id,
            turno_id,
            conversacion_id,
            Vec::new(),
            prompt.to_string(),
            &tx,
        )
        .await
    {
        Ok(()) => {
            let _ = sqlx::query(
                "UPDATE agente_tareas_programadas
                 SET estado = 'completada', ultima_ejecucion = NOW(), result_summary = $3,
                     actualizado_en = NOW()
                 WHERE id = $1 AND user_id = $2",
            )
            .bind(tarea_id)
            .bind(user_id)
            .bind(format!("Tarea '{nombre}' ejecutada"))
            .execute(&state.pool)
            .await;
            programar_siguiente(&state.pool, tarea_id, user_id, tipo, cron_expr).await?;
            Ok(format!("Tarea '{nombre}' ejecutada"))
        }
        Err(error) => Err(AppError::Upstream(format!("{nombre}: {error}"))),
    }
}

/// Recurrente: calcula la próxima ejecución desde cron_expr (formatos v1:
/// `diario`, `cada{N}min`, `cada{N}h`, `cada{N}d`). `una_vez` no reprograma.
async fn programar_siguiente(
    pool: &PgPool,
    tarea_id: Uuid,
    user_id: Uuid,
    tipo: &str,
    cron_expr: Option<&str>,
) -> Result<(), AppError> {
    if tipo != "recurrente" {
        let _ = sqlx::query(
            "UPDATE agente_tareas_programadas SET proxima_ejecucion = NULL WHERE id = $1",
        )
        .bind(tarea_id)
        .execute(pool)
        .await;
        return Ok(());
    }
    let expr = cron_expr.unwrap_or("diario");
    let proxima = proxima_ejecucion(expr, Utc::now())?;
    sqlx::query(
        "UPDATE agente_tareas_programadas
         SET proxima_ejecucion = $3, actualizado_en = NOW()
         WHERE id = $1 AND user_id = $2",
    )
    .bind(tarea_id)
    .bind(user_id)
    .bind(proxima)
    .execute(pool)
    .await?;
    Ok(())
}

/// Calcula la próxima ejecución para el formato v1 de cron_expr.
fn proxima_ejecucion(expr: &str, desde: DateTime<Utc>) -> Result<DateTime<Utc>, AppError> {
    let expr = expr.trim().to_ascii_lowercase();
    if expr == "diario" {
        return Ok(desde + chrono::Duration::days(1));
    }
    if let Some(resto) = expr.strip_prefix("cada") {
        let (numero, unidad) = parse_cantidad_unidad(resto)?;
        let duracion = match unidad.as_str() {
            "min" => chrono::Duration::minutes(numero),
            "h" => chrono::Duration::hours(numero),
            "d" => chrono::Duration::days(numero),
            _ => return Err(AppError::Validation(format!("Unidad cron inválida: {unidad}"))),
        };
        return Ok(desde + duracion);
    }
    Err(AppError::Validation(format!(
        "cron_expr no soportado en v1: {expr} (use diario, cadaNmin, cadaNh, cadaNd)"
    )))
}

fn parse_cantidad_unidad(resto: &str) -> Result<(i64, String), AppError> {
    let i = resto
        .find(|c: char| !c.is_ascii_digit())
        .unwrap_or(resto.len());
    let (num, unidad) = resto.split_at(i);
    let numero: i64 = num
        .parse()
        .map_err(|_| AppError::Validation("Cantidad cron inválida".into()))?;
    if numero <= 0 {
        return Err(AppError::Validation("Cantidad cron debe ser positiva".into()));
    }
    Ok((numero, unidad.to_string()))
}

#[cfg(test)]
mod tests {
    use super::proxima_ejecucion;

    #[test]
    fn cron_diario_avanza_un_dia() {
        let desde = chrono::DateTime::parse_from_rfc3339("2026-08-30T10:00:00Z")
            .expect("fecha")
            .with_timezone(&chrono::Utc);
        let prox = proxima_ejecucion("diario", desde).expect("válido");
        assert_eq!(prox, desde + chrono::Duration::days(1));
    }

    #[test]
    fn cron_cada_horas() {
        let desde = chrono::DateTime::parse_from_rfc3339("2026-08-30T10:00:00Z")
            .expect("fecha")
            .with_timezone(&chrono::Utc);
        assert_eq!(
            proxima_ejecucion("cada2h", desde).expect("válido"),
            desde + chrono::Duration::hours(2)
        );
        assert_eq!(
            proxima_ejecucion("cada30min", desde).expect("válido"),
            desde + chrono::Duration::minutes(30)
        );
        assert_eq!(
            proxima_ejecucion("cada3d", desde).expect("válido"),
            desde + chrono::Duration::days(3)
        );
    }

    #[test]
    fn cron_invalido_rechazado() {
        let desde = chrono::DateTime::parse_from_rfc3339("2026-08-30T10:00:00Z")
            .expect("fecha")
            .with_timezone(&chrono::Utc);
        assert!(proxima_ejecucion("0 9 * * *", desde).is_err());
        assert!(proxima_ejecucion("cada0h", desde).is_err());
    }
}
