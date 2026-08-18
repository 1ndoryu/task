/*
 * usePanelChatHistorial
 * Hook que encapsula toda la lógica del componente PanelChatHistorial.
 * Maneja estado de mensajes, envío, scroll automático y datos de usuario.
 */

import {useState, useRef, useEffect} from 'react';
import {useMensajes} from '../useMensajes';
import type {PanelChatHistorialProps} from '../../components/dashboard/PanelChatHistorial';

type HookParams = Pick<PanelChatHistorialProps, 'elementoId' | 'elementoTipo' | 'participantes' | 'avatarUsuario' | 'nombreUsuario'>;

export interface UsePanelChatHistorialReturn {
    mostrandoParticipantes: boolean;
    setMostrandoParticipantes: React.Dispatch<React.SetStateAction<boolean>>;
    mensajeNuevo: string;
    setMensajeNuevo: React.Dispatch<React.SetStateAction<string>>;
    refContenedor: React.RefObject<HTMLDivElement | null>;
    avatarFinal: string;
    nombreFinal: string;
    tieneParticipantes: boolean;
    estado: ReturnType<typeof useMensajes>['estado'];
    manejarEnviarMensaje: () => Promise<void>;
    manejarTecla: (evento: React.KeyboardEvent) => void;
}

export function usePanelChatHistorial({elementoId, elementoTipo, participantes = [], avatarUsuario, nombreUsuario}: HookParams): UsePanelChatHistorialReturn {
    const [mostrandoParticipantes, setMostrandoParticipantes] = useState(false);
    const [mensajeNuevo, setMensajeNuevo] = useState('');
    const refContenedor = useRef<HTMLDivElement>(null);

    /* Obtener usuario actual de WordPress si no se pasan props */
    const wpData = typeof window !== 'undefined' ? window.gloryDashboard : null;
    const usuarioActual = wpData?.currentUser;
    const avatarFinal = avatarUsuario || usuarioActual?.avatarUrl || '';
    const nombreFinal = nombreUsuario || usuarioActual?.name || 'Usuario';

    const tieneParticipantes = participantes.length > 0;

    /* Hook de mensajes conectado a la API */
    const {estado, enviarMensaje} = useMensajes(elementoTipo, elementoId);

    /* Scroll al ultimo mensaje al cargar o cuando cambian los mensajes */
    useEffect(() => {
        if (refContenedor.current && !mostrandoParticipantes) {
            refContenedor.current.scrollTop = refContenedor.current.scrollHeight;
        }
    }, [mostrandoParticipantes, estado.mensajes]);

    const manejarEnviarMensaje = async () => {
        if (!mensajeNuevo.trim() || estado.enviando) return;

        const contenido = mensajeNuevo;
        setMensajeNuevo('');

        const exito = await enviarMensaje(contenido);
        if (!exito) {
            /* Restaurar mensaje si fallo */
            setMensajeNuevo(contenido);
        }
    };

    const manejarTecla = (evento: React.KeyboardEvent) => {
        if (evento.key === 'Enter' && !evento.shiftKey) {
            evento.preventDefault();
            manejarEnviarMensaje();
        }
    };

    return {
        mostrandoParticipantes,
        setMostrandoParticipantes,
        mensajeNuevo,
        setMensajeNuevo,
        refContenedor,
        avatarFinal,
        nombreFinal,
        tieneParticipantes,
        estado,
        manejarEnviarMensaje,
        manejarTecla
    };
}
