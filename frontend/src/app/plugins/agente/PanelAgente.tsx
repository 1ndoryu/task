/*
 * plugins/agente/PanelAgente.tsx
 * Panel del agente de IA (plan-agente-ia-plugin, Fase 4): tabs de
 * conversaciones (persistidas en el servidor), streaming SSE con tarjetas
 * de tool y contexto visible. Reutiliza el sistema de diseño (SeccionEncabezado,
 * Boton, Textarea) y las clases de panelIA.css para coherencia visual.
 * Los bloques visuales (mensajes, tools, tabs, tareas, estados) viven en
 * componentes.tsx y son los MISMOS que renderiza la galería de Fase 4.5.
 */

import {useEffect, useRef, useState} from 'react';
import {ArrowUp, Bot, ChevronDown, ChevronUp, Clock, Loader2, Plus, Settings} from 'lucide-react';
import {SeccionEncabezado} from '../../components/dashboard';
import {Boton, Textarea} from '../../components/ui';
import {useAgenteStore, useTabActivaAgente} from './store';
import {ModalConfigAgente} from './ModalConfigAgente';
import {
    BotonCancelar,
    EstadoCarga,
    EstadoVacio,
    MensajeAsistente,
    MensajeUsuario,
    TabsWorkspace,
    TarjetaTareaProgramada,
} from './componentes';
import type {PanelBaseProps} from '../../types/paneles';

import '../../styles/dashboard/componentes/panelIA.css';
import './panelAgente.css';

export function PanelAgente({renderHandleArrastre, handleMinimizar}: PanelBaseProps): JSX.Element {
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

    const manejarEnviar = () => {
        const texto = inputTexto.trim();
        if (!texto || !tabActiva || tabActiva.enviando) return;
        setInputTexto('');
        refAbort.current = new AbortController();
        void enviarMensaje(texto, refAbort.current.signal);
    };

    const manejarTecla = (evento: React.KeyboardEvent) => {
        if (evento.key === 'Enter' && !evento.shiftKey) {
            evento.preventDefault();
            manejarEnviar();
        }
    };

    const iniciarRenombrado = (id: string, tituloActual: string) => {
        setEditandoTitulo(id);
        setTituloEdicion(tituloActual);
    };

    const confirmarRenombrado = (id: string) => {
        void renombrarTab(id, tituloEdicion);
        setEditandoTitulo(null);
    };

    const manejarCrearTarea = (evento: React.FormEvent) => {
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

    return (
        <div className="internaColumna panelIA panelAgente">
            <SeccionEncabezado
                icono={null}
                titulo={renderHandleArrastre('IA')}
                subtitulo={tabActiva?.enviando ? 'trabajando...' : undefined}
                variante="panelHeader"
                acciones={
                    <>
                        <Boton
                            variante="badge"
                            soloIcono
                            onClick={() => void crearTab()}
                            icono={<Plus size={12} />}
                            title="Nueva conversación"
                        />
                        <Boton
                            variante="badge"
                            soloIcono
                            onClick={() => setConfigAbierta(true)}
                            icono={<Settings size={12} />}
                            title="Configurar agente"
                        />
                        {handleMinimizar}
                    </>
                }
            />
            <ModalConfigAgente activo={configAbierta} onCerrar={() => setConfigAbierta(false)} />

            {/* Tabs de conversaciones */}
            <TabsWorkspace
                tabs={tabs.map(t => ({id: t.conversacion.id, titulo: t.conversacion.titulo}))}
                activaId={tabActivaId}
                editandoId={editandoTitulo}
                tituloEdicion={tituloEdicion}
                onActivar={id => void abrirTab(id)}
                onIniciarRenombrado={iniciarRenombrado}
                onCambiarTituloEdicion={setTituloEdicion}
                onConfirmarRenombrado={confirmarRenombrado}
                onCancelarRenombrado={() => setEditandoTitulo(null)}
                onCerrar={id => void cerrarTab(id)}
            />

            {/* Área de mensajes */}
            <div ref={refScroll} className="panelIAMensajes">
                {cargandoLista && <EstadoCarga texto="Cargando conversaciones..." />}

                {errorLista && (
                    <div className="panelIAError">{errorLista}</div>
                )}

                {!cargandoLista && tabs.length === 0 && !errorLista && (
                    <EstadoVacio icono={<Bot size={32} />} texto="Nueva conversación: pide al agente crear tareas, hábitos, notas o recordatorios.">
                        <Boton variante="primario" tamano="pequeño" onClick={() => void crearTab()}>
                            <Plus size={12} /> Nueva conversación
                        </Boton>
                    </EstadoVacio>
                )}

                {tabActiva?.cargandoHistorial && <EstadoCarga texto="Cargando historial..." />}

                {tabActiva?.error && (
                    <div className="panelIAError">
                        {tabActiva.error}
                        <Boton
                            variante="ghost"
                            tamano="pequeño"
                            onClick={() => limpiarErrorTab(tabActiva.conversacion.id)}
                        >
                            Descartar
                        </Boton>
                    </div>
                )}

                {tabActiva && !tabActiva.cargandoHistorial && tabActiva.mensajes.length === 0 && (
                    <EstadoVacio icono={<Bot size={32} />} texto="Escribe un mensaje para comenzar. Doble clic en una tab para renombrarla." />
                )}

                {tabActiva?.mensajes.map(mensaje => {
                    if (mensaje.rol === 'user') {
                        return <MensajeUsuario key={mensaje.id} contenido={mensaje.contenido} />;
                    }
                    const ultimo = mensaje.id === tabActiva.mensajes[tabActiva.mensajes.length - 1]?.id;
                    return (
                        <MensajeAsistente
                            key={mensaje.id}
                            contenido={mensaje.contenido}
                            herramientas={mensaje.herramientas}
                            contexto={mensaje.contexto}
                            aprobacionPendiente={mensaje.aprobacionPendiente}
                            reintentar={mensaje.reintentar}
                            enviando={tabActiva.enviando}
                            ultimo={ultimo}
                            onReintentar={() => void reintentarMensaje()}
                        />
                    );
                })}
            </div>

            {/* Tareas programadas (sección colapsable) */}
            <div className="panelAgenteTareas">
                <button
                    type="button"
                    className="panelAgenteTareasCabecera"
                    onClick={() => setTareasAbiertas(v => !v)}
                >
                    <Clock size={11} />
                    <span>Tareas programadas ({tareasProgramadas.length})</span>
                    {tareasAbiertas ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                </button>
                {tareasAbiertas && (
                    <div className="panelAgenteTareasContenido">
                        {errorTareas && <div className="panelIAError">{errorTareas}</div>}
                        {cargandoTareas && (
                            <div className="panelAgenteTareasVacio">
                                <Loader2 size={12} className="animacionGirar" /> Cargando...
                            </div>
                        )}
                        {!cargandoTareas && tareasProgramadas.length === 0 && !errorTareas && (
                            <div className="panelAgenteTareasVacio">Sin tareas programadas todavía.</div>
                        )}
                        {tareasProgramadas.map(tarea => (
                            <TarjetaTareaProgramada
                                key={tarea.id}
                                tarea={tarea}
                                onEliminar={id => void eliminarTarea(id)}
                            />
                        ))}
                        <form className="panelAgenteTareaForm" onSubmit={manejarCrearTarea}>
                            <input
                                className="panelAgenteTareaInput"
                                placeholder="Nombre"
                                value={tareaNombre}
                                maxLength={255}
                                required
                                onChange={e => setTareaNombre(e.target.value)}
                            />
                            <textarea
                                className="panelAgenteTareaInput panelAgenteTareaPrompt"
                                placeholder="Instrucciones para el agente"
                                value={tareaPrompt}
                                maxLength={4000}
                                required
                                onChange={e => setTareaPrompt(e.target.value)}
                            />
                            <select
                                className="panelAgenteTareaInput"
                                value={tareaTipo}
                                onChange={e => setTareaTipo(e.target.value as 'una_vez' | 'recurrente')}
                            >
                                <option value="una_vez">Una vez</option>
                                <option value="recurrente">Recurrente</option>
                            </select>
                            {tareaTipo === 'recurrente' ? (
                                <input
                                    className="panelAgenteTareaInput"
                                    placeholder="diario | cada30min | cada2h | cada3d"
                                    value={tareaCron}
                                    required
                                    onChange={e => setTareaCron(e.target.value)}
                                />
                            ) : (
                                <input
                                    className="panelAgenteTareaInput"
                                    type="datetime-local"
                                    value={tareaEjecutarEn}
                                    onChange={e => setTareaEjecutarEn(e.target.value)}
                                />
                            )}
                            <Boton type="submit" variante="primario" tamano="pequeño" disabled={tareaGuardando}>
                                {tareaGuardando ? <Loader2 size={11} className="animacionGirar" /> : <Plus size={11} />}
                                Programar
                            </Boton>
                        </form>
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="panelIAInput">
                <Textarea
                    claseAdicional="panelIAInputTexto"
                    claseContenedor="panelIAInputContenedor"
                    value={inputTexto}
                    onChange={e => setInputTexto(e.target.value)}
                    onKeyDown={manejarTecla}
                    placeholder={tabActiva ? 'Escribe un mensaje...' : 'Crea o abre una conversación'}
                    disabled={!tabActiva || tabActiva.enviando}
                    filas={1}
                    autoAjustar
                />
                {tabActiva?.enviando ? (
                    <BotonCancelar onCancelar={cancelarTurno} />
                ) : (
                    <Boton
                        type="button"
                        variante="icono"
                        tamano="pequeño"
                        soloIcono
                        claseAdicional="panelIAInputEnviar"
                        onClick={manejarEnviar}
                        disabled={!tabActiva || !inputTexto.trim()}
                        icono={<ArrowUp size={16} />}
                        title="Enviar"
                    />
                )}
            </div>
        </div>
    );
}
