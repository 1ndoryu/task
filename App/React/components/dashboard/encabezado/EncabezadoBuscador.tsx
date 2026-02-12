import {Search, X} from 'lucide-react';
import {BuscadorGlobal} from '../BuscadorGlobal';
import {Boton} from '../../ui/Boton';
import type {Tarea, Habito, Proyecto} from '../../../types/dashboard';

interface EncabezadoBuscadorProps {
    tareas: Tarea[];
    habitos: Habito[];
    proyectos: Proyecto[];
    onSeleccionarTarea?: (tarea: Tarea) => void;
    onSeleccionarHabito?: (habito: Habito) => void;
    onSeleccionarProyecto?: (proyecto: Proyecto) => void;
    mostrarModal: boolean;
    onCerrarModal: () => void;
    estaConectado: boolean;
}

export function EncabezadoBuscador({tareas, habitos, proyectos, onSeleccionarTarea, onSeleccionarHabito, onSeleccionarProyecto, mostrarModal, onCerrarModal, estaConectado}: EncabezadoBuscadorProps) {
    const puedeBuscar = Boolean(estaConectado && onSeleccionarTarea && onSeleccionarHabito && onSeleccionarProyecto);
    if (!puedeBuscar) return null;

    return (
        <>
            <div className="encabezadoBuscador">
                <BuscadorGlobal tareas={tareas} habitos={habitos} proyectos={proyectos} onSeleccionarTarea={onSeleccionarTarea!} onSeleccionarHabito={onSeleccionarHabito!} onSeleccionarProyecto={onSeleccionarProyecto!} />
            </div>

            {/* MODAL BUSCADOR MOVIL */}
            {mostrarModal && (
                <div className="buscadorModalOverlay" onClick={onCerrarModal}>
                    <div className="buscadorModalContenido" onClick={e => e.stopPropagation()}>
                        <div className="buscadorModalHeader">
                            <h3 className="buscadorModalTitulo">Buscar</h3>
                            <Boton claseAdicional="buscadorModalCerrar" onClick={onCerrarModal}>
                                <X size={16} />
                            </Boton>
                        </div>
                        <BuscadorGlobal
                            tareas={tareas}
                            habitos={habitos}
                            proyectos={proyectos}
                            onSeleccionarTarea={t => {
                                onSeleccionarTarea?.(t);
                                onCerrarModal();
                            }}
                            onSeleccionarHabito={h => {
                                onSeleccionarHabito?.(h);
                                onCerrarModal();
                            }}
                            onSeleccionarProyecto={p => {
                                onSeleccionarProyecto?.(p);
                                onCerrarModal();
                            }}
                        />
                    </div>
                </div>
            )}
        </>
    );
}
