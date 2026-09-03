// [039A-2] Historial enriquecido del agente: las tarjetas de tools y la barra de
// contexto vivían solo en el SSE en memoria y se perdían al recargar. La BD sí
// guarda `agente_turnos` + `agente_acciones`: este módulo los empareja con los
// mensajes `assistant` (por orden temporal, secuencial) y devuelve el historial
// con `herramientas[]` + `contexto?`. Sin migración: el `diff` nunca se
// persistió, así que las tarjetas restauradas muestran resumen + argumentos
// (para `file_patch` eso YA es el cambio específico: buscar → reemplazar).
// Los turnos fallidos sin burbuja quedan huérfanos (sin mensaje donde colgar):
// se omiten en vez de atribuirlos mal al siguiente turno.

use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::PgPool;
use uuid::Uuid;

use crate::errors::AppError;
use crate::middleware::auth::AuthUser;
use crate::repositories::{AgenteRepository, FilaAccionHistorial, FilaTurnoHistorial};

/// Tarjeta de tool restaurada (espejo de `HerramientaVisual` del front).
/// `diff` no viaja: la columna no existe (ver cabecera).
#[derive(Debug, Serialize)]
pub struct HerramientaHistorial {
    pub tool: String,
    pub ok: bool,
    pub resumen: String,
    pub argumentos: serde_json::Value,
}

/// Contexto del turno que respondió (espejo parcial de `ContextoVisual`).
/// `ocupacion_pct`/`skills` no se persistieron por turno: el front los deriva
/// (barra inferior) o los omite (chips) cuando son null.
#[derive(Debug, Serialize)]
pub struct ContextoHistorial {
    pub tokens_prompt: i64,
    pub tokens_complecion: i64,
    pub provider: Option<String>,
    pub modelo: Option<String>,
}

/// Mensaje del historial con sus tools y su contexto (superset compatible del
/// anterior `MensajeConversacionResponse`: solo añade campos).
#[derive(Debug, Serialize)]
#[allow(non_snake_case)]
pub struct MensajeHistorial {
    pub id: i64,
    pub rol: String,
    pub contenido: String,
    pub creadoEn: String,
    pub herramientas: Vec<HerramientaHistorial>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub contexto: Option<ContextoHistorial>,
}

type FilaMensaje = (i64, String, String, DateTime<Utc>);

/// Empareja mensajes `assistant` con turnos: recorre los mensajes en orden y
/// asigna a cada burbuja el último turno aún sin asignar con
/// `creado_en <= mensaje.creado_en` (el turno se persiste al inicio, la
/// burbuja al final). Si el reloj sesga, usa el siguiente turno sin asignar.
/// Puro y testeable (sin BD).
fn emparejar(
    mensajes: &[FilaMensaje],
    turnos: &[FilaTurnoHistorial],
    acciones_por_turno: &std::collections::HashMap<Uuid, Vec<FilaAccionHistorial>>,
) -> Vec<MensajeHistorial> {
    let mut siguiente_turno = 0usize;
    mensajes
        .iter()
        .map(|(id, rol, contenido, creado_en)| {
            let mut herramientas = Vec::new();
            let mut contexto = None;
            if rol == "assistant" {
                /* Último turno sin asignar anterior o igual al mensaje. */
                let mut elegido: Option<usize> = None;
                while siguiente_turno < turnos.len() && turnos[siguiente_turno].6 <= *creado_en {
                    elegido = Some(siguiente_turno);
                    siguiente_turno += 1;
                }
                /* Sin candidato temporal (sesgo de reloj): el siguiente turno
                 * sin asignar, si existe. */
                if elegido.is_none() && siguiente_turno < turnos.len() {
                    elegido = Some(siguiente_turno);
                    siguiente_turno += 1;
                }
                if let Some(idx) = elegido {
                    let (turno_id, proveedor, modelo, tokens_prompt, tokens_complecion, _, _) =
                        &turnos[idx];
                    if let Some(acciones) = acciones_por_turno.get(turno_id) {
                        herramientas = acciones
                            .iter()
                            .map(|(tool, argumentos, resumen, estado)| HerramientaHistorial {
                                tool: tool.clone(),
                                ok: estado == "ok",
                                resumen: resumen.clone(),
                                argumentos: argumentos.clone(),
                            })
                            .collect();
                    }
                    /* Los tokens llegan como i32 (columnas INT4 de la BD); el
                     * contrato JSON del front usa números (i64) — se amplía. */
                    let (tp, tc) = (*tokens_prompt as i64, *tokens_complecion as i64);
                    if tp > 0 || tc > 0 || !herramientas.is_empty() {
                        contexto = Some(ContextoHistorial {
                            tokens_prompt: tp,
                            tokens_complecion: tc,
                            provider: proveedor.clone(),
                            modelo: modelo.clone(),
                        });
                    }
                }
            }
            MensajeHistorial {
                id: *id,
                rol: rol.clone(),
                contenido: contenido.clone(),
                creadoEn: creado_en.to_rfc3339(),
                herramientas,
                contexto,
            }
        })
        .collect()
}

/// Historial enriquecido de una conversación (verifica propiedad vía los
/// repositorios, como `listar_mensajes`). Lo usan listar/rebobinar/compactar.
pub async fn historial_enriquecido(
    pool: &PgPool,
    conversacion_id: Uuid,
    auth: &AuthUser,
) -> Result<Vec<MensajeHistorial>, AppError> {
    let mensajes = AgenteRepository::listar_mensajes(pool, conversacion_id, auth.user_id).await?;
    let (turnos, acciones) =
        AgenteRepository::listar_turnos_con_acciones(pool, conversacion_id, auth.user_id).await?;
    Ok(emparejar(&mensajes, &turnos, &acciones))
}

#[cfg(test)]
mod tests {
    use super::{emparejar, FilaMensaje, FilaTurnoHistorial};
    use crate::repositories::FilaAccionHistorial;
    use chrono::{TimeZone, Utc};
    use serde_json::json;
    use std::collections::HashMap;
    use uuid::Uuid;

    fn mensaje(id: i64, rol: &str, minuto: u32) -> FilaMensaje {
        (
            id,
            rol.to_string(),
            format!("{rol} {id}"),
            Utc.with_ymd_and_hms(2026, 9, 3, 10, minuto, 0).unwrap(),
        )
    }

    fn turno(minuto: u32, tools: i32) -> FilaTurnoHistorial {
        (
            Uuid::new_v4(),
            Some("glory".to_string()),
            Some("commandcode".to_string()),
            100,
            20,
            tools,
            Utc.with_ymd_and_hms(2026, 9, 3, 10, minuto, 0).unwrap(),
        )
    }

    fn acciones_para(turnos: &[FilaTurnoHistorial]) -> HashMap<Uuid, Vec<FilaAccionHistorial>> {
        turnos
            .iter()
            .map(|t| {
                (
                    t.0,
                    vec![("file_search".to_string(), json!({"patron": "x"}), "1 archivos".to_string(), "ok".to_string())],
                )
            })
            .collect()
    }

    #[test]
    fn empareja_burbuja_con_su_turno_y_sus_tools() {
        let mensajes = vec![mensaje(1, "user", 0), mensaje(2, "assistant", 2)];
        let turnos = vec![turno(1, 1)];
        let out = emparejar(&mensajes, &turnos, &acciones_para(&turnos));
        assert!(out[0].herramientas.is_empty());
        assert!(out[0].contexto.is_none());
        assert_eq!(out[1].herramientas.len(), 1);
        assert_eq!(out[1].herramientas[0].tool, "file_search");
        assert!(out[1].herramientas[0].ok);
        let ctx = out[1].contexto.as_ref().expect("contexto");
        assert_eq!(ctx.tokens_prompt, 100);
        assert_eq!(ctx.provider.as_deref(), Some("glory"));
    }

    #[test]
    fn turno_fallido_sin_burbuja_no_contamina_al_siguiente() {
        let mensajes = vec![
            mensaje(1, "user", 0),
            mensaje(2, "assistant", 2),
            mensaje(3, "user", 3),
            mensaje(4, "assistant", 5),
        ];
        /* T1 (turno 1) + F (fallido, sin burbuja) + T2, cada uno con su tool. */
        let t1 = turno(1, 1);
        let f = turno(3, 2);
        let t2 = turno(4, 0);
        let turnos = vec![t1.clone(), f.clone(), t2.clone()];
        let acciones: HashMap<Uuid, Vec<FilaAccionHistorial>> = [
            (t1.0, vec![("t1_tool".to_string(), json!({}), "r1".to_string(), "ok".to_string())]),
            (f.0, vec![("fallida_tool".to_string(), json!({}), "rf".to_string(), "error".to_string())]),
            (t2.0, vec![("t2_tool".to_string(), json!({}), "r2".to_string(), "ok".to_string())]),
        ]
        .into_iter()
        .collect();
        let out = emparejar(&mensajes, &turnos, &acciones);
        /* A1 se queda con T1 (último <= min 2); F queda huérfano; A2 con T2. */
        assert_eq!(out[1].herramientas.len(), 1);
        assert_eq!(out[1].herramientas[0].tool, "t1_tool");
        assert_eq!(out[3].herramientas.len(), 1);
        assert_eq!(out[3].herramientas[0].tool, "t2_tool");
        assert!(out[3].contexto.is_some());
    }

    #[test]
    fn sin_turnos_no_hay_herramientas_ni_contexto() {
        let mensajes = vec![mensaje(1, "user", 0), mensaje(2, "assistant", 2)];
        let out = emparejar(&mensajes, &[], &HashMap::new());
        assert!(out.iter().all(|m| m.herramientas.is_empty() && m.contexto.is_none()));
    }

    /* [039A-2] El contrato JSON es el que lee el front (`HerramientaHistorial`
     * / `ContextoHistorial` en service.ts): herramientas siempre presente,
     * contexto omitido cuando es None. */
    #[test]
    fn forma_json_compatible_con_el_front() {
        use super::MensajeHistorial;
        let con_todo = MensajeHistorial {
            id: 2,
            rol: "assistant".to_string(),
            contenido: "hola".to_string(),
            creadoEn: "2026-09-03T10:02:00+00:00".to_string(),
            herramientas: vec![super::HerramientaHistorial {
                tool: "file_patch".to_string(),
                ok: true,
                resumen: "parche x".to_string(),
                argumentos: json!({"ruta": "a.txt"}),
            }],
            contexto: Some(super::ContextoHistorial {
                tokens_prompt: 100,
                tokens_complecion: 20,
                provider: Some("glory".to_string()),
                modelo: Some("commandcode".to_string()),
            }),
        };
        let v = serde_json::to_value(&con_todo).expect("serializa");
        assert_eq!(v["herramientas"][0]["tool"], json!("file_patch"));
        assert_eq!(v["herramientas"][0]["argumentos"]["ruta"], json!("a.txt"));
        assert_eq!(v["contexto"]["tokens_prompt"], json!(100));
        let sin_ctx = MensajeHistorial {
            id: 1,
            rol: "user".to_string(),
            contenido: "hola".to_string(),
            creadoEn: "2026-09-03T10:00:00+00:00".to_string(),
            herramientas: Vec::new(),
            contexto: None,
        };
        let v = serde_json::to_value(&sin_ctx).expect("serializa");
        assert!(v["herramientas"].as_array().expect("array").is_empty());
        assert!(v.get("contexto").is_none());
    }
}
