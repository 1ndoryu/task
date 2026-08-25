/**
 * Utilidades para el sistema de notas
 *
 * Incluye helpers para manipulación de titulos, persistencia local
 * y eventos de ventana.
 *
 * @package App/React/utils
 */

/* Clave para persistir el ID de la última nota activa (legacy, panel base) */
export const STORAGE_KEY_NOTA_ACTIVA = 'glory_nota_activa_id';
/* [263A-12] Mapa panelId -> notaId para soportar múltiples paneles duplicados */
export const STORAGE_KEY_NOTAS_ACTIVAS_PANEL = 'glory_notas_activas_panel';
export const EVENTO_NOTA_ACTIVA = 'glory_evento_nota_activa';
export const CONTENIDO_NOTA_NUEVA = '# Título de la nota\n\n';

/* [25-08-2026] Los ids son UUID (backend Rust). Se guardan y leen como string;
 * convertir con Number()/parseInt rompía la restauración (NaN) tras el reload. */

/**
 * Guarda el ID de la nota activa en localStorage
 */
export function persistirNotaActivaId(id: string | null): void {
    try {
        if (id !== null) {
            localStorage.setItem(STORAGE_KEY_NOTA_ACTIVA, id);
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
export function obtenerNotaActivaIdGuardado(): string | null {
    try {
        return localStorage.getItem(STORAGE_KEY_NOTA_ACTIVA);
    } catch {
        return null;
    }
}

/**
 * [263A-12] Persiste el ID de la nota activa para un panel específico.
 * Usa un mapa en localStorage para soportar múltiples paneles duplicados.
 */
export function persistirNotaActivaPanel(panelId: string, notaId: string | null): void {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_NOTAS_ACTIVAS_PANEL);
        const mapa: Record<string, string | null> = raw ? JSON.parse(raw) : {};
        mapa[panelId] = notaId;
        localStorage.setItem(STORAGE_KEY_NOTAS_ACTIVAS_PANEL, JSON.stringify(mapa));
    } catch {
        /* Ignorar errores de localStorage */
    }
}

/**
 * [263A-12] Recupera el ID de la nota activa guardada para un panel específico.
 * Mantiene fallback al key legacy para el panel base.
 */
export function obtenerNotaActivaPanelGuardada(panelId: string): string | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_NOTAS_ACTIVAS_PANEL);
        if (raw) {
            const mapa = JSON.parse(raw) as Record<string, string | null>;
            if (panelId in mapa) {
                return mapa[panelId];
            }
        }
    } catch {
        /* Fallthrough al legacy */
    }

    if (panelId === 'scratchpad') {
        return obtenerNotaActivaIdGuardado();
    }

    return null;
}

/**
 * Emite un evento personalizado cuando cambia la nota activa
 * Útil para sincronizar pestañas o componentes si fuera necesario
 */
export function emitirCambioNotaActiva(id: string | null): void {
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
