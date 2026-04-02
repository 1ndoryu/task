/*
 * PanelIA
 * Panel de asistente IA integrado en el dashboard
 * Permite planificar tareas/hábitos por texto natural
 *
 * [233A-69] Fase 1: Componente con chat básico funcional.
 * Fase 2+3: System prompt con acciones estructuradas.
 * Fase 4-5: Config inline (API key, modelo, preferencias).
 * [243A-1] Config movida al modal global (sección 'panelIA'). Settings abre modal.
 * [243A-2] Icono Bot en el encabezado del panel.
 * [253A-5] Icono Bot quitado del encabezado — el icono de IA se muestra en la barra de paneles ocultos (BarraPanelesOcultos).
 * [243A-3] Botón enviar más grande y con separación del borde.
 */

import {Send, Trash2, Loader2, Bot, CheckCircle, XCircle, Settings, AlertTriangle} from 'lucide-react';
import {SeccionEncabezado} from '../dashboard';
import {Boton, Textarea} from '../ui';
import {usePanelIA} from '../../hooks/paneles/usePanelIA';
import type {MensajeIA} from '../../stores/iaStore';
import type {PanelBaseProps} from '../../types/paneles';
import type {EjecutoresTareasIA} from '../../config/accionesIA';

import '../../styles/dashboard/componentes/panelIA.css';

/* [233A-69] Props extendidas: incluye ejecutores de tareas del dashboard */
/* [243A-1] Agrega onAbrirConfigIA para abrir modal de configuración */
export interface PanelIAProps extends PanelBaseProps, EjecutoresTareasIA {
    onAbrirConfigIA: () => void;
}

export function PanelIA({renderHandleArrastre, handleMinimizar, crearTarea, toggleTarea, editarTarea, eliminarTarea, tareas, onAbrirConfigIA}: PanelIAProps): JSX.Element {
    const {
        inputTexto, setInputTexto,
        refScroll,
        mensajes, enviando, error, apiKey, tokensUsados,
        limpiarChat,
        manejarEnviar, manejarTecla,
        confirmarAccion, rechazarAccion
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
                    {/* [303A-11] Acciones pendientes de confirmación muestran botones */}
                    {mensaje.acciones && mensaje.acciones.length > 0 && (
                        <div className="panelIAAcciones">
                            {mensaje.acciones.map((accion, i) => (
                                accion.pendienteConfirmacion ? (
                                    <div key={i} className="panelIAAccionBadge panelIAAccionBadge--pendiente">
                                        <AlertTriangle size={10} />
                                        <span>{accion.resultado || accion.tipo}</span>
                                        <button
                                            className="panelIAAccionBtn panelIAAccionBtn--confirmar"
                                            onClick={() => confirmarAccion(mensaje.id, i)}
                                        >Confirmar</button>
                                        <button
                                            className="panelIAAccionBtn panelIAAccionBtn--cancelar"
                                            onClick={() => rechazarAccion(mensaje.id, i)}
                                        >Cancelar</button>
                                    </div>
                                ) : (
                                    <div
                                        key={i}
                                        className={`panelIAAccionBadge ${accion.ejecutada ? 'panelIAAccionBadge--exito' : 'panelIAAccionBadge--error'}`}
                                    >
                                        {accion.ejecutada ? <CheckCircle size={10} /> : <XCircle size={10} />}
                                        <span>{accion.resultado || accion.tipo}</span>
                                    </div>
                                )
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="internaColumna panelIA">
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
                            onClick={onAbrirConfigIA}
                            icono={<Settings size={12} />}
                            title="Configuración"
                        />
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

            {/* [233A-69] Fase 4-5: Config ahora vive en modal global ('panelIA') */}

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
                    variante="ghost"
                    soloIcono
                    claseAdicional="panelIABotonEnviar"
                    onClick={manejarEnviar}
                    disabled={enviando || !inputTexto.trim() || !apiKey}
                    icono={enviando ? <Loader2 size={16} className="animacionGirar" /> : <Send size={16} />}
                    title="Enviar"
                />
            </div>
        </div>
    );
}
