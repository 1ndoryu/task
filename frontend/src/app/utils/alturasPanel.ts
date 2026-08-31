/*
 * utils/alturasPanel.ts
 * [30-08-2026] Validación centralizada de alturas de panel.
 *
 * Evita que se persista una altura inválida (p. ej. "2px") que colapsa el
 * panel a una franja invisible. El mínimo del resize (ALTURA_MINIMA) vive
 * aquí como única fuente para no duplicar la constante en hooks y lógica.
 */

/* Mínimo de altura en píxeles para un panel redimensionable */
export const ALTURA_MINIMA = 120;

/*
 * ¿La altura es 'auto' (modo anclado)? El único string no numérico válido.
 */
export function esAlturaAuto(altura: string | undefined | null): boolean {
    return altura === 'auto';
}

/*
 * Parsea un valor "NNNpx" a número; devuelve null si no es un px válido.
 */
export function parsearAlturaPx(altura: string | undefined | null): number | null {
    if (typeof altura !== 'string') return null;
    const match = altura.trim().match(/^(\d+(?:\.\d+)?)px$/i);
    return match ? Number(match[1]) : null;
}

/*
 * Sanitiza una altura antes de persistirla:
 * - undefined/null → 'auto' (default)
 * - 'auto' → 'auto'
 * - "NNNpx" con NNN < ALTURA_MINIMA → se sube al mínimo (nunca colapsar)
 * - cualquier otro string no parseable → 'auto'
 */
export function sanitizarAltura(altura: string | undefined | null): string {
    if (esAlturaAuto(altura)) return 'auto';
    const px = parsearAlturaPx(altura);
    if (px === null) return 'auto';
    return `${Math.max(ALTURA_MINIMA, Math.round(px))}px`;
}

/*
 * ¿La altura es segura para render (no colapsa el panel)?
 * Misma lógica que sanitizarAltura pero booleana (para validación previa).
 */
export function alturaEsValida(altura: string | undefined | null): boolean {
    if (esAlturaAuto(altura)) return true;
    const px = parsearAlturaPx(altura);
    return px !== null && px >= ALTURA_MINIMA;
}
