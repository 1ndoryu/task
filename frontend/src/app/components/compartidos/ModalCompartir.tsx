/*
 * ModalCompartir
 * Modal para compartir un elemento (tarea, proyecto o hábito)
 * con miembros del equipo
 * Lógica extraída a useModalCompartir hook
 */

import {Share2, AlertTriangle, UserPlus, Users, Loader2} from 'lucide-react';
import {Modal} from '../shared/Modal';
import {Boton} from '../ui';
import {SelectorCompaneros} from './SelectorCompaneros';
import {ListaParticipantes} from './ListaParticipantes';
import type {TipoElementoCompartido, RolCompartido, CompaneroEquipo, Participante} from '../../types/dashboard';
import {useModalCompartir} from '../../hooks/dashboard/useModalCompartir';

interface ModalCompartirProps {
    visible: boolean;
    onCerrar: () => void;
    tipo: TipoElementoCompartido;
    elementoId: number;
    elementoNombre: string;
    companeros: CompaneroEquipo[];
    participantes: Participante[];
    cifradoActivo?: boolean;
    onCompartir: (usuarioId: number, rol: RolCompartido) => Promise<boolean>;
    onCambiarRol: (compartidoId: number, nuevoRol: RolCompartido) => Promise<boolean>;
    onDejarDeCompartir: (compartidoId: number) => Promise<boolean>;
    cargandoParticipantes?: boolean;
}

export function ModalCompartir({visible, onCerrar, tipo, elementoId: _elementoId, elementoNombre, companeros, participantes, cifradoActivo = false, onCompartir, onCambiarRol, onDejarDeCompartir, cargandoParticipantes = false}: ModalCompartirProps): JSX.Element | null {
    const {
        companeroSeleccionado, setCompaneroSeleccionado,
        rolSeleccionado, setRolSeleccionado,
        compartiendo, error, mostroAdvertencia,
        tipoTexto, tipoTextoMayus, companerosDisponibles, esPropietario,
        manejarCompartir, manejarCambioRol, manejarEliminar
    } = useModalCompartir({visible, tipo, companeros, participantes, cifradoActivo, onCompartir, onCambiarRol, onDejarDeCompartir});

    if (!visible) return null;

    return (
        <Modal estaAbierto={visible} titulo={`Compartir ${tipoTextoMayus}`} onCerrar={onCerrar} claseExtra="modalCompartir">
            <div id="modal-compartir-contenido" className="modalCompartirContenido">
                {/* Nombre del elemento */}
                <div className="modalCompartirElemento">
                    <Share2 size={16} />
                    <span>{elementoNombre}</span>
                </div>

                {/* Advertencia de cifrado */}
                {cifradoActivo && mostroAdvertencia && (
                    <div className="modalCompartirAdvertencia">
                        <AlertTriangle size={18} />
                        <div>
                            <strong>Advertencia de seguridad</strong>
                            <p>Al compartir este {tipoTexto}, el cifrado de extremo a extremo se desactivará para este elemento. Los participantes podrán acceder a su contenido.</p>
                        </div>
                    </div>
                )}

                {/* Lista de participantes actuales */}
                {participantes.length > 0 && (
                    <div className="modalCompartirSeccion">
                        <h4>
                            <Users size={14} />
                            <span>Participantes ({participantes.length})</span>
                        </h4>
                        {cargandoParticipantes ? (
                            <div className="modalCompartirCargando">
                                <Loader2 size={16} className="girando" />
                                <span>Cargando participantes...</span>
                            </div>
                        ) : (
                            <ListaParticipantes participantes={participantes} esPropietario={esPropietario} onCambiarRol={manejarCambioRol} onEliminar={manejarEliminar} />
                        )}
                    </div>
                )}

                {/* Selector de nuevos compañeros */}
                <div className="modalCompartirSeccion">
                    <h4>
                        <UserPlus size={14} />
                        <span>Añadir participante</span>
                    </h4>
                    <SelectorCompaneros companeros={companerosDisponibles} companeroSeleccionado={companeroSeleccionado} rolSeleccionado={rolSeleccionado} onSeleccionar={setCompaneroSeleccionado} onCambiarRol={setRolSeleccionado} disabled={compartiendo} />
                </div>

                {/* Error */}
                {error && <div className="modalCompartirError">{error}</div>}

                {/* Acciones */}
                <div className="modalCompartirAcciones">
                    <Boton variante="secundario" onClick={onCerrar} disabled={compartiendo}>
                        Cerrar
                    </Boton>
                    {companeroSeleccionado && (
                        <Boton variante="primario" onClick={manejarCompartir} cargando={compartiendo}>
                            {mostroAdvertencia && cifradoActivo ? 'Confirmar y compartir' : 'Compartir'}
                        </Boton>
                    )}
                </div>
            </div>
        </Modal>
    );
}
