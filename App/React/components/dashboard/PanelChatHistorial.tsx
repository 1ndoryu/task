/*
 * PanelChatHistorial
 * Panel lateral para chat y historial de cambios de una tarea/proyecto
 * Responsabilidad: mostrar timeline unificado de mensajes y eventos
 *
 * Fase 7.2: Timeline Unificado (Chat + Historial son UN SOLO timeline)
 * - Mensajes usuario: burbuja con avatar (enviado/recibido)
 * - Mensajes sistema: linea centrada con icono (historial inmutable)
 *
 * Conectado a la API real de mensajes
 */

import {MessageCircle, Users, Send, Loader} from 'lucide-react';
import {type MensajeTimeline, obtenerTipoVisual} from '../../utils/mensajes';
import {usePanelChatHistorial} from '../../hooks/dashboard/usePanelChatHistorial';
import {Boton} from '../ui';
import {Input} from '../ui/Input';

export interface PanelChatHistorialProps {
    elementoId: number;
    elementoTipo: 'tarea' | 'proyecto' | 'habito';
    /* Participantes del elemento (si esta compartido) */
    participantes?: Array<{
        id: number;
        nombre: string;
        avatar: string;
    }>;
    /* Avatar del usuario actual para mostrar junto al input */
    avatarUsuario?: string;
    /* Nombre del usuario actual */
    nombreUsuario?: string;
    /* Mostrar solo el input sin el timeline (para cuando el chat esta oculto) */
    soloInput?: boolean;
    /* Modo compacto para movil inline (Fase 10.8.11) */
    compacto?: boolean;
}

/* Formatear hora para mensajes (sin fecha, solo hora) */
function formatearHora(fechaIso: string): string {
    const fecha = new Date(fechaIso);
    return fecha.toLocaleTimeString('es', {hour: '2-digit', minute: '2-digit'});
}

/* Obtener clave de día para agrupar mensajes (YYYY-MM-DD) */
function obtenerClaveDia(fechaIso: string): string {
    const fecha = new Date(fechaIso);
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
}

/* Formatear fecha del día para el separador */
function formatearFechaDia(fechaIso: string): string {
    const fecha = new Date(fechaIso);
    const ahora = new Date();
    const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const fechaComparar = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());

    if (fechaComparar.getTime() === hoy.getTime()) {
        return 'Hoy';
    }

    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);
    if (fechaComparar.getTime() === ayer.getTime()) {
        return 'Ayer';
    }

    /* Para fechas anteriores, mostrar formato completo */
    return fecha.toLocaleDateString('es', {weekday: 'long', day: 'numeric', month: 'long'});
}

export function PanelChatHistorial({elementoId, elementoTipo, participantes = [], avatarUsuario, nombreUsuario, soloInput = false, compacto = false}: PanelChatHistorialProps): JSX.Element {
    const {mostrandoParticipantes, setMostrandoParticipantes, mensajeNuevo, setMensajeNuevo, refContenedor, avatarFinal, nombreFinal, tieneParticipantes, estado, manejarEnviarMensaje, manejarTecla} = usePanelChatHistorial({elementoId, elementoTipo, participantes, avatarUsuario, nombreUsuario});

    /* Renderizar un mensaje del timeline */
    const renderizarMensaje = (mensaje: MensajeTimeline) => {
        const tipoVisual = obtenerTipoVisual(mensaje);

        if (tipoVisual === 'sistema') {
            return (
                <div key={mensaje.id} className="timelineMensajeSistema">
                    <span className="timelineMensajeSistemaTexto">{mensaje.contenido}</span>
                    <span className="timelineMensajeSistemaFecha">{formatearHora(mensaje.fechaCreacion)}</span>
                </div>
            );
        }

        const esEnviado = tipoVisual === 'enviado';
        return (
            <div key={mensaje.id} className={`timelineMensajeUsuario ${esEnviado ? 'timelineMensajeUsuario--enviado' : 'timelineMensajeUsuario--recibido'}`}>
                {!esEnviado && <div className="timelineMensajeAvatar">{mensaje.avatar ? <img src={mensaje.avatar} alt={mensaje.usuarioNombre} /> : <span>{mensaje.usuarioNombre.charAt(0).toUpperCase()}</span>}</div>}
                <div className="timelineMensajeBurbuja">
                    {!esEnviado && <span className="timelineMensajeNombre">{mensaje.usuarioNombre}</span>}
                    <span className="timelineMensajeContenido">{mensaje.contenido}</span>
                    <span className="timelineMensajeFecha">{formatearHora(mensaje.fechaCreacion)}</span>
                </div>
            </div>
        );
    };

    /* Renderizar separador de día */
    const renderizarSeparadorDia = (fechaIso: string) => {
        const clave = obtenerClaveDia(fechaIso);
        return (
            <div key={`separador-${clave}`} className="timelineSeparadorDia">
                <span className="timelineSeparadorDiaLinea" />
                <span className="timelineSeparadorDiaTexto">{formatearFechaDia(fechaIso)}</span>
                <span className="timelineSeparadorDiaLinea" />
            </div>
        );
    };

    /* Renderizar estado vacio o cargando */
    const renderizarEstadoTimeline = () => {
        if (estado.cargando && estado.mensajes.length === 0) {
            return (
                <div className="panelChatHistorialVacio">
                    <Loader size={24} className="animacionGirar" />
                    <span>Cargando historial...</span>
                </div>
            );
        }

        if (estado.mensajes.length === 0) {
            return (
                <div className="panelChatHistorialVacio">
                    <MessageCircle size={24} />
                    <span>Sin comentarios aun</span>
                </div>
            );
        }

        /* Agrupar mensajes por día e insertar separadores */
        const elementos: JSX.Element[] = [];
        let diaAnterior = '';

        estado.mensajes.forEach(mensaje => {
            const diaActual = obtenerClaveDia(mensaje.fechaCreacion);

            /* Si cambió el día, insertar separador */
            if (diaActual !== diaAnterior) {
                elementos.push(renderizarSeparadorDia(mensaje.fechaCreacion));
                diaAnterior = diaActual;
            }

            elementos.push(renderizarMensaje(mensaje));
        });

        return elementos;
    };

    /* Modo solo input: renderiza solo el input de comentario */
    if (soloInput) {
        return (
            <div className="timelineInput timelineInput--flotante">
                <div className="timelineInputAvatar">{avatarFinal ? <img src={avatarFinal} alt={nombreFinal} /> : <span>{nombreFinal.charAt(0).toUpperCase()}</span>}</div>
                <Input tipo="text" value={mensajeNuevo} onChange={e => setMensajeNuevo((e.target as HTMLInputElement).value)} onKeyDown={manejarTecla} placeholder="Dejar un comentario..." claseAdicional="timelineInputTexto" disabled={estado.enviando} />
                <Boton type="button" onClick={manejarEnviarMensaje} claseAdicional="timelineBotonEnviar" disabled={estado.enviando || !mensajeNuevo.trim()} title="Comentar">
                    {estado.enviando ? <Loader size={14} className="animacionGirar" /> : <Send size={14} />}
                </Boton>
            </div>
        );
    }

    return (
        <div id="panel-chat-historial" className={`panelChatHistorial ${compacto ? 'panelChatHistorial--compacto' : ''}`}>
            {/* Header con toggle de participantes - Ocultar en modo compacto */}
            {!compacto && tieneParticipantes && (
                <div className="panelChatHistorialHeader">
                    <div className="panelChatHistorialTitulo">
                        <MessageCircle size={14} />
                        <span>Timeline</span>
                    </div>
                    <Boton type="button" claseAdicional={`panelChatHistorialBotonParticipantes ${mostrandoParticipantes ? 'panelChatHistorialBotonParticipantes--activo' : ''}`} onClick={() => setMostrandoParticipantes(!mostrandoParticipantes)}>
                        <Users size={12} />
                        <span>{participantes.length}</span>
                    </Boton>
                </div>
            )}

            {/* Contenido */}
            <div className="panelChatHistorialContenido">
                {/* Timeline Unificado */}
                {!mostrandoParticipantes && (
                    <div className="panelChatHistorialTimeline">
                        <div ref={refContenedor as React.RefObject<HTMLDivElement>} className="timelineContenedor">
                            {renderizarEstadoTimeline()}
                        </div>

                        {/* Input de comentario */}
                        <div className="timelineInput">
                            <div className="timelineInputAvatar">{avatarFinal ? <img src={avatarFinal} alt={nombreFinal} /> : <span>{nombreFinal.charAt(0).toUpperCase()}</span>}</div>
                            <Input tipo="text" value={mensajeNuevo} onChange={e => setMensajeNuevo((e.target as HTMLInputElement).value)} onKeyDown={manejarTecla} placeholder="Dejar un comentario..." claseAdicional="timelineInputTexto" disabled={estado.enviando} />
                            <Boton type="button" onClick={manejarEnviarMensaje} claseAdicional="timelineBotonEnviar" disabled={estado.enviando || !mensajeNuevo.trim()} title="Comentar">
                                {estado.enviando ? <Loader size={14} className="animacionGirar" /> : <Send size={14} />}
                            </Boton>
                        </div>
                    </div>
                )}

                {/* Participantes */}
                {mostrandoParticipantes && (
                    <div className="panelChatHistorialParticipantes">
                        {participantes.length === 0 ? (
                            <div className="panelChatHistorialVacio">
                                <Users size={24} />
                                <span>Sin participantes</span>
                            </div>
                        ) : (
                            participantes.map(participante => (
                                <div key={participante.id} className="panelChatHistorialParticipante">
                                    {participante.avatar ? <img src={participante.avatar} alt={participante.nombre} className="panelChatHistorialParticipanteAvatar" /> : <div className="panelChatHistorialParticipanteAvatarPlaceholder">{participante.nombre.charAt(0).toUpperCase()}</div>}
                                    <span className="panelChatHistorialParticipanteNombre">{participante.nombre}</span>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
