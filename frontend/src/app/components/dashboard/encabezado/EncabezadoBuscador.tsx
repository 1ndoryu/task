import {X} from 'lucide-react';
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
    /* [19-08-2026] Cuando el input de escritorio choca con encabezadoNav, el
     * header lo colapsa a un boton de lupa en la nav; aqui se oculta el input
     * en linea y solo se mantiene el modal de busqueda. */
    colapsado?: boolean;
}

export function EncabezadoBuscador({tareas, habitos, proyectos, onSeleccionarTarea, onSeleccionarHabito, onSeleccionarProyecto, mostrarModal, onCerrarModal, estaConectado, colapsado = false}: EncabezadoBuscadorProps) {
    const puedeBuscar = Boolean(estaConectado && onSeleccionarTarea && onSeleccionarHabito && onSeleccionarProyecto);
    if (!puedeBuscar) return null;

    return (
        <>
            {!colapsado && (
                <div className="encabezadoBuscador">
                    <BuscadorGlobal tareas={tareas} habitos={habitos} proyectos={proyectos} onSeleccionarTarea={onSeleccionarTarea!} onSeleccionarHabito={onSeleccionarHabito!} onSeleccionarProyecto={onSeleccionarProyecto!} />
                </div>
            )}

            {/* MODAL BUSCADOR MOVIL */}
            {mostrarModal && (
                /* sentinel-disable-next-line componente-artesanal — modal de busqueda movil con posicionamiento especifico */
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
