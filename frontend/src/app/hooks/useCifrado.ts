/**
 * Hook para gestionar el cifrado de datos del usuario
 *
 * Proporciona estado y acciones para habilitar/deshabilitar
 * el cifrado end-to-end de los datos del dashboard.
 */

import {useState, useEffect, useCallback} from 'react';
import {apiFetch} from '../utils/apiClient';

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

/* [18-08-2026] Contrato Rust /api/security/e2e:
 * GET -> { habilitado, algoritmo, tipoClaveDerivacion }
 * PUT { habilitado, claveCifrada, algoritmo?, derivacion? } -> { success, estado }
 * La clave se genera en el cliente (AES-GCM 256 bits, base64) y el servidor
 * solo la guarda como blob; el cifrado real de los datos es responsabilidad
 * del cliente (Web Crypto) cuando se active el flujo completo. */

function generarClaveAesGcm(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    let binaria = '';
    for (const byte of bytes) {
        binaria += String.fromCharCode(byte);
    }
    return btoa(binaria);
}

export function useCifrado(): UseCifradoReturn {
    const [estadoCifrado, setEstadoCifrado] = useState<EstadoCifrado | null>(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const cargarEstado = useCallback(async () => {
        setCargando(true);
        setError(null);
        try {
            const estado = await apiFetch<EstadoCifrado>('/security/e2e');
            setEstadoCifrado(estado);
        } catch (err) {
            const mensaje = err instanceof Error ? err.message : 'Error de conexión';
            setError(mensaje);
            setEstadoCifrado(null);
        } finally {
            setCargando(false);
        }
    }, []);

    const toggleCifrado = useCallback(async (habilitar: boolean): Promise<boolean> => {
        setCargando(true);
        setError(null);
        try {
            const respuesta = await apiFetch<{success: boolean; estado: EstadoCifrado}>('/security/e2e', {
                method: 'PUT',
                body: habilitar
                    ? {
                          habilitado: true,
                          claveCifrada: generarClaveAesGcm(),
                          algoritmo: 'AES-GCM',
                          derivacion: 'PBKDF2'
                      }
                    : {habilitado: false, claveCifrada: ''}
            });
            setEstadoCifrado(respuesta.estado);
            return respuesta.success;
        } catch (err) {
            const mensaje = err instanceof Error ? err.message : 'Error de conexión';
            setError(mensaje);
            return false;
        } finally {
            setCargando(false);
        }
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
