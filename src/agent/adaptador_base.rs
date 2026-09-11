// [039A-1/FASE-FINAL] Ayudas puras del adaptador de persistencia del agente,
// extraídas de `adaptador.rs` para respetar el límite de líneas. Sin SQL:
// este archivo no necesita el `sentinel-disable-file` del adaptador.

use glory_harness_core::llm::AiMessage;
use glory_harness_core::HarnessError;

pub(crate) fn harness_err(error: sqlx::Error) -> HarnessError {
    HarnessError::Proveedor {
        detalle: error.to_string(),
        causa: None,
    }
}

/// Traduce el estado del contrato del núcleo al CHECK de `agente_turnos`
/// (pendiente|ejecutando|completado|fallido).
pub(crate) fn estado_turno_db(estado: &str) -> String {
    match estado {
        "ok" => "completado".to_string(),
        "error" | "cancelado" => "fallido".to_string(),
        otro => otro.to_string(),
    }
}

/// Construye el mensaje system con las skills activas. Puro y testeable:
/// devuelve `None` si no hay skills que inyectar. Verbatim del runtime
/// original.
pub fn construir_mensaje_skills(filas: Vec<(String, String)>) -> Vec<AiMessage> {
    if filas.is_empty() {
        return Vec::new();
    }
    let bloque = filas
        .into_iter()
        .map(|(nombre, descripcion)| format!("{nombre}: {descripcion}"))
        .collect::<Vec<_>>()
        .join("\n");
    let bloque = if bloque.chars().count() > 4000 {
        let cortado: String = bloque.chars().take(4000).collect();
        format!("{cortado}…")
    } else {
        bloque
    };
    vec![AiMessage::texto(
        "system",
        format!("Skills activas del usuario (síguelas al responder):\n{bloque}"),
    )]
}

#[cfg(test)]
mod tests {
    use super::construir_mensaje_skills;

    #[test]
    fn skills_vacias_no_generan_contexto() {
        assert!(construir_mensaje_skills(Vec::new()).is_empty());
    }

    #[test]
    fn skills_activas_generan_mensaje_system() {
        let mensajes = construir_mensaje_skills(vec![
            ("resumen".into(), "Resume en 3 viñetas".into()),
            ("tono".into(), "Responde en español".into()),
        ]);
        assert_eq!(mensajes.len(), 1);
        assert_eq!(mensajes[0].role, "system");
        let contenido = mensajes[0].content.as_str().unwrap();
        assert!(contenido.contains("resumen: Resume en 3 viñetas"));
        assert!(contenido.contains("Responde en español"));
    }

    #[test]
    fn skills_largas_se_cortan() {
        // El bloque se trunca a 4000 chars; el prefijo system añade ~45 + "…".
        let mensajes = construir_mensaje_skills(vec![("x".into(), "y".repeat(5000))]);
        assert_eq!(mensajes.len(), 1);
        let contenido = mensajes[0].content.as_str().unwrap();
        assert!(contenido.chars().count() < 5000);
        assert!(contenido.chars().count() <= 4010 + 46);
    }

    #[test]
    fn estados_turno_se_traducen() {
        use super::estado_turno_db;
        assert_eq!(estado_turno_db("ok"), "completado");
        assert_eq!(estado_turno_db("error"), "fallido");
        assert_eq!(estado_turno_db("cancelado"), "fallido");
        assert_eq!(estado_turno_db("ejecutando"), "ejecutando");
    }
}
