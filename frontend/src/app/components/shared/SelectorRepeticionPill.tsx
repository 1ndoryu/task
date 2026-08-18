/*
 * SelectorRepeticionPill
 * Selector de repeticion estilo pill con panel expandible
 * Fase 9.4: Version moderna del selector de repeticion para tareas
 */

import type React from 'react';
import {Repeat, X} from 'lucide-react';
import type {FrecuenciaHabito} from '../../types/dashboard';
import {SelectorDias} from './SelectorDias';
import {Boton} from '../ui';
import {useSelectorRepeticionPill} from '../../hooks/shared/useSelectorRepeticionPill';

interface SelectorRepeticionPillProps {
    tieneRepeticion: boolean;
    onTieneRepeticionChange: (valor: boolean) => void;
    frecuencia: FrecuenciaHabito;
    onFrecuenciaChange: (frecuencia: FrecuenciaHabito) => void;
    deshabilitado?: boolean;
}

const TIPOS_FRECUENCIA: {tipo: import('../../types/dashboard').TipoFrecuencia; etiqueta: string}[] = [
    {tipo: 'diario', etiqueta: 'Diario'},
    {tipo: 'cadaXDias', etiqueta: 'Cada X días'},
    {tipo: 'semanal', etiqueta: 'Semanal'},
    {tipo: 'diasEspecificos', etiqueta: 'Días específicos'},
    {tipo: 'mensual', etiqueta: 'Mensual'}
];

export function SelectorRepeticionPill({tieneRepeticion, onTieneRepeticionChange, frecuencia, onFrecuenciaChange, deshabilitado = false}: SelectorRepeticionPillProps): JSX.Element {
    const {panelAbierto, posicionPanel, botonRef, panelRef, descripcion, activarRepeticion, cerrarPanel: _cerrarPanel, desactivarRepeticion, manejarCambioTipo, manejarCambioDias, manejarCambioVecesMes} = useSelectorRepeticionPill({tieneRepeticion, onTieneRepeticionChange, frecuencia, onFrecuenciaChange, deshabilitado});

    return (
        <div className="propiedadesCompactas__item">
            <Boton ref={botonRef as React.Ref<HTMLButtonElement>} type="button" variante="ghost" claseAdicional={`pillOpcion ${!tieneRepeticion ? 'pillOpcion--vacio' : ''} ${deshabilitado ? 'pillOpcion--disabled' : ''}`} onClick={activarRepeticion} title="Repetición" style={tieneRepeticion ? {color: 'var(--dashboard-textoNormal)'} : undefined}>
                <Repeat size={14} />
                <span>{descripcion}</span>
                {tieneRepeticion && (
                    <Boton type="button" variante="ghost" claseAdicional="pillOpcion__quitar" onClick={desactivarRepeticion} title="Quitar repetición">
                        <X size={10} />
                    </Boton>
                )}
            </Boton>

            {panelAbierto && (
                <div
                    ref={panelRef as React.Ref<HTMLDivElement>}
                    className="selectorRepeticionPanel"
                    style={{ /* sentinel-disable inline-style-prohibido */
                        position: 'fixed',
                        left: posicionPanel.x,
                        top: posicionPanel.y,
                        zIndex: 100
                    }}>
                    <div className="selectorRepeticionPanel__titulo">Configurar repetición</div>

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
                            <SelectorDias seleccionados={frecuencia.diasSemana || []} onChange={dias => onFrecuenciaChange({...frecuencia, diasSemana: dias})} />
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

export type {SelectorRepeticionPillProps};
