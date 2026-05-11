/*
 * hooks/paneles/usePanelIA.ts
 * Hook que encapsula la lógica del panel de IA
 *
 * [233A-69] Fase 1: Lógica de chat extraída del componente.
 * Fase 2+3: Recibe ejecutores de tareas, delega el flujo completo a iaService.
 */

import {useState, useRef, useCallback, useEffect} from 'react';
import {useIAStore, generarIdMensaje} from '../../stores/iaStore';
import {obtenerApiKeyParaProveedor, procesarMensajeIA, proveedorTieneCredenciales} from '../../services/iaService';
import {ejecutarAccionDestructiva} from '../../config/accionesIA';
import type {MensajeIA} from '../../stores/iaStore';
import type {EjecutoresTareasIA} from '../../config/accionesIA';

export function usePanelIA(ejecutoresTareas: EjecutoresTareasIA) {
    const [inputTexto, setInputTexto] = useState('');
    const refScroll = useRef<HTMLDivElement>(null);
    const refAbort = useRef<AbortController | null>(null);

    /* Selectores específicos del store */
    const mensajes = useIAStore(s => s.mensajes);
    const enviando = useIAStore(s => s.enviando);
    const error = useIAStore(s => s.error);
    const apiKey = useIAStore(s => s.apiKey);
    const apiKeyDeepseek = useIAStore(s => s.apiKeyDeepseek);
    const proveedor = useIAStore(s => s.proveedor);
    const modelo = useIAStore(s => s.modelo);
    const tokensUsados = useIAStore(s => s.tokensUsados);
    const agregarMensaje = useIAStore(s => s.agregarMensaje);
    const actualizarMensaje = useIAStore(s => s.actualizarMensaje);
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

        const mensajeUsuario: MensajeIA = {
            id: generarIdMensaje(),
            rol: 'usuario',
            contenido: texto,
            timestamp: Date.now()
        };
        agregarMensaje(mensajeUsuario);
        setEnviando(true);
        refAbort.current = new AbortController();

        try {
            const preferencias = useIAStore.getState().preferenciasUsuario;
            const promptSistema = useIAStore.getState().promptSistema;
            const apiKeyActual = obtenerApiKeyParaProveedor(proveedor, apiKey, apiKeyDeepseek);
            const mensajesActuales = useIAStore.getState().mensajes;
            const resultado = await procesarMensajeIA(
                mensajesActuales,
                {proveedor, apiKey: apiKeyActual, modelo},
                preferencias,
                promptSistema,
                ejecutoresTareas,
                refAbort.current.signal
            );

            agregarMensaje({
                id: generarIdMensaje(),
                rol: 'asistente',
                contenido: resultado.contenido,
                acciones: resultado.acciones.length > 0 ? resultado.acciones : undefined,
                timestamp: Date.now()
            });
            incrementarTokens(resultado.tokensUsados);
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') return;
            setError(err instanceof Error ? err.message : 'Error desconocido');
        } finally {
            setEnviando(false);
            refAbort.current = null;
        }
    }, [inputTexto, enviando, apiKey, apiKeyDeepseek, proveedor, modelo, ejecutoresTareas, agregarMensaje, setEnviando, setError, incrementarTokens]);

    const manejarTecla = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            manejarEnviar();
        }
    }, [manejarEnviar]);

    /* [303A-11] Confirmar acción destructiva pendiente (eliminar tarea/hábito).
     * Ejecuta la eliminación real y actualiza el mensaje en el chat. */
    const confirmarAccion = useCallback((mensajeId: string, indiceAccion: number) => {
        const mensaje = useIAStore.getState().mensajes.find(m => m.id === mensajeId);
        if (!mensaje?.acciones?.[indiceAccion]) return;
        const accion = mensaje.acciones[indiceAccion];
        if (!accion.pendienteConfirmacion) return;

        const resultado = ejecutarAccionDestructiva(
            {tipo: accion.tipo, parametros: accion.parametros},
            ejecutoresTareas
        );

        const nuevasAcciones = [...mensaje.acciones];
        nuevasAcciones[indiceAccion] = {
            ...accion,
            ejecutada: resultado.exito,
            resultado: resultado.descripcion,
            pendienteConfirmacion: false
        };
        actualizarMensaje(mensajeId, {acciones: nuevasAcciones});
    }, [ejecutoresTareas, actualizarMensaje]);

    /* [303A-11] Rechazar acción destructiva pendiente */
    const rechazarAccion = useCallback((mensajeId: string, indiceAccion: number) => {
        const mensaje = useIAStore.getState().mensajes.find(m => m.id === mensajeId);
        if (!mensaje?.acciones?.[indiceAccion]) return;

        const nuevasAcciones = [...mensaje.acciones];
        nuevasAcciones[indiceAccion] = {
            ...mensaje.acciones[indiceAccion],
            ejecutada: false,
            resultado: 'Cancelado por el usuario',
            pendienteConfirmacion: false
        };
        actualizarMensaje(mensajeId, {acciones: nuevasAcciones});
    }, [actualizarMensaje]);

    return {
        inputTexto, setInputTexto,
        refScroll,
        mensajes, enviando, error, apiKey: proveedorTieneCredenciales(proveedor, apiKey, apiKeyDeepseek) ? 'configurada' : '', tokensUsados,
        limpiarChat,
        manejarEnviar, manejarTecla,
        confirmarAccion, rechazarAccion
    };
}
