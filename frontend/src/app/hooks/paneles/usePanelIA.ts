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
import {confirmarRecordatorio} from '../../config/accionesExternasIA';
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
    const apiKeyCerebras = useIAStore(s => s.apiKeyCerebras);
    const proveedor = useIAStore(s => s.proveedor);
    const modelo = useIAStore(s => s.modelo);
    const tokensUsados = useIAStore(s => s.tokensUsados);
    const temperatura = useIAStore(s => s.temperatura);
    const maxTokens = useIAStore(s => s.maxTokens);
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
            const apiKeyActual = obtenerApiKeyParaProveedor(proveedor, apiKey, apiKeyDeepseek, apiKeyCerebras);
            const mensajesActuales = useIAStore.getState().mensajes;
            const resultado = await procesarMensajeIA(
                mensajesActuales,
                {proveedor, apiKey: apiKeyActual, modelo},
                preferencias,
                promptSistema,
                ejecutoresTareas,
                refAbort.current.signal,
                {temperatura, maxTokens}
            );

            const mensajeAsistente: MensajeIA = {
                id: generarIdMensaje(),
                rol: 'asistente',
                contenido: resultado.contenido,
                acciones: resultado.acciones.length > 0 ? resultado.acciones : undefined,
                timestamp: Date.now()
            };
            agregarMensaje(mensajeAsistente);
            incrementarTokens(resultado.tokensUsados);
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') return;
            setError(err instanceof Error ? err.message : 'Error desconocido');
        } finally {
            setEnviando(false);
            refAbort.current = null;
        }
    }, [inputTexto, enviando, apiKey, apiKeyDeepseek, apiKeyCerebras, proveedor, modelo, temperatura, maxTokens, ejecutoresTareas, agregarMensaje, setEnviando, setError, incrementarTokens]);

    const manejarTecla = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            manejarEnviar();
        }
    }, [manejarEnviar]);

    /* [303A-11] Confirmar acción pendiente (eliminar tarea/hábito, o crear
     * recordatorio). Ejecuta la acción real y actualiza el mensaje en el chat.
     * [27-08-2026] Los recordatorios NO se crean en la propuesta: la propuesta
     * solo valida y genera la idempotency_key; la escritura ocurre aquí, al
     * confirmar, contra POST /api/reminders. */
    const confirmarAccion = useCallback(async (mensajeId: string, indiceAccion: number) => {
        const mensaje = useIAStore.getState().mensajes.find(m => m.id === mensajeId);
        if (!mensaje?.acciones?.[indiceAccion]) return;
        const accion = mensaje.acciones[indiceAccion];
        if (!accion.pendienteConfirmacion) return;

        let resultado: {exito: boolean; descripcion: string};
        try {
            if (accion.tipo === 'programar_recordatorio') {
                const datos = (accion.datos as Record<string, unknown>) || accion.parametros;
                const reminder = await confirmarRecordatorio(datos);
                resultado = {
                    exito: true,
                    descripcion: `Recordatorio "${reminder.titulo}" programado para ${new Date(reminder.programado_para).toLocaleString()}`
                };
            } else {
                resultado = ejecutarAccionDestructiva(
                    {tipo: accion.tipo, parametros: accion.parametros},
                    ejecutoresTareas
                );
            }
        } catch (error) {
            resultado = {
                exito: false,
                descripcion: error instanceof Error ? error.message : 'Error ejecutando la acción'
            };
        }

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
        mensajes, enviando, error, apiKey: proveedorTieneCredenciales(proveedor, apiKey, apiKeyDeepseek, apiKeyCerebras) ? 'configurada' : '', tokensUsados,
        limpiarChat,
        manejarEnviar, manejarTecla,
        confirmarAccion, rechazarAccion
    };
}
