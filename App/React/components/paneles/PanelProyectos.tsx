/*
 * PanelProyectos
 * Componente que renderiza el panel de proyectos
 * Responsabilidad única: renderizar la lista de proyectos con sus controles
 * Nota: En móvil el header del panel se oculta via CSS (Fase 10.8.3)
 */

import {useState} from 'react';
import {ArrowUpDown, Plus, Settings, Maximize2} from 'lucide-react';
import {SeccionEncabezado, ListaProyectos} from '../dashboard';
import {SelectorBadge, OverlayEnfoque} from '../shared';
import {Boton} from '../ui';
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
    /* Callback para abrir modal de creación rápida con proyecto preseleccionado */
    onAbrirModalCrearTarea?: (proyectoId: number) => void;
}

export function PanelProyectos({proyectos, tareas, configuracion, opcionesOrdenProyectos, onAbrirModalCrearProyecto, onAbrirModalEditarProyecto, onAbrirModalConfigProyectos, onEliminarProyecto, onCambiarEstadoProyecto, onCambiarOrdenProyectos, onCompartirProyecto, estaCompartido, onToggleTarea, onCrearTarea, onEditarTarea, onEliminarTarea, onReordenarTareas, renderHandleArrastre, handleMinimizar, modoCompacto = false, onAbrirModalCrearTarea}: PanelProyectosProps): JSX.Element {
    /* Estado local para el proyecto seleccionado/expandido */
    const [proyectoSeleccionadoId, setProyectoSeleccionadoId] = useState<number | null>(null);
    const [modoEnfoque, setModoEnfoque] = useState(false);

    return (
        <>
            <SeccionEncabezado
                icono={null}
                titulo={renderHandleArrastre('Proyectos') as any}
                variante="panelHeader"
                acciones={
                    <>
                        <SelectorBadge opciones={opcionesOrdenProyectos} valorActual={configuracion.ordenDefecto} onChange={valor => onCambiarOrdenProyectos(valor as any)} icono={<ArrowUpDown size={12} />} titulo="Ordenar proyectos" soloIcono={true} />
                        <Boton
                            variante="icono"
                            onClick={onAbrirModalCrearProyecto}
                            icono={<Plus size={12} />}
                            title="Nuevo Proyecto"
                            claseAdicional="selectorBadgeBoton selectorBadgeBoton--soloIcono"
                        />
                        <Boton
                            variante="icono"
                            onClick={onAbrirModalConfigProyectos}
                            icono={<Settings size={12} />}
                            title="Configuración"
                            claseAdicional="selectorBadgeBoton selectorBadgeBoton--soloIcono"
                        />
                        <Boton
                            variante="icono"
                            onClick={() => setModoEnfoque(true)}
                            icono={<Maximize2 size={12} />}
                            title="Modo enfoque"
                            claseAdicional="selectorBadgeBoton selectorBadgeBoton--soloIcono"
                        />
                        {handleMinimizar}
                    </>
                }
            />
            <ListaProyectos proyectos={proyectos} tareas={tareas} onCrearProyecto={onAbrirModalCrearProyecto} onSeleccionarProyecto={setProyectoSeleccionadoId} proyectoSeleccionadoId={proyectoSeleccionadoId} onEditarProyecto={onAbrirModalEditarProyecto} onEliminarProyecto={onEliminarProyecto} onCambiarEstadoProyecto={onCambiarEstadoProyecto} onCompartirProyecto={onCompartirProyecto} estaCompartido={estaCompartido} onToggleTarea={onToggleTarea} onCrearTarea={onCrearTarea} onEditarTarea={onEditarTarea} onEliminarTarea={onEliminarTarea} onReordenarTareas={onReordenarTareas} ocultarCompletados={configuracion.ocultarCompletados} ocultarTareasCompletadas={configuracion.ocultarTareasCompletadas} ordenDefecto={configuracion.ordenDefecto} mostrarProgreso={configuracion.mostrarProgreso} modoCompacto={modoCompacto} onAbrirModalCrear={onAbrirModalCrearTarea} />

            <OverlayEnfoque estaActivo={modoEnfoque} onCerrar={() => setModoEnfoque(false)} titulo="Proyectos">
                <ListaProyectos proyectos={proyectos} tareas={tareas} onCrearProyecto={onAbrirModalCrearProyecto} onSeleccionarProyecto={setProyectoSeleccionadoId} proyectoSeleccionadoId={proyectoSeleccionadoId} onEditarProyecto={onAbrirModalEditarProyecto} onEliminarProyecto={onEliminarProyecto} onCambiarEstadoProyecto={onCambiarEstadoProyecto} onCompartirProyecto={onCompartirProyecto} estaCompartido={estaCompartido} onToggleTarea={onToggleTarea} onCrearTarea={onCrearTarea} onEditarTarea={onEditarTarea} onEliminarTarea={onEliminarTarea} onReordenarTareas={onReordenarTareas} ocultarCompletados={configuracion.ocultarCompletados} ocultarTareasCompletadas={configuracion.ocultarTareasCompletadas} ordenDefecto={configuracion.ordenDefecto} mostrarProgreso={configuracion.mostrarProgreso} modoCompacto={modoCompacto} onAbrirModalCrear={onAbrirModalCrearTarea} />
            </OverlayEnfoque>
        </>
    );
}
