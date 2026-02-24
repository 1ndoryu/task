/*
 * usePanelChat
 * Hook para manejar la visibilidad del panel de chat/historial en modales
 *
 * Responsabilidad única: Estado de visibilidad persistido y mensajes no leídos
 *
 * Uso:
 * const {chatVisible, toggleChat, tieneMensajesSinLeer, participantesChat} = usePanelChat({
 *     elementoId: proyecto.id,
 *     elementoTipo: 'proyecto',
 *     participantes: participantes
 * });
 */

import {useState, useCallback, useMemo} from 'react';
import {useMensajesNoLeidos} from './useMensajesNoLeidos';
import type {Participante} from '../types/dashboard';

const STORAGE_KEY = 'glory_chat_panel_visible';

type TipoElemento = 'tarea' | 'habito' | 'proyecto';

interface UsePanelChatParams {
    /* ID del elemento (tarea, hábito o proyecto) */
    elementoId?: number;
    /* Tipo de elemento */
    elementoTipo: TipoElemento;
    /* Participantes del elemento */
    participantes?: Participante[];
    /* Si mostrar el panel (modo edición) */
    habilitado?: boolean;
}

export type ParticipanteChat = {id: number; nombre: string; avatar: string};

interface UsePanelChatReturn {
    /* Si el panel de chat está visible */
    chatVisible: boolean;
    /* Toggle de visibilidad */
    toggleChat: () => void;
    /* Si hay mensajes sin leer */
    tieneMensajesSinLeer: boolean;
    /* Participantes formateados para PanelChatHistorial */
    participantesChat: ParticipanteChat[];
    /* Si se debe mostrar la columna de chat (visible + habilitado) */
    mostrarChatColumna: boolean;
}

export function usePanelChat({elementoId, elementoTipo, participantes = [], habilitado = true}: UsePanelChatParams): UsePanelChatReturn {
    /* Estado de visibilidad persistido en localStorage */
    const [chatVisible, setChatVisible] = useState<boolean>(() => {
        const guardado = localStorage.getItem(STORAGE_KEY);
        return guardado !== 'false';
    });

    /* Toggle visibilidad con persistencia */
    const toggleChat = useCallback(() => {
        setChatVisible(prev => {
            const nuevoValor = !prev;
            localStorage.setItem(STORAGE_KEY, String(nuevoValor));
            return nuevoValor;
        });
    }, []);

    /* IDs para el hook de mensajes no leídos */
    const elementoIds = useMemo(() => {
        return elementoId && elementoId > 0 ? [elementoId] : [];
    }, [elementoId]);

    /* Obtener mensajes no leídos */
    const {noLeidos} = useMensajesNoLeidos(elementoTipo, elementoIds);

    const tieneMensajesSinLeer = useMemo(() => {
        return elementoId ? (noLeidos[elementoId] || 0) > 0 : false;
    }, [elementoId, noLeidos]);

    /* Participantes formateados para PanelChatHistorial */
    const participantesChat = useMemo(() => {
        return participantes.map(p => ({
            id: p.usuarioId,
            nombre: p.nombre,
            avatar: p.avatar
        }));
    }, [participantes]);

    /* Si mostrar la columna de chat */
    const mostrarChatColumna = habilitado && chatVisible;

    return {
        chatVisible,
        toggleChat,
        tieneMensajesSinLeer,
        participantesChat,
        mostrarChatColumna
    };
}
