/*
 * SelectorFrecuenciaPill
 * Selector de frecuencia estilo pill con panel expandible
 * Fase 9.5: Version moderna del selector de frecuencia para habitos
 */

import {useState, useRef, useEffect} from 'react';
import {Calendar} from 'lucide-react';
import type {FrecuenciaHabito, TipoFrecuencia, DiaSemana} from '../../types/dashboard';
import {SelectorDias} from './SelectorDias';
import {Boton} from '../ui';

interface SelectorFrecuenciaPillProps {
    frecuencia: FrecuenciaHabito;
    onChange: (frecuencia: FrecuenciaHabito) => void;
    deshabilitado?: boolean;
}

const TIPOS_FRECUENCIA: {tipo: TipoFrecuencia; etiqueta: string}[] = [
    {tipo: 'diario', etiqueta: 'Diario'},
    {tipo: 'cadaXDias', etiqueta: 'Cada X días'},
    {tipo: 'semanal', etiqueta: 'Semanal'},
    {tipo: 'diasEspecificos', etiqueta: 'Días específicos'},
    {tipo: 'mensual', etiqueta: 'Mensual'}
];

const DIAS_SEMANA: {dia: DiaSemana; corto: string}[] = [
    {dia: 'lunes', corto: 'L'},
    {dia: 'martes', corto: 'M'},
    {dia: 'miercoles', corto: 'X'},
    {dia: 'jueves', corto: 'J'},
    {dia: 'viernes', corto: 'V'},
    {dia: 'sabado', corto: 'S'},
    {dia: 'domingo', corto: 'D'}
];

export function SelectorFrecuenciaPill({frecuencia, onChange, deshabilitado = false}: SelectorFrecuenciaPillProps): JSX.Element {
    const [panelAbierto, setPanelAbierto] = useState(false);
    const [posicionPanel, setPosicionPanel] = useState({x: 0, y: 0});
    const botonRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    /* Obtener descripcion corta de la frecuencia */
    const obtenerDescripcion = (): string => {
        switch (frecuencia.tipo) {
            case 'diario':
                return 'Diario';
            case 'cadaXDias':
                return `Cada ${frecuencia.cadaDias || 2}d`;
            case 'semanal':
                return 'Semanal';
            case 'diasEspecificos': {
                const dias = frecuencia.diasSemana || [];
                if (dias.length === 0) return 'Sin días';
                if (dias.length === 7) return 'Diario';
                return dias.map(d => DIAS_SEMANA.find(ds => ds.dia === d)?.corto || d).join('');
            }
            case 'mensual':
                return `${frecuencia.vecesAlMes || 4}x/mes`;
            default:
                return 'Frecuencia';
        }
    };

    const abrirPanel = () => {
        if (deshabilitado) return;
        if (botonRef.current) {
            const rect = botonRef.current.getBoundingClientRect();
            setPosicionPanel({x: rect.left, y: rect.bottom + 4});
        }
        setPanelAbierto(true);
    };

    const cerrarPanel = () => setPanelAbierto(false);

    /* Cerrar al hacer click fuera */
    useEffect(() => {
        if (!panelAbierto) return;

        const manejarClickFuera = (evento: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(evento.target as Node) && botonRef.current && !botonRef.current.contains(evento.target as Node)) {
                cerrarPanel();
            }
        };

        const manejarEscape = (evento: KeyboardEvent) => {
            if (evento.key === 'Escape') cerrarPanel();
        };

        document.addEventListener('mousedown', manejarClickFuera);
        document.addEventListener('keydown', manejarEscape);

        return () => {
            document.removeEventListener('mousedown', manejarClickFuera);
            document.removeEventListener('keydown', manejarEscape);
        };
    }, [panelAbierto]);

    const manejarCambioTipo = (nuevoTipo: TipoFrecuencia) => {
        const nuevaFrecuencia: FrecuenciaHabito = {tipo: nuevoTipo};

        if (nuevoTipo === 'cadaXDias') {
            nuevaFrecuencia.cadaDias = 2;
        } else if (nuevoTipo === 'diasEspecificos') {
            nuevaFrecuencia.diasSemana = ['lunes', 'miercoles', 'viernes'];
        } else if (nuevoTipo === 'mensual') {
            nuevaFrecuencia.vecesAlMes = 4;
        }

        onChange(nuevaFrecuencia);
    };

    const manejarCambioDias = (nuevoDias: number) => {
        onChange({...frecuencia, cadaDias: Math.max(2, Math.min(30, nuevoDias))});
    };

    const manejarCambioVecesMes = (nuevasVeces: number) => {
        onChange({...frecuencia, vecesAlMes: Math.max(1, Math.min(30, nuevasVeces))});
    };

    return (
        <div className="propiedadesCompactas__item">
            <Boton ref={botonRef} type="button" variante="ghost" claseAdicional={`pillOpcion ${deshabilitado ? 'pillOpcion--disabled' : ''}`} onClick={abrirPanel} title="Frecuencia">
                <Calendar size={14} />
                <span>{obtenerDescripcion()}</span>
            </Boton>

            {panelAbierto && (
                <div
                    ref={panelRef}
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
