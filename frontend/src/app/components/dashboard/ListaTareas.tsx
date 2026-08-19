/*
 * ListaTareas
 * Componente para mostrar la lista de tareas pendientes
 * Responsabilidad única: renderizar tareas con checkbox, input de creación, edición inline y acciones
 * Lógica extraída a useListaTareas hook wrapper
 * [H-F13-01] El contrato de props vive en lista-tareas/ListaTareasProps.ts y el
 * cableado de cada fila en lista-tareas/TareaListaItem.tsx; aquí queda la
 * composición (estado vacío, grupos, drag, modales y menú masivo).
 */

import {Reorder} from 'framer-motion';
import {CheckSquare} from 'lucide-react';
import type {Tarea, GrupoTareas} from '../../types/dashboard';
import {TareaItem} from './TareaItem';
import {InputNuevaTarea} from './InputNuevaTarea';
import {PanelConfiguracionTarea} from './PanelConfiguracionTarea';
import {ModalMoverTarea} from './ModalMoverTarea';
import {DashboardPanel} from '../shared/DashboardPanel';
import {EstadoVacio} from '../shared/EstadoVacio';
import {MenuAccionesMasivas} from './lista-tareas/MenuAccionesMasivas';
import {GrupoTareasHeader} from './lista-tareas/GrupoTareasHeader';
import {TareaReorderItem} from './lista-tareas/TareaReorderItem';
import {TareaListaItem} from './lista-tareas/TareaListaItem';
import type {ListaTareasProps} from './lista-tareas/ListaTareasProps';
import {useListaTareas} from '../../hooks/dashboard/useListaTareas';
import {useHabitosStore} from '../../stores/habitosStore';

export function ListaTareas(props: ListaTareasProps): JSX.Element {
    const {
        tareas, proyectoId, onToggleTarea, onCrearTarea, onEditarTarea, onEliminarTarea,
        onReordenarTareas, habilitarDrag = true, proyectos = [], ocultarCompletadas = false,
        ocultarBadgeProyecto = false, ocultarSubtareasAutomaticamente = false,
        onCompartirTarea, estaCompartida, obtenerParticipantes,
        onEditarHabito, onEliminarHabito, onToggleHabito, onPosponerHabito,
        onPosponerHabitoConTiempo, onPausarHabito, onActualizarHabito,
        onToggleSubHabito, onEliminarSubHabito, onPosponerSubHabitoConTiempo,
        onActualizarSubHabito, onConfigurarSubHabito, modoCompacto = false, onConfigurarTarea,
        onAbrirModalCrear, onAbrirModalCrearHabito, ocultarPlaceholderVacio = false,
        onReordenarHabitos
    } = props;

    const habitos = useHabitosStore(state => state.habitos);
    const {
        pendientes, completadas,
        estaSeleccionada, manejarSeleccionMultiple, manejarClickDerechoLista,
        modoSeleccionActivo, menuPosicion, ocultarMenu, limpiarSeleccion,
        seccionesActivas, gruposOrdenados, manejarAgrupar,
        tareasExpandidas, tareaConfigurando, setTareaConfigurando,
        tareaMoviendo, setTareaMoviendo,
        toggleColapsar, abrirConfiguracion, guardarConfiguracion,
        handleIndent, handleOutdent, handleCrearNueva,
        handleMoverProyecto, obtenerSubtareasVisibles,
        tareaArrastrandoId, esGestoSubtarea, setEsGestoSubtarea,
        dragStartXRef, dragCurrentXRef,
        handleDragStart, handleDragEnd, handleReorder,
        UMBRAL_INDENT, seArrastroRef,
        tareasPrincipalesPendientes,
        tareasSinGrupo, tareasPorGrupo,
        mensajesNoLeidosPorTarea,
        crearTareaConProyecto
    } = useListaTareas({
        tareas, proyectoId, onEditarTarea, onCrearTarea, onEliminarTarea,
        onReordenarTareas, onConfigurarTarea, onToggleTarea,
        ocultarSubtareasAutomaticamente, onReordenarHabitos
    });

    /* [H-F13-01] Cableado compartido de fila: una sola construcción para las
     * 3 ramas que renderizan tareas (grupos, drag y sin drag). */
    const estadoFila = {
        tareas: pendientes,
        tareasExpandidas,
        onToggleExpandir: toggleColapsar,
        estaSeleccionada,
        manejarSeleccionMultiple,
        modoSeleccionActivo,
        abrirConfiguracion,
        setTareaMoviendo,
        handleIndent,
        handleOutdent,
        handleCrearNueva,
        mensajesNoLeidosPorTarea,
        suprimirClickRef: seArrastroRef
    };

    /* Renderizado de Tarea Individual (Wrapper común) */
    const renderTareaItem = (tarea: Tarea, esSubtarea: boolean) => (
        <TareaListaItem
            key={`wrapper-${tarea.id}`}
            tarea={tarea}
            esSubtarea={esSubtarea}
            listaProps={props}
            estado={estadoFila}
        />
    );

    /* Función auxiliar para renderizar tareas de un grupo con sus subtareas */
    const renderTareasGrupo = (tareasDelGrupo: Tarea[]) => (
        <>
            {tareasDelGrupo.map(tareaPadre => {
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
        </>
    );

    return (
        <DashboardPanel id="lista-tareas" onContextMenu={manejarClickDerechoLista}>
            {/* Estado vacío cuando no hay tareas (ocultar en proyectos expandidos) */}
            {tareas.length === 0 && !ocultarPlaceholderVacio ? (
                <EstadoVacio icono={<CheckSquare size={32} />} mensaje="No hay tareas pendientes" descripcion="Crea tu primera tarea para empezar" textoBoton="+ Crear tarea" onAccion={onAbrirModalCrear ?? (() => onCrearTarea?.({texto: 'Nueva tarea'}))} />
            ) : tareas.length > 0 ? (
                <>
                    {/* Renderizar grupos cuando las secciones están activas */}
                    {seccionesActivas && gruposOrdenados.length > 0 && (
                        <div className="listaTareasGrupos">
                            {gruposOrdenados.map((grupo: GrupoTareas) => {
                                const tareasDelGrupo = tareasPorGrupo.get(grupo.id) || [];
                                return (
                                    <div key={grupo.id} className="grupoTareasContenedor">
                                        <GrupoTareasHeader grupo={grupo} cantidadTareas={tareasDelGrupo.length} />
                                        {!grupo.colapsado && tareasDelGrupo.length > 0 && <div className="grupoTareasListaInterna">{renderTareasGrupo(tareasDelGrupo)}</div>}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Tareas sin grupo (o todas si secciones desactivadas) */}
                    {habilitarDrag ? (
                        <>
                            <Reorder.Group
                                axis="y"
                                /* [218A-fix] Rastrear IDs primitivos (number) en vez de objetos Tarea.
                                 * Framer Motion usa Object.is (===) para emparejar items entre renders.
                                 * Cuando setTareas recrea los objetos con .map(), todas las referencias
                                 * cambian → FM pierde el tracking → drag se cancela (snapping back).
                                 * Los IDs primitivos son inmutables: 1 === 1 siempre, inmune a re-renders. */
                                values={(seccionesActivas ? tareasSinGrupo : tareasPrincipalesPendientes).map(t => t.id)}
                                onReorder={handleReorder}
                                className="listaTareasPendientes"
                                onContextMenu={manejarClickDerechoLista}
                                as="div"
                            >
                                {(seccionesActivas ? tareasSinGrupo : tareasPrincipalesPendientes).map(tareaPadre => (
                                    <TareaReorderItem
                                        key={tareaPadre.id}
                                        tareaPadre={tareaPadre}
                                        subtareasVisibles={obtenerSubtareasVisibles(tareaPadre.id)}
                                        tareaArrastrandoId={tareaArrastrandoId}
                                        esGestoSubtarea={esGestoSubtarea}
                                        UMBRAL_INDENT={UMBRAL_INDENT}
                                        seArrastroRef={seArrastroRef}
                                        dragStartXRef={dragStartXRef}
                                        dragCurrentXRef={dragCurrentXRef}
                                        setEsGestoSubtarea={setEsGestoSubtarea}
                                        handleDragStart={handleDragStart}
                                        handleDragEnd={handleDragEnd}
                                        renderTareaItem={renderTareaItem}
                                    />
                                ))}
                            </Reorder.Group>

                            {/* [044A-1] Hábitos ahora se incluyen dentro del Reorder.Group
                             * via tareasPrincipalesPendientes. Ya no se renderizan por separado.
                             * [218A-fix] IDs primitivos corrigen drag intermitente. */}
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

                    {!ocultarCompletadas && completadas.map(tarea => <TareaItem key={tarea.id} tarea={tarea} esSubtarea={!!tarea.parentId} onToggle={() => onToggleTarea?.(tarea.id)} onEditar={datos => onEditarTarea?.(tarea.id, datos)} onEliminar={() => onEliminarTarea?.(tarea.id)} onConfigurar={() => abrirConfiguracion(tarea.id)} nombreProyecto={tarea.proyectoId ? proyectos?.find(p => p.id === tarea.proyectoId)?.nombre : undefined} soloIconoProyecto={ocultarBadgeProyecto} onMoverProyecto={() => setTareaMoviendo(tarea)} onCompartir={() => onCompartirTarea?.(tarea)} estaCompartida={estaCompartida?.(tarea.id) ?? false} mensajesNoLeidos={mensajesNoLeidosPorTarea[tarea.id] || 0} modoCompacto={modoCompacto} tareas={tareas} habitos={habitos} />)}

                    {onCrearTarea && <InputNuevaTarea onCrear={crearTareaConProyecto} onAbrirModalCrear={onAbrirModalCrear} onAbrirModalCrearHabito={onAbrirModalCrearHabito} />}
                </>
            ) : (
                /* Tareas vacías dentro de proyecto: solo mostrar botón añadir */
                onCrearTarea && <InputNuevaTarea onCrear={crearTareaConProyecto} onAbrirModalCrear={onAbrirModalCrear} onAbrirModalCrearHabito={onAbrirModalCrearHabito} />
            )}

            {tareaConfigurando && (
                <PanelConfiguracionTarea
                    tarea={tareaConfigurando}
                    estaAbierto={true}
                    onCerrar={() => setTareaConfigurando(null)}
                    onGuardar={guardarConfiguracion}
                    tareas={tareas}
                    habitos={habitos}
                    participantes={obtenerParticipantes ? obtenerParticipantes(tareaConfigurando) : []}
                    proyectos={proyectos}
                    onCambiarProyecto={nuevoProyectoId => {
                        if (onEditarTarea) {
                            onEditarTarea(tareaConfigurando.id, {proyectoId: nuevoProyectoId, parentId: undefined});
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

            {/* Menú de acciones masivas - TAREA 3.1 */}
            {menuPosicion && (
                <MenuAccionesMasivas
                    posicionX={menuPosicion.x}
                    posicionY={menuPosicion.y}
                    onCerrar={ocultarMenu}
                    onEliminarTareas={ids => {
                        ids.forEach(id => onEliminarTarea?.(id));
                        limpiarSeleccion();
                    }}
                    onCambiarPrioridad={(ids, prioridad) => {
                        ids.forEach(id => onEditarTarea?.(id, {prioridad}));
                        limpiarSeleccion();
                    }}
                    onCambiarUrgencia={(ids, urgencia) => {
                        ids.forEach(id => onEditarTarea?.(id, {urgencia}));
                        limpiarSeleccion();
                    }}
                    onMoverProyecto={(ids, proyectoId) => {
                        ids.forEach(id => onEditarTarea?.(id, {proyectoId}));
                        limpiarSeleccion();
                    }}
                    onAgrupar={seccionesActivas ? manejarAgrupar : undefined}
                    proyectos={proyectos}
                />
            )}
        </DashboardPanel>
    );
}
