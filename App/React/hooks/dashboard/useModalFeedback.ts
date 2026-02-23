/*
 * useModalFeedback
 * Hook que encapsula la lógica del modal de feedback.
 * Gestiona tipo de feedback, envío, estado premium y límites diarios.
 */

import {useState, useEffect, useCallback} from 'react';

type TipoFeedback = 'sugerencia' | 'bug' | 'otro';

interface EstadoFeedback {
    restante: number;
    esPremium: boolean;
    cargando: boolean;
}

export interface UseModalFeedbackProps {
    estaAbierto: boolean;
    onCerrar: () => void;
}

export interface UseModalFeedbackReturn {
    /* Estado */
    tipo: TipoFeedback;
    setTipo: (v: TipoFeedback) => void;
    mensaje: string;
    setMensaje: (v: string) => void;
    estado: EstadoFeedback;
    enviando: boolean;
    resultado: {exito: boolean; mensaje: string} | null;

    /* Acciones */
    enviarFeedback: () => Promise<void>;
    manejarTecla: (e: React.KeyboardEvent) => void;
}

function obtenerNonce(): string {
    const wpData = (window as unknown as {gloryDashboard?: {nonce?: string}}).gloryDashboard;
    return wpData?.nonce || '';
}

export function useModalFeedback({estaAbierto, onCerrar}: UseModalFeedbackProps): UseModalFeedbackReturn {
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

    const enviarFeedback = useCallback(async () => {
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
    }, [tipo, mensaje, onCerrar]);

    const manejarTecla = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && e.ctrlKey && !enviando && estado.restante > 0) {
            enviarFeedback();
        }
    }, [enviando, estado.restante, enviarFeedback]);

    return {
        tipo,
        setTipo,
        mensaje,
        setMensaje,
        estado,
        enviando,
        resultado,
        enviarFeedback,
        manejarTecla
    };
}
