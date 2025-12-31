/*
 * ModalConfiguracionMCP
 * Modal para configurar la conexión con asistentes de IA
 * Soporta: MCP (Claude/Cursor) y API REST (Antigravity/cualquiera)
 */

import {useState, useCallback, useEffect} from 'react';
import {Plug, Sparkles, Globe, Loader2} from 'lucide-react';
import {Modal} from '../shared/Modal';
import {SeccionTokenMCP} from './SeccionTokenMCP';
import {InstruccionesClienteMCP} from './InstruccionesClienteMCP';
import {ConfiguracionMCPCopiable} from './ConfiguracionMCPCopiable';

interface ModalConfiguracionMCPProps {
    estaAbierto: boolean;
    onCerrar: () => void;
}

type ClienteMCP = 'claude' | 'cursor' | 'apirest';

/* URL de producción */
const API_BASE_URL = 'https://task.nakomi.studio/wp-json/glory/v1';

/* Genera el contexto copiable para asistentes IA como Antigravity */
const generarContextoIA = (usuario: string, token: string): string => {
    const tokenBase64 = token ? btoa(`${usuario}:${token}`) : 'TU_TOKEN_BASE64';

    return `# API de Tareas Glory

## Autenticación
Todas las peticiones requieren el header:
Authorization: Basic ${tokenBase64}

## Endpoints disponibles:

### Tareas
- GET ${API_BASE_URL}/ai/tareas?filtro=pendientes|completadas|todas
- POST ${API_BASE_URL}/ai/tareas (body: {texto, prioridad?, urgencia?})
- GET ${API_BASE_URL}/ai/tareas/{id}
- PUT ${API_BASE_URL}/ai/tareas/{id} (body: campos a editar)
- POST ${API_BASE_URL}/ai/tareas/{id}/completar
- DELETE ${API_BASE_URL}/ai/tareas/{id}

### Proyectos
- GET ${API_BASE_URL}/ai/proyectos?estado=activo|completado|pausado|todos
- GET ${API_BASE_URL}/ai/proyectos/{id}

### Hábitos
- GET ${API_BASE_URL}/ai/habitos?importancia=Alta|Media|Baja

### Resumen
- GET ${API_BASE_URL}/ai/resumen

## Ejemplo crear tarea:
POST ${API_BASE_URL}/ai/tareas
Headers: Content-Type: application/json, Authorization: Basic ${tokenBase64}
Body: {"texto": "Mi tarea", "prioridad": "Alta", "urgencia": "urgente"}

## Valores válidos:
- prioridad: Alta, Media, Baja
- urgencia: bloqueante, urgente, normal, chill
- estado proyecto: activo, completado, pausado`;
};

/* Configuraciones JSON para cada cliente MCP */
const generarConfigClaude = (token: string) =>
    JSON.stringify(
        {
            mcpServers: {
                'glory-tareas': {
                    command: 'node',
                    args: ['C:/ruta/al/proyecto/glory/mcp/dist/index.js'],
                    env: {
                        GLORY_API_URL: API_BASE_URL,
                        GLORY_AUTH_TOKEN: token || 'TOKEN_PLACEHOLDER'
                    }
                }
            }
        },
        null,
        2
    );

const generarConfigCursor = (token: string) =>
    JSON.stringify(
        {
            'glory-tareas': {
                command: 'node',
                args: ['./mcp/dist/index.js'],
                env: {
                    GLORY_API_URL: API_BASE_URL,
                    GLORY_AUTH_TOKEN: token || 'TOKEN_PLACEHOLDER'
                }
            }
        },
        null,
        2
    );

/* Obtiene el nonce de WordPress para autenticación */
function obtenerNonce(): string {
    const wpData = (window as unknown as {gloryDashboard?: {nonce?: string}}).gloryDashboard;
    return wpData?.nonce || '';
}

/* Obtiene el nombre de usuario actual (login de WordPress) */
function obtenerUsuario(): string {
    const wpData = (window as unknown as {gloryDashboard?: {currentUser?: {login?: string}}}).gloryDashboard;
    return wpData?.currentUser?.login || 'usuario';
}

export function ModalConfiguracionMCP({estaAbierto, onCerrar}: ModalConfiguracionMCPProps): JSX.Element {
    const [clienteActivo, setClienteActivo] = useState<ClienteMCP>('apirest');
    const [tokenExiste, setTokenExiste] = useState(false);
    const [tokenGenerado, setTokenGenerado] = useState<string | null>(null);
    const [tokenBase64, setTokenBase64] = useState<string | null>(null);
    const [fechaCreacion, setFechaCreacion] = useState<string | null>(null);
    const [cargando, setCargando] = useState(false);
    const [verificando, setVerificando] = useState(true);

    /* URL de API local para operaciones */
    const apiUrl = window.location.origin + '/wp-json/glory/v1';
    const usuario = obtenerUsuario();

    /* Verificar estado del token al abrir el modal */
    useEffect(() => {
        if (!estaAbierto) return;

        const verificarToken = async () => {
            setVerificando(true);
            try {
                const respuesta = await fetch(`${apiUrl}/mcp/token`, {
                    credentials: 'include',
                    headers: {
                        'X-WP-Nonce': obtenerNonce()
                    }
                });
                const datos = await respuesta.json();

                if (datos.success && datos.existe) {
                    setTokenExiste(true);
                    setFechaCreacion(datos.fechaCreacion);
                    setTokenGenerado(null);
                    setTokenBase64(null);
                } else {
                    setTokenExiste(false);
                    setTokenGenerado(null);
                    setTokenBase64(null);
                    setFechaCreacion(null);
                }
            } catch (error) {
                console.error('Error al verificar token:', error);
            } finally {
                setVerificando(false);
            }
        };

        verificarToken();
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
                headers: {
                    'X-WP-Nonce': obtenerNonce()
                }
            });
            const datos = await respuesta.json();

            if (datos.success) {
                setTokenGenerado(null);
                setTokenBase64(null);
                setTokenExiste(false);
                setFechaCreacion(null);
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
    const obtenerConfiguracion = (cliente: ClienteMCP): string => {
        const tokenParaConfig = tokenBase64 || 'TOKEN_PLACEHOLDER';

        switch (cliente) {
            case 'claude':
                return generarConfigClaude(tokenParaConfig);
            case 'cursor':
                return generarConfigCursor(tokenParaConfig);
            case 'apirest':
                return generarContextoIA(usuario, tokenGenerado || '');
            default:
                return '';
        }
    };

    return (
        <Modal estaAbierto={estaAbierto} onCerrar={onCerrar} titulo="Conectar con IA" claseExtra="modalMcp">
            {/* Introducción */}
            <div className="mcpIntroduccion">
                <h3 className="mcpIntroduccion__titulo">
                    <Sparkles size={16} />
                    Conecta con tu asistente de IA
                </h3>
                <p className="mcpIntroduccion__descripcion">Gestiona tus tareas usando lenguaje natural desde Claude, Cursor, Antigravity o cualquier asistente de IA.</p>
            </div>

            {/* Estado de carga inicial */}
            {verificando ? (
                <div className="mcpCargando">
                    <Loader2 size={24} className="iconoGirando" />
                    <span>Verificando configuración...</span>
                </div>
            ) : (
                <>
                    {/* Sección Token */}
                    <SeccionTokenMCP tokenExiste={tokenExiste} tokenGenerado={tokenGenerado} fechaCreacion={fechaCreacion} cargando={cargando} onGenerarToken={manejarGenerarToken} onRevocarToken={manejarRevocarToken} />

                    {/* Mostrar instrucciones solo si hay token */}
                    {tokenExiste && (
                        <>
                            {/* Pestañas de clientes */}
                            <div className="mcpPestanas">
                                <button type="button" className={`mcpPestana ${clienteActivo === 'apirest' ? 'mcpPestana--activa' : ''}`} onClick={() => setClienteActivo('apirest')}>
                                    <Globe size={12} />
                                    API REST
                                </button>
                                <button type="button" className={`mcpPestana ${clienteActivo === 'claude' ? 'mcpPestana--activa' : ''}`} onClick={() => setClienteActivo('claude')}>
                                    <Plug size={12} />
                                    Claude
                                </button>
                                <button type="button" className={`mcpPestana ${clienteActivo === 'cursor' ? 'mcpPestana--activa' : ''}`} onClick={() => setClienteActivo('cursor')}>
                                    <Plug size={12} />
                                    Cursor
                                </button>
                            </div>

                            {/* Contenido según pestaña */}
                            {clienteActivo === 'apirest' ? (
                                <div className="mcpApiRest">
                                    <p className="mcpApiRest__descripcion">Copia este contexto y pásalo a tu asistente de IA (Antigravity, ChatGPT, etc.) para que sepa cómo interactuar con tus tareas:</p>
                                    <ConfiguracionMCPCopiable codigo={obtenerConfiguracion('apirest')} titulo="Contexto para IA" />
                                    {!tokenGenerado && <p className="mcpApiRest__nota">Nota: Regenera el token para obtener el contexto con tu autenticación incluida.</p>}
                                </div>
                            ) : (
                                <InstruccionesClienteMCP cliente={clienteActivo} jsonConfiguracion={obtenerConfiguracion(clienteActivo)} token={tokenGenerado || ''} />
                            )}
                        </>
                    )}
                </>
            )}
        </Modal>
    );
}
