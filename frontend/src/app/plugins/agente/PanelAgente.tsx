/*
 * plugins/agente/PanelAgente.tsx
 * Panel del agente de IA (plan-agente-ia-plugin, Fase 4): tabs de
 * conversaciones (persistidas en el servidor), streaming SSE con tarjetas
 * de tool y contexto visible. Reutiliza el sistema de diseño (SeccionEncabezado,
 * Boton, Textarea) y las clases de panelIA.css para coherencia visual.
 */

import {useEffect, useRef, useState} from 'react';
import {ArrowUp, Bot, Loader2, Plus, Trash2, X, Wrench, AlertTriangle, CheckCircle, XCircle} from 'lucide-react';
import {SeccionEncabezado} from '../../components/dashboard';
import {Boton, Textarea} from '../../components/ui';
import {useAgenteStore, useTabActivaAgente} from './store';
import type {PanelBaseProps} from '../../types/paneles';

import '../../styles/dashboard/componentes/panelIA.css';
import './panelAgente.css';

export function PanelAgente({renderHandleArrastre, handleMinimizar}: PanelBaseProps): JSX.Element {
    const {
        tabs,
        tabActivaId,
        cargandoLista,
        errorLista,
        conversacionesCargadas,
        cargarConversaciones,
        abrirTab,
        crearTab,
        renombrarTab,
        cerrarTab,
        enviarMensaje,
        limpiarErrorTab,
    } = useAgenteStore();

    const tabActiva = useTabActivaAgente();
    const [inputTexto, setInputTexto] = useState('');
    const [editandoTitulo, setEditandoTitulo] = useState<string | null>(null);
    const [tituloEdicion, setTituloEdicion] = useState('');
    const refScroll = useRef<HTMLDivElement>(null);
    const refAbort = useRef<AbortController | null>(null);

    /* Cargar la lista de conversaciones una vez al montar. */
    useEffect(() => {
        if (!conversacionesCargadas && !cargandoLista) {
            void cargarConversaciones();
        }
    }, [conversacionesCargadas, cargandoLista, cargarConversaciones]);

    /* Scroll automático al último mensaje. */
    useEffect(() => {
        if (refScroll.current) {
            refScroll.current.scrollTop = refScroll.current.scrollHeight;
        }
    }, [tabActiva?.mensajes.length, tabActiva?.mensajes[tabActiva.mensajes.length - 1]?.contenido]);

    /* Cancelar el stream al desmontar. */
    useEffect(() => {
        return () => {
            refAbort.current?.abort();
        };
    }, []);

    const manejarEnviar = () => {
        const texto = inputTexto.trim();
        if (!texto || !tabActiva || tabActiva.enviando) return;
        setInputTexto('');
        refAbort.current?.abort();
        refAbort.current = new AbortController();
        void enviarMensaje(texto, refAbort.current.signal);
    };

    const manejarTecla = (evento: React.KeyboardEvent) => {
        if (evento.key === 'Enter' && !evento.shiftKey) {
            evento.preventDefault();
            manejarEnviar();
        }
    };

    const iniciarRenombrado = (id: string, tituloActual: string) => {
        setEditandoTitulo(id);
        setTituloEdicion(tituloActual);
    };

    const confirmarRenombrado = (id: string) => {
        void renombrarTab(id, tituloEdicion);
        setEditandoTitulo(null);
    };

    return (
        <div className="internaColumna panelIA panelAgente">
            <SeccionEncabezado
                icono={null}
                titulo={renderHandleArrastre('Agente')}
                subtitulo={tabActiva?.enviando ? 'trabajando...' : undefined}
                variante="panelHeader"
                acciones={
                    <>
                        <Boton
                            variante="badge"
                            soloIcono
                            onClick={() => void crearTab()}
                            icono={<Plus size={12} />}
                            title="Nueva conversación"
                        />
                        {handleMinimizar}
                    </>
                }
            />

            {/* Tabs de conversaciones */}
            <div className="panelAgenteTabs">
                {tabs.map(tab => {
                    const activa = tab.conversacion.id === tabActivaId;
                    const editando = editandoTitulo === tab.conversacion.id;
                    return (
                        <div
                            key={tab.conversacion.id}
                            className={`panelAgenteTab ${activa ? 'panelAgenteTab--activa' : ''}`}
                            onClick={() => void abrirTab(tab.conversacion.id)}
                            onDoubleClick={() => iniciarRenombrado(tab.conversacion.id, tab.conversacion.titulo)}
                            title={tab.conversacion.titulo}
                        >
                            {editando ? (
                                <input
                                    className="panelAgenteTabInput"
                                    value={tituloEdicion}
                                    autoFocus
                                    onChange={e => setTituloEdicion(e.target.value)}
                                    onClick={e => e.stopPropagation()}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') confirmarRenombrado(tab.conversacion.id);
                                        if (e.key === 'Escape') setEditandoTitulo(null);
                                        e.stopPropagation();
                                    }}
                                />
                            ) : (
                                <span className="panelAgenteTabTitulo">{tab.conversacion.titulo}</span>
                            )}
                            <button
                                className="panelAgenteTabCerrar"
                                title="Cerrar conversación"
                                onClick={e => {
                                    e.stopPropagation();
                                    void cerrarTab(tab.conversacion.id);
                                }}
                            >
                                <X size={10} />
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Área de mensajes */}
            <div ref={refScroll} className="panelIAMensajes">
                {cargandoLista && (
                    <div className="panelIAVacio">
                        <Loader2 size={24} className="animacionGirar" />
                        <p>Cargando conversaciones...</p>
                    </div>
                )}

                {errorLista && (
                    <div className="panelIAError">{errorLista}</div>
                )}

                {!cargandoLista && tabs.length === 0 && !errorLista && (
                    <div className="panelIAVacio">
                        <Bot size={32} />
                        <p>Nueva conversación: pide al agente crear tareas, hábitos, notas o recordatorios.</p>
                        <Boton variante="primario" tamano="pequeño" onClick={() => void crearTab()}>
                            <Plus size={12} /> Nueva conversación
                        </Boton>
                    </div>
                )}

                {tabActiva?.cargandoHistorial && (
                    <div className="panelIAVacio">
                        <Loader2 size={24} className="animacionGirar" />
                        <p>Cargando historial...</p>
                    </div>
                )}

                {tabActiva?.error && (
                    <div className="panelIAError">
                        {tabActiva.error}
                        <Boton
                            variante="ghost"
                            tamano="pequeño"
                            onClick={() => limpiarErrorTab(tabActiva.conversacion.id)}
                        >
                            Descartar
                        </Boton>
                    </div>
                )}

                {tabActiva && !tabActiva.cargandoHistorial && tabActiva.mensajes.length === 0 && (
                    <div className="panelIAVacio">
                        <Bot size={32} />
                        <p>Escribe un mensaje para comenzar. Doble clic en una tab para renombrarla.</p>
                    </div>
                )}

                {tabActiva?.mensajes.map(mensaje => {
                    const esUsuario = mensaje.rol === 'user';
                    return (
                        <div key={mensaje.id} className={`panelIAMensaje ${esUsuario ? 'panelIAMensaje--usuario' : 'panelIAMensaje--asistente'}`}>
                            {!esUsuario && (
                                <div className="panelIAMensajeAvatar">
                                    <Bot size={14} />
                                </div>
                            )}
                            <div className="panelIAMensajeBurbuja">
                                <span className="panelIAMensajeTexto">{mensaje.contenido || '...'}</span>

                                {/* Tarjetas de herramientas ejecutadas */}
                                {mensaje.herramientas && mensaje.herramientas.length > 0 && (
                                    <div className="panelAgenteHerramientas">
                                        {mensaje.herramientas.map((h, i) => (
                                            <div
                                                key={`${mensaje.id}-${i}`}
                                                className={`panelAgenteHerramienta ${h.ok ? 'panelAgenteHerramienta--ok' : 'panelAgenteHerramienta--error'}`}
                                            >
                                                {h.ok ? <CheckCircle size={10} /> : <XCircle size={10} />}
                                                <Wrench size={10} />
                                                <span>{h.tool}</span>
                                                <span className="panelAgenteHerramientaResumen">{h.resumen}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Aprobación pendiente (modo predeterminado) */}
                                {mensaje.aprobacionPendiente && (
                                    <div className="panelIAAccionBadge panelIAAccionBadge--pendiente">
                                        <AlertTriangle size={10} />
                                        <span>
                                            {mensaje.aprobacionPendiente.tool} requiere aprobación del usuario
                                        </span>
                                    </div>
                                )}

                                {tabActiva.enviando && !esUsuario && mensaje.id === tabActiva.mensajes[tabActiva.mensajes.length - 1]?.id && mensaje.contenido === '' && (
                                    <div className="panelIAMensajeBurbuja--cargando panelAgentePensando">
                                        <Loader2 size={12} className="animacionGirar" />
                                        <span>Pensando...</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Input */}
            <div className="panelIAInput">
                <Textarea
                    claseAdicional="panelIAInputTexto"
                    claseContenedor="panelIAInputContenedor"
                    value={inputTexto}
                    onChange={e => setInputTexto(e.target.value)}
                    onKeyDown={manejarTecla}
                    placeholder={tabActiva ? 'Escribe un mensaje...' : 'Crea o abre una conversación'}
                    disabled={!tabActiva || tabActiva.enviando}
                    filas={1}
                    autoAjustar
                />
                <Boton
                    type="button"
                    variante="icono"
                    tamano="pequeño"
                    soloIcono
                    claseAdicional="panelIAInputEnviar"
                    onClick={manejarEnviar}
                    disabled={!tabActiva || tabActiva.enviando || !inputTexto.trim()}
                    icono={tabActiva?.enviando ? <Loader2 size={16} className="animacionGirar" /> : <ArrowUp size={16} />}
                    title="Enviar"
                />
            </div>
        </div>
    );
}
