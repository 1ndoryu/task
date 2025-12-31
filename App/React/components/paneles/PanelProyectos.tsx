/*
 * PanelProyectos
 * Componente que renderiza el panel de proyectos
 * Responsabilidad única: renderizar la lista de proyectos con sus controles
 */

import {useState} from 'react';
import {Folder, ArrowUpDown, Plus, Settings} from 'lucide-react';
import {SeccionEncabezado, ListaProyectos} from '../dashboard';
import {SelectorBadge} from '../shared/SelectorBadge';
import type {Proyecto, Tarea} from '../../types/dashboard';
import type {ConfiguracionProyectos} from '../../hooks/useConfiguracionProyectos';

interface PanelProyectosProps {
    proyectos: Proyecto[];
    tareas: Tarea[];
    configuracion: ConfiguracionProyectos;
    opcionesOrdenProyectos: Array<{id: string; etiqueta: string; descripcion: string}>;
    onAbrirModalCrearProyecto: () => void;
    onAbrirModalEditarProyecto: (proyecto: Proyecto) => void;
    onAbrirModalConfigProyectos: () => void;
    onEliminarProyecto: (id: number) => void;
    onCambiarEstadoProyecto: (id: number, estado: 'activo' | 'completado' | 'pausado') => void;
    onCambiarOrdenProyectos: (orden: any) => void;
    onCompartirProyecto: (proyecto: Proyecto) => void;
    estaCompartido: (id: number) => boolean;
    onToggleTarea: (id: number) => void;
    onCrearTarea: (datos: any) => void;
    onEditarTarea: (id: number, datos: any) => void;
    onEliminarTarea: (id: number) => void;
    onReordenarTareas: (tareas: Tarea[]) => void;
    renderHandleArrastre: (titulo?: string) => JSX.Element;
    handleMinimizar: JSX.Element;
    modoCompacto?: boolean;
}

export function PanelProyectos({proyectos, tareas, configuracion, opcionesOrdenProyectos, onAbrirModalCrearProyecto, onAbrirModalEditarProyecto, onAbrirModalConfigProyectos, onEliminarProyecto, onCambiarEstadoProyecto, onCambiarOrdenProyectos, onCompartirProyecto, estaCompartido, onToggleTarea, onCrearTarea, onEditarTarea, onEliminarTarea, onReordenarTareas, renderHandleArrastre, handleMinimizar, modoCompacto = false}: PanelProyectosProps): JSX.Element {
    /* Estado local para el proyecto seleccionado/expandido */
    const [proyectoSeleccionadoId, setProyectoSeleccionadoId] = useState<number | null>(null);

    return (
        <>
            <SeccionEncabezado
                icono={null}
                titulo={renderHandleArrastre('Proyectos') as any}
                variante="panelHeader"
                acciones={
                    <>
                        <SelectorBadge opciones={opcionesOrdenProyectos} valorActual={configuracion.ordenDefecto} onChange={valor => onCambiarOrdenProyectos(valor as any)} icono={<ArrowUpDown size={12} />} titulo="Ordenar proyectos" soloIcono={true} />
                        <button className="selectorBadgeBoton selectorBadgeBoton--soloIcono" onClick={onAbrirModalCrearProyecto} title="Nuevo Proyecto">
                            <span className="selectorBadgeIcono">
                                <Plus size={12} />
                            </span>
                        </button>
                        <button className="selectorBadgeBoton selectorBadgeBoton--soloIcono" onClick={onAbrirModalConfigProyectos} title="Configuración">
                            <span className="selectorBadgeIcono">
                                <Settings size={12} />
                            </span>
                        </button>
                        {handleMinimizar}
                    </>
                }
            />
            <ListaProyectos proyectos={proyectos} tareas={tareas} onCrearProyecto={onAbrirModalCrearProyecto} onSeleccionarProyecto={setProyectoSeleccionadoId} proyectoSeleccionadoId={proyectoSeleccionadoId} onEditarProyecto={onAbrirModalEditarProyecto} onEliminarProyecto={onEliminarProyecto} onCambiarEstadoProyecto={onCambiarEstadoProyecto} onCompartirProyecto={onCompartirProyecto} estaCompartido={estaCompartido} onToggleTarea={onToggleTarea} onCrearTarea={onCrearTarea} onEditarTarea={onEditarTarea} onEliminarTarea={onEliminarTarea} onReordenarTareas={onReordenarTareas} ocultarCompletados={configuracion.ocultarCompletados} ocultarTareasCompletadas={configuracion.ocultarTareasCompletadas} ordenDefecto={configuracion.ordenDefecto} mostrarProgreso={configuracion.mostrarProgreso} modoCompacto={modoCompacto} />
        </>
    );
}
