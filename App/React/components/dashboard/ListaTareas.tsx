/*
 * ListaTareas
 * Componente para mostrar la lista de tareas pendientes
 * Responsabilidad única: renderizar tareas con checkbox, input de creación, edición inline y acciones
 */

import {useMemo} from 'react';
import {Reorder} from 'framer-motion';
import {CheckSquare} from 'lucide-react';
import type {Tarea, DatosEdicionTarea, Proyecto, Participante} from '../../types/dashboard';
import {esTareaHabito} from '../../types/dashboard';
import {TareaItem} from './TareaItem';
import {InputNuevaTarea} from './InputNuevaTarea';
import {PanelConfiguracionTarea} from './PanelConfiguracionTarea';
import {ModalMoverTarea} from './ModalMoverTarea';
import {DashboardPanel} from '../shared/DashboardPanel';
import {EstadoVacio} from '../shared/EstadoVacio';
import {useMensajesNoLeidos} from '../../hooks/useMensajes';

// Hooks extraídos
import {useListaTareasLogica} from '../../hooks/dashboard/useListaTareasLogica';
import {useTareaOrdenamiento} from '../../hooks/dashboard/useTareaOrdenamiento';

// Componentes extraídos
import {TareaConColapsador} from './lista-tareas/TareaConColapsador';

interface ListaTareasProps {
    tareas: Tarea[];
    proyectoId?: number;
    onToggleTarea?: (id: number) => void;
    onCrearTarea?: (datos: DatosEdicionTarea) => void;
    onEditarTarea?: (id: number, datos: DatosEdicionTarea) => void;
    onEliminarTarea?: (id: number) => void;
    onReordenarTareas?: (tareas: Tarea[]) => void;
    habilitarDrag?: boolean;
    proyectos?: Proyecto[];
    ocultarCompletadas?: boolean;
    ocultarBadgeProyecto?: boolean;
    onCompartirTarea?: (tarea: Tarea) => void;
    estaCompartida?: (tareaId: number) => boolean;
    obtenerParticipantes?: (tarea: Tarea) => Participante[];
    /* Callbacks para hábitos - Sincronizado con TablaHabitos (Fase UI/UX) */
    onEditarHabito?: (habitoId: number) => void;
    onEliminarHabito?: (habitoId: number) => void;
    onToggleHabito?: (habitoId: number) => void;
    onPosponerHabito?: (habitoId: number) => void;
    onPausarHabito?: (habitoId: number) => void;
    onActualizarHabito?: (habitoId: number, datos: any) => void;
    modoCompacto?: boolean;
    onConfigurarTarea?: (tarea: Tarea) => void;
    /* Callback para abrir modal de creación rápida (usado en estado vacío y botón añadir) */
    onAbrirModalCrear?: () => void;
}

export function ListaTareas({tareas, proyectoId, onToggleTarea, onCrearTarea, onEditarTarea, onEliminarTarea, onReordenarTareas, habilitarDrag = true, proyectos = [], ocultarCompletadas = false, ocultarBadgeProyecto = false, onCompartirTarea, estaCompartida, obtenerParticipantes, onEditarHabito, onEliminarHabito, onToggleHabito, onPosponerHabito, onPausarHabito, onActualizarHabito, modoCompacto = false, onConfigurarTarea, onAbrirModalCrear}: ListaTareasProps): JSX.Element {
    /* Filtros básicos */
    const pendientes = useMemo(() => tareas.filter(t => !t.completado), [tareas]);
    const completadas = useMemo(() => tareas.filter(t => t.completado), [tareas]);

    /* Lógica Principal y Estado */
    const {tareasExpandidas, setTareasExpandidas, tareaConfigurando, setTareaConfigurando, tareaMoviendo, setTareaMoviendo, toggleColapsar, abrirConfiguracion, guardarConfiguracion, handleIndent, handleOutdent, handleCrearNueva, handleMoverProyecto, obtenerSubtareasVisibles} = useListaTareasLogica({
        tareas,
        proyectoId,
        onEditarTarea,
        onCrearTarea,
        onConfigurarTarea,
        pendientes
    });

    /* Lógica de Ordenamiento (Drag & Drop) */
    const {tareaArrastrandoId, esGestoSubtarea, setEsGestoSubtarea, dragStartXRef, dragCurrentXRef, handleDragStart, handleDragEnd, handleReorder, UMBRAL_INDENT} = useTareaOrdenamiento({
        tareas,
        pendientes,
        completadas,
        onReordenarTareas,
        onEditarTarea,
        setTareasExpandidas
    });

    /* Datos calculados */
    const tareasPrincipalesPendientes = useMemo(() => pendientes.filter(t => !t.parentId && !esTareaHabito(t)), [pendientes]);
    const tareasHabitoPendientes = useMemo(() => pendientes.filter(t => esTareaHabito(t)), [pendientes]);

    // Mensajes no leídos
    const tareasIdsReales = useMemo(() => tareas.filter(t => t.id > 0).map(t => t.id), [tareas]);
    const {noLeidos: mensajesNoLeidosPorTarea} = useMensajesNoLeidos('tarea', tareasIdsReales);

    /* Wrapper para crear tarea con proyecto */
    const crearTareaConProyecto = (datos: DatosEdicionTarea) => {
        onCrearTarea?.({
            ...datos,
            proyectoId: proyectoId
        });
    };

    /* Renderizado de Tarea Individual (Wrapper común) */
    const renderTareaItem = (tarea: Tarea, esSubtarea: boolean) => (
        <TareaConColapsador
            key={`wrapper-${tarea.id}`}
            tarea={tarea}
            esSubtarea={esSubtarea}
            tareas={tareas}
            tareasExpandidas={tareasExpandidas}
            onToggleExpandir={toggleColapsar}
            proyectos={proyectos}
            modoCompacto={modoCompacto}
            ocultarBadgeProyecto={ocultarBadgeProyecto}
            mensajesNoLeidos={mensajesNoLeidosPorTarea[tarea.id] || 0}
            estaCompartida={estaCompartida?.(tarea.id) ?? false}
            // Acciones
            onToggleTarea={onToggleTarea}
            onEditarTarea={onEditarTarea}
            onEliminarTarea={onEliminarTarea}
            onIndent={handleIndent}
            onOutdent={handleOutdent}
            onCrearNueva={handleCrearNueva}
            onConfigurar={abrirConfiguracion}
            onMoverProyecto={t => setTareaMoviendo(t)}
            onCompartir={onCompartirTarea}
            // Hábitos - Sincronizado con TablaHabitos
            onEditarHabito={onEditarHabito}
            onEliminarHabito={onEliminarHabito}
            onToggleHabito={onToggleHabito}
            onPosponerHabito={onPosponerHabito}
            onPausarHabito={onPausarHabito}
            onActualizarHabito={onActualizarHabito}
        />
    );

    return (
        <DashboardPanel id="lista-tareas">
            {/* Estado vacío cuando no hay tareas */}
            {tareas.length === 0 ? (
                <EstadoVacio icono={<CheckSquare size={32} />} mensaje="No hay tareas pendientes" descripcion="Crea tu primera tarea para empezar" textoBoton="+ Crear tarea" onAccion={onAbrirModalCrear ?? (() => onCrearTarea?.({texto: 'Nueva tarea'}))} />
            ) : (
                <>
                    {habilitarDrag ? (
                        <>
                            <Reorder.Group axis="y" values={tareasPrincipalesPendientes} onReorder={handleReorder} className="listaTareasPendientes">
                                {tareasPrincipalesPendientes.map(tareaPadre => {
                                    const subtareasVisibles = obtenerSubtareasVisibles(tareaPadre.id);

                                    return (
                                        <Reorder.Item
                                            key={tareaPadre.id}
                                            value={tareaPadre}
                                            as="div"
                                            style={{position: 'relative'}}
                                            className={`tareaPadreReorder ${tareaArrastrandoId === tareaPadre.id ? 'tareaPadreReorderArrastrando' : ''} ${tareaArrastrandoId === tareaPadre.id && esGestoSubtarea ? 'tareaPadreReorderGestoSubtarea' : ''}`}
                                            dragListener={true}
                                            onPointerDown={e => handleDragStart(tareaPadre.id, e)}
                                            onDragEnd={handleDragEnd}
                                            onDrag={(_, info) => {
                                                dragCurrentXRef.current = dragStartXRef.current + info.offset.x;
                                                const nuevoEsGesto = info.offset.x > UMBRAL_INDENT;
                                                if (nuevoEsGesto !== esGestoSubtarea) {
                                                    setEsGestoSubtarea(nuevoEsGesto);
                                                }
                                            }}>
                                            {tareaArrastrandoId === tareaPadre.id && esGestoSubtarea && <div className="tareaDropIndicador tareaDropIndicadorSubtarea tareaDropIndicadorActivo" style={{top: 0}} />}

                                            {renderTareaItem(tareaPadre, false)}

                                            {subtareasVisibles.map(subtarea => (
                                                <div key={subtarea.id} className="subtareaContenedor">
                                                    {renderTareaItem(subtarea, true)}
                                                </div>
                                            ))}
                                        </Reorder.Item>
                                    );
                                })}
                            </Reorder.Group>

                            {tareasHabitoPendientes.map(tareaHabito => {
                                const subtareasVisibles = obtenerSubtareasVisibles(tareaHabito.id);
                                return (
                                    <div key={tareaHabito.id} className="tareaHabitoContenedor">
                                        {renderTareaItem(tareaHabito, false)}
                                        {subtareasVisibles.map(subtarea => (
                                            <div key={subtarea.id} className="subtareaContenedor">
                                                {renderTareaItem(subtarea, true)}
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}
                        </>
                    ) : (
                        <div className="listaTareasPendientes">
                            {pendientes
                                .filter(t => !t.parentId)
                                .map(tareaPadre => {
                                    const subtareasVisibles = obtenerSubtareasVisibles(tareaPadre.id);
                                    return (
                                        <div key={tareaPadre.id} className="tareaPadreContenedor">
                                            {renderTareaItem(tareaPadre, false)}
                                            {subtareasVisibles.map(subtarea => (
                                                <div key={subtarea.id} className="subtareaContenedor">
                                                    {renderTareaItem(subtarea, true)}
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })}
                        </div>
                    )}

                    {pendientes.length > 0 && completadas.length > 0 && !ocultarCompletadas && <div className="listaTareasSeparador" />}

                    {!ocultarCompletadas && completadas.map(tarea => <TareaItem key={tarea.id} tarea={tarea} esSubtarea={!!tarea.parentId} onToggle={() => onToggleTarea?.(tarea.id)} onEditar={datos => onEditarTarea?.(tarea.id, datos)} onEliminar={() => onEliminarTarea?.(tarea.id)} onConfigurar={() => abrirConfiguracion(tarea.id)} nombreProyecto={tarea.proyectoId ? proyectos?.find(p => p.id === tarea.proyectoId)?.nombre : undefined} soloIconoProyecto={ocultarBadgeProyecto} onMoverProyecto={() => setTareaMoviendo(tarea)} onCompartir={() => onCompartirTarea?.(tarea)} estaCompartida={estaCompartida?.(tarea.id) ?? false} mensajesNoLeidos={mensajesNoLeidosPorTarea[tarea.id] || 0} modoCompacto={modoCompacto} />)}

                    {onCrearTarea && <InputNuevaTarea onCrear={crearTareaConProyecto} onAbrirModalCrear={onAbrirModalCrear} />}
                </>
            )}

            {tareaConfigurando && (
                <PanelConfiguracionTarea
                    tarea={tareaConfigurando}
                    estaAbierto={true}
                    onCerrar={() => setTareaConfigurando(null)}
                    onGuardar={guardarConfiguracion}
                    participantes={obtenerParticipantes ? obtenerParticipantes(tareaConfigurando) : []}
                    proyectos={proyectos}
                    onCambiarProyecto={nuevoProyectoId => {
                        if (onEditarTarea) {
                            onEditarTarea(tareaConfigurando.id, {proyectoId: nuevoProyectoId, parentId: undefined} as any);
                        }
                    }}
                    onToggleCompletado={completado => {
                        if (completado !== tareaConfigurando.completado) {
                            onToggleTarea?.(tareaConfigurando.id);
                            setTareaConfigurando({...tareaConfigurando, completado});
                        }
                    }}
                />
            )}

            <ModalMoverTarea estaAbierto={!!tareaMoviendo} onCerrar={() => setTareaMoviendo(null)} onMover={handleMoverProyecto} proyectos={proyectos} proyectoActualId={tareaMoviendo?.proyectoId} />
        </DashboardPanel>
    );
}
