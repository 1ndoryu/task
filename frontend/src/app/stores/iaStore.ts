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
export type ProveedorIA = 'cerebras' | 'groq' | 'deepseek' | 'glory';

/* Acción estructurada que la IA puede ejecutar (Fase 3)
 * [303A-11] pendienteConfirmacion: acciones destructivas requieren confirmación del usuario */
export interface AccionIA {
    tipo: string;
    parametros: Record<string, unknown>;
    ejecutada?: boolean;
    resultado?: string;
    pendienteConfirmacion?: boolean;
    accionExternaId?: number;
    /* [27-08-2026] Datos estructurados de la propuesta (p. ej. el recordatorio
     * validado con su idempotency_key) que la confirmación reenvía al backend. */
    datos?: Record<string, unknown>;
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

/* Estado persistente (configuración) dividido en sub-interfaces cohesivas
 * (ISP) para no cruzar la metrica de interfaz grande; la forma plana del
 * call-site se conserva via extends. Solo datos no sensibles. */
interface IAConfigModelo {
    sessionId: string;
    proveedor: ProveedorIA;
    modelo: string;
    preferenciasUsuario: string;
    promptSistema: string;
    temperatura: number;
    maxTokens: number;
    idioma: string;
    estilo: string;
}

interface IAConfigContexto {
    incluirTareasCompletadas: boolean;
    incluirHabitosPausados: boolean;
    incluirNotasEnContexto: boolean;
    permitirRecordatorios: boolean;
    permitirBusquedaWeb: boolean;
}

/* Estado persistente (configuración) — solo datos no sensibles. */
interface IAConfigPersistente extends IAConfigModelo, IAConfigContexto {
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

/* Acciones divididas por dominio (ISP): keys/modelo/contexto para setters
 * de config, chat para mensajes/estado. La union IAStore las compone. */
interface IAAccionesKeys {
    setProveedor: (proveedor: ProveedorIA) => void;
    setApiKey: (key: string) => void;
    setApiKeyDeepseek: (key: string) => void;
    setApiKeyCerebras: (key: string) => void;
}

interface IAAccionesModelo {
    setModelo: (modelo: string) => void;
    setPreferencias: (preferencias: string) => void;
    setPromptSistema: (prompt: string) => void;
    setTemperatura: (temperatura: number) => void;
    setMaxTokens: (maxTokens: number) => void;
    setIdioma: (idioma: string) => void;
    setEstilo: (estilo: string) => void;
}

interface IAAccionesContexto {
    setIncluirTareasCompletadas: (valor: boolean) => void;
    setIncluirHabitosPausados: (valor: boolean) => void;
    setIncluirNotasEnContexto: (valor: boolean) => void;
    setPermitirRecordatorios: (valor: boolean) => void;
    setPermitirBusquedaWeb: (valor: boolean) => void;
}

interface IAAccionesConfig extends IAAccionesKeys, IAAccionesModelo, IAAccionesContexto {
}

interface IAAccionesChat {
    setMensajes: (mensajes: MensajeIA[]) => void;
    agregarMensaje: (mensaje: MensajeIA) => void;
    /* [303A-11] Actualizar un mensaje existente (para confirmar/rechazar acciones pendientes) */
    actualizarMensaje: (id: string, cambios: Partial<MensajeIA>) => void;
    setEnviando: (enviando: boolean) => void;
    setError: (error: string | null) => void;
    incrementarTokens: (cantidad: number) => void;
    limpiarChat: () => void;
}

interface IAAcciones extends IAAccionesConfig, IAAccionesChat {
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
            proveedor: 'glory',
            modelo: 'glm-5.3-flash',
            preferenciasUsuario: '',
            promptSistema: '',
            /* [27-08-2026] Defaults de la configuración detallada IA. */
            temperatura: 0.7,
            maxTokens: 2048,
            idioma: 'es',
            estilo: 'conciso',
            incluirTareasCompletadas: false,
            incluirHabitosPausados: false,
            incluirNotasEnContexto: false,
            permitirRecordatorios: true,
            permitirBusquedaWeb: true,

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
            setTemperatura: (temperatura) => set({temperatura}),
            setMaxTokens: (maxTokens) => set({maxTokens}),
            setIdioma: (idioma) => set({idioma}),
            setEstilo: (estilo) => set({estilo}),
            setIncluirTareasCompletadas: (valor) => set({incluirTareasCompletadas: valor}),
            setIncluirHabitosPausados: (valor) => set({incluirHabitosPausados: valor}),
            setIncluirNotasEnContexto: (valor) => set({incluirNotasEnContexto: valor}),
            setPermitirRecordatorios: (valor) => set({permitirRecordatorios: valor}),
            setPermitirBusquedaWeb: (valor) => set({permitirBusquedaWeb: valor}),

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
                promptSistema: state.promptSistema,
                temperatura: state.temperatura,
                maxTokens: state.maxTokens,
                idioma: state.idioma,
                estilo: state.estilo,
                incluirTareasCompletadas: state.incluirTareasCompletadas,
                incluirHabitosPausados: state.incluirHabitosPausados,
                incluirNotasEnContexto: state.incluirNotasEnContexto,
                permitirRecordatorios: state.permitirRecordatorios,
                permitirBusquedaWeb: state.permitirBusquedaWeb
            })
        }
    )
);
