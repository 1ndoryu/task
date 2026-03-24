/*
 * stores/iaStore.ts
 * Store Zustand para el panel de IA
 * Gestiona chat, preferencias y configuración del asistente
 *
 * [233A-69] Fase 1: Store base con estado de mensajes y configuración persistente.
 * La config (apiKey, modelo, preferencias) se persiste en localStorage.
 * Los mensajes y estado de sesión viven solo en memoria.
 */

import {create} from 'zustand';
import {persist} from 'zustand/middleware';

/* Roles del chat */
export type RolMensaje = 'usuario' | 'asistente' | 'sistema';

/* Acción estructurada que la IA puede ejecutar (Fase 3) */
export interface AccionIA {
    tipo: string;
    parametros: Record<string, unknown>;
    ejecutada?: boolean;
    resultado?: string;
}

/* Mensaje individual del chat */
export interface MensajeIA {
    id: string;
    rol: RolMensaje;
    contenido: string;
    acciones?: AccionIA[];
    timestamp: number;
}

/* Estado persistente (configuración) */
interface IAConfigPersistente {
    apiKey: string;
    modelo: string;
    preferenciasUsuario: string;
}

/* Estado de sesión (no persistido) */
interface IAEstadoSesion {
    mensajes: MensajeIA[];
    enviando: boolean;
    error: string | null;
    tokensUsados: number;
}

/* Acciones */
interface IAAcciones {
    setApiKey: (key: string) => void;
    setModelo: (modelo: string) => void;
    setPreferencias: (preferencias: string) => void;
    agregarMensaje: (mensaje: MensajeIA) => void;
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

export const useIAStore = create<IAStore>()(
    persist(
        (set) => ({
            /* Config persistente */
            apiKey: '',
            modelo: 'meta-llama/llama-4-scout-17b-16e-instruct',
            preferenciasUsuario: '',

            /* Estado de sesión */
            mensajes: [],
            enviando: false,
            error: null,
            tokensUsados: 0,

            /* Acciones de configuración */
            setApiKey: (key) => set({apiKey: key}),
            setModelo: (modelo) => set({modelo}),
            setPreferencias: (preferencias) => set({preferenciasUsuario: preferencias}),

            /* Acciones de chat */
            agregarMensaje: (mensaje) => set(state => ({
                mensajes: [...state.mensajes, mensaje]
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
            /* Solo persistir configuración, no estado de sesión */
            partialize: (state) => ({
                apiKey: state.apiKey,
                modelo: state.modelo,
                preferenciasUsuario: state.preferenciasUsuario
            })
        }
    )
);
