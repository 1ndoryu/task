/*
 * SelectorFrecuenciaPill
 * Selector de frecuencia estilo pill con panel expandible
 * Fase 9.5: Version moderna del selector de frecuencia para habitos
 */

import type React from 'react';
import {Calendar} from 'lucide-react';
import type {FrecuenciaHabito} from '../../types/dashboard';
import {SelectorDias} from './SelectorDias';
import {Boton} from '../ui';
import {useSelectorFrecuenciaPill} from '../../hooks/shared/useSelectorFrecuenciaPill';

interface SelectorFrecuenciaPillProps {
    frecuencia: FrecuenciaHabito;
    onChange: (frecuencia: FrecuenciaHabito) => void;
    deshabilitado?: boolean;
}

const TIPOS_FRECUENCIA: {tipo: import('../../types/dashboard').TipoFrecuencia; etiqueta: string}[] = [
    {tipo: 'diario', etiqueta: 'Diario'},
    {tipo: 'cadaXDias', etiqueta: 'Cada X días'},
    {tipo: 'semanal', etiqueta: 'Semanal'},
    {tipo: 'diasEspecificos', etiqueta: 'Días específicos'},
    {tipo: 'mensual', etiqueta: 'Mensual'}
];

export function SelectorFrecuenciaPill({frecuencia, onChange, deshabilitado = false}: SelectorFrecuenciaPillProps): JSX.Element {
    const {panelAbierto, posicionPanel, botonRef, panelRef, descripcion, abrirPanel, manejarCambioTipo, manejarCambioDias, manejarCambioVecesMes} = useSelectorFrecuenciaPill({frecuencia, onChange, deshabilitado});

    return (
        <div className="propiedadesCompactas__item">
            <Boton ref={botonRef as React.Ref<HTMLButtonElement>} type="button" variante="ghost" claseAdicional={`pillOpcion ${deshabilitado ? 'pillOpcion--disabled' : ''}`} onClick={abrirPanel} title="Frecuencia">
                <Calendar size={14} />
                <span>{descripcion}</span>
            </Boton>

            {panelAbierto && (
                <div
                    ref={panelRef as React.Ref<HTMLDivElement>}
                    className="selectorRepeticionPanel"
                    style={{
                        position: 'fixed',
                        left: posicionPanel.x,
                        top: posicionPanel.y,
                        zIndex: 100
                    }}>
                    <div className="selectorRepeticionPanel__titulo">Frecuencia</div>

                    {/* Selector de tipo */}
                    <div className="selectorRepeticionPanel__tipos">
                        {TIPOS_FRECUENCIA.map(({tipo, etiqueta}) => (
                            <Boton key={tipo} type="button" variante="ghost" claseAdicional={`selectorRepeticionPanel__tipo ${frecuencia.tipo === tipo ? 'selectorRepeticionPanel__tipo--activo' : ''}`} onClick={() => manejarCambioTipo(tipo)}>
                                {etiqueta}
                            </Boton>
                        ))}
                    </div>

                    {/* Configuracion especifica */}
                    {frecuencia.tipo === 'cadaXDias' && (
                        <div className="selectorRepeticionPanel__config">
                            <span className="selectorRepeticionPanel__label">Cada</span>
                            <div className="selectorRepeticionPanel__numero">
                                <Boton type="button" variante="ghost" onClick={() => manejarCambioDias((frecuencia.cadaDias || 2) - 1)} disabled={(frecuencia.cadaDias || 2) <= 2}>
                                    −
                                </Boton>
                                <span>{frecuencia.cadaDias || 2}</span>
                                <Boton type="button" variante="ghost" onClick={() => manejarCambioDias((frecuencia.cadaDias || 2) + 1)} disabled={(frecuencia.cadaDias || 2) >= 30}>
                                    +
                                </Boton>
                            </div>
                            <span className="selectorRepeticionPanel__label">días</span>
                        </div>
                    )}

                    {frecuencia.tipo === 'diasEspecificos' && (
                        <div className="selectorRepeticionPanel__config">
                            <SelectorDias seleccionados={frecuencia.diasSemana || []} onChange={dias => onChange({...frecuencia, diasSemana: dias})} />
                        </div>
                    )}

                    {frecuencia.tipo === 'mensual' && (
                        <div className="selectorRepeticionPanel__config">
                            <div className="selectorRepeticionPanel__numero">
                                <Boton type="button" variante="ghost" onClick={() => manejarCambioVecesMes((frecuencia.vecesAlMes || 4) - 1)} disabled={(frecuencia.vecesAlMes || 4) <= 1}>
                                    −
                                </Boton>
                                <span>{frecuencia.vecesAlMes || 4}</span>
                                <Boton type="button" variante="ghost" onClick={() => manejarCambioVecesMes((frecuencia.vecesAlMes || 4) + 1)} disabled={(frecuencia.vecesAlMes || 4) >= 30}>
                                    +
                                </Boton>
                            </div>
                            <span className="selectorRepeticionPanel__label">veces al mes</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export type {SelectorFrecuenciaPillProps};
