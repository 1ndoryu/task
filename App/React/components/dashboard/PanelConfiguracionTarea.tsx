/*
 * PanelConfiguracionTarea
 * Panel modal para configurar opciones avanzadas de una tarea
 *
 * Fase 9.4: Refactorizado para usar componentes modernos estilo Linear
 * - FormularioTareaModerno para el formulario principal
 * - usePanelChat para la gestión del panel de chat
 * - Fase 10.8.6: Removido PestanasModal (código muerto)
 */

import {useState, useEffect, useCallback, useRef} from 'react';
import type {Tarea, TareaConfiguracion, NivelPrioridad, NivelUrgencia, Participante, Proyecto, CompaneroEquipo, RolCompartido, DatosEdicionTarea} from '../../types/dashboard';
import {AccionesFormulario, Modal} from '../shared';
import {FormularioTareaModerno} from './tareas/FormularioTareaModerno';
import {PanelChatHistorial} from './PanelChatHistorial';
import {usePanelChat} from '../../hooks/usePanelChat';
import {useEsDispositivoMovil} from '../../hooks/useEsMovil';
import {Activity, BarChart2} from 'lucide-react';
import type {FrecuenciaHabito, Adjunto} from '../../types/dashboard';

export interface PanelConfiguracionTareaProps {
    tarea?: Tarea;
    estaAbierto: boolean;
    onCerrar: () => void;
    onGuardar: (configuracion: TareaConfiguracion, prioridad: NivelPrioridad | null, texto?: string, asignacion?: {asignadoA: number | null; asignadoANombre: string; asignadoAAvatar: string}, urgencia?: NivelUrgencia | null, tags?: string[]) => void;
    participantes?: Participante[];
    /* Gestión de participantes (Compartir) */
    companeros?: CompaneroEquipo[];
    onAgregarParticipante?: (usuarioId: number, rol: RolCompartido) => void;
    onRemoverParticipante?: (participanteId: number) => void;
    onCambiarRolParticipante?: (participanteId: number, nuevoRol: RolCompartido) => void;
    proyectos?: Proyecto[];
    onCambiarProyecto?: (proyectoId: number | undefined) => void;
    onToggleCompletado?: (completado: boolean) => void;
    /* Subtareas - Fase 14.9 */
    subtareas?: Tarea[];
    onCrearSubtarea?: (datos: DatosEdicionTarea) => void;
    onToggleSubtarea?: (id: number) => void;
    onEliminarSubtarea?: (id: number) => void;
    onConfigurarSubtarea?: (tarea: Tarea) => void;
    onEditarSubtarea?: (id: number, datos: DatosEdicionTarea) => void;
}

import {useAutoguardado} from '../../hooks/useAutoguardado';

export function PanelConfiguracionTarea({tarea, estaAbierto, onCerrar, onGuardar, participantes = [], companeros = [], onAgregarParticipante, onRemoverParticipante, onCambiarRolParticipante, proyectos = [], onCambiarProyecto, onToggleCompletado, subtareas, onCrearSubtarea, onToggleSubtarea, onEliminarSubtarea, onConfigurarSubtarea, onEditarSubtarea}: PanelConfiguracionTareaProps): JSX.Element | null {
    const modoEdicion = !!tarea;
    const esMovil = useEsDispositivoMovil();

    /* Estado local para edicion */
    const [texto, setTexto] = useState(tarea?.texto || '');
    const [descripcion, setDescripcion] = useState(tarea?.configuracion?.descripcion || '');
    const [prioridad, setPrioridad] = useState<NivelPrioridad | null>(tarea?.prioridad || null);
    const [urgencia, setUrgencia] = useState<NivelUrgencia | null>(tarea?.urgencia || null);
    const [fechaMaxima, setFechaMaxima] = useState<string>(tarea?.configuracion?.fechaMaxima || '');
    const [tieneRepeticion, setTieneRepeticion] = useState<boolean>(!!tarea?.configuracion?.repeticion);
    const [frecuencia, setFrecuencia] = useState<FrecuenciaHabito>({tipo: 'diario'});
    const [adjuntos, setAdjuntos] = useState<Adjunto[]>(tarea?.configuracion?.adjuntos || []);
    const [tags, setTags] = useState<string[]>(tarea?.tags || []);

    /* Estado para asignacion */
    const [asignadoA, setAsignadoA] = useState<number | null>(tarea?.asignadoA || null);
    const [asignadoANombre, setAsignadoANombre] = useState<string>(tarea?.asignadoANombre || '');
    const [asignadoAAvatar, setAsignadoAAvatar] = useState<string>(tarea?.asignadoAAvatar || '');

    /* Estado local para proyecto y completado */
    const [proyectoIdLocal, setProyectoIdLocal] = useState<number | undefined>(tarea?.proyectoId);
    const [completadoLocal, setCompletadoLocal] = useState<boolean>(tarea?.completado ?? false);

    /* Removido: Estado de pestañas móvil (código muerto - Fase 10.8.6) */

    /* Hook para panel de chat */
    const {chatVisible, toggleChat, tieneMensajesSinLeer, participantesChat, mostrarChatColumna} = usePanelChat({
        elementoId: tarea?.id,
        elementoTipo: 'tarea',
        participantes,
        habilitado: modoEdicion
    });

    /* Campos actuales para deteccion de cambios */
    const camposActuales = {
        texto,
        descripcion,
        prioridad,
        urgencia,
        fechaMaxima,
        tieneRepeticion,
        frecuencia,
        adjuntos,
        asignadoA,
        tags
    };

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
        } else {
            /* Explícitamente marcar que no hay repetición para que se borre al guardar */
            configuracion.repeticion = undefined;
        }

        configuracion.adjuntos = adjuntos;

        const asignacion = {
            asignadoA,
            asignadoANombre,
            asignadoAAvatar
        };

        onGuardar(configuracion, prioridad, texto.trim(), asignacion, urgencia, tags);

        /*
         * Forzamos el cierre del panel después de guardar.
         * En edición estilo Linear, el guardado final ocurre al cerrar.
         * Si es creación, el botón de guardado también debe cerrar el panel.
         */
        onCerrar();
    }, [fechaMaxima, descripcion, tieneRepeticion, frecuencia, adjuntos, asignadoA, asignadoANombre, asignadoAAvatar, prioridad, texto, urgencia, tags, onGuardar, onCerrar]);

    /* Hook de autoguardado */
    const {guardarEstadoInicial, manejarCerrarConGuardado} = useAutoguardado({
        camposActuales,
        onGuardar: manejarGuardar,
        onCerrar,
        validar: () => texto.trim().length > 0
    });

    /* Ref para evitar loops infinitos en useEffect */
    const lastTareaIdRef = useRef<number | undefined>(undefined);

    /* Sincronizar estado cuando cambia la tarea */
    useEffect(() => {
        /* Si el ID es el mismo que ya procesamos, ignorar (evita loops) */
        if (tarea?.id === lastTareaIdRef.current) return;
        lastTareaIdRef.current = tarea?.id;

        if (tarea) {
            setTexto(tarea.texto);
            setDescripcion(tarea.configuracion?.descripcion || '');
            setPrioridad(tarea.prioridad || null);
            setUrgencia(tarea.urgencia || null);
            setFechaMaxima(tarea.configuracion?.fechaMaxima || '');
            setTieneRepeticion(!!tarea.configuracion?.repeticion);

            let nuevaFrecuencia: FrecuenciaHabito = {tipo: 'diario'};
            /* Convertir RepeticionTarea a FrecuenciaHabito */
            if (tarea.configuracion?.repeticion) {
                const {intervalo, diasSemana} = tarea.configuracion.repeticion;
                if (diasSemana && diasSemana.length > 0) {
                    nuevaFrecuencia = {tipo: 'diasEspecificos', diasSemana};
                } else if (intervalo === 1) {
                    nuevaFrecuencia = {tipo: 'diario'};
                } else if (intervalo === 7) {
                    nuevaFrecuencia = {tipo: 'semanal'};
                } else {
                    nuevaFrecuencia = {tipo: 'cadaXDias', cadaDias: intervalo};
                }
            }
            setFrecuencia(nuevaFrecuencia);

            setAdjuntos(tarea.configuracion?.adjuntos || []);
            setAsignadoA(tarea.asignadoA || null);
            setAsignadoANombre(tarea.asignadoANombre || '');
            setAsignadoAAvatar(tarea.asignadoAAvatar || '');
            setProyectoIdLocal(tarea.proyectoId);
            setCompletadoLocal(tarea.completado);
            setTags(tarea.tags || []);

            /* Guardar estado inicial para detectar cambios */
            guardarEstadoInicial({
                texto: tarea.texto,
                descripcion: tarea.configuracion?.descripcion || '',
                prioridad: tarea.prioridad || null,
                urgencia: tarea.urgencia || null,
                fechaMaxima: tarea.configuracion?.fechaMaxima || '',
                tieneRepeticion: !!tarea.configuracion?.repeticion,
                frecuencia: nuevaFrecuencia,
                adjuntos: tarea.configuracion?.adjuntos || [],
                asignadoA: tarea.asignadoA || null,
                tags: tarea.tags || []
            });
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
            setTags([]);

            /* No llamamos a guardarEstadoInicial aqui porque es modo creacion */
        }
    }, [tarea?.id]);

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

    /*
     * Header Icons (similar a ModalProyecto)
     * Fase 10.8.11: En móvil no mostramos estos iconos,
     * el chat se muestra inline al final del modal
     */
    const accionesHeader =
        modoEdicion && !esMovil ? (
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
        <Modal estaAbierto={estaAbierto} onCerrar={manejarCerrarConGuardado} titulo={modoEdicion ? 'Modificar tarea' : 'Nueva tarea'} claseExtra={claseModal} accionesEncabezado={accionesHeader} ocultarBotonCerrar={modoEdicion}>
            {modoEdicion ? (
                <>
                    {/* Layout de 2 columnas (en móvil solo se muestra configuración) */}
                    <div className={`panelConfiguracionDosColumnas ${!mostrarChatColumna ? 'panelConfiguracionDosColumnas--sinChat' : ''}`}>
                        {/* Columna Izquierda: Formulario */}
                        <div className="panelConfiguracionColumnaIzquierda panelConfiguracionColumnaIzquierda--activa">
                            <div className="panelConfiguracionColumnaScroll">
                                <FormularioTareaModerno
                                    texto={texto}
                                    onTextoChange={setTexto}
                                    descripcion={descripcion}
                                    onDescripcionChange={setDescripcion}
                                    completado={completadoLocal}
                                    onCompletadoChange={onToggleCompletado ? manejarCambioCompletado : undefined}
                                    prioridad={prioridad}
                                    onPrioridadChange={setPrioridad}
                                    urgencia={urgencia}
                                    onUrgenciaChange={setUrgencia}
                                    fechaLimite={fechaMaxima}
                                    onFechaLimiteChange={setFechaMaxima}
                                    proyectoId={proyectoIdLocal}
                                    proyectos={proyectos}
                                    onProyectoChange={onCambiarProyecto ? manejarCambioProyecto : undefined}
                                    tieneRepeticion={tieneRepeticion}
                                    onTieneRepeticionChange={setTieneRepeticion}
                                    frecuencia={frecuencia}
                                    onFrecuenciaChange={setFrecuencia}
                                    participantes={participantes}
                                    asignadoA={asignadoA}
                                    asignadoANombre={asignadoANombre}
                                    asignadoAAvatar={asignadoAAvatar}
                                    onAsignacionChange={participantes.length > 0 ? manejarAsignacion : undefined}
                                    companeros={companeros}
                                    onAgregarParticipante={onAgregarParticipante}
                                    onRemoverParticipante={onRemoverParticipante}
                                    onCambiarRolParticipante={onCambiarRolParticipante}
                                    adjuntos={adjuntos}
                                    onAdjuntosChange={setAdjuntos}
                                    tags={tags}
                                    onTagsChange={setTags}
                                    modoEdicion={true}
                                    /* Subtareas */
                                    tareaId={tarea.id}
                                    subtareas={subtareas}
                                    onCrearSubtarea={onCrearSubtarea}
                                    onToggleSubtarea={onToggleSubtarea}
                                    onEliminarSubtarea={onEliminarSubtarea}
                                    onConfigurarSubtarea={onConfigurarSubtarea}
                                    onEditarSubtarea={onEditarSubtarea}
                                    esSubtarea={!!tarea.parentId}
                                />

                                {/* Fase 10.8.11: Chat inline en móvil */}
                                {esMovil && tarea && (
                                    <div className="chatInlineMovil">
                                        <PanelChatHistorial elementoId={tarea.id} elementoTipo="tarea" participantes={participantesChat} compacto />
                                    </div>
                                )}
                            </div>
                            {/* Input de comentario cuando el chat esta oculto (solo desktop) */}
                            {!esMovil && !mostrarChatColumna && tarea && <PanelChatHistorial elementoId={tarea.id} elementoTipo="tarea" participantes={participantesChat} soloInput />}
                        </div>

                        {/* Columna Derecha: Chat e Historial (oculto en móvil) */}
                        {mostrarChatColumna && tarea && (
                            <div className="panelConfiguracionColumnaDerecha panelConfiguracionColumnaDerecha--activa ocultarEnMovil">
                                <PanelChatHistorial elementoId={tarea.id} elementoTipo="tarea" participantes={participantesChat} />
                            </div>
                        )}
                    </div>
                </>
            ) : (
                /* Modo creación simple */
                <>
                    <div id="panel-tarea-contenido" className="formularioHabito">
                        <FormularioTareaModerno texto={texto} onTextoChange={setTexto} descripcion={descripcion} onDescripcionChange={setDescripcion} completado={false} prioridad={prioridad} onPrioridadChange={setPrioridad} urgencia={urgencia} onUrgenciaChange={setUrgencia} fechaLimite={fechaMaxima} onFechaLimiteChange={setFechaMaxima} tieneRepeticion={tieneRepeticion} onTieneRepeticionChange={setTieneRepeticion} frecuencia={frecuencia} onFrecuenciaChange={setFrecuencia} adjuntos={adjuntos} onAdjuntosChange={setAdjuntos} tags={tags} onTagsChange={setTags} modoEdicion={false} asignadoA={null} asignadoANombre="" asignadoAAvatar="" />
                    </div>
                    <AccionesFormulario onCancelar={onCerrar} onGuardar={manejarGuardar} textoGuardar="Crear tarea" />
                </>
            )}
        </Modal>
    );
}
