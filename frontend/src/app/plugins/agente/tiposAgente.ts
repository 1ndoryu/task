/* [039A-1/FASE-FINAL] Tipos del store del agente, extraídos de `store.ts`.
 * Las acciones se agrupan por dominio (tabs / turnos+config / tareas) para que
 * cada slice viva en su módulo sin ciclos. */
import type {ConversacionAgente, ConfigAgente, TareaProgramada, DecisionAprobacion} from './service';

export interface MensajeTabAgente {
    id: string;
    rol: 'user' | 'assistant';
    contenido: string;
    /* Eventos de tool del último turno (para las tarjetas). */
    herramientas?: Array<{tool: string; ok: boolean; resumen: string; argumentos?: unknown; diff?: string}>;
    /* [318A-16 F2] Petición de aprobación con canal explícito: `id` +
     * `clasificacion` (clase F1) llegan en el evento `peticion_aprobacion`;
     * sin `id` (backend viejo / solo `requiere_aprobacion`) la UI muestra
     * solo la insignia informativa. */
    aprobacionPendiente?: {id: string; tool: string; argumentos: unknown; clasificacion: string} | null;
    /* Clave de idempotencia del mensaje del usuario: un reintento con la misma
     * clave no duplica la fila en BD (ON CONFLICT DO NOTHING). Se genera en el
     * envío y se conserva en el mensaje para que el botón reintentar reutilice. */
    claveIdempotencia?: string | null;
    /* Fallo retryable del proveedor; el botón reintentar reenvía con la misma clave. */
    reintentar?: boolean | null;
    /* Contexto real recibido por el agente en este turno (eventos usage/contexto).
     * [318A-7] `contexto_detalle` añade el desglose por secciones de la ventana.
     * [02-09-2026] `provider`/`modelo` = proveedor/modelo REAL que respondió
     * (el fallback del core puede saltar a otro distinto del solicitado). */
    contexto?: {
        ocupacionPct: number | null;
        tokensPrompt: number;
        tokensComplecion: number;
        skills: number;
        provider?: string | null;
        modelo?: string | null;
        maxVentana?: number;
        reservaSalida?: number;
        systemInstrucciones?: number;
        definicionesTools?: number;
        mensajes?: number;
        resultadosTools?: number;
        totalEntrada?: number;
    } | null;
}

export interface TabAgente {
    conversacion: ConversacionAgente;
    mensajes: MensajeTabAgente[];
    cargandoHistorial: boolean;
    enviando: boolean;
    error: string | null;
    config: ConfigAgente;
}

/* EstadoAgente se divide en estado puro + acciones, compuesto vía extends. */
export interface EstadoAgenteDatos {
    tabs: TabAgente[];
    tabActivaId: string | null;
    conversacionesCargadas: boolean;
    cargandoLista: boolean;
    errorLista: string | null;
    config: ConfigAgente;
    /* Tareas programadas (sección del panel). */
    tareasProgramadas: TareaProgramada[];
    cargandoTareas: boolean;
    errorTareas: string | null;
}

export interface EstadoAgenteAccionesTabs {
    cargarConversaciones: () => Promise<void>;
    abrirTab: (id: string) => Promise<void>;
    crearTab: () => Promise<ConversacionAgente | null>;
    renombrarTab: (id: string, titulo: string) => Promise<void>;
    cerrarTab: (id: string) => Promise<void>;
}

export interface EstadoAgenteAccionesTurnos {
    enviarMensaje: (texto: string, signal?: AbortSignal, claveIdempotencia?: string) => Promise<void>;
    reintentarMensaje: () => Promise<void>;
    /* [318A-16 F2] Responde la petición de aprobación pendiente del tab con las
     * tres vías (aprobar | siempre | rechazar) y reenvía el turno para que la
     * decisión surta efecto (token de una vez / regla de clase sembrados). */
    responderAprobacion: (tabId: string, decision: DecisionAprobacion) => Promise<void>;
    limpiarErrorTab: (id: string) => void;
    /* [318A-5] Rebobina la conversación hasta un mensaje (volver atrás/editar):
     * borra los mensajes posteriores en BD y en la sesión local. `editar=true`
     * elimina también el mensaje objetivo (para reescribirlo); false lo conserva. */
    rebobinarTab: (id: string, hastaId: number, hastaMensajeId: string, editar?: boolean) => Promise<void>;
    /* [318A-7] Compacta la conversación de forma persistente (marca mensajes
     * antiguos como compactados + inserta resumen system) y reconcilia la
     * sesión local con el historial resultante del servidor. */
    compactarTab: (id: string) => Promise<void>;
    establecerConfig: (config: Partial<ConfigAgente>) => void;
}

export interface EstadoAgenteAccionesConversacion extends EstadoAgenteAccionesTabs, EstadoAgenteAccionesTurnos {}

export interface EstadoAgenteAccionesTareas {
    cargarTareasProgramadas: () => Promise<void>;
    crearTarea: (datos: {nombre: string; prompt: string; tipo: 'una_vez' | 'recurrente'; cron_expr?: string; ejecutar_en?: string}) => Promise<void>;
    eliminarTarea: (id: string) => Promise<void>;
}

export interface EstadoAgente extends EstadoAgenteDatos, EstadoAgenteAccionesConversacion, EstadoAgenteAccionesTareas {}
