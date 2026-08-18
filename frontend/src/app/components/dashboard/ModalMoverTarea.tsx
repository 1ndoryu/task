/*
 * ModalMoverTarea
 * Modal para seleccionar el proyecto destino de una tarea
 */

import {Folder, Check, Ban} from 'lucide-react';
import {Modal} from '../shared/Modal';
import {Boton} from '../ui';
import type {Proyecto} from '../../types/dashboard';

interface ModalMoverTareaProps {
    estaAbierto: boolean;
    onCerrar: () => void;
    onMover: (proyectoId: number | undefined) => void;
    proyectos: Proyecto[];
    proyectoActualId?: number;
}

export function ModalMoverTarea({estaAbierto, onCerrar, onMover, proyectos, proyectoActualId}: ModalMoverTareaProps): JSX.Element {
    const manejarSeleccion = (id: number | undefined) => {
        onMover(id);
        onCerrar();
    };

    return (
        <Modal estaAbierto={estaAbierto} onCerrar={onCerrar} titulo="Mover tarea a proyecto">
            <div className="contenedorListaProyectos">
                {/* Opcion: Sin proyecto */}
                <Boton claseAdicional={`itemProyectoSeleccionable ${!proyectoActualId ? 'seleccionado' : ''}`} onClick={() => manejarSeleccion(undefined)}>
                    <div className="infoProyectoSeleccion">
                        <Ban size={16} className="iconoProyectoSeleccion" />
                        <span className="nombreProyectoSeleccion">Sin proyecto (Tareas sueltas)</span>
                    </div>
                    {!proyectoActualId && <Check size={16} />}
                </Boton>

                {proyectos.length > 0 && <div className="separadorListaProyectos" />}

                {/* Lista de proyectos */}
                {proyectos.map(proyecto => {
                    const esActual = proyecto.id === proyectoActualId;
                    return (
                        <Boton key={proyecto.id} claseAdicional={`itemProyectoSeleccionable ${esActual ? 'seleccionado' : ''}`} onClick={() => manejarSeleccion(proyecto.id)}>
                            <div className="infoProyectoSeleccion">
                                <Folder size={16} className="iconoProyectoSeleccion" />
                                <span className="nombreProyectoSeleccion">{proyecto.nombre}</span>
                            </div>
                            {esActual && <span className="indicadorActual">Actual</span>}
                        </Boton>
                    );
                })}
            </div>
        </Modal>
    );
}
