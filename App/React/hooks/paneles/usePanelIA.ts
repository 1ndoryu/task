/*
 * hooks/paneles/usePanelIA.ts
 * Hook que encapsula la lógica del panel de IA
 *
 * [233A-69] Fase 1: Lógica de chat extraída del componente.
 * Maneja envío de mensajes, scroll automático y cleanup.
 */

import {useState, useRef, useCallback, useEffect} from 'react';
import {useIAStore, generarIdMensaje} from '../../stores/iaStore';
import {enviarMensajeLLM} from '../../services/iaService';
import type {MensajeIA} from '../../stores/iaStore';

export function usePanelIA() {
    const [inputTexto, setInputTexto] = useState('');
    const refScroll = useRef<HTMLDivElement>(null);
    const refAbort = useRef<AbortController | null>(null);

    /* Selectores específicos del store */
    const mensajes = useIAStore(s => s.mensajes);
    const enviando = useIAStore(s => s.enviando);
    const error = useIAStore(s => s.error);
    const apiKey = useIAStore(s => s.apiKey);
    const modelo = useIAStore(s => s.modelo);
    const tokensUsados = useIAStore(s => s.tokensUsados);
    const agregarMensaje = useIAStore(s => s.agregarMensaje);
    const setEnviando = useIAStore(s => s.setEnviando);
    const setError = useIAStore(s => s.setError);
    const incrementarTokens = useIAStore(s => s.incrementarTokens);
    const limpiarChat = useIAStore(s => s.limpiarChat);

    /* Scroll automático al último mensaje */
    useEffect(() => {
        if (refScroll.current) {
            refScroll.current.scrollTop = refScroll.current.scrollHeight;
        }
    }, [mensajes]);

    /* Cleanup del AbortController al desmontar */
    useEffect(() => {
        return () => { refAbort.current?.abort(); };
    }, []);

    const manejarEnviar = useCallback(async () => {
        const texto = inputTexto.trim();
        if (!texto || enviando) return;

        setInputTexto('');
        setError(null);

        /* Agregar mensaje del usuario */
        const mensajeUsuario: MensajeIA = {
            id: generarIdMensaje(),
            rol: 'usuario',
            contenido: texto,
            timestamp: Date.now()
        };
        agregarMensaje(mensajeUsuario);

        /* Enviar al LLM */
        setEnviando(true);
        refAbort.current = new AbortController();

        try {
            /* Construir historial para la API (últimos 20 mensajes máx) */
            const historial = [...useIAStore.getState().mensajes].slice(-20).map(m => ({
                role: m.rol === 'usuario' ? 'user' as const : m.rol === 'asistente' ? 'assistant' as const : 'system' as const,
                content: m.contenido
            }));

            const respuesta = await enviarMensajeLLM(
                historial,
                apiKey,
                modelo,
                refAbort.current.signal
            );

            /* Agregar respuesta del asistente */
            const mensajeAsistente: MensajeIA = {
                id: generarIdMensaje(),
                rol: 'asistente',
                contenido: respuesta.contenido,
                timestamp: Date.now()
            };
            agregarMensaje(mensajeAsistente);
            incrementarTokens(respuesta.tokensPrompt + respuesta.tokensComplecion);
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') return;
            const mensaje = err instanceof Error ? err.message : 'Error desconocido';
            setError(mensaje);
        } finally {
            setEnviando(false);
            refAbort.current = null;
        }
    }, [inputTexto, enviando, apiKey, modelo, agregarMensaje, setEnviando, setError, incrementarTokens]);

    const manejarTecla = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            manejarEnviar();
        }
    }, [manejarEnviar]);

    return {
        inputTexto, setInputTexto,
        refScroll,
        mensajes, enviando, error, apiKey, tokensUsados,
        limpiarChat,
        manejarEnviar, manejarTecla
    };
}
