/*
 * PanelIA
 * Panel de asistente IA integrado en el dashboard
 * Permite planificar tareas/hábitos por texto natural
 *
 * [233A-69] Fase 1: Componente con chat básico funcional.
 * Fase 2+3: System prompt con acciones estructuradas.
 * El LLM responde JSON con texto + acciones a ejecutar sobre tareas/hábitos.
 */

import {Send, Trash2, Loader2, Bot, CheckCircle, XCircle} from 'lucide-react';
import {SeccionEncabezado} from '../dashboard';
import {Boton, Textarea} from '../ui';
import {usePanelIA} from '../../hooks/paneles/usePanelIA';
import type {MensajeIA} from '../../stores/iaStore';
import type {PanelBaseProps} from '../../types/paneles';
import type {EjecutoresTareasIA} from '../../config/accionesIA';

import '../../styles/dashboard/componentes/panelIA.css';

/* [233A-69] Props extendidas: incluye ejecutores de tareas del dashboard */
export interface PanelIAProps extends PanelBaseProps, EjecutoresTareasIA {}

export function PanelIA({renderHandleArrastre, handleMinimizar, crearTarea, toggleTarea, editarTarea, eliminarTarea, tareas}: PanelIAProps): JSX.Element {
    const {
        inputTexto, setInputTexto,
        refScroll,
        mensajes, enviando, error, apiKey, tokensUsados,
        limpiarChat,
        manejarEnviar, manejarTecla
    } = usePanelIA({crearTarea, toggleTarea, editarTarea, eliminarTarea, tareas});

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
                    {/* [233A-69] Fase 2+3: Mostrar acciones ejecutadas */}
                    {mensaje.acciones && mensaje.acciones.length > 0 && (
                        <div className="panelIAAcciones">
                            {mensaje.acciones.map((accion, i) => (
                                <div
                                    key={i}
                                    className={`panelIAAccionBadge ${accion.ejecutada ? 'panelIAAccionBadge--exito' : 'panelIAAccionBadge--error'}`}
                                >
                                    {accion.ejecutada ? <CheckCircle size={10} /> : <XCircle size={10} />}
                                    <span>{accion.resultado || accion.tipo}</span>
                                </div>
                            ))}
                        </div>
                    )}
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
