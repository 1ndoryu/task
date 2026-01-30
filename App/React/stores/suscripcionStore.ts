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
import type {InfoSuscripcion, LimitesPlan, PlanSuscripcion, EstadoSuscripcion} from '../types/dashboard';

/*
 * Límites por defecto para plan FREE
 * Nota: cifradoE2E disponible para todos los planes
 */
const LIMITES_FREE: LimitesPlan = {
    habitos: 10,
    tareasActivas: 50,
    proyectos: 3,
    adjuntosPorTarea: 0,
    sincronizacion: false,
    estadisticasAvanzadas: false,
    temas: false,
    cifradoE2E: true
};

/*
 * Límites para plan PREMIUM
 */
const LIMITES_PREMIUM: LimitesPlan = {
    habitos: -1,
    tareasActivas: -1,
    proyectos: -1,
    adjuntosPorTarea: 10,
    sincronizacion: true,
    estadisticasAvanzadas: true,
    temas: true,
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
        limites: LIMITES_FREE,
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

export const useSuscripcionStore = create<SuscripcionState & SuscripcionActions>((set, get) => ({
    /* Estado inicial */
    suscripcion: obtenerSuscripcionInicial(),
    cargando: false,
    error: null,

    /* Getters computados */
    esPremium: () => get().suscripcion.esPremium,
    enTrial: () => get().suscripcion.estado === 'trial',
    obtenerLimites: () => get().suscripcion.limites,

    /*
     * Verifica si el usuario puede crear más entidades de un tipo
     */
    puedeCrear: (entidad, cantidadActual) => {
        const limites = get().suscripcion.limites;
        const limite = limites[entidad];

        /* -1 significa ilimitado */
        if (limite === -1) return true;

        return cantidadActual < limite;
    },

    /*
     * Verifica límite y devuelve resultado detallado
     */
    verificarLimite: (entidad, cantidadActual) => {
        const limites = get().suscripcion.limites;
        const limite = limites[entidad];

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
     * Activa el trial de 14 días
     */
    activarTrial: async () => {
        const wpData = (
            window as unknown as {
                gloryDashboard?: {nonce?: string; apiBase?: string};
            }
        ).gloryDashboard;

        if (!wpData?.apiBase || !wpData?.nonce) {
            set({error: 'No hay conexión con el servidor'});
            return false;
        }

        set({cargando: true, error: null});

        try {
            const response = await fetch(wpData.apiBase.replace('/dashboard', '/suscripcion/trial'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': wpData.nonce
                },
                credentials: 'include'
            });

            const data = await response.json();

            if (data.success) {
                set({suscripcion: data.data, cargando: false});
                return true;
            }

            set({error: data.message || 'No se pudo activar el trial', cargando: false});
            return false;
        } catch (err) {
            const mensaje = err instanceof Error ? err.message : 'Error de conexión';
            set({error: mensaje, cargando: false});
            return false;
        }
    },

    /*
     * Recarga la información de suscripción desde el servidor
     */
    recargarSuscripcion: async () => {
        const wpData = (
            window as unknown as {
                gloryDashboard?: {nonce?: string; apiBase?: string};
            }
        ).gloryDashboard;

        if (!wpData?.apiBase || !wpData?.nonce) return;

        set({cargando: true});

        try {
            const response = await fetch(wpData.apiBase.replace('/dashboard', '/suscripcion'), {
                method: 'GET',
                headers: {'X-WP-Nonce': wpData.nonce},
                credentials: 'include'
            });

            const data = await response.json();

            if (data.success) {
                set({suscripcion: data.data, cargando: false});
            } else {
                set({cargando: false});
            }
        } catch (err) {
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
}));

/*
 * Selectores atómicos para evitar re-renders innecesarios
 */
export const selectEsPremium = (state: SuscripcionState & SuscripcionActions) => state.esPremium();
export const selectEnTrial = (state: SuscripcionState & SuscripcionActions) => state.enTrial();
export const selectLimites = (state: SuscripcionState & SuscripcionActions) => state.obtenerLimites();
export const selectSuscripcion = (state: SuscripcionState & SuscripcionActions) => state.suscripcion;
