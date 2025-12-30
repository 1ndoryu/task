/*
 * SelectorRepeticionPill
 * Selector de repeticion estilo pill con panel expandible
 * Fase 9.4: Version moderna del selector de repeticion para tareas
 */

import {useState, useRef, useEffect} from 'react';
import {Repeat, X} from 'lucide-react';
import type {FrecuenciaHabito, TipoFrecuencia, DiaSemana} from '../../types/dashboard';
import {SelectorDias} from './SelectorDias';

interface SelectorRepeticionPillProps {
    tieneRepeticion: boolean;
    onTieneRepeticionChange: (valor: boolean) => void;
    frecuencia: FrecuenciaHabito;
    onFrecuenciaChange: (frecuencia: FrecuenciaHabito) => void;
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

export function SelectorRepeticionPill({tieneRepeticion, onTieneRepeticionChange, frecuencia, onFrecuenciaChange, deshabilitado = false}: SelectorRepeticionPillProps): JSX.Element {
    const [panelAbierto, setPanelAbierto] = useState(false);
    const [posicionPanel, setPosicionPanel] = useState({x: 0, y: 0});
    const botonRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    /* Obtener descripcion corta de la frecuencia */
    const obtenerDescripcion = (): string => {
        if (!tieneRepeticion) return 'Repetir';
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
                return 'Repetir';
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

        onFrecuenciaChange(nuevaFrecuencia);
    };

    const manejarCambioDias = (nuevoDias: number) => {
        onFrecuenciaChange({...frecuencia, cadaDias: Math.max(2, Math.min(30, nuevoDias))});
    };

    const manejarCambioVecesMes = (nuevasVeces: number) => {
        onFrecuenciaChange({...frecuencia, vecesAlMes: Math.max(1, Math.min(30, nuevasVeces))});
    };

    const activarRepeticion = () => {
        if (!tieneRepeticion) {
            onTieneRepeticionChange(true);
            onFrecuenciaChange({tipo: 'diario'});
        }
        abrirPanel();
    };

    const desactivarRepeticion = (e: React.MouseEvent) => {
        e.stopPropagation();
        onTieneRepeticionChange(false);
        cerrarPanel();
    };

    return (
        <div className="propiedadesCompactas__item">
            <button ref={botonRef} type="button" className={`pillOpcion ${!tieneRepeticion ? 'pillOpcion--vacio' : ''} ${deshabilitado ? 'pillOpcion--disabled' : ''}`} onClick={activarRepeticion} title="Repetición" style={tieneRepeticion ? {color: 'var(--dashboard-textoNormal)'} : undefined}>
                <Repeat size={14} />
                <span>{obtenerDescripcion()}</span>
                {tieneRepeticion && (
                    <button type="button" className="pillOpcion__quitar" onClick={desactivarRepeticion} title="Quitar repetición">
                        <X size={10} />
                    </button>
                )}
            </button>

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
                    <div className="selectorRepeticionPanel__titulo">Configurar repetición</div>

                    {/* Selector de tipo */}
                    <div className="selectorRepeticionPanel__tipos">
                        {TIPOS_FRECUENCIA.map(({tipo, etiqueta}) => (
                            <button key={tipo} type="button" className={`selectorRepeticionPanel__tipo ${frecuencia.tipo === tipo ? 'selectorRepeticionPanel__tipo--activo' : ''}`} onClick={() => manejarCambioTipo(tipo)}>
                                {etiqueta}
                            </button>
                        ))}
                    </div>

                    {/* Configuracion especifica */}
                    {frecuencia.tipo === 'cadaXDias' && (
                        <div className="selectorRepeticionPanel__config">
                            <span className="selectorRepeticionPanel__label">Cada</span>
                            <div className="selectorRepeticionPanel__numero">
                                <button type="button" onClick={() => manejarCambioDias((frecuencia.cadaDias || 2) - 1)} disabled={(frecuencia.cadaDias || 2) <= 2}>
                                    −
                                </button>
                                <span>{frecuencia.cadaDias || 2}</span>
                                <button type="button" onClick={() => manejarCambioDias((frecuencia.cadaDias || 2) + 1)} disabled={(frecuencia.cadaDias || 2) >= 30}>
                                    +
                                </button>
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
                                <button type="button" onClick={() => manejarCambioVecesMes((frecuencia.vecesAlMes || 4) - 1)} disabled={(frecuencia.vecesAlMes || 4) <= 1}>
                                    −
                                </button>
                                <span>{frecuencia.vecesAlMes || 4}</span>
                                <button type="button" onClick={() => manejarCambioVecesMes((frecuencia.vecesAlMes || 4) + 1)} disabled={(frecuencia.vecesAlMes || 4) >= 30}>
                                    +
                                </button>
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
