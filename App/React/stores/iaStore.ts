/*
 * stores/iaStore.ts
 * Store Zustand para el panel de IA
 * Gestiona chat, preferencias y configuración del asistente
 *
 * [233A-69] Fase 1: Store base con estado de mensajes y configuración persistente.
 * [SEC-001] CRÍTICO: API keys eliminadas de localStorage.
 *   Las keys ahora viven solo en memoria y se obtienen del servidor (backend proxy)
 *   para usuarios admin. Usuarios no-admin deben ingresar su key cada sesión
 *   (nunca se persiste en el navegador).
 */

import {create} from 'zustand';
import {persist} from 'zustand/middleware';

/* Roles del chat */
export type RolMensaje = 'usuario' | 'asistente' | 'sistema';
export type ProveedorIA = 'cerebras' | 'groq' | 'deepseek';

/* Acción estructurada que la IA puede ejecutar (Fase 3)
 * [303A-11] pendienteConfirmacion: acciones destructivas requieren confirmación del usuario */
export interface AccionIA {
    tipo: string;
    parametros: Record<string, unknown>;
    ejecutada?: boolean;
    resultado?: string;
    pendienteConfirmacion?: boolean;
    accionExternaId?: number;
}

/* Mensaje individual del chat */
export interface MensajeIA {
    id: string;
    rol: RolMensaje;
    contenido: string;
    acciones?: AccionIA[];
    timestamp: number;
    /* [106A] id del registro en BD; permite actualizar acciones en backend tras confirmar/rechazar */
    _dbId?: number;
}

/* Estado persistente (configuración) — solo datos no sensibles.
 * [SEC-001] API keys NUNCA se persisten en localStorage. */
interface IAConfigPersistente {
    sessionId: string;
    proveedor: ProveedorIA;
    modelo: string;
    preferenciasUsuario: string;
    promptSistema: string;
}

/* Estado de sesión (no persistido) */
interface IAEstadoSesion {
    mensajes: MensajeIA[];
    enviando: boolean;
    error: string | null;
    tokensUsados: number;
    /* [SEC-001] API keys solo en memoria, nunca en localStorage */
    apiKey: string;
    apiKeyDeepseek: string;
    apiKeyCerebras: string;
}

/* Acciones */
interface IAAcciones {
    setMensajes: (mensajes: MensajeIA[]) => void;
    setProveedor: (proveedor: ProveedorIA) => void;
    setApiKey: (key: string) => void;
    setApiKeyDeepseek: (key: string) => void;
    setApiKeyCerebras: (key: string) => void;
    setModelo: (modelo: string) => void;
    setPreferencias: (preferencias: string) => void;
    setPromptSistema: (prompt: string) => void;
    agregarMensaje: (mensaje: MensajeIA) => void;
    /* [303A-11] Actualizar un mensaje existente (para confirmar/rechazar acciones pendientes) */
    actualizarMensaje: (id: string, cambios: Partial<MensajeIA>) => void;
    setEnviando: (enviando: boolean) => void;
    setError: (error: string | null) => void;
    incrementarTokens: (cantidad: number) => void;
    limpiarChat: () => void;
}

type IAStore = IAConfigPersistente & IAEstadoSesion & IAAcciones;

/* Generar ID único para mensajes */
export function generarIdMensaje(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function generarIdSesionIA(): string {
    return `ia-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const useIAStore = create<IAStore>()(
    persist(
        (set) => ({
            /* Config persistente — solo datos no sensibles */
            sessionId: generarIdSesionIA(),
            proveedor: 'groq',
            modelo: 'meta-llama/llama-4-scout-17b-16e-instruct',
            preferenciasUsuario: '',
            promptSistema: '',

            /* Estado de sesión (incluyendo API keys en memoria — NUNCA persisten) */
            mensajes: [],
            enviando: false,
            error: null,
            tokensUsados: 0,
            apiKey: '',
            apiKeyDeepseek: '',
            apiKeyCerebras: '',

            /* Acciones de configuración */
            setMensajes: (mensajes) => set({mensajes}),
            setProveedor: (proveedor) => set({proveedor}),
            setApiKey: (key) => set({apiKey: key}),
            setApiKeyDeepseek: (key) => set({apiKeyDeepseek: key}),
            setApiKeyCerebras: (key) => set({apiKeyCerebras: key}),
            setModelo: (modelo) => set({modelo}),
            setPreferencias: (preferencias) => set({preferenciasUsuario: preferencias}),
            setPromptSistema: (prompt) => set({promptSistema: prompt}),

            /* Acciones de chat */
            agregarMensaje: (mensaje) => set(state => ({
                mensajes: [...state.mensajes, mensaje]
            })),
            actualizarMensaje: (id, cambios) => set(state => ({
                mensajes: state.mensajes.map(m => m.id === id ? {...m, ...cambios} : m)
            })),
            setEnviando: (enviando) => set({enviando}),
            setError: (error) => set({error}),
            incrementarTokens: (cantidad) => set(state => ({
                tokensUsados: state.tokensUsados + cantidad
            })),
            limpiarChat: () => set({
                mensajes: [],
                tokensUsados: 0,
                error: null
            })
        }),
        {
            name: 'glory-ia-panel',
            /* [SEC-001] Solo persistir configuración no sensible.
             * API keys explícitamente excluidas — nunca en localStorage. */
            partialize: (state) => ({
                proveedor: state.proveedor,
                sessionId: state.sessionId,
                modelo: state.modelo,
                preferenciasUsuario: state.preferenciasUsuario,
                promptSistema: state.promptSistema
            })
        }
    )
);
