/*
 * PanelEjecucion
 * Componente que renderiza el panel de ejecución (tareas)
 * Responsabilidad única: renderizar la lista de tareas con sus controles
 * Nota: En móvil el header del panel se oculta via CSS (Fase 10.8.3)
 */

import {useState} from 'react';
import {ArrowUpDown, Plus, Settings, Maximize2} from 'lucide-react';
import {SeccionEncabezado, ListaTareas} from '../dashboard';
import {SelectorBadge, OverlayEnfoque} from '../shared';
import type {Tarea, Proyecto, Participante} from '../../types/dashboard';

interface OpcionFiltro {
    id: string;
    etiqueta: string;
    icono?: JSX.Element;
    descripcion: string;
}

interface PanelEjecucionProps {
    tareas: Tarea[];
    proyectos: Proyecto[];
    proyectoIdActual?: number;
    ocultarCompletadas: boolean;
    ocultarBadgeProyecto: boolean;
    modoOrden: string;
    valorFiltroActual: string;
    opcionesFiltro: OpcionFiltro[];
    opcionesOrdenTareas: Array<{id: string; etiqueta: string; descripcion: string}>;
    esOrdenManual: boolean;
    onAbrirModalNuevaTarea: () => void;
    onAbrirModalConfigTareas: () => void;
    onToggleTarea: (id: number) => void;
    onCrearTarea: (datos: any) => void;
    onEditarTarea: (id: number, datos: any) => void;
    onEliminarTarea: (id: number) => void;
    onReordenarTareas?: (tareas: Tarea[]) => void;
    onCambiarFiltro: (valor: string) => void;
    onCambiarModoOrden: (modo: any) => void;
    onCompartirTarea: (tarea: Tarea) => void;
    estaCompartida: (id: number) => boolean;
    obtenerParticipantes: (tarea: Tarea) => Participante[];
    renderHandleArrastre: (titulo?: string) => JSX.Element;
    handleMinimizar: JSX.Element;
    /* Callbacks para editar/eliminar habitos desde tareas-habito (Fase 7.6.1) */
    onEditarHabito?: (habitoId: number) => void;
    onEliminarHabito?: (habitoId: number) => void;
    onPosponerHabito?: (habitoId: number) => void;
    modoCompacto?: boolean;
}

export function PanelEjecucion({tareas, proyectos, proyectoIdActual, ocultarCompletadas, ocultarBadgeProyecto, modoOrden, valorFiltroActual, opcionesFiltro, opcionesOrdenTareas, esOrdenManual, onAbrirModalNuevaTarea, onAbrirModalConfigTareas, onToggleTarea, onCrearTarea, onEditarTarea, onEliminarTarea, onReordenarTareas, onCambiarFiltro, onCambiarModoOrden, onCompartirTarea, estaCompartida, obtenerParticipantes, renderHandleArrastre, handleMinimizar, onEditarHabito, onEliminarHabito, onPosponerHabito, modoCompacto = false}: PanelEjecucionProps): JSX.Element {
    const [modoEnfoque, setModoEnfoque] = useState(false);

    return (
        <>
            <SeccionEncabezado
                icono={null}
                titulo={renderHandleArrastre('Tareas') as any}
                variante="panelHeader"
                acciones={
                    <>
                        <SelectorBadge opciones={opcionesFiltro} valorActual={valorFiltroActual} onChange={onCambiarFiltro} titulo="Filtrar tareas" soloIcono={true} />
                        <SelectorBadge opciones={opcionesOrdenTareas} valorActual={modoOrden} onChange={valor => onCambiarModoOrden(valor as any)} icono={<ArrowUpDown size={12} />} titulo="Ordenar tareas" soloIcono={true} />
                        <button className="selectorBadgeBoton selectorBadgeBoton--soloIcono" onClick={onAbrirModalNuevaTarea} title="Nueva Tarea">
                            <span className="selectorBadgeIcono">
                                <Plus size={12} />
                            </span>
                        </button>
                        <button className="selectorBadgeBoton selectorBadgeBoton--soloIcono" onClick={onAbrirModalConfigTareas} title="Configuración">
                            <span className="selectorBadgeIcono">
                                <Settings size={12} />
                            </span>
                        </button>
                        <button className="selectorBadgeBoton selectorBadgeBoton--soloIcono" onClick={() => setModoEnfoque(true)} title="Modo enfoque">
                            <span className="selectorBadgeIcono">
                                <Maximize2 size={12} />
                            </span>
                        </button>
                        {handleMinimizar}
                    </>
                }
            />
            <ListaTareas tareas={tareas} proyectoId={proyectoIdActual} proyectos={proyectos} ocultarCompletadas={ocultarCompletadas} ocultarBadgeProyecto={ocultarBadgeProyecto} onToggleTarea={onToggleTarea} onCrearTarea={onCrearTarea} onEditarTarea={onEditarTarea} onEliminarTarea={onEliminarTarea} onReordenarTareas={esOrdenManual ? onReordenarTareas : undefined} habilitarDrag={esOrdenManual} onCompartirTarea={onCompartirTarea} estaCompartida={estaCompartida} obtenerParticipantes={obtenerParticipantes} onEditarHabito={onEditarHabito} onEliminarHabito={onEliminarHabito} onPosponerHabito={onPosponerHabito} modoCompacto={modoCompacto} />

            <OverlayEnfoque estaActivo={modoEnfoque} onCerrar={() => setModoEnfoque(false)} titulo="Tareas">
                <ListaTareas tareas={tareas} proyectoId={proyectoIdActual} proyectos={proyectos} ocultarCompletadas={ocultarCompletadas} ocultarBadgeProyecto={ocultarBadgeProyecto} onToggleTarea={onToggleTarea} onCrearTarea={onCrearTarea} onEditarTarea={onEditarTarea} onEliminarTarea={onEliminarTarea} onReordenarTareas={esOrdenManual ? onReordenarTareas : undefined} habilitarDrag={esOrdenManual} onCompartirTarea={onCompartirTarea} estaCompartida={estaCompartida} obtenerParticipantes={obtenerParticipantes} onEditarHabito={onEditarHabito} onEliminarHabito={onEliminarHabito} onPosponerHabito={onPosponerHabito} modoCompacto={modoCompacto} />
            </OverlayEnfoque>
        </>
    );
}
