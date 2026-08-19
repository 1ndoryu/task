/**
 * Store de Suscripción (Zustand)
 *
 * Fuente única de verdad para el estado de suscripción del usuario.
 * Centraliza la lógica de verificación de límites y acceso premium
 * siguiendo principios SOLID (SRP, DIP).
 *
 * @package App/React/stores
 */

import {create} from 'zustand';
import {apiFetch} from '../utils/apiClient';
import type {InfoSuscripcion, LimitesPlan} from '../types/dashboard';

/* [H-F11-02] El backend (/api/subscription) es la autoridad de límites: este
 * default solo pinta el estado FREE pre-hidratación (recargarSuscripcion
 * reemplaza suscripcion con los límites del servidor). LIMITES_PREMIUM era
 * duplicación muerta del contrato Rust y se eliminó. */
const LIMITES_FREE_FALLBACK: LimitesPlan = {
    habitos: 5,
    tareasActivas: 20,
    proyectos: 3,
    adjuntosPorTarea: 0,
    sincronizacion: false,
    estadisticasAvanzadas: false,
    temas: false,
    cifradoE2E: true
};

/*
 * Genera info de suscripción FREE por defecto
 */
function crearSuscripcionFree(): InfoSuscripcion {
    return {
        plan: 'free',
        estado: 'activa',
        esPremium: false,
        diasRestantes: null,
        trialDisponible: true,
        limites: LIMITES_FREE_FALLBACK,
        fechaInicio: new Date().toISOString(),
        fechaExpiracion: null
    };
}

/*
 * Obtiene la suscripción inicial desde window.gloryDashboard
 */
function obtenerSuscripcionInicial(): InfoSuscripcion {
    const wpData = (
        window as unknown as {
            gloryDashboard?: {
                suscripcion?: InfoSuscripcion;
                isLoggedIn?: boolean;
            };
        }
    ).gloryDashboard;

    if (!wpData?.isLoggedIn || !wpData.suscripcion) {
        return crearSuscripcionFree();
    }

    return wpData.suscripcion;
}

/*
 * Tipo de entidad para verificar límites
 */
export type TipoEntidadLimite = 'habitos' | 'tareasActivas' | 'proyectos' | 'adjuntos';

/* Mapeo de entidad conceptual a clave real en LimitesPlan */
const MAPA_LIMITE: Record<TipoEntidadLimite, keyof LimitesPlan> = {
    habitos: 'habitos',
    tareasActivas: 'tareasActivas',
    proyectos: 'proyectos',
    adjuntos: 'adjuntosPorTarea'
};

/*
 * Resultado de verificación de límite
 */
export interface ResultadoLimite {
    permitido: boolean;
    limite: number;
    actual: number;
    mensaje: string;
}

interface SuscripcionState {
    suscripcion: InfoSuscripcion;
    cargando: boolean;
    error: string | null;
}

interface SuscripcionActions {
    /* Getters computados */
    esPremium: () => boolean;
    enTrial: () => boolean;
    obtenerLimites: () => LimitesPlan;

    /* Verificaciones de acceso */
    puedeCrear: (entidad: TipoEntidadLimite, cantidadActual: number) => boolean;
    verificarLimite: (entidad: TipoEntidadLimite, cantidadActual: number) => ResultadoLimite;
    tieneAcceso: (funcionalidad: keyof LimitesPlan) => boolean;

    /* Acciones */
    activarTrial: () => Promise<boolean>;
    recargarSuscripcion: () => Promise<void>;
    establecerSuscripcion: (suscripcion: InfoSuscripcion) => void;
    limpiarError: () => void;
}

export const useSuscripcionStore = create<SuscripcionState & SuscripcionActions>((set, get) => {
    /* Estado inicial */
    const estadoInicial: SuscripcionState = {
        suscripcion: obtenerSuscripcionInicial(),
        cargando: false,
        error: null,
    };

    return {
        ...estadoInicial,

    /* Getters computados */
    esPremium: () => get().suscripcion.esPremium,
    enTrial: () => get().suscripcion.estado === 'trial',
    obtenerLimites: () => get().suscripcion.limites,

    /*
     * Verifica si el usuario puede crear más entidades de un tipo
     */
    puedeCrear: (entidad, cantidadActual) => {
        const limites = get().suscripcion.limites;
        const limite = limites[MAPA_LIMITE[entidad]] as number;

        /* -1 significa ilimitado */
        if (limite === -1) return true;

        return cantidadActual < limite;
    },

    /*
     * Verifica límite y devuelve resultado detallado
     */
    verificarLimite: (entidad, cantidadActual) => {
        const limites = get().suscripcion.limites;
        const limite = limites[MAPA_LIMITE[entidad]] as number;

        /* -1 significa ilimitado */
        if (limite === -1) {
            return {
                permitido: true,
                limite: -1,
                actual: cantidadActual,
                mensaje: ''
            };
        }

        const permitido = cantidadActual < limite;
        const nombreEntidad = {
            habitos: 'hábitos',
            tareasActivas: 'tareas activas',
            proyectos: 'proyectos',
            adjuntos: 'adjuntos'
        }[entidad];

        return {
            permitido,
            limite,
            actual: cantidadActual,
            mensaje: permitido
                ? ''
                : `Has alcanzado el límite de ${limite} ${nombreEntidad} del plan gratuito.`
        };
    },

    /*
     * Verifica si una funcionalidad está disponible
     */
    tieneAcceso: funcionalidad => {
        const valor = get().suscripcion.limites[funcionalidad];

        if (typeof valor === 'boolean') return valor;

        /* Para valores numéricos, > 0 significa acceso (o -1 = ilimitado) */
        return valor !== 0;
    },

    /*
     * Activa el trial de 30 días (contrato Rust POST /api/subscription/trial)
     * [H-F11-02] apiFetch en vez del fetch con nonce WP + replace de URL frágil.
     */
    activarTrial: async () => {
        set({cargando: true, error: null});

        try {
            const data = await apiFetch<{success: boolean; data: InfoSuscripcion; message?: string}>(
                '/subscription/trial',
                {method: 'POST'}
            );
            set({suscripcion: data.data, cargando: false});
            return true;
        } catch (err) {
            const mensaje = err instanceof Error ? err.message : 'Error de conexión';
            set({error: mensaje, cargando: false});
            return false;
        }
    },

    /*
     * Recarga la información de suscripción desde el servidor
     * [18-08-2026] Contrato Rust: GET /api/subscription -> InfoSuscripcion
     * directa. [H-F11-02] apiFetch: CSRF y errores unificados.
     */
    recargarSuscripcion: async () => {
        set({cargando: true});

        try {
            const data = await apiFetch<InfoSuscripcion>('/subscription');
            set({suscripcion: data, error: null, cargando: false});
        } catch (err) {
            /* Sin sesion o error: se mantiene el estado actual (free por defecto) */
            console.error('[SuscripcionStore] Error al recargar:', err);
            set({cargando: false});
        }
    },

    /*
     * Establece la suscripción manualmente (para testing o actualizaciones externas)
     */
    establecerSuscripcion: suscripcion => {
        set({suscripcion});
    },

    limpiarError: () => set({error: null})
    };
});

/*
 * Selectores atómicos para evitar re-renders innecesarios
 */
export const selectEsPremium = (state: SuscripcionState & SuscripcionActions) => state.esPremium();
export const selectEnTrial = (state: SuscripcionState & SuscripcionActions) => state.enTrial();
export const selectLimites = (state: SuscripcionState & SuscripcionActions) => state.obtenerLimites();
export const selectSuscripcion = (state: SuscripcionState & SuscripcionActions) => state.suscripcion;

/*
 * [H-F11-03] Hidratación explícita: se llama una vez desde el boot (main.tsx)
 * en vez de un setTimeout oculto en la evaluación del módulo. La señal fiable
 * es la cookie csrf_token (no HttpOnly): existe = hay sesión. En la landing
 * sin sesión se omite y el store queda en FREE sin generar 401 de consola. */
export function inicializarSuscripcionStore(): void {
    if (/(?:^|;\s*)csrf_token=/.test(document.cookie)) {
        void useSuscripcionStore.getState().recargarSuscripcion();
    }
}
