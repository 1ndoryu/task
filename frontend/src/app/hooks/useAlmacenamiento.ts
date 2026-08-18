/*
 * Hook useAlmacenamiento
 * Gestiona el estado de almacenamiento del usuario.
 * Consulta uso de espacio y valida antes de subir archivos.
 */

import {useState, useEffect, useCallback} from 'react';
import type {InfoAlmacenamiento} from '../types/dashboard';

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

interface RespuestaApi {
    success: boolean;
    data?: InfoAlmacenamiento;
    message?: string;
}

interface RespuestaVerificacion extends RespuestaApi {
    puedeSubir: boolean;
}

export function useAlmacenamiento() {
    const [estado, setEstado] = useState<EstadoAlmacenamiento>({
        info: null,
        cargando: false,
        error: null
    });

    /* [18-08-2026] Sin backend de almacenamiento/adjuntos en Rust aun: se
     * degrada a valores locales sin llamar a /wp-json. */
    const cargar = useCallback(async () => {
        setEstado({
            info: ALMACENAMIENTO_INICIAL,
            cargando: false,
            error: null
        });
    }, []);

    /* Verificar si se puede subir un archivo de X bytes */
    const verificarEspacio = useCallback(async (_tamanoBytes: number): Promise<{puedeSubir: boolean; mensaje: string; info: InfoAlmacenamiento | null}> => {
        return {
            puedeSubir: false,
            mensaje: 'Los adjuntos aún no están disponibles',
            info: ALMACENAMIENTO_INICIAL
        };
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
