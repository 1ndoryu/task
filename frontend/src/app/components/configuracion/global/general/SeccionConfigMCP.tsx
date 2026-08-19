/* [233A-27] Conexión con IA (MCP): token y pestañas de cliente (API REST/Claude/Cursor). */
import {Sparkles, Globe, Plug as PlugIcon, Loader2} from 'lucide-react';
import {Boton} from '../../../ui';
import {SeccionTokenMCP} from '../../SeccionTokenMCP';
import {InstruccionesClienteMCP} from '../../InstruccionesClienteMCP';
import {ConfiguracionMCPCopiable} from '../../ConfiguracionMCPCopiable';
import {MensajeBloquePremium} from '../../../shared/MensajeBloquePremium';
import {useModalConfiguracionMCP} from '../../../../hooks/dashboard/useModalConfiguracionMCP';

export function SeccionConfigMCP({onAbrirUpgrade}: {onAbrirUpgrade?: () => void}): JSX.Element {
    const {clienteActivo, setClienteActivo, tokenExiste, tokenGenerado, fechaCreacion, cargando, verificando, esPremium, manejarGenerarToken, manejarRevocarToken, obtenerConfiguracion} = useModalConfiguracionMCP({estaAbierto: true});
    if (!esPremium) return <MensajeBloquePremium titulo="Conexión con IA Premium" descripcion="La integración con asistentes de IA está disponible para usuarios Premium." onAbrirUpgrade={onAbrirUpgrade} />;
    return (
        <div className="contenedorMcp">
            <div className="mcpIntroduccion">
                <h3 className="mcpIntroduccion__titulo"><Sparkles size={16} /> Conecta con tu asistente de IA</h3>
                <p className="mcpIntroduccion__descripcion">Gestiona tus tareas usando lenguaje natural desde Claude, Cursor, Antigravity o cualquier asistente de IA.</p>
            </div>
            {verificando ? (
                <div className="mcpCargando"><Loader2 size={24} className="iconoGirando" /><span>Verificando configuración...</span></div>
            ) : (
                <>
                    <SeccionTokenMCP tokenExiste={tokenExiste} tokenGenerado={tokenGenerado} fechaCreacion={fechaCreacion} cargando={cargando} onGenerarToken={manejarGenerarToken} onRevocarToken={manejarRevocarToken} />
                    {tokenExiste && (
                        <>
                            <div className="mcpPestanas">
                                <Boton type="button" variante="pestaña" activo={clienteActivo === 'apirest'} onClick={() => setClienteActivo('apirest')}><Globe size={12} /> API REST</Boton>
                                <Boton type="button" variante="pestaña" activo={clienteActivo === 'claude'} onClick={() => setClienteActivo('claude')}><PlugIcon size={12} /> Claude</Boton>
                                <Boton type="button" variante="pestaña" activo={clienteActivo === 'cursor'} onClick={() => setClienteActivo('cursor')}><PlugIcon size={12} /> Cursor</Boton>
                            </div>
                            {clienteActivo === 'apirest' ? (
                                <div className="mcpApiRest">
                                    <p className="mcpApiRest__descripcion">Copia este contexto para tu asistente de IA:</p>
                                    <ConfiguracionMCPCopiable codigo={obtenerConfiguracion('apirest')} titulo="Contexto para IA" />
                                </div>
                            ) : (
                                <InstruccionesClienteMCP cliente={clienteActivo} jsonConfiguracion={obtenerConfiguracion(clienteActivo)} token={tokenGenerado || ''} />
                            )}
                        </>
                    )}
                </>
            )}
        </div>
    );
}
