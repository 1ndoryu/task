/*
 * ModalConfiguracionMCP
 * Modal para configurar la conexión con asistentes de IA
 * Soporta: MCP (Claude/Cursor) y API REST (Antigravity/cualquiera)
 */

import {useState, useCallback, useEffect} from 'react';
import {Plug, Sparkles, Globe, Loader2} from 'lucide-react';
import {Modal} from '../shared/Modal';
import {MensajeBloquePremium} from '../shared/MensajeBloquePremium';
import {SeccionTokenMCP} from './SeccionTokenMCP';
import {InstruccionesClienteMCP} from './InstruccionesClienteMCP';
import {ConfiguracionMCPCopiable} from './ConfiguracionMCPCopiable';
import {useSuscripcionStore} from '../../stores/suscripcionStore';

interface ModalConfiguracionMCPProps {
    estaAbierto: boolean;
    onCerrar: () => void;
    onAbrirUpgrade?: () => void;
}

type ClienteMCP = 'claude' | 'cursor' | 'apirest';

/* Genera el contexto copiable para asistentes IA como Antigravity */
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

/* Obtiene el nonce de WordPress para autenticación */
function obtenerNonce(): string {
    const wpData = (window as unknown as {gloryDashboard?: {nonce?: string}}).gloryDashboard;
    return wpData?.nonce || '';
}

export function ModalConfiguracionMCP({estaAbierto, onCerrar, onAbrirUpgrade}: ModalConfiguracionMCPProps): JSX.Element {
    const [clienteActivo, setClienteActivo] = useState<ClienteMCP>('apirest');
    const [tokenExiste, setTokenExiste] = useState(false);
    const [tokenGenerado, setTokenGenerado] = useState<string | null>(null);
    const [tokenBase64, setTokenBase64] = useState<string | null>(null);
    const [fechaCreacion, setFechaCreacion] = useState<string | null>(null);
    const [cargando, setCargando] = useState(false);
    const [verificando, setVerificando] = useState(true);

    /* Verificar si el usuario es Premium */
    const esPremium = useSuscripcionStore(s => s.esPremium());

    /* URL de API local para operaciones */
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
                    headers: {
                        'X-WP-Nonce': obtenerNonce()
                    }
                });
                if (abortController.signal.aborted) return;
                const datos = await respuesta.json();
                if (abortController.signal.aborted) return;

                if (datos.success && datos.existe) {
                    setTokenExiste(true);
                    setFechaCreacion(datos.fechaCreacion);
                    setTokenGenerado(null);
                    /* Recuperar tokenBase64 de localStorage si existe */
                    const tokenGuardado = localStorage.getItem('glory_mcp_token_base64');
                    setTokenBase64(tokenGuardado);
                } else {
                    setTokenExiste(false);
                    setTokenGenerado(null);
                    setTokenBase64(null);
                    setFechaCreacion(null);
                    /* Limpiar localStorage si no existe token */
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
                /* Guardar tokenBase64 en localStorage para persistencia */
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
                /* Limpiar localStorage al revocar */
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
    const obtenerConfiguracion = (cliente: ClienteMCP): string => {
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
    };

    return (
        <Modal estaAbierto={estaAbierto} onCerrar={onCerrar} titulo="Conectar con IA" claseExtra="modalMcp">
            {/* Verificar si es Premium */}
            {!esPremium ? (
                <MensajeBloquePremium
                    titulo="Conexión con IA Premium"
                    descripcion="La integración con asistentes de IA está disponible exclusivamente para usuarios Premium. Gestiona tus tareas usando lenguaje natural."
                    onAbrirUpgrade={onAbrirUpgrade}
                />
            ) : (
                <>
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
                                        <Boton type="button" variante="pestaña" activo={clienteActivo === 'apirest'} onClick={() => setClienteActivo('apirest')}>
                                            <Globe size={12} />
                                            API REST
                                        </Boton>
                                        <Boton type="button" variante="pestaña" activo={clienteActivo === 'claude'} onClick={() => setClienteActivo('claude')}>
                                            <Plug size={12} />
                                            Claude
                                        </Boton>
                                        <Boton type="button" variante="pestaña" activo={clienteActivo === 'cursor'} onClick={() => setClienteActivo('cursor')}>
                                            <Plug size={12} />
                                            Cursor
                                        </Boton>
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
                </>
            )}
        </Modal>
    );
}
