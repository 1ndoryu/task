/*
 * useModalFeedback
 * Hook que encapsula la lógica del modal de feedback.
 * Gestiona tipo de feedback, envío, estado premium y límites diarios.
 */

import {useState, useEffect, useCallback} from 'react';
import {apiFetch} from '../../utils/apiClient';

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

/* [18-08-2026] Contrato Rust /api/feedback:
 * GET /feedback/state -> { restante, esPremium }
 * POST /feedback { tipo, mensaje } -> { success, message } */

export function useModalFeedback({estaAbierto, onCerrar}: UseModalFeedbackProps): UseModalFeedbackReturn {
    const [tipo, setTipo] = useState<TipoFeedback>('sugerencia');
    const [mensaje, setMensaje] = useState('');
    const [estado, setEstado] = useState<EstadoFeedback>({restante: 3, esPremium: false, cargando: true});
    const [enviando, setEnviando] = useState(false);
    const [resultado, setResultado] = useState<{exito: boolean; mensaje: string} | null>(null);

    const cargarEstado = useCallback(async () => {
        setEstado(prev => ({...prev, cargando: true}));
        try {
            const datos = await apiFetch<{restante: number; esPremium: boolean}>('/feedback/state');
            setEstado({...datos, cargando: false});
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Error de conexión';
            setEstado({restante: 0, esPremium: false, cargando: false});
            setResultado({exito: false, mensaje: msg});
        }
    }, []);

    /* Cargar estado de comentarios restantes */
    useEffect(() => {
        if (estaAbierto) {
            cargarEstado();
            setMensaje('');
            setResultado(null);
        }
    }, [estaAbierto, cargarEstado]);

    const enviarFeedback = useCallback(async () => {
        if (!mensaje.trim() || mensaje.length < 10) {
            setResultado({exito: false, mensaje: 'El mensaje debe tener al menos 10 caracteres'});
            return;
        }

        setEnviando(true);
        setResultado(null);

        try {
            const respuesta = await apiFetch<{success: boolean; message: string}>('/feedback', {
                method: 'POST',
                body: {tipo, mensaje: mensaje.trim()}
            });
            setResultado({exito: respuesta.success, mensaje: respuesta.message});
            if (respuesta.success) {
                setMensaje('');
                /* Actualizar restantes tras el envío */
                cargarEstado();
                setTimeout(() => onCerrar(), 1200);
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Error de conexión';
            setResultado({exito: false, mensaje: msg});
        } finally {
            setEnviando(false);
        }
    }, [tipo, mensaje, onCerrar, cargarEstado]);

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
