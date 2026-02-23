/*
 * SeccionResponsables
 * Seccion para mostrar y gestionar participantes/responsables de un elemento
 * Estilo Linear: avatares compactos con opcion de agregar/remover
 *
 * Fase 9.2.4: Seccion de responsables para proyectos/tareas
 */

import {User, UserPlus, X, Crown, Edit3, Eye} from 'lucide-react';
import {MenuFlotante} from './MenuFlotante';
import type {Participante, CompaneroEquipo, RolCompartido} from '../../types/dashboard';
import {Boton} from '../ui';
import {useSeccionResponsables} from '../../hooks/dashboard/useSeccionResponsables';

interface SeccionResponsablesProps {
    /* Participantes actuales del elemento */
    participantes: Participante[];
    /* Companeros disponibles para agregar (del equipo) */
    companeros?: CompaneroEquipo[];
    /* Callback al agregar un participante */
    onAgregar?: (companeroId: number, rol: RolCompartido) => void;
    /* Callback al remover un participante */
    onRemover?: (participanteId: number) => void;
    /* Callback al cambiar el rol de un participante */
    onCambiarRol?: (participanteId: number, nuevoRol: RolCompartido) => void;
    /* Si el usuario actual puede gestionar participantes */
    puedeGestionar?: boolean;
    /* Etiqueta personalizada para la seccion */
    etiqueta?: string;
    /* Mostrar en modo compacto (solo avatares) */
    modoCompacto?: boolean;
}

export function SeccionResponsables({participantes, companeros = [], onAgregar, onRemover, onCambiarRol, puedeGestionar = false, etiqueta = 'Responsables', modoCompacto = false}: SeccionResponsablesProps): JSX.Element {
    const {menuAgregarAbierto, setMenuAgregarAbierto, menuParticipanteAbierto, setMenuParticipanteAbierto, rolSeleccionado, setRolSeleccionado, menuAgregarPos, menuParticipantePos, companeroDisponibles, toggleMenuAgregar, toggleMenuParticipante, manejarAgregarParticipante, manejarRemoverParticipante, manejarCambiarRol} = useSeccionResponsables({participantes, companeros, onAgregar, onRemover, onCambiarRol});

    const obtenerIconoRol = (rol: RolCompartido) => {
        switch (rol) {
            case 'propietario':
                return <Crown size={10} />;
            case 'colaborador':
                return <Edit3 size={10} />;
            case 'observador':
                return <Eye size={10} />;
            default:
                return null;
        }
    };

    const obtenerEtiquetaRol = (rol: RolCompartido): string => {
        switch (rol) {
            case 'propietario':
                return 'Propietario';
            case 'colaborador':
                return 'Colaborador';
            case 'observador':
                return 'Observador';
            default:
                return '';
        }
    };

    /* Modo compacto: solo fila de avatares */
    if (modoCompacto) {
        return (
            <>
                <div id="seccion-responsables-compacto" className="seccionResponsables seccionResponsables--compacto">
                    <div className="seccionResponsables__avatares">
                        {participantes.length === 0 ? (
                            <div className="seccionResponsables__vacio seccionResponsables__vacio--compacto">
                                <User size={14} />
                            </div>
                        ) : (
                            participantes.slice(0, 3).map(participante => <img key={participante.id} src={participante.avatar} alt={participante.nombre} className="seccionResponsables__avatarCompacto" title={`${participante.nombre} (${obtenerEtiquetaRol(participante.rol)})`} />)
                        )}
                        {participantes.length > 3 && (
                            <div className="seccionResponsables__avatarMas" title={`+${participantes.length - 3} mas`}>
                                +{participantes.length - 3}
                            </div>
                        )}
                    </div>
                    {puedeGestionar && companeroDisponibles.length > 0 && (
                        <Boton type="button" claseAdicional="seccionResponsables__botonAgregarCompacto" onClick={toggleMenuAgregar} title="Agregar responsable">
                            <UserPlus size={14} />
                        </Boton>
                    )}
                </div>
                {/* Menu agregar para modo compacto */}
                {menuAgregarAbierto && modoCompacto && (
                    <MenuFlotante posicionX={menuAgregarPos.x} posicionY={menuAgregarPos.y} onCerrar={() => setMenuAgregarAbierto(false)}>
                        <div className="seccionResponsables__menuAgregar" style={{position: 'static', marginTop: 0}}>
                            <div className="seccionResponsables__menuTitulo">Agregar participante</div>

                            {/* Selector de rol */}
                            <div className="seccionResponsables__selectorRol">
                                <Boton type="button" claseAdicional={`seccionResponsables__opcionRol ${rolSeleccionado === 'colaborador' ? 'seccionResponsables__opcionRol--activo' : ''}`} onClick={() => setRolSeleccionado('colaborador')}>
                                    <Edit3 size={12} />
                                    <span>Colaborador</span>
                                </Boton>
                                <Boton type="button" claseAdicional={`seccionResponsables__opcionRol ${rolSeleccionado === 'observador' ? 'seccionResponsables__opcionRol--activo' : ''}`} onClick={() => setRolSeleccionado('observador')}>
                                    <Eye size={12} />
                                    <span>Observador</span>
                                </Boton>
                            </div>

                            {/* Lista de companeros disponibles */}
                            <div className="seccionResponsables__listaCompaneros">
                                {companeroDisponibles.map(companero => (
                                    <Boton key={companero.companeroId} type="button" claseAdicional="seccionResponsables__companeroItem" onClick={() => manejarAgregarParticipante(companero.companeroId)}>
                                        <img src={companero.avatar} alt={companero.nombre} className="seccionResponsables__companeroAvatar" />
                                        <div className="seccionResponsables__companeroInfo">
                                            <span className="seccionResponsables__companeroNombre">{companero.nombre}</span>
                                            <span className="seccionResponsables__companeroEmail">{companero.email}</span>
                                        </div>
                                    </Boton>
                                ))}
                            </div>
                        </div>
                    </MenuFlotante>
                )}
            </>
        );
    }

    return (
        <div id="seccion-responsables" className="seccionResponsables seccionResponsables--inline">
            {/* Layout inline: etiqueta + contenido en la misma fila */}
            <span className="seccionResponsables__etiqueta">{etiqueta}</span>

            <div className="seccionResponsables__contenidoInline">
                {participantes.length === 0 ? (
                    /* Sin participantes: mostrar pill "Ninguno" con boton agregar */
                    puedeGestionar && companeroDisponibles.length > 0 ? (
                        <div className="seccionResponsables__agregarContenedor">
                            <Boton type="button" claseAdicional="pillOpcion pillOpcion--vacio" onClick={toggleMenuAgregar}>
                                <User size={14} />
                                <span>Agregar</span>
                            </Boton>
                        </div>
                    ) : (
                        <span className="pillOpcion pillOpcion--vacio pillOpcion--disabled">
                            <User size={14} />
                            <span>Ninguno</span>
                        </span>
                    )
                ) : (
                    /* Con participantes: mostrar avatares + boton agregar */
                    <>
                        {participantes.map(participante => (
                            <div key={participante.id} className="seccionResponsables__participante">
                                <Boton type="button" claseAdicional="pillOpcion" onClick={e => puedeGestionar && !participante.esPropietario && toggleMenuParticipante(e, participante.id)} disabled={!puedeGestionar || participante.esPropietario}>
                                    <img src={participante.avatar} alt={participante.nombre} className="seccionResponsables__participanteAvatar" />
                                    <span>{participante.nombre}</span>
                                    <span className="seccionResponsables__participanteRol" title={obtenerEtiquetaRol(participante.rol)}>
                                        {obtenerIconoRol(participante.rol)}
                                    </span>
                                </Boton>
                            </div>
                        ))}

                        {/* Boton agregar mas */}
                        {puedeGestionar && companeroDisponibles.length > 0 && (
                            <div className="seccionResponsables__agregarContenedor">
                                <Boton type="button" claseAdicional="seccionResponsables__botonAgregarSmall" onClick={toggleMenuAgregar} title="Agregar participante">
                                    <UserPlus size={14} />
                                </Boton>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Menu agregar para modo inline */}
            {menuAgregarAbierto && !modoCompacto && (
                <MenuFlotante posicionX={menuAgregarPos.x} posicionY={menuAgregarPos.y} onCerrar={() => setMenuAgregarAbierto(false)}>
                    <div className="seccionResponsables__menuAgregar" style={{position: 'static', marginTop: 0}}>
                        <div className="seccionResponsables__menuTitulo">Agregar participante</div>

                        {/* Selector de rol */}
                        <div className="seccionResponsables__selectorRol">
                            <Boton type="button" claseAdicional={`seccionResponsables__opcionRol ${rolSeleccionado === 'colaborador' ? 'seccionResponsables__opcionRol--activo' : ''}`} onClick={() => setRolSeleccionado('colaborador')}>
                                <Edit3 size={12} />
                                <span>Colaborador</span>
                            </Boton>
                            <Boton type="button" claseAdicional={`seccionResponsables__opcionRol ${rolSeleccionado === 'observador' ? 'seccionResponsables__opcionRol--activo' : ''}`} onClick={() => setRolSeleccionado('observador')}>
                                <Eye size={12} />
                                <span>Observador</span>
                            </Boton>
                        </div>

                        {/* Lista de companeros disponibles */}
                        <div className="seccionResponsables__listaCompaneros">
                            {companeroDisponibles.map(companero => (
                                <Boton key={companero.companeroId} type="button" claseAdicional="seccionResponsables__companeroItem" onClick={() => manejarAgregarParticipante(companero.companeroId)}>
                                    <img src={companero.avatar} alt={companero.nombre} className="seccionResponsables__companeroAvatar" />
                                    <div className="seccionResponsables__companeroInfo">
                                        <span className="seccionResponsables__companeroNombre">{companero.nombre}</span>
                                        <span className="seccionResponsables__companeroEmail">{companero.email}</span>
                                    </div>
                                </Boton>
                            ))}
                        </div>
                    </div>
                </MenuFlotante>
            )}

            {/* Menu de opciones del participante */}
            {menuParticipanteAbierto !== null && !modoCompacto && (
                <MenuFlotante posicionX={menuParticipantePos.x} posicionY={menuParticipantePos.y} onCerrar={() => setMenuParticipanteAbierto(null)} anchoMinimo={160}>
                    {(() => {
                        const participante = participantes.find(p => p.id === menuParticipanteAbierto);
                        if (!participante) return null;

                        return (
                            <div className="seccionResponsables__menuParticipante" style={{position: 'static', marginTop: 0}}>
                                <div className="seccionResponsables__menuSeccion">
                                    <span className="seccionResponsables__menuEtiqueta">Cambiar rol</span>
                                    <Boton type="button" claseAdicional={`seccionResponsables__menuOpcion ${participante.rol === 'colaborador' ? 'seccionResponsables__menuOpcion--activo' : ''}`} onClick={() => manejarCambiarRol(participante.id, 'colaborador')}>
                                        <Edit3 size={12} />
                                        <span>Colaborador</span>
                                    </Boton>
                                    <Boton type="button" claseAdicional={`seccionResponsables__menuOpcion ${participante.rol === 'observador' ? 'seccionResponsables__menuOpcion--activo' : ''}`} onClick={() => manejarCambiarRol(participante.id, 'observador')}>
                                        <Eye size={12} />
                                        <span>Observador</span>
                                    </Boton>
                                </div>
                                <div className="seccionResponsables__menuDivisor" />
                                <Boton type="button" claseAdicional="seccionResponsables__menuOpcion seccionResponsables__menuOpcion--peligro" onClick={() => manejarRemoverParticipante(participante.id)}>
                                    <X size={12} />
                                    <span>Remover</span>
                                </Boton>
                            </div>
                        );
                    })()}
                </MenuFlotante>
            )}
        </div>
    );
}
