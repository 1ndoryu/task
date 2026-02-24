/*
 * ListaFeedbackAdmin
 *
 * Lista de feedback enviado por usuarios premium.
 * Muestra mensaje, tipo, usuario y permite marcar como leído.
 * Lógica delegada a useListaFeedbackAdmin.
 */

import {MessageSquare, ChevronLeft, ChevronRight, Clock, AlertCircle, Eye, EyeOff, Bug, Lightbulb, HelpCircle} from 'lucide-react';
import {Boton} from '../ui/Boton';
import {useListaFeedbackAdmin} from '../../hooks/admin/useListaFeedbackAdmin';
import type {FeedbackItem} from '../../hooks/admin/useListaFeedbackAdmin';

interface ListaFeedbackAdminProps {
    visible: boolean;
}

/* Icono según tipo de feedback */
function iconoPorTipo(tipo: FeedbackItem['tipo']) {
    switch (tipo) {
        case 'sugerencia':
            return <Lightbulb size={14} className="feedbackTipoIcono feedbackTipoSugerencia" />;
        case 'bug':
            return <Bug size={14} className="feedbackTipoIcono feedbackTipoBug" />;
        default:
            return <HelpCircle size={14} className="feedbackTipoIcono feedbackTipoOtro" />;
    }
}

/* Formatear fecha corta */
function formatearFecha(fechaISO: string): string {
    const fecha = new Date(fechaISO);
    return fecha.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

export function ListaFeedbackAdmin({visible}: ListaFeedbackAdminProps): JSX.Element {
    /* Toda la lógica delegada al hook dedicado */
    const {feedback, paginacion, cargando, error, expandido, cargarFeedback, marcarLeido, toggleExpandido} = useListaFeedbackAdmin({visible});

    /* Estado de carga */
    if (cargando && feedback.length === 0) {
        return (
            <div className="listaFeedbackEstado">
                <Clock size={24} className="listaFeedbackIcono animacionRotar" />
                <span>Cargando mensajes...</span>
            </div>
        );
    }

    /* Estado de error */
    if (error) {
        return (
            <div className="listaFeedbackEstado listaFeedbackError">
                <AlertCircle size={24} className="listaFeedbackIcono" />
                <span>{error}</span>
            </div>
        );
    }

    /* Sin feedback */
    if (feedback.length === 0) {
        return (
            <div className="listaFeedbackEstado">
                <MessageSquare size={24} className="listaFeedbackIcono" />
                <span>No hay mensajes de feedback</span>
            </div>
        );
    }

    return (
        <div id="lista-feedback-admin" className="listaFeedbackAdmin">
            {/* Lista de mensajes */}
            <div className="listaFeedbackContenedor">
                {feedback.map(item => (
                    <div key={item.id} className={`feedbackItemAdmin ${item.leido ? 'feedbackItemLeido' : 'feedbackItemNoLeido'} ${expandido === item.id ? 'feedbackItemExpandido' : ''}`}>
                        <div className="feedbackItemCabecera" onClick={() => toggleExpandido(item.id)}>
                            <div className="feedbackItemInfo">
                                {iconoPorTipo(item.tipo)}
                                <span className="feedbackItemTipo">{item.tipo}</span>
                                <span className="feedbackItemUsuario">{item.usuarioNombre || item.usuarioEmail}</span>
                            </div>
                            <div className="feedbackItemMeta">
                                <span className="feedbackItemFecha">{formatearFecha(item.fechaCreacion)}</span>
                                {!item.leido && <span className="feedbackItemNuevo">Nuevo</span>}
                            </div>
                        </div>

                        {/* Mensaje expandido */}
                        {expandido === item.id && (
                            <div className="feedbackItemContenido">
                                <p className="feedbackItemMensaje">{item.mensaje}</p>
                                <div className="feedbackItemAcciones">
                                    <span className="feedbackItemEmailFull">{item.usuarioEmail}</span>
                                    {!item.leido && (
                                        <Boton type="button" variante="ghost" onClick={() => marcarLeido(item.id)} title="Marcar como leído">
                                            <Eye size={14} />
                                            Marcar leído
                                        </Boton>
                                    )}
                                    {item.leido && (
                                        <span className="feedbackItemLeidoIndicador">
                                            <EyeOff size={14} />
                                            Leído
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Paginación */}
            {paginacion.totalPaginas > 1 && (
                <div className="listaFeedbackPaginacion">
                    <Boton type="button" claseAdicional="paginacionBoton" onClick={() => cargarFeedback(paginacion.pagina - 1)} disabled={paginacion.pagina <= 1} title="Página anterior">
                        <ChevronLeft size={16} />
                    </Boton>
                    <span className="paginacionInfo">
                        Pág. {paginacion.pagina} de {paginacion.totalPaginas}
                    </span>
                    <Boton type="button" claseAdicional="paginacionBoton" onClick={() => cargarFeedback(paginacion.pagina + 1)} disabled={paginacion.pagina >= paginacion.totalPaginas} title="Página siguiente">
                        <ChevronRight size={16} />
                    </Boton>
                </div>
            )}

            {/* Total */}
            <div className="listaFeedbackTotal">Total: {paginacion.total} mensaje(s)</div>
        </div>
    );
}
