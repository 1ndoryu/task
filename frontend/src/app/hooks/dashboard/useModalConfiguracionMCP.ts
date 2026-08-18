/*
 * useModalConfiguracionMCP
 * Hook que encapsula la lógica del modal de configuración MCP/API REST.
 * Gestiona token, verificación, generación, revocación y configuraciones.
 */

import {useState, useCallback, useEffect, useRef} from 'react';
import {useSuscripcionStore} from '../../stores/suscripcionStore';
import {apiFetch} from '../../utils/apiClient';

type ClienteMCP = 'claude' | 'cursor' | 'apirest';

export interface UseModalConfiguracionMCPProps {
    estaAbierto: boolean;
}

export interface UseModalConfiguracionMCPReturn {
    /* Estado */
    clienteActivo: ClienteMCP;
    setClienteActivo: (v: ClienteMCP) => void;
    tokenExiste: boolean;
    tokenGenerado: string | null;
    tokenBase64: string | null;
    fechaCreacion: string | null;
    cargando: boolean;
    verificando: boolean;
    esPremium: boolean;
    apiUrl: string;

    /* Acciones */
    manejarGenerarToken: () => Promise<void>;
    manejarRevocarToken: () => Promise<void>;
    obtenerConfiguracion: (cliente: ClienteMCP) => string;
}

/* Genera el contexto copiable para asistentes IA */
const generarContextoIA = (tokenBase64: string, apiUrl: string): string => {
    const tokenParaMostrar = tokenBase64 || 'TU_TOKEN_BASE64';

    return `# API de Tareas Glory

## Autenticación
Todas las peticiones requieren el header:
Authorization: Basic ${tokenParaMostrar}

## Endpoints disponibles:

### Tareas
- GET ${apiUrl}/ai/tareas?filtro=pendientes|completadas|todas
- POST ${apiUrl}/ai/tareas (body: {texto, prioridad?, urgencia?})
- GET ${apiUrl}/ai/tareas/{id}
- PUT ${apiUrl}/ai/tareas/{id} (body: campos a editar)
- POST ${apiUrl}/ai/tareas/{id}/completar
- DELETE ${apiUrl}/ai/tareas/{id}

### Proyectos
- GET ${apiUrl}/ai/proyectos?estado=activo|completado|pausado|todos
- GET ${apiUrl}/ai/proyectos/{id}

### Hábitos
- GET ${apiUrl}/ai/habitos?importancia=Alta|Media|Baja

### Resumen
- GET ${apiUrl}/ai/resumen

## Ejemplo crear tarea:
POST ${apiUrl}/ai/tareas
Headers: Content-Type: application/json, Authorization: Basic ${tokenParaMostrar}
Body: {"texto": "Mi tarea", "prioridad": "Alta", "urgencia": "urgente"}

## Valores válidos:
- prioridad: Alta, Media, Baja
- urgencia: bloqueante, urgente, normal, chill
- estado proyecto: activo, completado, pausado`;
};

/* Configuraciones JSON para cada cliente MCP */
const generarConfigClaude = (token: string, apiUrl: string) =>
    JSON.stringify(
        {
            mcpServers: {
                'glory-tareas': {
                    command: 'node',
                    args: ['C:/ruta/al/proyecto/glory/mcp/dist/index.js'],
                    env: {
                        GLORY_API_URL: apiUrl,
                        GLORY_AUTH_TOKEN: token || 'TOKEN_PLACEHOLDER'
                    }
                }
            }
        },
        null,
        2
    );

const generarConfigCursor = (token: string, apiUrl: string) =>
    JSON.stringify(
        {
            'glory-tareas': {
                command: 'node',
                args: ['./mcp/dist/index.js'],
                env: {
                    GLORY_API_URL: apiUrl,
                    GLORY_AUTH_TOKEN: token || 'TOKEN_PLACEHOLDER'
                }
            }
        },
        null,
        2
    );

export function useModalConfiguracionMCP({estaAbierto}: UseModalConfiguracionMCPProps): UseModalConfiguracionMCPReturn {
    const [clienteActivo, setClienteActivo] = useState<ClienteMCP>('apirest');
    const [tokenExiste, setTokenExiste] = useState(false);
    const [tokenGenerado, setTokenGenerado] = useState<string | null>(null);
    const [tokenBase64, setTokenBase64] = useState<string | null>(null);
    const [fechaCreacion, setFechaCreacion] = useState<string | null>(null);
    const [cargando, setCargando] = useState(false);
    const [verificando, setVerificando] = useState(true);

    const esPremium = useSuscripcionStore(s => s.esPremium());
    /* [18-08-2026] Contrato Rust /api/security/mcp/token:
     * GET -> { existe, id, fechaCreacion } | POST -> { success, token, fechaCreacion }
     * DELETE /{id} -> { success }. El token plano se muestra una sola vez. */
    const apiUrl = `${window.location.origin}/api`;
    const tokenIdRef = useRef<string | null>(null);

    /* Verificar estado del token al abrir el modal */
    useEffect(() => {
        if (!estaAbierto) return;

        setVerificando(true);
        setTokenExiste(false);
        setTokenGenerado(null);
        setTokenBase64(null);
        setFechaCreacion(null);
        localStorage.removeItem('glory_mcp_token_base64');

        (async () => {
            try {
                const estado = await apiFetch<{existe: boolean; id: string | null; fechaCreacion: string | null}>(
                    '/security/mcp/token'
                );
                tokenIdRef.current = estado.id;
                setTokenExiste(estado.existe);
                setFechaCreacion(estado.fechaCreacion);
            } catch {
                /* Sin token o sin backend: estado por defecto */
                tokenIdRef.current = null;
            } finally {
                setVerificando(false);
            }
        })();
    }, [estaAbierto]);

    /* Generar nuevo token vía API */
    const manejarGenerarToken = useCallback(async () => {
        setCargando(true);
        try {
            const respuesta = await apiFetch<{success: boolean; token: string; fechaCreacion: string}>(
                '/security/mcp/token',
                {method: 'POST'}
            );
            if (respuesta.success) {
                setTokenGenerado(respuesta.token);
                setTokenBase64(btoa(respuesta.token));
                setTokenExiste(true);
                setFechaCreacion(respuesta.fechaCreacion);
                localStorage.setItem('glory_mcp_token_base64', btoa(respuesta.token));
            }
        } catch (err) {
            console.error('[MCP] No se pudo generar el token:', err);
        } finally {
            setCargando(false);
        }
    }, []);

    /* Revocar token existente vía API */
    const manejarRevocarToken = useCallback(async () => {
        setCargando(true);
        try {
            if (tokenIdRef.current) {
                await apiFetch<{success: boolean}>(`/security/mcp/token/${tokenIdRef.current}`, {
                    method: 'DELETE'
                });
            }
            tokenIdRef.current = null;
            setTokenGenerado(null);
            setTokenBase64(null);
            setTokenExiste(false);
            setFechaCreacion(null);
            localStorage.removeItem('glory_mcp_token_base64');
        } catch (err) {
            console.error('[MCP] No se pudo revocar el token:', err);
        } finally {
            setCargando(false);
        }
    }, []);

    /* Obtener configuración JSON según cliente */
    const obtenerConfiguracion = useCallback((cliente: ClienteMCP): string => {
        const tokenParaConfig = tokenBase64 || 'TOKEN_PLACEHOLDER';

        switch (cliente) {
            case 'claude':
                return generarConfigClaude(tokenParaConfig, apiUrl);
            case 'cursor':
                return generarConfigCursor(tokenParaConfig, apiUrl);
            case 'apirest':
                return generarContextoIA(tokenBase64 || '', apiUrl);
            default:
                return '';
        }
    }, [tokenBase64, apiUrl]);

    return {
        clienteActivo,
        setClienteActivo,
        tokenExiste,
        tokenGenerado,
        tokenBase64,
        fechaCreacion,
        cargando,
        verificando,
        esPremium,
        apiUrl,
        manejarGenerarToken,
        manejarRevocarToken,
        obtenerConfiguracion
    };
}
