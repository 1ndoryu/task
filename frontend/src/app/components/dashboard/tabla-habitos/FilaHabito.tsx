/*
 * components/dashboard/tabla-habitos/FilaHabito.tsx
 * [H-F13-01] Fila de hábito: checkbox, nombre con badges, historial, columnas
 * de prioridad/inactividad/urgencia/racha, acciones hover y menú contextual.
 * La lógica de cálculo vive en useFilaHabito (hooks/dashboard/useTablaHabitos).
 */

import React, {useMemo, useCallback} from 'react';
import {Clock, Flame, Check, Pause, AlertTriangle, Play, Square, Lock} from 'lucide-react';
import type {Habito, Tarea} from '../../../types/dashboard';
import type {ConfiguracionHabitos} from '../../../hooks/useConfiguracionHabitos';
import {useFilaHabito} from '../../../hooks/dashboard/useTablaHabitos';
import {useDependenciasElemento} from '../../../hooks/useDependenciasElemento';
import {useDependenciasUIStore} from '../../../stores/dependenciasUIStore';
import {useAlertasContext} from '../../../context/AlertasContext';
import {generarOpcionesMenuHabito} from '../../../config/opcionesMenuHabito';
import {MenuContextualAdaptivo} from '../../shared/MenuContextualAdaptivo';
import {BadgeInfo, BadgeGroup} from '../../shared/BadgeInfo';
import {AccionesItem} from '../../shared/AccionesItem';
import {HistorialHabitoInline} from '../../shared/HistorialHabito';

/* FilaHabitoProps se divide en datos + acciones + dependencias vía extends. */
interface FilaHabitoDatos {
    habito: Habito;
    configuracion: ConfiguracionHabitos;
    estiloGrid: React.CSSProperties;
    tareas?: Tarea[];
    habitos?: Habito[];
}

interface FilaHabitoAcciones {
    onToggle?: (id: number) => void;
    onEditar?: (habito: Habito) => void;
    onEliminar?: (id: number) => void;
    onPosponer?: (id: number) => void;
    onPausar?: (id: number) => void;
    onMarcarDia?: (habitoId: number, fecha: string, estado: 'completado' | 'pospuesto') => void;
    onDesmarcarDia?: (habitoId: number, fecha: string) => void;
    onActualizar?: (id: number, datos: Partial<Habito>) => void;
}

interface FilaHabitoProps extends FilaHabitoDatos, FilaHabitoAcciones {}

/* [H-F13-07] Prop `indice` eliminada: no se usaba en FilaHabito. */
export function FilaHabito({habito, onToggle, onEditar, onEliminar, onPosponer, onPausar, onMarcarDia, onDesmarcarDia, onActualizar, configuracion, estiloGrid, tareas = [], habitos = []}: FilaHabitoProps): JSX.Element {
    const {
        mostrarAcciones, setMostrarAcciones,
        menuContextual,
        frecuencia, esUrgente, porcentajeUrgencia,
        completadoHoy, habitoTocaHoy, pospuestoHoy,
        textoFrecuencia, intervaloFrecuencia,
        rachaEnPeligro, rachaPerdida, diasAntesDePerder,
        estaPausado, estaEnTracking,
        historialParaComponente,
        variantePrioridad, claseUrgencia,
        manejarToggle, manejarEditar, manejarClickDerecho, manejarOpcionMenu
    } = useFilaHabito({habito, onToggle, onEditar, onEliminar, onPosponer, onPausar, onActualizar});

    const {bloqueado, nombresBloqueantes} = useDependenciasElemento('habito', habito.id, undefined, habito, tareas, habitos);
    const {mostrarAdvertencia} = useAlertasContext();
    const destello = useDependenciasUIStore(s => s.destello);
    const activarDestello = useDependenciasUIStore(s => s.activarDestello);
    const esDestello = destello?.tipo === 'habito' && destello.id === habito.id;

    const manejarToggleConDependencias = useCallback((e: React.MouseEvent) => {
        if (bloqueado) {
            e.stopPropagation();
            e.preventDefault();
            activarDestello({tipo: 'habito', id: habito.id});
            mostrarAdvertencia(`Debes completar primero: ${nombresBloqueantes.join(', ')}`);
            return;
        }
        manejarToggle(e);
    }, [bloqueado, nombresBloqueantes, activarDestello, mostrarAdvertencia, habito.id, manejarToggle]);

    /* Opciones del menú contextual (requiere JSX, se mantiene en el componente) */
    const opcionesMenu = useMemo(() => {
        const base = generarOpcionesMenuHabito({
            completadoHoy,
            estaPausado,
            tieneActualizar: !!onActualizar,
            pospuestoHoy
        });

        const indiceEliminar = base.findIndex(o => o.id === 'eliminar');
        const opcionTracking = estaEnTracking
            ? {id: 'detener-tracking', etiqueta: 'Detener tracking', icono: <Square size={12} />, separadorDespues: true}
            : {id: 'iniciar-tracking', etiqueta: 'Iniciar tracking', icono: <Play size={12} />, separadorDespues: true};

        if (indiceEliminar >= 0) {
            return [...base.slice(0, indiceEliminar), opcionTracking, ...base.slice(indiceEliminar)];
        }

        return [...base, opcionTracking];
    }, [completadoHoy, estaPausado, onActualizar, pospuestoHoy, estaEnTracking]);

    return (
        <>
            <div className={`tablaFila tablaFilaEditable ${completadoHoy ? 'tablaFilaCompletada' : ''} ${configuracion.modoCompacto ? 'tablaFilaCompacta' : ''} ${habitoTocaHoy && !completadoHoy ? 'tablaFilaTocaHoy' : ''} ${estaPausado ? 'tablaFilaPausada' : ''} ${bloqueado ? 'dependenciaBloqueada' : ''} ${esDestello ? 'dependenciaDestello' : ''}`} onClick={manejarEditar} onContextMenu={manejarClickDerecho} onMouseEnter={() => setMostrarAcciones(true)} onMouseLeave={() => setMostrarAcciones(false)} style={estiloGrid}>
                {/* Checkbox */}
                {configuracion.columnasVisibles.indice && (
                    <div className="tablaColumnaCheckbox" onClick={manejarToggleConDependencias}>
                        <div className={`habitoCheckbox ${completadoHoy ? 'habitoCheckboxCompletado' : ''} ${esDestello ? 'dependenciaDestello' : ''}`}>{completadoHoy && <Check size={10} />}</div>
                    </div>
                )}

                {/* Nombre y Tags */}
                <div className="tablaColumnaNombre">
                    <div className="filaNombreContenedor">
                        <span className={`filaNombre ${completadoHoy ? 'filaNombreCompletado' : ''}`}>{habito.nombre}</span>
                        <BadgeGroup>
                            {habito.dependencias && habito.dependencias.length > 0 && (
                                <span className="dependenciaBadge" title={nombresBloqueantes.join(', ')}>
                                    <Lock size={10} />
                                </span>
                            )}
                            {configuracion.columnasVisibles.frecuencia && intervaloFrecuencia !== null && <BadgeInfo tipo="frecuencia" icono={<Clock size={10} />} texto={intervaloFrecuencia.toString()} titulo={`Frecuencia: ${textoFrecuencia}`} variante="frecuencia" />}
                            {configuracion.columnasVisibles.tocaHoy && pospuestoHoy && <BadgeInfo tipo="personalizado" icono={<Pause size={10} />} texto="Pospuesto" variante="pospuesto" />}
                            {configuracion.columnasVisibles.tocaHoy && habitoTocaHoy && !completadoHoy && !pospuestoHoy && <BadgeInfo tipo="destacado" texto="Hoy" variante="destacado" />}
                        </BadgeGroup>
                    </div>
                </div>

                {/* Historial 5 dias - Actividad */}
                {configuracion.columnasVisibles.historial && (
                    <div className="tablaColumnaHistorial">
                        <HistorialHabitoInline
                            historial={historialParaComponente}
                            frecuencia={frecuencia}
                            fechaCreacion={habito.fechaCreacion}
                            onClickDia={(fecha, estadoActual) => {
                                if (estadoActual) {
                                    onDesmarcarDia?.(habito.id, fecha);
                                } else {
                                    onMarcarDia?.(habito.id, fecha, 'completado');
                                }
                            }}
                        />
                    </div>
                )}

                {/* Prioridad */}
                {configuracion.columnasVisibles.importancia && (
                    <div className="tablaColumnaPrioridad">
                        <BadgeInfo tipo="prioridad" texto={habito.importancia.toUpperCase()} variante={variantePrioridad} />
                    </div>
                )}

                {/* Inactividad - dias sin hacer */}
                {configuracion.columnasVisibles.inactividad && (
                    <div className="tablaColumnaInactividad">
                        <div className="inactividadIndicador">
                            <Clock size={10} className={esUrgente ? 'inactividadIconoUrgente' : 'inactividadIcono'} />
                            <span className={esUrgente ? 'inactividadTextoUrgente' : 'inactividadTexto'}>{habito.diasInactividad}d</span>
                        </div>
                    </div>
                )}

                {/* Urgencia - barra de progreso visual */}
                {configuracion.columnasVisibles.urgencia && (
                    <div className="tablaColumnaUrgencia">
                        <div className="urgenciaContenedor">
                            <div className="barraUrgenciaNueva">
                                <div className={`barraRellenoNueva ${claseUrgencia}`} style={{width: `${porcentajeUrgencia}%`}}></div> {/* sentinel-disable inline-style-prohibido */}
                            </div>
                            <span className={`urgenciaPorcentaje ${esUrgente ? 'urgenciaPorcentajeAlto' : ''}`}>{Math.round(porcentajeUrgencia)}%</span>
                        </div>
                    </div>
                )}

                {/* Racha - indicador separado */}
                {configuracion.columnasVisibles.racha && (
                    <div className="tablaColumnaRacha">
                        <div className={`rachaContenedor ${rachaEnPeligro && !completadoHoy ? 'rachaContenedorPeligro' : ''} ${completadoHoy ? 'rachaContenedorCompletado' : ''}`}>
                            {rachaEnPeligro && !completadoHoy && <AlertTriangle size={10} className="rachaIconoAdvertencia" />}
                            {rachaPerdida && habito.racha === 0 ? <Flame size={10} className="rachaIconoPerdida" /> : <Flame size={10} className={`rachaIcono ${habito.racha > 0 ? 'rachaIconoActivo' : ''}`} />}
                            <span className="rachaNumero">{habito.racha}</span>
                            {rachaEnPeligro && !completadoHoy && <span className="rachaTiempoRestante">({diasAntesDePerder}d)</span>}
                        </div>
                    </div>
                )}

                {/* Acciones inline (hover) */}
                {configuracion.columnasVisibles.acciones && <div className="tablaColumnaAcciones">{mostrarAcciones && <AccionesItem mostrarConfigurar={true} mostrarEliminar={true} onConfigurar={manejarEditar} onEliminar={() => onEliminar?.(habito.id)} />}</div>}
            </div>

            {/* Menu contextual */}
            {menuContextual.visible && <MenuContextualAdaptivo opciones={opcionesMenu} posicionX={menuContextual.posicion.x} posicionY={menuContextual.posicion.y} onSeleccionar={manejarOpcionMenu} onCerrar={menuContextual.cerrar} titulo={habito.nombre} />}
        </>
    );
}
