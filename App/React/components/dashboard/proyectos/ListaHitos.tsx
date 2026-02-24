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
import {ETIQUETAS_PRIORIDAD} from '../../shared/PropiedadesCompactas';
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
            <div className="listaTareasCompacta__header" style={{marginBottom: '10px'}}>
                <span className="listaTareasCompacta__titulo">Hitos</span>
                <span className="listaTareasCompacta__contador">
                    {hitos.filter(h => h.completado).length}/{hitos.length}
                </span>
            </div>
            <div className="listaTareasCompacta__lista">
                {hitosOrdenados.map(hito => {
                    return (
                        <div key={hito.id} className="tareaItemCompactoContenedor">
                            <div className={`tareaItemCompacto ${hito.completado ? 'tareaItemCompacto--completada' : ''}`} style={{paddingLeft: 0, minHeight: '32px'}}>
                                {/* Checkbox - Iconos reducidos */}
                                <Boton type="button" claseAdicional={`tareaItemCompacto__checkbox ${hito.completado ? 'tareaItemCompacto__checkbox--checked' : ''}`} onClick={() => manejarToggle(hito.id)}>
                                    {hito.completado ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                                </Boton>

                                {/* Titulo */}
                                <span className="tareaItemCompacto__texto" style={{flex: 1, display: 'flex', alignItems: 'center', gap: '16px', overflow: 'hidden'}}>
                                    <span style={{textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap'}}>{hito.titulo}</span>

                                    {/* Badge de Prioridad junto al texto - Estilo PropiedadesCompactas */}
                                    <Boton
                                        type="button"
                                        claseAdicional={`pillOpcion ${hito.prioridad === 'media' ? 'pillOpcion--vacio' : ''}`}
                                        title={`Prioridad: ${ETIQUETAS_PRIORIDAD[hito.prioridad]}`}
                                        onClick={e => abrirMenuPrioridad(e, hito.id)}
                                        style={{
                                            padding: '2px 8px',
                                            height: '24px',
                                            fontSize: '11px',
                                            color: hito.prioridad === 'alta' ? 'var(--dashboard-estadoAlta)' : hito.prioridad === 'baja' ? 'var(--dashboard-estadoBaja)' : undefined,
                                            borderColor: hito.prioridad === 'alta' ? 'var(--dashboard-estadoAlta)' : undefined
                                        }}>
                                        <Flag size={12} fill={hito.prioridad === 'alta' ? 'currentColor' : 'none'} />
                                        <span>{ETIQUETAS_PRIORIDAD[hito.prioridad]}</span>
                                    </Boton>
                                </span>

                                {/* Controles: Solo eliminar, apareces on hover */}
                                <div className="controlesHito" style={{display: 'flex', gap: '4px', opacity: 0}}>
                                    <Boton type="button" variante="icono" title="Eliminar hito" onClick={() => manejarEliminar(hito.id)} style={{padding: '4px'}}>
                                        <Trash2 size={12} />
                                    </Boton>
                                </div>
                            </div>
                        </div>
                    );
                })}
                <style>{`
                    .tareaItemCompacto:hover .controlesHito { opacity: 1 !important; }
                `}</style>

                {/* Menu Contextual de Prioridad */}
                {menuAbiertoId && (
                    <MenuContextual
                        opciones={Object.entries(ETIQUETAS_PRIORIDAD).map(([key, label]) => ({
                            id: key,
                            etiqueta: label,
                            icono: <Flag size={12} />
                        }))}
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
                        <div className="tareaItemCompacto" style={{paddingLeft: 0}}>
                            <Circle size={14} className="textoApagado" />
                            <Input
                                autoFocus
                                tipo="text"
                                claseAdicional="inputSinBorde"
                                placeholder="Nuevo hito..."
                                value={nuevoHitoTexto}
                                onChange={e => setNuevoHitoTexto(e.target.value)}
                                onKeyDown={manejarKeyDown}
                                onBlur={() => {
                                    if (nuevoHitoTexto.trim()) manejarAgregar();
                                    else setMostrandoInput(false);
                                }}
                                style={{
                                    flex: 1,
                                    marginLeft: '8px',
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    color: 'var(--dashboard-textoPrincipal)',
                                    fontSize: '13px'
                                }}
                            />
                        </div>
                    </div>
                ) : (
                    <Boton
                        type="button"
                        claseAdicional="seccionModerna__botonAgregar"
                        onClick={() => setMostrandoInput(true)}
                        style={{
                            marginTop: '8px',
                            borderStyle: 'dashed',
                            width: '100%',
                            justifyContent: 'center',
                            padding: '6px'
                        }}>
                        <Plus size={14} />
                        <span>Agregar hito</span>
                    </Boton>
                )}
            </div>
        </div>
    );
}
