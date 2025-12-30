/*
 * ModalProyecto
 * Modal para crear/editar un proyecto con auto-guardado
 * Maneja su propio Modal interno (similar a PanelConfiguracionTarea)
 *
 * Auto-guardado: al cerrar (overlay, ESC, X)
 * Cancelar: descarta cambios y cierra
 *
 * Fase 7.6: Incluye panel de chat/historial siempre en modo edición
 * El historial es útil para ver cambios aunque no esté compartido
 * Fase 9.2.4: Seccion de responsables integrada
 */

import {useState, useCallback, useEffect, useRef, useMemo} from 'react';
import {MessageSquare, MessageSquareOff, Activity, BarChart2} from 'lucide-react';
import type {NivelPrioridad, NivelUrgencia, Proyecto, Participante, CompaneroEquipo, RolCompartido, Adjunto, Tarea, Hito} from '../../../types/dashboard';
import type {DatosNuevoProyecto} from '../../../hooks/useProyectos';
import {AccionesFormulario, Modal, SeccionPanel} from '../../shared';
import {MapaCalorProyecto} from '../../shared/MapaCalorProyecto';
import {PanelChatHistorial} from '../PanelChatHistorial';
import {useMensajesNoLeidos} from '../../../hooks/useMensajes';
import {FormularioProyectoModerno} from './FormularioProyectoModerno';

interface ModalProyectoProps {
    estaAbierto: boolean;
    onCerrar: () => void;
    onGuardar: (datos: DatosNuevoProyecto) => void;
    proyecto?: Proyecto;
    /* Participantes del proyecto (si está compartido) */
    participantes?: Participante[];
    /* Companeros del equipo disponibles para agregar (Fase 9.2.4) */
    companeros?: CompaneroEquipo[];
    /* Callbacks para gestion de participantes (Fase 9.2.4) */
    onAgregarParticipante?: (companeroId: number, rol: RolCompartido) => void;
    onRemoverParticipante?: (participanteId: number) => void;
    onCambiarRolParticipante?: (participanteId: number, nuevoRol: RolCompartido) => void;
    /* Tareas para calcular estadisticas (Fase 9.2.7) */
    tareas?: Tarea[];
    onToggleTarea?: (id: number) => void;
}

type PestanaModal = 'configuracion' | 'chat';

export function ModalProyecto({estaAbierto, onCerrar, onGuardar, proyecto, participantes = [], companeros = [], onAgregarParticipante, onRemoverParticipante, onCambiarRolParticipante, tareas = [], onToggleTarea}: ModalProyectoProps): JSX.Element | null {
    const modoEdicion = !!proyecto;

    /* Estado local para edicion */
    const [nombre, setNombre] = useState(proyecto?.nombre || '');
    const [descripcion, setDescripcion] = useState(proyecto?.descripcion || '');
    const [icono, setIcono] = useState(proyecto?.icono || 'folder');
    const [colorIcono, setColorIcono] = useState(proyecto?.colorIcono || '#888888');
    const [prioridad, setPrioridad] = useState<NivelPrioridad>(proyecto?.prioridad || 'media');
    const [urgencia, setUrgencia] = useState<NivelUrgencia | null>(proyecto?.urgencia || null);
    const [fechaLimite, setFechaLimite] = useState(proyecto?.fechaLimite || '');
    const [adjuntos, setAdjuntos] = useState<Adjunto[]>(proyecto?.adjuntos || []);
    const [hitos, setHitos] = useState<Hito[]>(proyecto?.hitos || []);
    const [errores, setErrores] = useState<{nombre?: string}>({});

    /* Estado para pestañas responsive */
    const [pestanaActiva, setPestanaActiva] = useState<PestanaModal>('configuracion');

    /* Estado para visibilidad del panel de chat (persistido) */
    const [chatVisible, setChatVisible] = useState<boolean>(() => {
        const guardado = localStorage.getItem('glory_chat_panel_visible');
        return guardado !== 'false';
    });

    /* Referencia al estado inicial para detectar cambios */
    const estadoInicialRef = useRef<{
        nombre: string;
        descripcion: string;
        icono: string;
        colorIcono: string;
        prioridad: NivelPrioridad;
        urgencia: NivelUrgencia | null;
        fechaLimite: string;

        adjuntos: Adjunto[];
        hitos: Hito[];
    } | null>(null);

    /* Sincronizar estado cuando cambia el proyecto */
    useEffect(() => {
        if (proyecto) {
            setNombre(proyecto.nombre);
            setDescripcion(proyecto.descripcion || '');
            setIcono(proyecto.icono || 'folder');
            setColorIcono(proyecto.colorIcono || '#888888');
            setPrioridad(proyecto.prioridad);
            setUrgencia(proyecto.urgencia || null);
            setFechaLimite(proyecto.fechaLimite || '');
            setAdjuntos(proyecto.adjuntos || []);
            setHitos(Array.isArray(proyecto.hitos) ? proyecto.hitos : []);

            /* Guardar estado inicial para detección de cambios */
            estadoInicialRef.current = {
                nombre: proyecto.nombre,
                descripcion: proyecto.descripcion || '',
                icono: proyecto.icono || 'folder',
                colorIcono: proyecto.colorIcono || '#888888',
                prioridad: proyecto.prioridad,
                urgencia: proyecto.urgencia || null,
                fechaLimite: proyecto.fechaLimite || '',

                adjuntos: proyecto.adjuntos || [],
                hitos: Array.isArray(proyecto.hitos) ? proyecto.hitos : []
            };
        } else {
            /* Resetear si no hay proyecto (modo creacion) */
            setNombre('');
            setDescripcion('');
            setIcono('folder');
            setColorIcono('#888888');
            setPrioridad('media');
            setUrgencia(null);
            setFechaLimite('');
            setAdjuntos([]);
            setHitos([]);
            estadoInicialRef.current = null;
        }
        setErrores({});
    }, [proyecto?.id, estaAbierto]);

    /* Detectar si hubo cambios respecto al estado inicial */
    const hayCambios = useCallback((): boolean => {
        const inicial = estadoInicialRef.current;

        /* Si es modo creación, hay cambios si hay nombre */
        if (!inicial) {
            return nombre.trim().length >= 3;
        }

        /* Comparar cada campo */
        if (nombre.trim() !== inicial.nombre) return true;
        if (descripcion.trim() !== inicial.descripcion) return true;
        if (icono !== inicial.icono) return true;
        if (colorIcono !== inicial.colorIcono) return true;
        if (prioridad !== inicial.prioridad) return true;
        if (urgencia !== inicial.urgencia) return true;
        if (fechaLimite !== inicial.fechaLimite) return true;
        if (JSON.stringify(adjuntos) !== JSON.stringify(inicial.adjuntos)) return true;
        if (JSON.stringify(hitos) !== JSON.stringify(inicial.hitos)) return true;

        return false;
    }, [nombre, descripcion, icono, colorIcono, prioridad, urgencia, fechaLimite, adjuntos, hitos]);

    const validarFormulario = useCallback((): boolean => {
        const nuevosErrores: {nombre?: string} = {};

        if (!nombre.trim()) {
            nuevosErrores.nombre = 'El nombre es obligatorio';
        } else if (nombre.trim().length < 3) {
            nuevosErrores.nombre = 'El nombre debe tener al menos 3 caracteres';
        }

        setErrores(nuevosErrores);
        return Object.keys(nuevosErrores).length === 0;
    }, [nombre]);

    const manejarGuardar = useCallback(() => {
        if (!validarFormulario()) return;

        onGuardar({
            nombre: nombre.trim(),
            descripcion: descripcion.trim() || undefined,
            icono,
            colorIcono,
            prioridad,
            urgencia: urgencia || undefined,
            fechaLimite: fechaLimite || undefined,

            adjuntos,
            hitos
        });
        onCerrar();
    }, [nombre, descripcion, icono, colorIcono, prioridad, urgencia, fechaLimite, adjuntos, hitos, validarFormulario, onGuardar, onCerrar]);

    /* Auto-guardado: al cerrar el modal, guardar solo si hay cambios */
    const manejarCerrarConGuardado = useCallback(() => {
        if (hayCambios() && nombre.trim().length >= 3) {
            manejarGuardar();
        } else {
            onCerrar();
        }
    }, [hayCambios, nombre, manejarGuardar, onCerrar]);

    /* Cancelar: cerrar sin guardar (descartar cambios) */
    const manejarCancelar = useCallback(() => {
        onCerrar();
    }, [onCerrar]);

    /* Toggle visibilidad del panel de chat */
    const toggleChatVisible = useCallback(() => {
        setChatVisible(prev => {
            const nuevoValor = !prev;
            localStorage.setItem('glory_chat_panel_visible', String(nuevoValor));
            return nuevoValor;
        });
    }, []);

    /* Obtener mensajes no leídos para este proyecto */
    const proyectoIdParaMensajes = proyecto?.id && proyecto.id > 0 ? [proyecto.id] : [];
    const {noLeidos: mensajesNoLeidos} = useMensajesNoLeidos('proyecto', proyectoIdParaMensajes);
    const tieneMensajesSinLeer = proyecto?.id ? (mensajesNoLeidos[proyecto.id] || 0) > 0 : false;

    /* Participantes para el panel de chat */
    const participantesChat = participantes.map(p => ({
        id: p.usuarioId,
        nombre: p.nombre,
        avatar: p.avatar
    }));

    /* Mostrar chat siempre en modo edición (útil para ver historial) */
    const mostrarChat = modoEdicion;
    const mostrarChatColumna = mostrarChat && chatVisible;

    /* Calcular estadisticas de tareas (Fase 9.2.7) */
    /* Filtrar tareas del proyecto */
    const tareasProyecto = useMemo(() => {
        if (!proyecto || !tareas.length) return [];
        return tareas.filter(t => t.proyectoId === proyecto.id);
    }, [proyecto?.id, tareas]);

    /* Calcular estadisticas */
    const {tareasCompletadas, tareasPendientes} = useMemo(() => {
        return {
            tareasCompletadas: tareasProyecto.filter(t => t.completado).length,
            tareasPendientes: tareasProyecto.filter(t => !t.completado).length
        };
    }, [tareasProyecto]);

    /* Clase extra para modal expandido */
    const claseModal = mostrarChat ? 'panelConfiguracionContenedor modalContenedor--expandido' : 'modalContenedor--moderno';

    /* Header Icons (Fase 9.2.8) */
    const accionesHeader = (
        <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
            {/* Estadisticas (Placeholder) */}
            <button type="button" className="botonIcono botonIcono--sutil" title="Estadísticas (Próximamente)" style={{cursor: 'default', opacity: 0.5}}>
                <BarChart2 size={16} className="textoApagado" />
            </button>

            {/* Actividad / Chat */}
            <button type="button" className={`botonIcono ${chatVisible && tieneMensajesSinLeer ? 'textoActivo' : 'textoApagado'}`} onClick={toggleChatVisible} title={chatVisible ? 'Ocultar chat' : 'Mostrar chat e historial'} style={{cursor: 'pointer'}}>
                {tieneMensajesSinLeer ? (
                    <div style={{position: 'relative'}}>
                        <Activity size={16} />
                        <span className="indicadorBadge" />
                    </div>
                ) : (
                    <Activity size={16} />
                )}
            </button>
        </div>
    );

    /* Boton del encabezado (Chat/Historial) */
    const botonChat = modoEdicion ? (
        <button
            type="button"
            style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: chatVisible || (tieneMensajesSinLeer && !chatVisible) ? 'var(--dashboard-textoActivo)' : 'var(--dashboard-textoApagado)',
                display: 'flex',
                alignItems: 'center',
                padding: '4px',
                transition: 'color 0.2s',
                position: 'relative'
            }}
            onClick={toggleChatVisible}
            title={chatVisible ? 'Ocultar chat' : `Mostrar chat${tieneMensajesSinLeer ? ' (mensajes sin leer)' : ''}`}>
            {chatVisible ? <MessageSquareOff size={18} /> : <MessageSquare size={18} />}
            {tieneMensajesSinLeer && !chatVisible && (
                <span
                    style={{
                        position: 'absolute',
                        top: '2px',
                        right: '2px',
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--dashboard-estadoAlta)'
                    }}
                />
            )}
        </button>
    ) : null;

    return (
        <Modal estaAbierto={estaAbierto} onCerrar={manejarCerrarConGuardado} titulo={modoEdicion ? nombre : 'Nuevo Proyecto'} claseExtra={claseModal} accionesEncabezado={accionesHeader} ocultarBotonCerrar={true}>
            {mostrarChat ? (
                <>
                    {/* Pestañas para móvil */}
                    <div className="panelConfiguracionPestanas">
                        <button type="button" className={`panelConfiguracionPestana ${pestanaActiva === 'configuracion' ? 'panelConfiguracionPestana--activa' : ''}`} onClick={() => setPestanaActiva('configuracion')}>
                            Configuracion
                        </button>
                        <button type="button" className={`panelConfiguracionPestana ${pestanaActiva === 'chat' ? 'panelConfiguracionPestana--activa' : ''}`} onClick={() => setPestanaActiva('chat')}>
                            Chat / Historial
                        </button>
                    </div>

                    {/* Layout de 2 columnas */}
                    <div className={`panelConfiguracionDosColumnas ${!mostrarChatColumna ? 'panelConfiguracionDosColumnas--sinChat' : ''}`}>
                        {/* Columna Izquierda: Formulario */}
                        <div className={`panelConfiguracionColumnaIzquierda ${pestanaActiva === 'configuracion' ? 'panelConfiguracionColumnaIzquierda--activa' : ''}`}>
                            <div className="panelConfiguracionColumnaScroll">
                                <FormularioProyectoModerno
                                    nombre={nombre}
                                    onNombreChange={setNombre}
                                    descripcion={descripcion}
                                    onDescripcionChange={setDescripcion}
                                    icono={icono}
                                    colorIcono={colorIcono}
                                    onIconoChange={(nuevoIcono, nuevoColor) => {
                                        setIcono(nuevoIcono);
                                        setColorIcono(nuevoColor);
                                    }}
                                    prioridad={prioridad}
                                    onPrioridadChange={setPrioridad}
                                    urgencia={urgencia}
                                    onUrgenciaChange={setUrgencia}
                                    fechaLimite={fechaLimite}
                                    onFechaLimiteChange={setFechaLimite}
                                    errorNombre={errores.nombre}
                                    modoEdicion={true}
                                    participantes={participantes}
                                    companeros={companeros}
                                    onAgregarParticipante={onAgregarParticipante}
                                    onRemoverParticipante={onRemoverParticipante}
                                    onCambiarRolParticipante={onCambiarRolParticipante}
                                    puedeGestionarParticipantes={modoEdicion}
                                    adjuntos={adjuntos}
                                    onAdjuntosChange={setAdjuntos}
                                    // Tareas eliminadas de la vista
                                    hitos={hitos}
                                    onHitosChange={setHitos}
                                />
                            </div>
                            {/* Input de comentario cuando el chat esta oculto */}
                            {!mostrarChatColumna && proyecto && <PanelChatHistorial elementoId={proyecto.id} elementoTipo="proyecto" participantes={participantesChat} soloInput />}
                        </div>

                        {/* Columna Derecha: Chat e Historial */}
                        {mostrarChatColumna && <div className={`panelConfiguracionColumnaDerecha ${pestanaActiva === 'chat' ? 'panelConfiguracionColumnaDerecha--activa' : ''}`}>{proyecto && <PanelChatHistorial elementoId={proyecto.id} elementoTipo="proyecto" participantes={participantesChat} />}</div>}
                    </div>
                </>
            ) : (
                /* Modo simple para crear proyecto nuevo - Diseno moderno */
                <>
                    <div id="modal-proyecto-contenido" className="formularioHabito">
                        <FormularioProyectoModerno
                            nombre={nombre}
                            onNombreChange={setNombre}
                            descripcion={descripcion}
                            onDescripcionChange={setDescripcion}
                            icono={icono}
                            colorIcono={colorIcono}
                            onIconoChange={(nuevoIcono, nuevoColor) => {
                                setIcono(nuevoIcono);
                                setColorIcono(nuevoColor);
                            }}
                            prioridad={prioridad}
                            onPrioridadChange={setPrioridad}
                            urgencia={urgencia}
                            onUrgenciaChange={setUrgencia}
                            fechaLimite={fechaLimite}
                            onFechaLimiteChange={setFechaLimite}
                            errorNombre={errores.nombre}
                            modoEdicion={false}
                            adjuntos={adjuntos}
                            onAdjuntosChange={setAdjuntos}
                            hitos={hitos}
                            onHitosChange={setHitos}
                        />
                    </div>
                    <AccionesFormulario onCancelar={manejarCancelar} onGuardar={manejarGuardar} textoGuardar="Crear proyecto" />
                </>
            )}
        </Modal>
    );
}
