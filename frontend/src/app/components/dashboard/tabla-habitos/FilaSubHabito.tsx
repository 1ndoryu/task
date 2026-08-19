/*
 * components/dashboard/tabla-habitos/FilaSubHabito.tsx
 * [H-F13-01] Fila de subhábito — mismo aspecto visual que un hábito, indentado
 * bajo el padre. Incluye el hook local de cálculo (urgencia/inactividad) y el
 * bloqueo por dependencias.
 */

import React, {useMemo, useCallback} from 'react';
import {Check, Pause, Clock, Flame, Lock} from 'lucide-react';
import type {Habito, SubHabito, Tarea} from '../../../types/dashboard';
import {FRECUENCIA_POR_DEFECTO} from '../../../types/dashboard';
import {obtenerFechaHoy} from '../../../utils/fecha';
import {calcularUmbralInactividad} from '../../../utils/frecuenciaHabitos';
import {obtenerVariantePrioridad} from '../../../hooks/dashboard/useTablaHabitos';
import {useDependenciasElemento} from '../../../hooks/useDependenciasElemento';
import type {ConfiguracionHabitos} from '../../../hooks/useConfiguracionHabitos';
import {useDependenciasUIStore} from '../../../stores/dependenciasUIStore';
import {useAlertasContext} from '../../../context/AlertasContext';
import {BadgeInfo, BadgeGroup} from '../../shared/BadgeInfo';
import {AccionesItem} from '../../shared/AccionesItem';
import {HistorialHabitoInline} from '../../shared/HistorialHabito';

interface FilaSubHabitoProps {
    subHabito: SubHabito;
    habitoPadreId: number;
    frecuenciaPadre: Habito['frecuencia'];
    onToggle?: (habitoId: number, subHabitoId: number) => void;
    onConfigurar?: (habitoId: number, subHabitoId: number) => void;
    onPosponerConTiempo?: (habitoId: number, subHabitoId: number, hasta: string | null) => void;
    configuracion: ConfiguracionHabitos;
    estiloGrid: React.CSSProperties;
    tareas?: Tarea[];
    habitos?: Habito[];
}

/* Reutiliza los cálculos de urgencia/inactividad del hook para mantener coherencia visual */
function useFilaSubHabito(subHabito: SubHabito, frecuenciaPadre: Habito['frecuencia']) {
    const hoy = obtenerFechaHoy();
    const completadoHoy = subHabito.ultimoCompletado === hoy || subHabito.historialCompletados?.includes(hoy);
    const pospuestoHoy = subHabito.historialPospuestos?.includes(hoy) ?? false;
    const pospuestoHasta = subHabito.pospuestoHasta ? new Date(subHabito.pospuestoHasta) > new Date() : false;
    const estaPausado = subHabito.pausado ?? false;

    const frecuencia = subHabito.frecuencia || frecuenciaPadre || FRECUENCIA_POR_DEFECTO;
    const umbralInactividad = calcularUmbralInactividad(frecuencia);
    const esUrgente = subHabito.diasInactividad > Math.floor(umbralInactividad * 0.4);
    const porcentajeUrgencia = Math.min((subHabito.diasInactividad / umbralInactividad) * 100, 100);

    const variantePrioridad = obtenerVariantePrioridad(subHabito.importancia);

    const claseUrgencia = (() => {
        if (completadoHoy) return 'barraRellenoCompletado';
        if (porcentajeUrgencia >= 80) return 'barraRellenoUrgenteCritico';
        if (esUrgente) return 'barraRellenoUrgente';
        if (porcentajeUrgencia >= 40) return 'barraRellenoAdvertencia';
        return '';
    })();

    const historialParaComponente = useMemo(() => {
        const resultado: Record<string, 'completado' | 'pospuesto'> = {};
        if (subHabito.historialCompletados) {
            for (const fecha of subHabito.historialCompletados) {
                resultado[fecha] = 'completado';
            }
        }
        if (subHabito.historialPospuestos) {
            for (const fecha of subHabito.historialPospuestos) {
                resultado[fecha] = 'pospuesto';
            }
        }
        return resultado;
    }, [subHabito.historialCompletados, subHabito.historialPospuestos]);

    return {
        hoy,
        completadoHoy,
        pospuestoHoy,
        pospuestoHasta,
        estaPausado,
        frecuencia,
        esUrgente,
        porcentajeUrgencia,
        variantePrioridad,
        claseUrgencia,
        historialParaComponente
    };
}

export function FilaSubHabito({subHabito, habitoPadreId, frecuenciaPadre, onToggle, onConfigurar, configuracion, estiloGrid, tareas = [], habitos = []}: FilaSubHabitoProps): JSX.Element {
    const {
        completadoHoy,
        pospuestoHasta,
        estaPausado,
        frecuencia,
        esUrgente,
        porcentajeUrgencia,
        variantePrioridad,
        claseUrgencia,
        historialParaComponente
    } = useFilaSubHabito(subHabito, frecuenciaPadre);

    const {bloqueado, nombresBloqueantes} = useDependenciasElemento('subhabito', subHabito.id, habitoPadreId, subHabito, tareas, habitos);
    const {mostrarAdvertencia} = useAlertasContext();
    const destello = useDependenciasUIStore(s => s.destello);
    const activarDestello = useDependenciasUIStore(s => s.activarDestello);
    const esDestello = destello?.tipo === 'subhabito' && destello.id === subHabito.id && destello.padreId === habitoPadreId;

    const manejarToggle = useCallback((e: React.MouseEvent) => {
        if (bloqueado) {
            e.stopPropagation();
            e.preventDefault();
            activarDestello({tipo: 'subhabito', id: subHabito.id, padreId: habitoPadreId});
            mostrarAdvertencia(`Debes completar primero: ${nombresBloqueantes.join(', ')}`);
            return;
        }
        e.stopPropagation();
        onToggle?.(habitoPadreId, subHabito.id);
    }, [bloqueado, nombresBloqueantes, activarDestello, mostrarAdvertencia, subHabito.id, habitoPadreId, onToggle]);

    const manejarConfigurar = useCallback(() => {
        onConfigurar?.(habitoPadreId, subHabito.id);
    }, [onConfigurar, habitoPadreId, subHabito.id]);

    return (
        <div
            className={`tablaFila tablaFilaEditable tablaFila--subhabito ${completadoHoy ? 'tablaFilaCompletada' : ''} ${configuracion.modoCompacto ? 'tablaFilaCompacta' : ''} ${estaPausado ? 'tablaFilaPausada' : ''} ${bloqueado ? 'dependenciaBloqueada' : ''} ${esDestello ? 'dependenciaDestello' : ''}`}
            onClick={manejarConfigurar}
            style={estiloGrid}
        >
            {/* Checkbox */}
            {configuracion.columnasVisibles.indice && (
                <div className="tablaColumnaCheckbox" onClick={manejarToggle}>
                    <div className={`habitoCheckbox ${completadoHoy ? 'habitoCheckboxCompletado' : ''} ${esDestello ? 'dependenciaDestello' : ''}`}>{completadoHoy && <Check size={10} />}</div>
                </div>
            )}

            {/* Nombre con indentación visual */}
            <div className="tablaColumnaNombre">
                <div className="filaNombreContenedor">
                    <span className={`filaNombre filaNombreSubhabito ${completadoHoy ? 'filaNombreCompletado' : ''}`}>{subHabito.nombre}</span>
                    <BadgeGroup>
                        {subHabito.dependencias && subHabito.dependencias.length > 0 && (
                            <span className="dependenciaBadge" title={nombresBloqueantes.join(', ')}>
                                <Lock size={10} />
                            </span>
                        )}
                        {configuracion.columnasVisibles.tocaHoy && pospuestoHasta && <BadgeInfo tipo="personalizado" icono={<Pause size={10} />} texto="Pospuesto" variante="pospuesto" />}
                        {configuracion.columnasVisibles.tocaHoy && estaPausado && <BadgeInfo tipo="personalizado" icono={<Pause size={10} />} texto="Pausado" variante="pospuesto" />}
                    </BadgeGroup>
                </div>
            </div>

            {/* Historial 5 días - Actividad */}
            {configuracion.columnasVisibles.historial && (
                <div className="tablaColumnaHistorial">
                    <HistorialHabitoInline
                        historial={historialParaComponente}
                        frecuencia={frecuencia}
                        fechaCreacion={subHabito.fechaCreacion}
                        onClickDia={() => {}}
                    />
                </div>
            )}

            {/* Prioridad */}
            {configuracion.columnasVisibles.importancia && (
                <div className="tablaColumnaPrioridad">
                    <BadgeInfo tipo="prioridad" texto={subHabito.importancia.toUpperCase()} variante={variantePrioridad} />
                </div>
            )}

            {/* Inactividad */}
            {configuracion.columnasVisibles.inactividad && (
                <div className="tablaColumnaInactividad">
                    <div className="inactividadIndicador">
                        <Clock size={10} className={esUrgente ? 'inactividadIconoUrgente' : 'inactividadIcono'} />
                        <span className={esUrgente ? 'inactividadTextoUrgente' : 'inactividadTexto'}>{subHabito.diasInactividad}d</span>
                    </div>
                </div>
            )}

            {/* Urgencia */}
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

            {/* Racha */}
            {configuracion.columnasVisibles.racha && (
                <div className="tablaColumnaRacha">
                    <div className="rachaContenedor">
                        <Flame size={10} className={`rachaIcono ${subHabito.racha > 0 ? 'rachaIconoActivo' : ''}`} />
                        <span className="rachaNumero">{subHabito.racha}</span>
                    </div>
                </div>
            )}

            {/* Acciones */}
            {configuracion.columnasVisibles.acciones && (
                <div className="tablaColumnaAcciones">
                    <AccionesItem mostrarConfigurar={!!onConfigurar} mostrarEliminar={false} onConfigurar={manejarConfigurar} />
                </div>
            )}
        </div>
    );
}
