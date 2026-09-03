/* [029A-1 03-09-2026] Submódulo de `handlers/agente.rs` (limite-lineas):
 * mapeo de la config guardada de la conversación a `TurnoConfig` +
 * validadores de campos. Código movido desde `agente.rs` y dividido en
 * auxiliares por dominio (`texto_*`, `contexto_*`; funcion-larga-rs:
 * el mapeo monolítico superaba 100 líneas efectivas); ninguna lógica cambia.
 * `agente_stream` lo usa vía `super::agente_config::config_desde_guardada`. */

use crate::agent::{ContextoConfig, TurnoConfig};
use crate::errors::AppError;

pub fn config_desde_guardada(
    config: serde_json::Value,
    modo: String,
) -> Result<TurnoConfig, AppError> {
    let defaults = TurnoConfig::default();
    let texto = texto_desde_guardada(&config)?;
    Ok(TurnoConfig {
        provider: config
            .get("provider")
            .and_then(serde_json::Value::as_str)
            .map(str::trim)
            .filter(|p| !p.is_empty())
            .unwrap_or("glory")
            .to_string(),
        modelo: config
            .get("modelo")
            .and_then(serde_json::Value::as_str)
            .map(str::trim)
            .filter(|m| !m.is_empty())
            .unwrap_or("commandcode")
            .to_string(),
        temperatura: config
            .get("temperatura")
            .and_then(serde_json::Value::as_f64)
            .unwrap_or(defaults.temperatura as f64)
            .clamp(0.0, 2.0) as f32,
        max_tokens: config
            .get("max_tokens")
            .and_then(serde_json::Value::as_u64)
            .unwrap_or(defaults.max_tokens as u64)
            .clamp(64, 4096) as u32,
        idioma: texto.idioma,
        incluir_notas: config
            .get("incluir_notas")
            .and_then(serde_json::Value::as_bool)
            .unwrap_or(false),
        incluir_tareas_completadas: config
            .get("incluir_tareas_completadas")
            .and_then(serde_json::Value::as_bool)
            .unwrap_or(false),
        incluir_habitos_pausados: config
            .get("incluir_habitos_pausados")
            .and_then(serde_json::Value::as_bool)
            .unwrap_or(false),
        permitir_busqueda_web: config
            .get("permitir_busqueda_web")
            .and_then(serde_json::Value::as_bool)
            .unwrap_or(true),
        permitir_recordatorios: config
            .get("permitir_recordatorios")
            .and_then(serde_json::Value::as_bool)
            .unwrap_or(true),
        prompt_sistema: texto.prompt_sistema,
        incluir_memoria: config
            .get("incluir_memoria")
            .and_then(serde_json::Value::as_bool)
            .unwrap_or(true),
        incluir_skills: config
            .get("incluir_skills")
            .and_then(serde_json::Value::as_bool)
            .unwrap_or(true),
        max_turns: config
            .get("max_turns")
            .and_then(serde_json::Value::as_u64)
            .unwrap_or(defaults.max_turns as u64)
            .clamp(1, 10) as usize,
        timeout_tool: std::time::Duration::from_secs(
            config
                .get("timeout_tool_secs")
                .and_then(serde_json::Value::as_u64)
                .unwrap_or(defaults.timeout_tool.as_secs())
                .clamp(1, 15),
        ),
        estilo: texto.estilo,
        preferencias: texto.preferencias,
        workspace: texto.workspace,
        nivel_razonamiento: texto.nivel_razonamiento,
        contexto: contexto_desde_guardada(&config, &defaults),
        modo,
        /* [318A-4] `..defaults` final es redundante: todos los campos de
         * TurnoConfig ya están listados explícitamente arriba (clippy
         * needless_update). */
    })
}

/// Textos validados de la config (Fase 5 + 318A-10): estilo, preferencias,
/// workspace (solo local) y nivel de razonamiento vienen de la config de la
/// conversación, no de defaults globales.
struct TextoConfig {
    idioma: String,
    prompt_sistema: String,
    estilo: String,
    preferencias: String,
    workspace: Option<String>,
    nivel_razonamiento: Option<String>,
}

fn texto_desde_guardada(config: &serde_json::Value) -> Result<TextoConfig, AppError> {
    Ok(TextoConfig {
        idioma: validar_idioma(
            config
                .get("idioma")
                .and_then(serde_json::Value::as_str)
                .map(str::to_owned),
        )?,
        prompt_sistema: validar_prompt_sistema(
            config
                .get("prompt_sistema")
                .and_then(serde_json::Value::as_str)
                .map(str::to_owned),
        )?,
        /* [02-09-2026] Fase 5: estilo, preferencias y workspace (solo local)
         * vienen de la config de la conversación. */
        estilo: validar_estilo(
            config
                .get("estilo")
                .and_then(serde_json::Value::as_str)
                .map(str::to_owned),
        )?,
        preferencias: validar_preferencias(
            config
                .get("preferencias")
                .and_then(serde_json::Value::as_str)
                .map(str::to_owned),
        )?,
        workspace: config
            .get("workspace")
            .and_then(serde_json::Value::as_str)
            .map(str::trim)
            .filter(|w| !w.is_empty())
            .map(str::to_owned),
        /* [318A-10 02-09-2026] Nivel de razonamiento (low|medium|high) que
         * decide el usuario; se envía como `reasoning_effort` a los
         * proveedores que lo aceptan (deepseek/groq/cerebras). */
        nivel_razonamiento: validar_nivel_razonamiento(
            config
                .get("nivel_razonamiento")
                .and_then(serde_json::Value::as_str)
                .map(str::to_owned),
        )?,
    })
}

/// Ventana de contexto del turno (tokens máximos, reserva de salida y umbral
/// de compactación) desde la config guardada, con los defaults del núcleo.
fn contexto_desde_guardada(config: &serde_json::Value, defaults: &TurnoConfig) -> ContextoConfig {
    ContextoConfig {
        max_ventana: config
            .get("max_ventana")
            .and_then(serde_json::Value::as_u64)
            .unwrap_or(defaults.contexto.max_ventana as u64)
            .clamp(8_192, 512_000) as u32,
        reserva_salida: config
            .get("reserva_salida")
            .and_then(serde_json::Value::as_u64)
            .unwrap_or(defaults.contexto.reserva_salida as u64)
            .clamp(1_024, 64_000) as u32,
        umbral: config
            .get("umbral_compactacion")
            .and_then(serde_json::Value::as_f64)
            .unwrap_or(defaults.contexto.umbral as f64)
            .clamp(0.1, 0.9) as f32,
        ..defaults.contexto.clone()
    }
}

fn validar_idioma(idioma: Option<String>) -> Result<String, AppError> {
    let valor = idioma.unwrap_or_else(|| "es".into());
    if !matches!(valor.as_str(), "es" | "en" | "pt" | "fr") {
        return Err(AppError::BadRequest("Idioma inválido (es|en|pt|fr)".into()));
    }
    Ok(valor)
}

fn validar_prompt_sistema(prompt: Option<String>) -> Result<String, AppError> {
    let valor = prompt.unwrap_or_default().trim().to_string();
    if valor.chars().count() > 4000 {
        return Err(AppError::BadRequest(
            "El prompt de sistema no puede exceder 4000 caracteres".into(),
        ));
    }
    Ok(valor)
}

fn validar_estilo(estilo: Option<String>) -> Result<String, AppError> {
    let valor = estilo.unwrap_or_else(|| "conciso".into());
    if !matches!(valor.as_str(), "conciso" | "detallado" | "amable") {
        return Err(AppError::BadRequest(
            "Estilo inválido (conciso|detallado|amable)".into(),
        ));
    }
    Ok(valor)
}

/* [318A-10 02-09-2026] Nivel de razonamiento del modelo (contrato OpenAI
 * `reasoning_effort`): low|medium|high. Opcional: sin valor el proveedor usa
 * su default. Se mapea a snake_case `nivel_razonamiento` en la config. */
fn validar_nivel_razonamiento(nivel: Option<String>) -> Result<Option<String>, AppError> {
    let Some(valor) = nivel.map(|v| v.trim().to_string()) else {
        return Ok(None);
    };
    if valor.is_empty() {
        return Ok(None);
    }
    if !matches!(valor.as_str(), "low" | "medium" | "high") {
        return Err(AppError::BadRequest(
            "Nivel de razonamiento inválido (low|medium|high)".into(),
        ));
    }
    Ok(Some(valor))
}

fn validar_preferencias(preferencias: Option<String>) -> Result<String, AppError> {
    let valor = preferencias.unwrap_or_default().trim().to_string();
    if valor.chars().count() > 2000 {
        return Err(AppError::BadRequest(
            "Las preferencias personales no pueden exceder 2000 caracteres".into(),
        ));
    }
    Ok(valor)
}
