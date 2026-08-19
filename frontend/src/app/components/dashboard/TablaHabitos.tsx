/*
 * TablaHabitos
 * [H-F13-01] Composición de sub-componentes extraídos en tabla-habitos/:
 * FilaHabito, FilaSubHabito y EncabezadoTabla. La lógica de cálculo vive en
 * useTablaHabitos; aquí solo queda la orquestación (drag & drop, pausados,
 * vacío y añadir). La API pública (TablaHabitosProps/TablaHabitos) no cambia.
 */

import React from 'react';
import {Reorder} from 'framer-motion';
import {Target} from 'lucide-react';
import type {Habito, Tarea} from '../../types/dashboard';
import type {ConfiguracionHabitos} from '../../hooks/useConfiguracionHabitos';
import {CONFIG_HABITOS_POR_DEFECTO} from '../../hooks/useConfiguracionHabitos';
import {useTablaHabitos} from '../../hooks/dashboard/useTablaHabitos';
import {DashboardPanel} from '../shared/DashboardPanel';
import {EstadoVacio} from '../shared/EstadoVacio';
import {FilaHabito} from './tabla-habitos/FilaHabito';
import {FilaSubHabito} from './tabla-habitos/FilaSubHabito';
import {EncabezadoTabla} from './tabla-habitos/EncabezadoTabla';

interface TablaHabitosProps {
    habitos: Habito[];
    tareas?: Tarea[];
    onAñadirHabito?: () => void;
    onToggleHabito?: (id: number) => void;
    onEditarHabito?: (habito: Habito) => void;
    onEliminarHabito?: (id: number) => void;
    onPosponerHabito?: (id: number) => void;
    onPausarHabito?: (id: number) => void;
    onMarcarDiaHabito?: (habitoId: number, fecha: string, estado: 'completado' | 'pospuesto') => void;
    onDesmarcarDiaHabito?: (habitoId: number, fecha: string) => void;
    onActualizarHabito?: (id: number, datos: Partial<Habito>) => void;
    /* [217A-5] Callbacks para subhábitos */
    onToggleSubHabito?: (habitoId: number, subHabitoId: number) => void;
    onConfigurarSubHabito?: (habitoId: number, subHabitoId: number) => void;
    onPosponerSubHabitoConTiempo?: (habitoId: number, subHabitoId: number, hasta: string | null) => void;
    /* [218A-1] Drag & drop para orden manual */
    habilitarDrag?: boolean;
    onReordenarHabitos?: (habitos: Habito[]) => void;
    configuracion?: ConfiguracionHabitos;
}

export function TablaHabitos({habitos, tareas = [], onAñadirHabito, onToggleHabito, onEditarHabito, onEliminarHabito, onPosponerHabito, onPausarHabito, onMarcarDiaHabito, onDesmarcarDiaHabito, onActualizarHabito, onToggleSubHabito, onConfigurarSubHabito, onPosponerSubHabitoConTiempo, habilitarDrag = false, onReordenarHabitos, configuracion = CONFIG_HABITOS_POR_DEFECTO}: TablaHabitosProps): JSX.Element {
    const {habitosVisibles, habitosPausados, estiloGrid} = useTablaHabitos(habitos, configuracion);

    /* [H-F13-06] Fila + subhábitos, compartida entre drag&drop y vista normal. */
    const renderFila = (habito: Habito): JSX.Element => (
        <React.Fragment key={habito.id}>
            <FilaHabito habito={habito} onToggle={onToggleHabito} onEditar={onEditarHabito} onEliminar={onEliminarHabito} onPosponer={onPosponerHabito} onPausar={onPausarHabito} onMarcarDia={onMarcarDiaHabito} onDesmarcarDia={onDesmarcarDiaHabito} onActualizar={onActualizarHabito} configuracion={configuracion} estiloGrid={estiloGrid} tareas={tareas} habitos={habitos} />
            {habito.subhabitos && habito.subhabitos.length > 0 && habito.subhabitos.map(sub => (
                <FilaSubHabito key={`sub-${sub.id}`} subHabito={sub} habitoPadreId={habito.id} frecuenciaPadre={habito.frecuencia} onToggle={onToggleSubHabito} onConfigurar={onConfigurarSubHabito} onPosponerConTiempo={onPosponerSubHabitoConTiempo} configuracion={configuracion} estiloGrid={estiloGrid} tareas={tareas} habitos={habitos} />
            ))}
        </React.Fragment>
    );

    return (
        <DashboardPanel id="tabla-habitos">
            {habitos.length === 0 ? (
                <EstadoVacio icono={<Target size={32} />} mensaje="No hay hábitos creados" textoBoton="+ Crear hábito" onAccion={onAñadirHabito} />
            ) : (
                <>
                    {/* Encabezado de tabla */}
                    <EncabezadoTabla configuracion={configuracion} estiloGrid={estiloGrid} />

                    {/* [218A-1] Filas de hábitos activos — con o sin drag & drop */}
                    {habilitarDrag && onReordenarHabitos ? (
                        <Reorder.Group axis="y" values={habitosVisibles} onReorder={onReordenarHabitos} className="listaHabitosReorder" as="div">
                            {habitosVisibles.map(habito => (
                                <Reorder.Item key={habito.id} value={habito} as="div" className="habitoReorderItem">
                                    {renderFila(habito)}
                                </Reorder.Item>
                            ))}
                        </Reorder.Group>
                    ) : (
                        habitosVisibles.map(habito => renderFila(habito))
                    )}

                    {/* Seccion de habitos pausados */}
                    {configuracion.mostrarPausados && habitosPausados.length > 0 && (
                        <>
                            <div className="tablaSeparadorPausados">
                                <span className="tablaSeparadorPausados__texto">Pausados ({habitosPausados.length})</span>
                            </div>
                            {habitosPausados.map(habito => (
                                <FilaHabito key={habito.id} habito={habito} onToggle={onToggleHabito} onEditar={onEditarHabito} onEliminar={onEliminarHabito} onPosponer={onPosponerHabito} onPausar={onPausarHabito} onMarcarDia={onMarcarDiaHabito} onDesmarcarDia={onDesmarcarDiaHabito} onActualizar={onActualizarHabito} configuracion={configuracion} estiloGrid={estiloGrid} tareas={tareas} habitos={habitos} />
                            ))}
                        </>
                    )}

                    {/* Añadir habito */}
                    <div className="añadirHabito" onClick={onAñadirHabito}>
                        + Añadir
                    </div>
                </>
            )}
        </DashboardPanel>
    );
}
