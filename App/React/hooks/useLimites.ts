/**
 * Hook para verificación de límites con modal automático
 *
 * Centraliza la lógica de verificación de límites y muestra
 * automáticamente el modal cuando se alcanza un límite.
 * Sigue principios DIP al depender de abstracciones (store).
 *
 * @package App/React/hooks
 */

import {useState, useCallback} from 'react';
import {useSuscripcionStore, type TipoEntidadLimite} from '../stores/suscripcionStore';

interface EstadoModalLimite {
    visible: boolean;
    tipoEntidad: TipoEntidadLimite;
    limite: number;
    actual: number;
}

interface UseLimitesReturn {
    /* Estado del modal */
    modalLimite: EstadoModalLimite;
    cerrarModalLimite: () => void;

    /* Verificadores que muestran modal si se excede el límite */
    verificarYMostrar: (entidad: TipoEntidadLimite, cantidadActual: number) => boolean;

    /* Verificadores silenciosos (sin modal) */
    puedeCrear: (entidad: TipoEntidadLimite, cantidadActual: number) => boolean;
    tieneAcceso: (funcionalidad: 'sincronizacion' | 'estadisticasAvanzadas' | 'temas' | 'cifradoE2E') => boolean;

    /* Info de suscripción */
    esPremium: boolean;
}

const ESTADO_INICIAL: EstadoModalLimite = {
    visible: false,
    tipoEntidad: 'habitos',
    limite: 0,
    actual: 0
};

/**
 * Hook principal para verificación de límites
 */
export function useLimites(): UseLimitesReturn {
    const [modalLimite, setModalLimite] = useState<EstadoModalLimite>(ESTADO_INICIAL);

    /* Obtener funciones del store */
    const puedeCrearStore = useSuscripcionStore(s => s.puedeCrear);
    const verificarLimiteStore = useSuscripcionStore(s => s.verificarLimite);
    const tieneAccesoStore = useSuscripcionStore(s => s.tieneAcceso);
    const esPremium = useSuscripcionStore(s => s.esPremium());

    /*
     * Verifica límite y muestra modal si se excede
     * Retorna true si puede crear, false si está bloqueado
     */
    const verificarYMostrar = useCallback(
        (entidad: TipoEntidadLimite, cantidadActual: number): boolean => {
            const resultado = verificarLimiteStore(entidad, cantidadActual);

            if (!resultado.permitido) {
                setModalLimite({
                    visible: true,
                    tipoEntidad: entidad,
                    limite: resultado.limite,
                    actual: resultado.actual
                });
                return false;
            }

            return true;
        },
        [verificarLimiteStore]
    );

    const cerrarModalLimite = useCallback(() => {
        setModalLimite(ESTADO_INICIAL);
    }, []);

    /*
     * Verificador silencioso (sin modal)
     */
    const puedeCrear = useCallback(
        (entidad: TipoEntidadLimite, cantidadActual: number): boolean => {
            return puedeCrearStore(entidad, cantidadActual);
        },
        [puedeCrearStore]
    );

    /*
     * Verifica acceso a funcionalidad
     */
    const tieneAcceso = useCallback(
        (funcionalidad: 'sincronizacion' | 'estadisticasAvanzadas' | 'temas' | 'cifradoE2E'): boolean => {
            return tieneAccesoStore(funcionalidad);
        },
        [tieneAccesoStore]
    );

    return {
        modalLimite,
        cerrarModalLimite,
        verificarYMostrar,
        puedeCrear,
        tieneAcceso,
        esPremium
    };
}
