/*
 * useAdjuntos
 * Hook para gestionar subida y descarga de adjuntos via API
 * [21-08-2026] Contrato Rust: POST /api/storage/files (multipart, campo
 * "file") con sesión por cookie + X-CSRF-Token, GET/DELETE
 * /api/storage/files/:id y POST /api/storage/verify. Antes usaba el contrato
 * WordPress (window.gloryDashboard.apiUrl/nonce + /wp-json/glory/v1/adjuntos)
 * que ya no existe: obtenerCredenciales() devolvía null y la subida fallaba
 * con "No autenticado". La respuesta es Attachment directo (camelCase).
 */

import {useState, useCallback} from 'react';
import type {Adjunto} from '../types/dashboard';
import {apiFetch, obtenerTokenCsrf} from '../utils/apiClient';
import {useAlmacenamiento} from './useAlmacenamiento';

interface EstadoSubida {
    subiendo: boolean;
    progreso: number;
    error: string | null;
}

interface UseAdjuntosReturn {
    estado: EstadoSubida;
    subirArchivo: (archivo: File) => Promise<Adjunto | null>;
    eliminarArchivo: (adjunto: Adjunto) => Promise<boolean>;
    descargarArchivo: (adjunto: Adjunto) => Promise<Blob | null>;
    verificarEspacio: (tamano: number) => Promise<boolean>;
    limpiarError: () => void;
}

/* Límite de tamaño por archivo (5MB) */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/* Tipos MIME permitidos (paridad con ALLOWED_MIME_TYPES del backend) */
const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];

/**
 * Hook para gestionar adjuntos con subida física al servidor
 */
export function useAdjuntos(): UseAdjuntosReturn {
    const [estado, setEstado] = useState<EstadoSubida>({
        subiendo: false,
        progreso: 0,
        error: null
    });

    const {cargar: refrescarAlmacenamiento} = useAlmacenamiento();

    /**
     * Valida el archivo antes de subir
     */
    const validarArchivo = useCallback((archivo: File): string | null => {
        if (archivo.size > MAX_FILE_SIZE) {
            return `El archivo es demasiado grande (máx: ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(0)}MB)`;
        }

        if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
            return 'Tipo de archivo no permitido';
        }

        return null;
    }, []);

    /* [21-08-2026] La sesión viaja en la cookie HttpOnly (mismo origen) y las
     * mutaciones exigen X-CSRF-Token (cookie csrf_token no HttpOnly), igual
     * que apiFetch. No se manda Content-Type: el navegador fija el boundary
     * del multipart. */
    const subirArchivo = useCallback(
        async (archivo: File): Promise<Adjunto | null> => {
            /* Validar archivo */
            const errorValidacion = validarArchivo(archivo);
            if (errorValidacion) {
                setEstado(prev => ({...prev, error: errorValidacion}));
                return null;
            }

            setEstado({subiendo: true, progreso: 0, error: null});

            try {
                const formData = new FormData();
                formData.append('file', archivo);

                const response = await fetch('/api/storage/files', {
                    method: 'POST',
                    headers: {
                        'X-CSRF-Token': obtenerTokenCsrf()
                    },
                    body: formData,
                    credentials: 'same-origin'
                });

                const data = (await response.json().catch(() => null)) as
                    | (Partial<Adjunto> & {message?: string; error?: string})
                    | null;

                if (!response.ok) {
                    const mensaje = data?.message || data?.error || `Error al subir archivo (${response.status})`;
                    setEstado({subiendo: false, progreso: 0, error: mensaje});
                    return null;
                }

                /* Refrescar información de almacenamiento */
                refrescarAlmacenamiento();

                setEstado({subiendo: false, progreso: 100, error: null});

                /* Attachment del backend (camelCase directo) */
                const adjunto: Adjunto = {
                    id: data?.id ?? '',
                    tipo: (data?.tipo as Adjunto['tipo']) || 'archivo',
                    url: data?.url ?? '',
                    nombre: data?.nombre ?? archivo.name,
                    tamano: data?.tamano ?? archivo.size,
                    fechaSubida: data?.fechaSubida ?? new Date().toISOString(),
                    thumbnailUrl: data?.thumbnailUrl
                };

                return adjunto;
            } catch (error) {
                const mensaje = error instanceof Error ? error.message : 'Error de conexión';
                setEstado({subiendo: false, progreso: 0, error: mensaje});
                return null;
            }
        },
        [validarArchivo, refrescarAlmacenamiento]
    );

    /**
     * Elimina un archivo del servidor
     */
    const eliminarArchivo = useCallback(
        async (adjunto: Adjunto): Promise<boolean> => {
            try {
                await apiFetch(`/storage/files/${adjunto.id}`, {method: 'DELETE'});

                /* Refrescar información de almacenamiento */
                refrescarAlmacenamiento();

                return true;
            } catch (error) {
                const mensaje = error instanceof Error ? error.message : 'Error al eliminar';
                setEstado(prev => ({...prev, error: mensaje}));
                return false;
            }
        },
        [refrescarAlmacenamiento]
    );

    /**
     * Descarga un archivo del servidor (la cookie de sesión viaja en el mismo origen)
     */
    const descargarArchivo = useCallback(async (adjunto: Adjunto): Promise<Blob | null> => {
        try {
            const response = await fetch(adjunto.url, {
                credentials: 'same-origin'
            });

            if (!response.ok) {
                return null;
            }

            return await response.blob();
        } catch {
            return null;
        }
    }, []);

    /**
     * Verifica si hay espacio suficiente para subir
     */
    const verificarEspacio = useCallback(async (tamano: number): Promise<boolean> => {
        try {
            const respuesta = await apiFetch<{success: boolean; puedeSubir: boolean; message: string | null}>(
                '/storage/verify',
                {method: 'POST', body: {tamano}}
            );
            return respuesta.puedeSubir;
        } catch {
            return false;
        }
    }, []);

    /**
     * Limpia el error actual
     */
    const limpiarError = useCallback(() => {
        setEstado(prev => ({...prev, error: null}));
    }, []);

    return {
        estado,
        subirArchivo,
        eliminarArchivo,
        descargarArchivo,
        verificarEspacio,
        limpiarError
    };
}
