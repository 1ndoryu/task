//! Escapado de wildcards para búsquedas `ILIKE`. [H-B03-06]
//!
//! Una búsqueda de usuario que contenga `%`, `_` o `\` no debe interpretarse como
//! comodín del patrón `ILIKE` (si no, buscar `%` devuelve todo). La función escapa
//! esos tres caracteres para que se traten como texto literal. Postgres usa `\`
//! como escape por defecto en `LIKE`/`ILIKE`, así que el resultado se usa tal cual
//! con el patrón `'%' || $x || '%'` (o `%{}%` en SQL dinámico de whitelist).

/// Escapa `%`, `_` y `\` de un término de búsqueda para usarse dentro de `ILIKE`.
#[must_use]
pub fn escape_like_literal(value: &str) -> String {
    value
        .replace('\\', "\\\\")
        .replace('%', "\\%")
        .replace('_', "\\_")
}

#[cfg(test)]
mod tests {
    use super::escape_like_literal;

    #[test]
    fn escapes_like_wildcards_as_literal_text() {
        assert_eq!(escape_like_literal("a%b_c\\d"), "a\\%b\\_c\\\\d");
        assert_eq!(escape_like_literal("normal"), "normal");
    }
}