/*
 * useModalConfiguracionMCP
 * Hook que encapsula la lógica del modal de configuración MCP/API REST.
 * Gestiona token, verificación, generación, revocación y configuraciones.
 */

import {useState, useCallback, useEffect} from 'react';
import {useSuscripcionStore} from '../../stores/suscripcionStore';

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

/* Obtiene el nonce de WordPress para autenticación */
function obtenerNonce(): string {
    const wpData = (window as unknown as {gloryDashboard?: {nonce?: string}}).gloryDashboard;
    return wpData?.nonce || '';
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
    const apiUrl = window.location.origin + '/wp-json/glory/v1';

    /* Verificar estado del token al abrir el modal */
    useEffect(() => {
        if (!estaAbierto) return;

        const abortController = new AbortController();

        const verificarToken = async () => {
            setVerificando(true);
            try {
                const respuesta = await fetch(`${apiUrl}/mcp/token`, {
                    credentials: 'include',
                    signal: abortController.signal,
                    headers: {'X-WP-Nonce': obtenerNonce()}
                });
                if (abortController.signal.aborted) return;
                const datos = await respuesta.json();
                if (abortController.signal.aborted) return;

                if (datos.success && datos.existe) {
                    setTokenExiste(true);
                    setFechaCreacion(datos.fechaCreacion);
                    setTokenGenerado(null);
                    const tokenGuardado = localStorage.getItem('glory_mcp_token_base64');
                    setTokenBase64(tokenGuardado);
                } else {
                    setTokenExiste(false);
                    setTokenGenerado(null);
                    setTokenBase64(null);
                    setFechaCreacion(null);
                    localStorage.removeItem('glory_mcp_token_base64');
                }
            } catch (error) {
                if (abortController.signal.aborted) return;
                console.error('Error al verificar token:', error);
            } finally {
                if (!abortController.signal.aborted) {
                    setVerificando(false);
                }
            }
        };

        verificarToken();

        return () => { abortController.abort(); };
    }, [estaAbierto, apiUrl]);

    /* Generar nuevo token vía API */
    const manejarGenerarToken = useCallback(async () => {
        setCargando(true);
        try {
            const respuesta = await fetch(`${apiUrl}/mcp/token`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': obtenerNonce()
                }
            });
            const datos = await respuesta.json();

            if (datos.success) {
                setTokenGenerado(datos.token);
                setTokenBase64(datos.tokenBase64);
                setTokenExiste(true);
                setFechaCreacion(datos.fechaCreacion);
                if (datos.tokenBase64) {
                    localStorage.setItem('glory_mcp_token_base64', datos.tokenBase64);
                }
            } else {
                console.error('Error al generar token:', datos.message);
            }
        } catch (error) {
            console.error('Error al generar token:', error);
        } finally {
            setCargando(false);
        }
    }, [apiUrl]);

    /* Revocar token existente vía API */
    const manejarRevocarToken = useCallback(async () => {
        setCargando(true);
        try {
            const respuesta = await fetch(`${apiUrl}/mcp/token`, {
                method: 'DELETE',
                credentials: 'include',
                headers: {'X-WP-Nonce': obtenerNonce()}
            });
            const datos = await respuesta.json();

            if (datos.success) {
                setTokenGenerado(null);
                setTokenBase64(null);
                setTokenExiste(false);
                setFechaCreacion(null);
                localStorage.removeItem('glory_mcp_token_base64');
            } else {
                console.error('Error al revocar token:', datos.message);
            }
        } catch (error) {
            console.error('Error al revocar token:', error);
        } finally {
            setCargando(false);
        }
    }, [apiUrl]);

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
