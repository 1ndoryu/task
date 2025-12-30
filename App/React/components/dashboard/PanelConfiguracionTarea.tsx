/*
 * PanelConfiguracionTarea
 * Panel modal para configurar opciones avanzadas de una tarea
 *
 * Fase 9.4: Refactorizado para usar componentes modernos estilo Linear
 * - FormularioTareaModerno para el formulario principal
 * - usePanelChat para la gestión del panel de chat
 * - PestanasModal para las pestañas responsive
 */

import {useState, useEffect, useCallback} from 'react';
import type {Tarea, TareaConfiguracion, NivelPrioridad, NivelUrgencia, Participante, Proyecto} from '../../types/dashboard';
import {AccionesFormulario, Modal, PestanasModal} from '../shared';
import type {PestanaId} from '../shared';
import {FormularioTareaModerno} from './tareas/FormularioTareaModerno';
import {PanelChatHistorial} from './PanelChatHistorial';
import {usePanelChat} from '../../hooks/usePanelChat';
import {MessageSquare, MessageSquareOff, Activity, BarChart2} from 'lucide-react';
import type {FrecuenciaHabito, Adjunto} from '../../types/dashboard';

export interface PanelConfiguracionTareaProps {
    tarea?: Tarea;
    estaAbierto: boolean;
    onCerrar: () => void;
    onGuardar: (configuracion: TareaConfiguracion, prioridad: NivelPrioridad | null, texto?: string, asignacion?: {asignadoA: number | null; asignadoANombre: string; asignadoAAvatar: string}, urgencia?: NivelUrgencia | null) => void;
    participantes?: Participante[];
    proyectos?: Proyecto[];
    onCambiarProyecto?: (proyectoId: number | undefined) => void;
    onToggleCompletado?: (completado: boolean) => void;
}

export function PanelConfiguracionTarea({tarea, estaAbierto, onCerrar, onGuardar, participantes = [], proyectos = [], onCambiarProyecto, onToggleCompletado}: PanelConfiguracionTareaProps): JSX.Element | null {
    const modoEdicion = !!tarea;

    /* Estado local para edicion */
    const [texto, setTexto] = useState(tarea?.texto || '');
    const [descripcion, setDescripcion] = useState(tarea?.configuracion?.descripcion || '');
    const [prioridad, setPrioridad] = useState<NivelPrioridad | null>(tarea?.prioridad || null);
    const [urgencia, setUrgencia] = useState<NivelUrgencia | null>(tarea?.urgencia || null);
    const [fechaMaxima, setFechaMaxima] = useState<string>(tarea?.configuracion?.fechaMaxima || '');
    const [tieneRepeticion, setTieneRepeticion] = useState<boolean>(!!tarea?.configuracion?.repeticion);
    const [frecuencia, setFrecuencia] = useState<FrecuenciaHabito>({tipo: 'diario'});
    const [adjuntos, setAdjuntos] = useState<Adjunto[]>(tarea?.configuracion?.adjuntos || []);

    /* Estado para asignacion */
    const [asignadoA, setAsignadoA] = useState<number | null>(tarea?.asignadoA || null);
    const [asignadoANombre, setAsignadoANombre] = useState<string>(tarea?.asignadoANombre || '');
    const [asignadoAAvatar, setAsignadoAAvatar] = useState<string>(tarea?.asignadoAAvatar || '');

    /* Estado local para proyecto y completado */
    const [proyectoIdLocal, setProyectoIdLocal] = useState<number | undefined>(tarea?.proyectoId);
    const [completadoLocal, setCompletadoLocal] = useState<boolean>(tarea?.completado ?? false);

    /* Estado para pestañas responsive */
    const [pestanaActiva, setPestanaActiva] = useState<PestanaId>('configuracion');

    /* Hook para panel de chat */
    const {chatVisible, toggleChat, tieneMensajesSinLeer, participantesChat, mostrarChatColumna} = usePanelChat({
        elementoId: tarea?.id,
        elementoTipo: 'tarea',
        participantes,
        habilitado: modoEdicion
    });

    /* Sincronizar estado cuando cambia la tarea */
    useEffect(() => {
        if (tarea) {
            setTexto(tarea.texto);
            setDescripcion(tarea.configuracion?.descripcion || '');
            setPrioridad(tarea.prioridad || null);
            setUrgencia(tarea.urgencia || null);
            setFechaMaxima(tarea.configuracion?.fechaMaxima || '');
            setTieneRepeticion(!!tarea.configuracion?.repeticion);

            /* Convertir RepeticionTarea a FrecuenciaHabito */
            if (tarea.configuracion?.repeticion) {
                const {intervalo, diasSemana} = tarea.configuracion.repeticion;
                if (diasSemana && diasSemana.length > 0) {
                    setFrecuencia({tipo: 'diasEspecificos', diasSemana});
                } else if (intervalo === 1) {
                    setFrecuencia({tipo: 'diario'});
                } else if (intervalo === 7) {
                    setFrecuencia({tipo: 'semanal'});
                } else {
                    setFrecuencia({tipo: 'cadaXDias', cadaDias: intervalo});
                }
            } else {
                setFrecuencia({tipo: 'diario'});
            }

            setAdjuntos(tarea.configuracion?.adjuntos || []);
            setAsignadoA(tarea.asignadoA || null);
            setAsignadoANombre(tarea.asignadoANombre || '');
            setAsignadoAAvatar(tarea.asignadoAAvatar || '');
            setProyectoIdLocal(tarea.proyectoId);
            setCompletadoLocal(tarea.completado);
        } else {
            /* Resetear si no hay tarea (modo creacion) */
            setTexto('');
            setDescripcion('');
            setPrioridad(null);
            setUrgencia(null);
            setFechaMaxima('');
            setTieneRepeticion(false);
            setFrecuencia({tipo: 'diario'});
            setAdjuntos([]);
            setAsignadoA(null);
            setAsignadoANombre('');
            setAsignadoAAvatar('');
        }
    }, [tarea?.id, estaAbierto]);

    /* Manejador de cambio de asignacion */
    const manejarAsignacion = useCallback((usuarioId: number | null, nombre: string, avatar: string) => {
        setAsignadoA(usuarioId);
        setAsignadoANombre(nombre);
        setAsignadoAAvatar(avatar);
    }, []);

    /* Manejador de cambio de proyecto */
    const manejarCambioProyecto = useCallback(
        (nuevoProyectoId: number | undefined) => {
            setProyectoIdLocal(nuevoProyectoId);
            onCambiarProyecto?.(nuevoProyectoId);
        },
        [onCambiarProyecto]
    );

    /* Manejador de cambio de estado completado */
    const manejarCambioCompletado = useCallback(
        (nuevoCompletado: boolean) => {
            setCompletadoLocal(nuevoCompletado);
            onToggleCompletado?.(nuevoCompletado);
        },
        [onToggleCompletado]
    );

    /* Guardar tarea */
    const manejarGuardar = useCallback(() => {
        const configuracion: TareaConfiguracion = {};

        if (fechaMaxima) {
            configuracion.fechaMaxima = fechaMaxima;
        }

        if (descripcion.trim()) {
            configuracion.descripcion = descripcion.trim();
        }

        if (tieneRepeticion) {
            const repeticion: any = {
                tipo: 'despuesCompletar',
                intervalo: 1
            };

            switch (frecuencia.tipo) {
                case 'diario':
                    repeticion.intervalo = 1;
                    break;
                case 'cadaXDias':
                    repeticion.intervalo = frecuencia.cadaDias || 2;
                    break;
                case 'semanal':
                    repeticion.intervalo = 7;
                    break;
                case 'diasEspecificos':
                    repeticion.intervalo = 1;
                    repeticion.diasSemana = frecuencia.diasSemana || [];
                    break;
                case 'mensual':
                    repeticion.intervalo = Math.floor(30 / (frecuencia.vecesAlMes || 1));
                    break;
            }

            configuracion.repeticion = repeticion;
        }

        configuracion.adjuntos = adjuntos;

        const asignacion = {
            asignadoA,
            asignadoANombre,
            asignadoAAvatar
        };

        onGuardar(configuracion, prioridad, texto.trim(), asignacion, urgencia);
        onCerrar();
    }, [fechaMaxima, descripcion, tieneRepeticion, frecuencia, adjuntos, asignadoA, asignadoANombre, asignadoAAvatar, prioridad, texto, urgencia, onGuardar, onCerrar]);

    /* Auto-guardado: al cerrar el modal, guardar si hay texto */
    const manejarCerrarConGuardado = useCallback(() => {
        if (texto.trim().length > 0) {
            manejarGuardar();
        } else {
            onCerrar();
        }
    }, [texto, manejarGuardar, onCerrar]);

    /* Header Icons (similar a ModalProyecto) */
    const accionesHeader = modoEdicion ? (
        <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
            {/* Estadisticas (Placeholder) */}
            <button type="button" className="botonIcono botonIcono--sutil" title="Estadísticas (Próximamente)" style={{cursor: 'default', opacity: 0.5}}>
                <BarChart2 size={16} className="textoApagado" />
            </button>

            {/* Actividad / Chat */}
            <button type="button" className={`botonIcono ${chatVisible && tieneMensajesSinLeer ? 'textoActivo' : 'textoApagado'}`} onClick={toggleChat} title={chatVisible ? 'Ocultar chat' : 'Mostrar chat e historial'} style={{cursor: 'pointer'}}>
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
    ) : undefined;

    /* Clase del modal */
    const claseModal = modoEdicion ? 'panelConfiguracionContenedor modalContenedor--expandido' : 'modalContenedor--moderno';

    return (
        <Modal estaAbierto={estaAbierto} onCerrar={manejarCerrarConGuardado} titulo={modoEdicion ? texto || 'Configurar Tarea' : 'Nueva Tarea'} claseExtra={claseModal} accionesEncabezado={accionesHeader} ocultarBotonCerrar={modoEdicion}>
            {modoEdicion ? (
                <>
                    {/* Pestañas para móvil */}
                    <PestanasModal pestanaActiva={pestanaActiva} onCambiar={setPestanaActiva} tieneNotificaciones={tieneMensajesSinLeer} />

                    {/* Layout de 2 columnas */}
                    <div className={`panelConfiguracionDosColumnas ${!mostrarChatColumna ? 'panelConfiguracionDosColumnas--sinChat' : ''}`}>
                        {/* Columna Izquierda: Formulario */}
                        <div className={`panelConfiguracionColumnaIzquierda ${pestanaActiva === 'configuracion' ? 'panelConfiguracionColumnaIzquierda--activa' : ''}`}>
                            <div className="panelConfiguracionColumnaScroll">
                                <FormularioTareaModerno texto={texto} onTextoChange={setTexto} descripcion={descripcion} onDescripcionChange={setDescripcion} completado={completadoLocal} onCompletadoChange={onToggleCompletado ? manejarCambioCompletado : undefined} prioridad={prioridad} onPrioridadChange={setPrioridad} urgencia={urgencia} onUrgenciaChange={setUrgencia} fechaLimite={fechaMaxima} onFechaLimiteChange={setFechaMaxima} proyectoId={proyectoIdLocal} proyectos={proyectos} onProyectoChange={onCambiarProyecto ? manejarCambioProyecto : undefined} tieneRepeticion={tieneRepeticion} onTieneRepeticionChange={setTieneRepeticion} frecuencia={frecuencia} onFrecuenciaChange={setFrecuencia} participantes={participantes} asignadoA={asignadoA} asignadoANombre={asignadoANombre} asignadoAAvatar={asignadoAAvatar} onAsignacionChange={participantes.length > 0 ? manejarAsignacion : undefined} adjuntos={adjuntos} onAdjuntosChange={setAdjuntos} modoEdicion={true} />
                            </div>
                            {/* Sin botones de acciones - auto-guardado */}
                        </div>

                        {/* Columna Derecha: Chat e Historial */}
                        {mostrarChatColumna && tarea && (
                            <div className={`panelConfiguracionColumnaDerecha ${pestanaActiva === 'chat' ? 'panelConfiguracionColumnaDerecha--activa' : ''}`}>
                                <PanelChatHistorial elementoId={tarea.id} elementoTipo="tarea" participantes={participantesChat} />
                            </div>
                        )}
                    </div>
                </>
            ) : (
                /* Modo creación simple */
                <>
                    <div id="panel-tarea-contenido" className="formularioHabito">
                        <FormularioTareaModerno texto={texto} onTextoChange={setTexto} descripcion={descripcion} onDescripcionChange={setDescripcion} completado={false} prioridad={prioridad} onPrioridadChange={setPrioridad} urgencia={urgencia} onUrgenciaChange={setUrgencia} fechaLimite={fechaMaxima} onFechaLimiteChange={setFechaMaxima} tieneRepeticion={tieneRepeticion} onTieneRepeticionChange={setTieneRepeticion} frecuencia={frecuencia} onFrecuenciaChange={setFrecuencia} adjuntos={adjuntos} onAdjuntosChange={setAdjuntos} modoEdicion={false} asignadoA={null} asignadoANombre="" asignadoAAvatar="" />
                    </div>
                    <AccionesFormulario onCancelar={onCerrar} onGuardar={manejarGuardar} textoGuardar="Crear tarea" />
                </>
            )}
        </Modal>
    );
}
