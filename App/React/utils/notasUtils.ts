/**
 * Utilidades para el sistema de notas
 *
 * Incluye helpers para manipulación de titulos, persistencia local
 * y eventos de ventana.
 *
 * @package App/React/utils
 */

/* Clave para persistir el ID de la última nota activa */
export const STORAGE_KEY_NOTA_ACTIVA = 'glory_nota_activa_id';
export const EVENTO_NOTA_ACTIVA = 'glory_evento_nota_activa';
export const CONTENIDO_NOTA_NUEVA = '# Título de la nota\n\n';

/**
 * Guarda el ID de la nota activa en localStorage
 */
export function persistirNotaActivaId(id: number | null): void {
    try {
        if (id !== null) {
            localStorage.setItem(STORAGE_KEY_NOTA_ACTIVA, id.toString());
        } else {
            localStorage.removeItem(STORAGE_KEY_NOTA_ACTIVA);
        }
    } catch {
        /* Ignorar errores de localStorage */
    }
}

/**
 * Recupera el ID de la nota activa de localStorage
 */
export function obtenerNotaActivaIdGuardado(): number | null {
    try {
        const id = localStorage.getItem(STORAGE_KEY_NOTA_ACTIVA);
        return id ? parseInt(id, 10) : null;
    } catch {
        return null;
    }
}

/**
 * Emite un evento personalizado cuando cambia la nota activa
 * Útil para sincronizar pestañas o componentes si fuera necesario
 */
export function emitirCambioNotaActiva(id: number | null): void {
    if (typeof window === 'undefined') return;

    window.dispatchEvent(
        new CustomEvent(EVENTO_NOTA_ACTIVA, {
            detail: {
                id
            }
        })
    );
}

/**
 * Extrae el título de la primera línea con # del contenido
 */
export function extraerTitulo(contenido: string): string {
    const lineas = contenido.split('\n');
    const primeraLinea = lineas[0]?.trim() || '';

    /* Si empieza con #, extraer el texto después del # */
    if (primeraLinea.startsWith('#')) {
        const titulo = primeraLinea.replace(/^#+\s*/, '').trim();
        return titulo || 'Sin título';
    }

    /* Si no tiene #, usar las primeras palabras */
    const palabras = primeraLinea.split(' ').slice(0, 5).join(' ');
    return palabras || 'Sin título';
}

/**
 * Obtiene el nonce de WordPress para autenticación
 */
export function obtenerNonce(): string {
    const wpData = (window as unknown as {gloryDashboard?: {nonce?: string}}).gloryDashboard;
    return wpData?.nonce || '';
}
