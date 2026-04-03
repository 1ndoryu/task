/*
 * ListaHitos
 * Componente para gestionar los hitos del proyecto.
 * Reemplaza a ListaTareasCompacta en el modal de configuración.
 *
 * Funcionalidad:
 * - Listar hitos
 * - Agregar nuevos hitos
 * - Marcar como completados
 * - Cambiar prioridad (lo que reordena la lista automáticamente)
 */

import {CheckCircle2, Circle, Plus, Flag, Trash2} from 'lucide-react';
import {MenuContextual} from '../../shared/MenuContextual';
import {Boton, Input} from '../../ui';
import {ETIQUETAS_PRIORIDAD, COLORES_PRIORIDAD, opcionesMenuPrioridad} from '../../../utils/nivelesConfig';
import {useListaHitos} from '../../../hooks/dashboard/useListaHitos';
import type {Hito, NivelPrioridad} from '../../../types/dashboard';

interface ListaHitosProps {
    hitos: Hito[];
    onChange: (hitos: Hito[]) => void;
}

export function ListaHitos({hitos, onChange}: ListaHitosProps): JSX.Element {
    const {
        nuevoHitoTexto, setNuevoHitoTexto,
        mostrandoInput, setMostrandoInput,
        menuAbiertoId,
        posicionMenu,
        hitosOrdenados,
        manejarToggle,
        manejarCambiarPrioridad,
        manejarEliminar,
        manejarAgregar,
        manejarKeyDown,
        abrirMenuPrioridad,
        cerrarMenu
    } = useListaHitos({hitos, onChange});

    return (
        <div className="listaTareasCompacta">
            {' '}
            {/* Reutilizamos clase base para estructura */}
            <div className="listaTareasCompacta__header listaHitos__header">
                <span className="listaTareasCompacta__titulo">Hitos</span>
                <span className="listaTareasCompacta__contador">
                    {hitos.filter(h => h.completado).length}/{hitos.length}
                </span>
            </div>
            <div className="listaTareasCompacta__lista">
                {hitosOrdenados.map(hito => {
                    return (
                        <div key={hito.id} className="tareaItemCompactoContenedor">
                            <div className={`tareaItemCompacto listaHitos__item ${hito.completado ? 'tareaItemCompacto--completada' : ''}`}>
                                {/* Checkbox - Iconos reducidos */}
                                <Boton type="button" claseAdicional={`tareaItemCompacto__checkbox ${hito.completado ? 'tareaItemCompacto__checkbox--checked' : ''}`} onClick={() => manejarToggle(hito.id)}>
                                    {hito.completado ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                                </Boton>

                                {/* Titulo */}
                                <span className="tareaItemCompacto__texto listaHitos__textoContenedor">
                                    <span className="listaHitos__textoTruncado">{hito.titulo}</span>

                                    {/* Badge de Prioridad junto al texto - Estilo PropiedadesCompactas */}
                                    <Boton
                                        type="button"
                                        claseAdicional={`pillOpcion listaHitos__pillPrioridad ${hito.prioridad === 'media' ? 'pillOpcion--vacio' : ''}`}
                                        title={`Prioridad: ${ETIQUETAS_PRIORIDAD[hito.prioridad]}`}
                                        onClick={e => abrirMenuPrioridad(e, hito.id)}
                                        style={{ /* sentinel-disable inline-style-prohibido */
                                            color: COLORES_PRIORIDAD[hito.prioridad],
                                            borderColor: hito.prioridad === 'alta' || hito.prioridad === 'muy_alta' ? COLORES_PRIORIDAD[hito.prioridad] : undefined
                                        }}>
                                        <Flag size={12} fill={hito.prioridad === 'alta' || hito.prioridad === 'muy_alta' ? 'currentColor' : 'none'} />
                                        <span>{ETIQUETAS_PRIORIDAD[hito.prioridad]}</span>
                                    </Boton>
                                </span>

                                {/* Controles: Solo eliminar, apareces on hover */}
                                <div className="listaHitos__controles">
                                    <Boton type="button" variante="icono" title="Eliminar hito" onClick={() => manejarEliminar(hito.id)} claseAdicional="listaHitos__botonEliminar">
                                        <Trash2 size={12} />
                                    </Boton>
                                </div>
                            </div>
                        </div>
                    );
                })}
                <style>{`
                    .tareaItemCompacto:hover .listaHitos__controles { opacity: 1 !important; }
                `}</style>

                {/* Menu Contextual de Prioridad */}
                {menuAbiertoId && (
                    <MenuContextual
                        opciones={opcionesMenuPrioridad(12)}
                        posicionX={posicionMenu.x}
                        posicionY={posicionMenu.y}
                        onSeleccionar={id => {
                            manejarCambiarPrioridad(menuAbiertoId, id as NivelPrioridad);
                            cerrarMenu();
                        }}
                        onCerrar={cerrarMenu}
                    />
                )}

                {/* Input para nuevo hito */}
                {mostrandoInput ? (
                    <div className="tareaItemCompactoContenedor">
                        <div className="tareaItemCompacto listaHitos__item">
                            <Circle size={14} className="textoApagado" />
                            <Input
                                autoFocus
                                tipo="text"
                                claseAdicional="inputSinBorde listaHitos__inputNuevo"
                                placeholder="Nuevo hito..."
                                value={nuevoHitoTexto}
                                onChange={e => setNuevoHitoTexto(e.target.value)}
                                onKeyDown={manejarKeyDown}
                                onBlur={() => {
                                    if (nuevoHitoTexto.trim()) manejarAgregar();
                                    else setMostrandoInput(false);
                                }}
                            />
                        </div>
                    </div>
                ) : (
                    <Boton
                        type="button"
                        claseAdicional="seccionModerna__botonAgregar listaHitos__botonAgregar"
                        onClick={() => setMostrandoInput(true)}>
                        <Plus size={14} />
                        <span>Agregar hito</span>
                    </Boton>
                )}
            </div>
        </div>
    );
}
