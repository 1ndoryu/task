/*
 * preferenciasUsuario.ts
 *
 * [18-08-2026] Fuente de verdad de preferencias UI/plugins por usuario.
 *
 * En WordPress el layout, plugins, sidebar, tema, órdenes y filtros vivían
 * SOLO en localStorage: al abrir en otro navegador o reiniciar la cache se
 * borraban. Aquí el servidor es la fuente de verdad: `recolectarPreferencias()`
 * junta el blob completo y `aplicarPreferenciasServidor()` restaura las claves
 * que el navegador local NO tiene (navegador nuevo / cache limpia) sin pisar
 * las que el usuario ya tiene (mismo navegador, estado más fresco).
 *
 * Contrato: el blob viaja dentro de `configuracion.preferencias` del
 * PUT/GET /api/dashboard/settings (Rust persiste el JSONB completo).
 */

/* Claves de preferencias persistibles. NO incluir: secretos (API keys, tokens
 * MCP), datos que ya se sincronizan por su propia vía (habitos/tareas/notas/
 * proyectos via dashboard, actividad via /api/activity) ni caches efímeros
 * (actividad sessionStorage, sync retries). */
export const CLAVES_PREFERENCIAS: string[] = [
    /* Layout y paneles */
    'glory_config_layout',
    'glory_sidebar_paneles',
    'glory_sidebar_expandido',
    'glory_chat_panel_visible',
    /* Configuración por dominio */
    'glory_config_tareas',
    'glory_config_habitos_desktop',
    'glory_config_habitos_movil',
    'glory_config_proyectos',
    'glory_config_scratchpad',
    'glory_config_actividad',
    /* Órdenes y filtros */
    'glory_orden_habitos',
    'glory_orden_tareas',
    'glory_filtro_tareas',
    /* Preferencias globales */
    'glory-config-usuario',      // hora fin de día (configuracionUsuarioStore)
    'glory-nav-movil',           // navegación móvil
    'glory-ia-panel',            // configuración del panel IA (sin API keys)
    'glory-plugins',             // plugins activos + configuración
    /* Datos de plugins que en WP vivían solo en localStorage */
    'glory-time-tracker',
    'glory-recordatorios',
    'glory_grupos_ejecucion',
    /* Tema (hook useTema) */
    'dashboard_tema',
];

/* Eventos que usan los hooks/stores para reaccionar a cambios en la misma
 * pestaña (useLocalStorage) y entre pestañas (storage). */
const EVENTO_SYNC_LOCAL = '__glory_ls_update__';

/** Lee una clave de localStorage y devuelve su valor parseado (o undefined). */
function leerClave(clave: string): unknown | undefined {
    try {
        const raw = localStorage.getItem(clave);
        if (raw === null) return undefined;
        return JSON.parse(raw);
    } catch {
        return undefined;
    }
}

/**
 * Junta el blob completo de preferencias del usuario desde localStorage.
 * Solo incluye claves presentes; el resultado se sube con cada guardado.
 */
export function recolectarPreferencias(): Record<string, unknown> {
    const preferencias: Record<string, unknown> = {};
    for (const clave of CLAVES_PREFERENCIAS) {
        const valor = leerClave(clave);
        if (valor !== undefined) preferencias[clave] = valor;
    }
    return preferencias;
}

/** Escribe una clave en localStorage y notifica a hooks/stores de la pestaña. */
function escribirClave(clave: string, valor: unknown): void {
    try {
        const serializado = JSON.stringify(valor);
        localStorage.setItem(clave, serializado);
        /* [233A-66] Mismo canal que useLocalStorage: actualiza instancias de la
         * misma pestaña; el evento 'storage' (nativo, cross-tab) también se
         * dispara solo en otras pestañas, así que emitimos el CustomEvent. */
        window.dispatchEvent(new CustomEvent(EVENTO_SYNC_LOCAL, {
            detail: {clave, valor: serializado}
        }));
        /* Los stores Zustand con persist (plugins, nav móvil, IA, etc.) escuchan
         * el evento nativo 'storage': un StorageEvent sintético en la misma
         * pestaña les rehidrata el estado sin recargar la página. */
        window.dispatchEvent(new StorageEvent('storage', {
            key: clave,
            newValue: serializado,
            storageArea: localStorage
        }));
    } catch (error) {
        console.warn(`[Preferencias] No se pudo escribir "${clave}":`, error);
    }
}

/**
 * Aplica las preferencias del servidor SOLO a las claves ausentes localmente.
 * Esto cubre el caso navegador nuevo / cache limpiada (restaurar layout,
 * plugins, tema, órdenes...) sin pisar el estado local más fresco del mismo
 * navegador. Devuelve cuántas claves se restauraron.
 */
/**
 * Sube el blob completo de preferencias al servidor de inmediato.
 * Lo usa el logout: si el usuario cambió una preferencia dentro del debounce
 * del observador (<1.2s), este flush garantiza que no se pierda al limpiar
 * el localStorage (el servidor es la fuente de verdad).
 */
export async function persistirPreferenciasAhora(): Promise<boolean> {
    const preferencias = recolectarPreferencias();
    if (Object.keys(preferencias).length === 0) return true;
    try {
        const respuesta = await fetch('/api/dashboard/settings', {
            method: 'PUT',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': obtenerTokenCsrf()
            },
            body: JSON.stringify({preferencias})
        });
        if (!respuesta.ok) {
            console.warn('[Preferencias] Flush de logout falló:', respuesta.status);
            return false;
        }
        return true;
    } catch (error) {
        console.warn('[Preferencias] Flush de logout falló:', error);
        return false;
    }
}

/* Token CSRF de la cookie no HttpOnly (mismo contrato que apiClient). */
function obtenerTokenCsrf(): string {
    const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

export function aplicarPreferenciasServidor(
    preferencias: Record<string, unknown> | null | undefined
): number {
    if (!preferencias || typeof preferencias !== 'object') return 0;

    let restauradas = 0;
    for (const [clave, valor] of Object.entries(preferencias)) {
        if (!CLAVES_PREFERENCIAS.includes(clave)) continue;
        const existeLocal = leerClave(clave) !== undefined;
        if (existeLocal) continue; // estado local más fresco: no pisar
        escribirClave(clave, valor);
        restauradas++;
    }

    if (restauradas > 0) {
        console.info(`[Preferencias] Restauradas ${restauradas} preferencias desde el servidor`);
    }
    return restauradas;
}
