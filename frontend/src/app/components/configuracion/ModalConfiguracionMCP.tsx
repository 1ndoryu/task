/*
 * ModalConfiguracionMCP
 * Modal para configurar la conexión con asistentes de IA
 * Soporta: MCP (Claude/Cursor) y API REST (Antigravity/cualquiera)
 * Lógica extraída a useModalConfiguracionMCP hook
 */

import {Plug, Sparkles, Globe, Loader2} from 'lucide-react';
import {Modal} from '../shared/Modal';
import {MensajeBloquePremium} from '../shared/MensajeBloquePremium';
import {SeccionTokenMCP} from './SeccionTokenMCP';
import {InstruccionesClienteMCP} from './InstruccionesClienteMCP';
import {ConfiguracionMCPCopiable} from './ConfiguracionMCPCopiable';
import {Boton} from '../ui';
import {useModalConfiguracionMCP} from '../../hooks/dashboard/useModalConfiguracionMCP';

interface ModalConfiguracionMCPProps {
    estaAbierto: boolean;
    onCerrar: () => void;
    onAbrirUpgrade?: () => void;
}

export function ModalConfiguracionMCP({estaAbierto, onCerrar, onAbrirUpgrade}: ModalConfiguracionMCPProps): JSX.Element {
    const {
        clienteActivo, setClienteActivo,
        tokenExiste, tokenGenerado, tokenBase64: _tokenBase64, fechaCreacion,
        cargando, verificando, esPremium, apiUrl: _apiUrl,
        manejarGenerarToken, manejarRevocarToken, obtenerConfiguracion
    } = useModalConfiguracionMCP({estaAbierto});

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
