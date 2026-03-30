/*
 * ModalFeedback
 * Modal para que usuarios Premium envíen comentarios/sugerencias
 * Límite: 3 comentarios por día
 * Lógica extraída a useModalFeedback hook
 */

import {MessageSquare, Send, AlertCircle, CheckCircle, Loader2, Lightbulb, Bug, MessageCircle} from 'lucide-react';
import {Modal} from './Modal';
import {Boton, Textarea} from '../ui';
import {useModalFeedback} from '../../hooks/dashboard/useModalFeedback';

interface ModalFeedbackProps {
    estaAbierto: boolean;
    onCerrar: () => void;
}

type TipoFeedback = 'sugerencia' | 'bug' | 'otro';

/* [303A-5] Emojis reemplazados por iconos SVG (lucide-react) */
const TIPOS_FEEDBACK: {valor: TipoFeedback; etiqueta: string; icono: JSX.Element}[] = [
    {valor: 'sugerencia', etiqueta: 'Sugerencia', icono: <Lightbulb size={14} />},
    {valor: 'bug', etiqueta: 'Reportar problema', icono: <Bug size={14} />},
    {valor: 'otro', etiqueta: 'Otro', icono: <MessageCircle size={14} />}
];

export function ModalFeedback({estaAbierto, onCerrar}: ModalFeedbackProps): JSX.Element | null {
    const {tipo, setTipo, mensaje, setMensaje, estado, enviando, resultado, enviarFeedback, manejarTecla} = useModalFeedback({estaAbierto, onCerrar});

    return (
        <Modal estaAbierto={estaAbierto} onCerrar={onCerrar} titulo="Enviar Comentarios" claseExtra="modalFeedback">
            <div className="modalFeedbackContenido">
                {estado.cargando ? (
                    <div className="modalFeedbackCargando">
                        <Loader2 size={24} className="animacionGirar" />
                        <span>Cargando...</span>
                    </div>
                ) : !estado.esPremium ? (
                    <div className="modalFeedbackBloqueado">
                        <AlertCircle size={32} />
                        <h3>Función Premium</h3>
                        <p>El envío de comentarios está disponible solo para usuarios Premium.</p>
                        <p className="modalFeedbackNota">Actualiza tu plan para compartir tus ideas con nosotros.</p>
                    </div>
                ) : estado.restante <= 0 ? (
                    <div className="modalFeedbackLimite">
                        <AlertCircle size={32} />
                        <h3>Límite alcanzado</h3>
                        <p>Has usado tus 3 comentarios de hoy.</p>
                        <p className="modalFeedbackNota">Podrás enviar más mañana.</p>
                    </div>
                ) : (
                    <>
                        <div className="modalFeedbackInfo">
                            <MessageSquare size={16} />
                            <span>Comentarios restantes hoy: <strong>{estado.restante}/3</strong></span>
                        </div>

                        <div className="modalFeedbackTipos">
                            {TIPOS_FEEDBACK.map(t => (
                                <Boton key={t.valor} variante={tipo === t.valor ? 'primario' : 'ghost'} onClick={() => setTipo(t.valor)} claseAdicional={`modalFeedbackTipo ${tipo === t.valor ? 'modalFeedbackTipoActivo' : ''}`}>
                                    <span>{t.icono}</span>
                                    <span>{t.etiqueta}</span>
                                </Boton>
                            ))}
                        </div>

                        <Textarea
                            placeholder="Escribe tu comentario aquí... (mínimo 10 caracteres)"
                            value={mensaje}
                            onChange={e => setMensaje(e.target.value)}
                            onKeyDown={manejarTecla}
                            maxLength={2000}
                            disabled={enviando}
                            mostrarContador
                            claseAdicional="modalFeedbackTextarea"
                            filas={6}
                        />

                        {resultado && (
                            <div className={`modalFeedbackResultado ${resultado.exito ? 'modalFeedbackExito' : 'modalFeedbackError'}`}>
                                {resultado.exito ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                                <span>{resultado.mensaje}</span>
                            </div>
                        )}

                        <div className="modalFeedbackAcciones">
                            <Boton variante="secundario" onClick={onCerrar} disabled={enviando}>
                                Cancelar
                            </Boton>
                            <Boton variante="primario" onClick={enviarFeedback} disabled={enviando || mensaje.length < 10} cargando={enviando} icono={<Send size={16} />}>
                                Enviar
                            </Boton>
                        </div>

                        <p className="modalFeedbackNota">
                            Tu feedback nos ayuda a mejorar. Leemos todos los comentarios.
                        </p>
                    </>
                )}
            </div>
        </Modal>
    );
}
