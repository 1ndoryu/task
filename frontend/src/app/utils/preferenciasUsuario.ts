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
 * MCP, glory_mcp_token_base64), marcas de proceso (glory_usuario_inicializado,
 * glory_sync_init_retries), caches regenerables (HabitosHistorialStore TTL 10m,
 * glory_actividad_cache sessionStorage TTL 5m, glory_offline_db IndexedDB) ni
 * datos que ya se sincronizan por su propia vía (dashboard_* via dashboard,
 * glory-habitos-store via /api/habits, actividad via /api/activity).
 *
 * [18-08-2026] Auditoría exhaustiva: se añadieron glory-ayuno y
 * glory-deficit-calorico (el sync los incluye en datosActuales pero el backend
 * Rust NO tiene campos/handlers para ellos → viven solo en localStorage),
 * grupos de tareas/FB, estado de paneles (escalador de imagen, columnas FB,
 * página móvil, nota activa) y las claves de la isla Arbitraje del mismo SPA.
 */
import {apiFetch} from './apiClient';
import {leerClave, escribirClave} from './almacenamientoPreferencias';

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
    /* Datos de plugin sin backend Rust (el sync de dashboard no los persiste) */
    'glory-ayuno',
    'glory-deficit-calorico',
    /* Grupos (service legacy /wp-json, sin backend Rust) */
    'grupos-tareas-storage',
    'GruposFbStore',
    /* Estado de paneles y UI */
    'magnific_last_task',
    'gruposFb_columnas',
    'gloryPaginaMovilActiva',
    'glory_nota_activa_id',
    'glory_notas_activas_panel',
    /* Isla Arbitraje (misma SPA, ruta /arbitraje/) */
    'arbitraje_costoProducto',
    'arbitraje_costoEnvio',
    'arbitraje_precioVenta',
    'arbitraje_tasas',
    'arbitraje_numeroCiclos',
    'arbitraje_modoSimulacion',
    /* Tema (hook useTema) */
    'dashboard_tema',
];

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
        /* [H-F15-02] apiFetch: CSRF, JSON y manejo de errores unificados con
         * el resto del cliente (el endpoint responde 204 No Content). */
        await apiFetch('/dashboard/settings', {
            method: 'PUT',
            body: {preferencias}
        });
        return true;
    } catch (error) {
        console.warn('[Preferencias] Flush de logout falló:', error);
        return false;
    }
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
