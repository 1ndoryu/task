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
    /* [18-08-2026] Sin backend MCP en Rust aun: apiUrl apunta a /api y el
     * token queda como no existente; la generacion de config JSON sigue
     * funcionando localmente sin llamar a /wp-json. */
    const apiUrl = `${window.location.origin}/api`;

    /* Verificar estado del token al abrir el modal */
    useEffect(() => {
        if (!estaAbierto) return;

        setVerificando(true);
        setTokenExiste(false);
        setTokenGenerado(null);
        setTokenBase64(null);
        setFechaCreacion(null);
        localStorage.removeItem('glory_mcp_token_base64');
        setVerificando(false);
    }, [estaAbierto]);

    /* Generar nuevo token vía API */
    const manejarGenerarToken = useCallback(async () => {
        setCargando(false);
        console.warn('[MCP] La generación de tokens aún no está disponible');
    }, []);

    /* Revocar token existente vía API */
    const manejarRevocarToken = useCallback(async () => {
        setCargando(false);
        setTokenGenerado(null);
        setTokenBase64(null);
        setTokenExiste(false);
        setFechaCreacion(null);
        localStorage.removeItem('glory_mcp_token_base64');
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
