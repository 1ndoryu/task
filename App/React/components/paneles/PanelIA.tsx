/*
 * PanelIA
 * Panel de asistente IA integrado en el dashboard
 * Permite planificar tareas/hábitos por texto natural
 *
 * [233A-69] Fase 1: Componente con chat básico funcional.
 * El usuario escribe, se envía a Groq API, se muestra la respuesta.
 * Fase 2 agregará system prompt y acciones estructuradas.
 */

import {Send, Trash2, Loader2, Bot} from 'lucide-react';
import {SeccionEncabezado} from '../dashboard';
import {Boton, Textarea} from '../ui';
import {usePanelIA} from '../../hooks/paneles/usePanelIA';
import type {MensajeIA} from '../../stores/iaStore';
import type {PanelBaseProps} from '../../types/paneles';

import '../../styles/dashboard/componentes/panelIA.css';

export function PanelIA({renderHandleArrastre, handleMinimizar}: PanelBaseProps): JSX.Element {
    const {
        inputTexto, setInputTexto,
        refScroll,
        mensajes, enviando, error, apiKey, tokensUsados,
        limpiarChat,
        manejarEnviar, manejarTecla
    } = usePanelIA();

    /* Renderizado de un mensaje individual */
    const renderizarMensaje = (mensaje: MensajeIA) => {
        const esUsuario = mensaje.rol === 'usuario';
        return (
            <div key={mensaje.id} className={`panelIAMensaje ${esUsuario ? 'panelIAMensaje--usuario' : 'panelIAMensaje--asistente'}`}>
                {!esUsuario && (
                    <div className="panelIAMensajeAvatar">
                        <Bot size={14} />
                    </div>
                )}
                <div className="panelIAMensajeBurbuja">
                    <span className="panelIAMensajeTexto">{mensaje.contenido}</span>
                </div>
            </div>
        );
    };

    return (
        <div className="panelDashboard internaColumna panelIA">
            <SeccionEncabezado
                icono={null}
                titulo={renderHandleArrastre('IA')}
                subtitulo={tokensUsados > 0 ? `~${tokensUsados} tokens` : undefined}
                variante="panelHeader"
                acciones={
                    <>
                        <Boton
                            variante="badge"
                            soloIcono
                            onClick={limpiarChat}
                            icono={<Trash2 size={12} />}
                            title="Limpiar chat"
                            disabled={mensajes.length === 0}
                        />
                        {handleMinimizar}
                    </>
                }
            />

            {/* Área de mensajes */}
            <div ref={refScroll} className="panelIAMensajes">
                {mensajes.length === 0 ? (
                    <div className="panelIAVacio">
                        <Bot size={32} />
                        <p>Escribe para planificar tu día, crear tareas o preguntar lo que necesites.</p>
                        {!apiKey && (
                            <p className="panelIAVacioAviso">Configura tu API Key de Groq para empezar.</p>
                        )}
                    </div>
                ) : (
                    mensajes.map(renderizarMensaje)
                )}

                {enviando && (
                    <div className="panelIAMensaje panelIAMensaje--asistente">
                        <div className="panelIAMensajeAvatar">
                            <Bot size={14} />
                        </div>
                        <div className="panelIAMensajeBurbuja panelIAMensajeBurbuja--cargando">
                            <Loader2 size={14} className="animacionGirar" />
                            <span>Pensando...</span>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="panelIAError">
                        {error}
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="panelIAInput">
                <Textarea
                    claseAdicional="panelIAInputTexto"
                    value={inputTexto}
                    onChange={e => setInputTexto(e.target.value)}
                    onKeyDown={manejarTecla}
                    placeholder={apiKey ? 'Escribe un mensaje...' : 'Configura tu API Key primero'}
                    disabled={enviando || !apiKey}
                    filas={1}
                    autoAjustar
                />
                <Boton
                    type="button"
                    variante="badge"
                    soloIcono
                    onClick={manejarEnviar}
                    disabled={enviando || !inputTexto.trim() || !apiKey}
                    icono={enviando ? <Loader2 size={14} className="animacionGirar" /> : <Send size={14} />}
                    title="Enviar"
                />
            </div>
        </div>
    );
}
