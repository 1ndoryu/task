/*
 * Hook useAlmacenamiento
 * Gestiona el estado de almacenamiento del usuario.
 * Consulta uso de espacio y valida antes de subir archivos.
 */

import {useState, useEffect, useCallback} from 'react';
import type {InfoAlmacenamiento} from '../types/dashboard';
import {apiFetch} from '../utils/apiClient';

interface EstadoAlmacenamiento {
    info: InfoAlmacenamiento | null;
    cargando: boolean;
    error: string | null;
}

const ALMACENAMIENTO_INICIAL: InfoAlmacenamiento = {
    usado: 0,
    usadoFormateado: '0 B',
    limite: 1073741824,
    limiteFormateado: '1 GB',
    disponible: 1073741824,
    disponibleFormateado: '1 GB',
    porcentaje: 0,
    cercaDelLimite: false,
    limiteExcedido: false,
    esPremium: false
};

export function useAlmacenamiento() {
    const [estado, setEstado] = useState<EstadoAlmacenamiento>({
        info: null,
        cargando: false,
        error: null
    });

    /* [18-08-2026] Contrato Rust: GET /api/storage -> StorageInfo (mismo shape). */
    const cargar = useCallback(async () => {
        setEstado(prev => ({...prev, cargando: true, error: null}));
        try {
            const info = await apiFetch<InfoAlmacenamiento>('/storage');
            setEstado({info, cargando: false, error: null});
        } catch (err) {
            const mensaje = err instanceof Error ? err.message : 'Error de conexión';
            setEstado({info: null, cargando: false, error: mensaje});
        }
    }, []);

    /* Verificar si se puede subir un archivo de X bytes */
    /* [18-08-2026] Contrato Rust: POST /api/storage/verify { tamano } -> { puedeSubir, message }. */
    const verificarEspacio = useCallback(async (tamanoBytes: number): Promise<{puedeSubir: boolean; mensaje: string; info: InfoAlmacenamiento | null}> => {
        try {
            const respuesta = await apiFetch<{success: boolean; puedeSubir: boolean; message: string | null}>(
                '/storage/verify',
                {method: 'POST', body: {tamano: tamanoBytes}}
            );
            const info = await apiFetch<InfoAlmacenamiento>('/storage');
            return {
                puedeSubir: respuesta.puedeSubir,
                mensaje: respuesta.message || '',
                info
            };
        } catch (err) {
            const mensaje = err instanceof Error ? err.message : 'Error de conexión';
            setEstado(prev => ({...prev, error: mensaje}));
            return {puedeSubir: false, mensaje, info: null};
        }
    }, []);

    /* Cargar al montar */
    useEffect(() => {
        cargar();
    }, [cargar]);

    /* Calcular color de la barra de progreso */
    const colorBarra = estado.info ? (estado.info.limiteExcedido ? 'var(--dashboard-estadoAlta)' : estado.info.cercaDelLimite ? 'var(--dashboard-estadoAdvertencia)' : 'var(--dashboard-estadoActivo)') : 'var(--dashboard-estadoActivo)';

    return {
        ...estado,
        cargar,
        verificarEspacio,
        colorBarra,
        /* Helpers */
        porcentaje: estado.info?.porcentaje ?? 0,
        cercaDelLimite: estado.info?.cercaDelLimite ?? false,
        limiteExcedido: estado.info?.limiteExcedido ?? false
    };
}
