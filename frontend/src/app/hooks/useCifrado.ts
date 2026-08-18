/**
 * Hook para gestionar el cifrado de datos del usuario
 *
 * Proporciona estado y acciones para habilitar/deshabilitar
 * el cifrado end-to-end de los datos del dashboard.
 */

import {useState, useEffect, useCallback} from 'react';

export interface EstadoCifrado {
    habilitado: boolean;
    algoritmo: string;
    tipoClaveDerivacion: string;
}

interface UseCifradoReturn {
    estadoCifrado: EstadoCifrado | null;
    cargando: boolean;
    error: string | null;
    toggleCifrado: (habilitar: boolean) => Promise<boolean>;
    recargar: () => Promise<void>;
}

/*
 * Obtiene la configuracion de WordPress inyectada en el frontend
 * Nota: apiBase apunta a /glory/v1/dashboard, pero para seguridad
 * necesitamos /glory/v1, por eso removemos el sufijo /dashboard
 * Retorna null si el usuario no está autenticado
 */
function obtenerConfigWP(): {nonce: string; apiBase: string} | null {
    const wpData = (
        window as unknown as {
            gloryDashboard?: {nonce?: string; apiBase?: string; isLoggedIn?: boolean};
        }
    ).gloryDashboard;

    /* Verificar que el usuario esté logueado, no solo que exista el nonce */
    if (!wpData?.isLoggedIn || !wpData?.nonce) {
        return null;
    }

    /* Obtener la base sin /dashboard para endpoints fuera de dashboard */
    let apiBase = wpData.apiBase || '/wp-json/glory/v1/dashboard';
    if (apiBase.endsWith('/dashboard')) {
        apiBase = apiBase.replace('/dashboard', '');
    }

    return {
        nonce: wpData.nonce,
        apiBase
    };
}

export function useCifrado(): UseCifradoReturn {
    const [estadoCifrado, setEstadoCifrado] = useState<EstadoCifrado | null>(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);

    /* [18-08-2026] Sin backend de cifrado E2E en Rust aun: se degrada a estado
     * deshabilitado sin llamar a /wp-json. El flag cifradoE2E se persiste via
     * PUT /api/dashboard/settings cuando exista el flujo de claves. */
    const cargarEstado = useCallback(async () => {
        setEstadoCifrado(null);
        setCargando(false);
        setError(null);
    }, []);

    const toggleCifrado = useCallback(async (_habilitar: boolean): Promise<boolean> => {
        setError('El cifrado de extremo a extremo aún no está disponible');
        return false;
    }, []);

    useEffect(() => {
        cargarEstado();
    }, [cargarEstado]);

    return {
        estadoCifrado,
        cargando,
        error,
        toggleCifrado,
        recargar: cargarEstado
    };
}

export default useCifrado;
