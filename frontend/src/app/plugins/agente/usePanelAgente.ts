import {useEffect, useRef, useState} from 'react';
import type {KeyboardEvent, FormEvent} from 'react';
import {useAgenteStore, useTabActivaAgente} from './store';

/*
 * usePanelAgente
 *
 * Estado y handlers del panel del agente, extraídos de PanelAgente.tsx para
 * que el componente quede visual (bajo limite-lineas y sin usestate-excesivo).
 * La lógica de conversaciones vive en el store (useAgenteStore); aquí solo se
 * orquesta la vista: input, renombrado de tabs, modales y formulario de tareas.
 */

export function usePanelAgente() {
    const {
        tabs,
        tabActivaId,
        cargandoLista,
        errorLista,
        conversacionesCargadas,
        cargarConversaciones,
        abrirTab,
        crearTab,
        renombrarTab,
        cerrarTab,
        enviarMensaje,
        reintentarMensaje,
        limpiarErrorTab,
        rebobinarTab,
        compactarTab,
        tareasProgramadas,
        cargandoTareas,
        errorTareas,
        cargarTareasProgramadas,
        crearTarea,
        eliminarTarea,
    } = useAgenteStore();

    const tabActiva = useTabActivaAgente();
    const [inputTexto, setInputTexto] = useState('');
    const [editandoTitulo, setEditandoTitulo] = useState<string | null>(null);
    const [tituloEdicion, setTituloEdicion] = useState('');
    const [configAbierta, setConfigAbierta] = useState(false);
    const [tareasAbiertas, setTareasAbiertas] = useState(false);
    const [tareaNombre, setTareaNombre] = useState('');
    const [tareaPrompt, setTareaPrompt] = useState('');
    const [tareaTipo, setTareaTipo] = useState<'una_vez' | 'recurrente'>('una_vez');
    const [tareaCron, setTareaCron] = useState('');
    const [tareaEjecutarEn, setTareaEjecutarEn] = useState('');
    const [tareaGuardando, setTareaGuardando] = useState(false);
    /* [318A-7] La compactación está en curso (deshabilita el botón de la barra). */
    const [compactando, setCompactando] = useState(false);
    const refScroll = useRef<HTMLDivElement>(null);
    const refAbort = useRef<AbortController | null>(null);

    /* Cargar la lista de conversaciones una vez al montar. */
    useEffect(() => {
        if (!conversacionesCargadas && !cargandoLista) {
            void cargarConversaciones();
        }
    }, [conversacionesCargadas, cargandoLista, cargarConversaciones]);

    /* Cargar las tareas programadas una vez al montar. La acción de zustand es
     * estable, así que NUNCA debe depender de `cargandoTareas`: la propia carga
     * alterna ese flag (true→false al terminar) y reintroducirlo como dependencia
     * dispara un bucle de refetch infinito (una petición por segundo). */
    useEffect(() => {
        void cargarTareasProgramadas();
    }, [cargarTareasProgramadas]);

    /* Scroll automático al último mensaje. */
    useEffect(() => {
        if (refScroll.current) {
            refScroll.current.scrollTop = refScroll.current.scrollHeight;
        }
    }, [tabActiva?.mensajes.length, tabActiva?.mensajes[tabActiva.mensajes.length - 1]?.contenido]);

    /* Cancelar el stream al desmontar. */
    useEffect(() => {
        return () => {
            refAbort.current?.abort();
        };
    }, []);

    const cancelarTurno = () => {
        refAbort.current?.abort();
        refAbort.current = null;
    };

    const manejarEnviar = (texto: string) => {
        const limpio = texto.trim();
        if (!limpio || !tabActiva || tabActiva.enviando) return false;
        setInputTexto('');
        refAbort.current = new AbortController();
        void enviarMensaje(limpio, refAbort.current.signal);
        return true;
    };

    const manejarTecla = (evento: KeyboardEvent) => {
        if (evento.key === 'Enter' && !evento.shiftKey) {
            evento.preventDefault();
            manejarEnviar(inputTexto);
        }
    };

    const iniciarRenombrado = (id: string, tituloActual: string) => {
        setEditandoTitulo(id);
        setTituloEdicion(tituloActual);
    };

    const confirmarRenombrado = (id: string) => {
        void renombrarTab(id, tituloEdicion.trim() || tituloEdicion);
        setEditandoTitulo(null);
    };

    /* [318A-7] Compacta la conversación activa desde la barra de contexto. */
    const manejarCompactar = () => {
        if (!tabActiva || compactando) return;
        setCompactando(true);
        void compactarTab(tabActiva.conversacion.id).finally(() => setCompactando(false));
    };

    const manejarCrearTarea = (evento: FormEvent) => {
        evento.preventDefault();
        const nombre = tareaNombre.trim();
        const prompt = tareaPrompt.trim();
        if (!nombre || !prompt || tareaGuardando) return;
        setTareaGuardando(true);
        void crearTarea({
            nombre,
            prompt,
            tipo: tareaTipo,
            ...(tareaTipo === 'recurrente'
                ? {cron_expr: tareaCron.trim() || undefined}
                : tareaEjecutarEn
                    ? {ejecutar_en: new Date(tareaEjecutarEn).toISOString()}
                    : {}),
        }).finally(() => {
            setTareaGuardando(false);
            setTareaNombre('');
            setTareaPrompt('');
            setTareaCron('');
            setTareaEjecutarEn('');
        });
    };

    return {
        tabs,
        tabActivaId,
        tabActiva,
        cargandoLista,
        errorLista,
        tareasProgramadas,
        cargandoTareas,
        errorTareas,
        refScroll,
        inputTexto,
        setInputTexto,
        editandoTitulo,
        setEditandoTitulo,
        tituloEdicion,
        setTituloEdicion,
        configAbierta,
        setConfigAbierta,
        tareasAbiertas,
        setTareasAbiertas,
        tareaNombre,
        setTareaNombre,
        tareaPrompt,
        setTareaPrompt,
        tareaTipo,
        setTareaTipo,
        tareaCron,
        setTareaCron,
        tareaEjecutarEn,
        setTareaEjecutarEn,
        tareaGuardando,
        compactando,
        abrirTab,
        crearTab,
        cerrarTab,
        limpiarErrorTab,
        reintentarMensaje,
        rebobinarTab,
        compactarTab,
        eliminarTarea,
        cancelarTurno,
        manejarEnviar,
        manejarTecla,
        iniciarRenombrado,
        confirmarRenombrado,
        manejarCrearTarea,
        manejarCompactar,
    };
}