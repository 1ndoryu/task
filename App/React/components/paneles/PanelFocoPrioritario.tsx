/*
 * PanelFocoPrioritario
 * Componente que renderiza el panel de hábitos (Foco Prioritario)
 * Responsabilidad única: renderizar la tabla de hábitos con sus controles
 */

import {useState} from 'react';
import {ArrowUpDown, Plus, Settings, Maximize2} from 'lucide-react';
import {SeccionEncabezado, TablaHabitos} from '../dashboard';
import {SelectorBadge, OverlayEnfoque} from '../shared';
import type {Habito} from '../../types/dashboard';
import type {ConfiguracionHabitos} from '../../hooks/useConfiguracionHabitos';

interface PanelFocoPrioritarioProps {
    habitos: Habito[];
    modoOrdenHabitos: string;
    opcionesOrdenHabitos: Array<{id: string; etiqueta: string; descripcion: string}>;
    configuracion: ConfiguracionHabitos;
    onAbrirModalCrearHabito: () => void;
    onAbrirModalConfigHabitos: () => void;
    onToggleHabito: (id: number) => void;
    onEditarHabito: (habito: Habito) => void;
    onEliminarHabito: (id: number) => void;
    onPosponerHabito: (id: number) => void;
    onMarcarDiaHabito?: (habitoId: number, fecha: string, estado: 'completado' | 'pospuesto') => void;
    onDesmarcarDiaHabito?: (habitoId: number, fecha: string) => void;
    onCambiarModoHabitos: (modo: any) => void;
    renderHandleArrastre: (titulo?: string) => JSX.Element;
    handleMinimizar: JSX.Element;
}

export function PanelFocoPrioritario({habitos, modoOrdenHabitos, opcionesOrdenHabitos, configuracion, onAbrirModalCrearHabito, onAbrirModalConfigHabitos, onToggleHabito, onEditarHabito, onEliminarHabito, onPosponerHabito, onMarcarDiaHabito, onDesmarcarDiaHabito, onCambiarModoHabitos, renderHandleArrastre, handleMinimizar}: PanelFocoPrioritarioProps): JSX.Element {
    const [modoEnfoque, setModoEnfoque] = useState(false);

    return (
        <>
            <SeccionEncabezado
                icono={null}
                titulo={renderHandleArrastre('Habitos') as any}
                variante="panelHeader"
                acciones={
                    <>
                        <SelectorBadge opciones={opcionesOrdenHabitos} valorActual={modoOrdenHabitos} onChange={valor => onCambiarModoHabitos(valor as any)} icono={<ArrowUpDown size={12} />} titulo="Ordenar hábitos" soloIcono={true} />
                        <button className="selectorBadgeBoton selectorBadgeBoton--soloIcono" onClick={onAbrirModalCrearHabito} title="Nuevo Hábito">
                            <span className="selectorBadgeIcono">
                                <Plus size={12} />
                            </span>
                        </button>
                        <button className="selectorBadgeBoton selectorBadgeBoton--soloIcono" onClick={onAbrirModalConfigHabitos} title="Configuración">
                            <span className="selectorBadgeIcono">
                                <Settings size={12} />
                            </span>
                        </button>
                        <button className="selectorBadgeBoton selectorBadgeBoton--soloIcono" onClick={() => setModoEnfoque(true)} title="Modo enfoque">
                            <span className="selectorBadgeIcono">
                                <Maximize2 size={12} />
                            </span>
                        </button>
                        {handleMinimizar}
                    </>
                }
            />
            <TablaHabitos habitos={habitos} onAnadirHabito={onAbrirModalCrearHabito} onToggleHabito={onToggleHabito} onEditarHabito={onEditarHabito} onEliminarHabito={onEliminarHabito} onPosponerHabito={onPosponerHabito} onMarcarDiaHabito={onMarcarDiaHabito} onDesmarcarDiaHabito={onDesmarcarDiaHabito} configuracion={configuracion} />

            <OverlayEnfoque estaActivo={modoEnfoque} onCerrar={() => setModoEnfoque(false)} titulo="Habitos">
                <TablaHabitos habitos={habitos} onAnadirHabito={onAbrirModalCrearHabito} onToggleHabito={onToggleHabito} onEditarHabito={onEditarHabito} onEliminarHabito={onEliminarHabito} onPosponerHabito={onPosponerHabito} onMarcarDiaHabito={onMarcarDiaHabito} onDesmarcarDiaHabito={onDesmarcarDiaHabito} configuracion={configuracion} />
            </OverlayEnfoque>
        </>
    );
}
