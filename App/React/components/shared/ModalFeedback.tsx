/*
 * ModalFeedback
 * Modal para que usuarios Premium envíen comentarios/sugerencias
 * Límite: 3 comentarios por día
 */

import {useState, useEffect} from 'react';
import {MessageSquare, Send, AlertCircle, CheckCircle, Loader2} from 'lucide-react';
import {Modal} from './Modal';
import {useSuscripcion} from '../../hooks/useSuscripcion';

interface ModalFeedbackProps {
    estaAbierto: boolean;
    onCerrar: () => void;
}

type TipoFeedback = 'sugerencia' | 'bug' | 'otro';

interface EstadoFeedback {
    restante: number;
    esPremium: boolean;
    cargando: boolean;
}

const TIPOS_FEEDBACK: {valor: TipoFeedback; etiqueta: string; icono: string}[] = [
    {valor: 'sugerencia', etiqueta: 'Sugerencia', icono: '💡'},
    {valor: 'bug', etiqueta: 'Reportar problema', icono: '🐛'},
    {valor: 'otro', etiqueta: 'Otro', icono: '💬'}
];

function obtenerNonce(): string {
    const wpData = (window as unknown as {gloryDashboard?: {nonce?: string}}).gloryDashboard;
    return wpData?.nonce || '';
}

export function ModalFeedback({estaAbierto, onCerrar}: ModalFeedbackProps): JSX.Element | null {
    const {esPremium} = useSuscripcion();
    const [tipo, setTipo] = useState<TipoFeedback>('sugerencia');
    const [mensaje, setMensaje] = useState('');
    const [estado, setEstado] = useState<EstadoFeedback>({restante: 3, esPremium: false, cargando: true});
    const [enviando, setEnviando] = useState(false);
    const [resultado, setResultado] = useState<{exito: boolean; mensaje: string} | null>(null);

    /* Cargar estado de comentarios restantes */
    useEffect(() => {
        if (estaAbierto) {
            cargarEstado();
        }
    }, [estaAbierto]);

    const cargarEstado = async () => {
        setEstado(prev => ({...prev, cargando: true}));
        try {
            const response = await fetch('/wp-json/glory/v1/feedback/restante', {
                credentials: 'include',
                headers: {'X-WP-Nonce': obtenerNonce()}
            });
            const data = await response.json();
            if (data.success) {
                setEstado({
                    restante: data.restante,
                    esPremium: data.esPremium,
                    cargando: false
                });
            }
        } catch {
            setEstado(prev => ({...prev, cargando: false}));
        }
    };

    const enviarFeedback = async () => {
        if (!mensaje.trim() || mensaje.length < 10) {
            setResultado({exito: false, mensaje: 'El mensaje debe tener al menos 10 caracteres'});
            return;
        }

        setEnviando(true);
        setResultado(null);

        try {
            const response = await fetch('/wp-json/glory/v1/feedback', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': obtenerNonce()
                },
                body: JSON.stringify({tipo, mensaje})
            });

            const data = await response.json();

            if (data.success) {
                setResultado({exito: true, mensaje: data.mensaje});
                setMensaje('');
                setEstado(prev => ({...prev, restante: data.restante}));
                /* Cerrar automáticamente después de éxito */
                setTimeout(() => {
                    onCerrar();
                    setResultado(null);
                }, 2000);
            } else {
                setResultado({exito: false, mensaje: data.error || 'Error al enviar'});
            }
        } catch {
            setResultado({exito: false, mensaje: 'Error de conexión'});
        } finally {
            setEnviando(false);
        }
    };

    const manejarTecla = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && e.ctrlKey && !enviando && estado.restante > 0) {
            enviarFeedback();
        }
    };

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
                                <button key={t.valor} type="button" className={`modalFeedbackTipo ${tipo === t.valor ? 'modalFeedbackTipoActivo' : ''}`} onClick={() => setTipo(t.valor)}>
                                    <span>{t.icono}</span>
                                    <span>{t.etiqueta}</span>
                                </button>
                            ))}
                        </div>

                        <textarea
                            className="modalFeedbackTextarea"
                            placeholder="Escribe tu comentario aquí... (mínimo 10 caracteres)"
                            value={mensaje}
                            onChange={e => setMensaje(e.target.value)}
                            onKeyDown={manejarTecla}
                            maxLength={2000}
                            disabled={enviando}
                        />

                        <div className="modalFeedbackContador">
                            {mensaje.length}/2000 caracteres
                        </div>

                        {resultado && (
                            <div className={`modalFeedbackResultado ${resultado.exito ? 'modalFeedbackExito' : 'modalFeedbackError'}`}>
                                {resultado.exito ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                                <span>{resultado.mensaje}</span>
                            </div>
                        )}

                        <div className="modalFeedbackAcciones">
                            <button type="button" className="botonSecundario" onClick={onCerrar} disabled={enviando}>
                                Cancelar
                            </button>
                            <button type="button" className="botonPrimario" onClick={enviarFeedback} disabled={enviando || mensaje.length < 10}>
                                {enviando ? <Loader2 size={16} className="animacionGirar" /> : <Send size={16} />}
                                <span>{enviando ? 'Enviando...' : 'Enviar'}</span>
                            </button>
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
