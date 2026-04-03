/*
 * TablaHabitos
 * Componente para mostrar la tabla de hábitos prioritarios
 * Responsabilidad única: renderizar lista de hábitos con su estado
 * Lógica extraída a useTablaHabitos y useFilaHabito hooks
 */

import {useMemo} from 'react';
import {Clock, Flame, Target, Check, Pause, AlertTriangle, Play, Square} from 'lucide-react';
import type {Habito} from '../../types/dashboard';
import {MenuContextualAdaptivo} from '../shared/MenuContextualAdaptivo';
import {DashboardPanel} from '../shared/DashboardPanel';
import {EstadoVacio} from '../shared/EstadoVacio';
import {BadgeInfo, BadgeGroup} from '../shared/BadgeInfo';
import {AccionesItem} from '../shared/AccionesItem';
import type {ConfiguracionHabitos} from '../../hooks/useConfiguracionHabitos';
import {CONFIG_HABITOS_POR_DEFECTO} from '../../hooks/useConfiguracionHabitos';
import {HistorialHabitoInline} from '../shared/HistorialHabito';
import {generarOpcionesMenuHabito} from '../../config/opcionesMenuHabito';
import {useTablaHabitos, useFilaHabito} from '../../hooks/dashboard/useTablaHabitos';

interface TablaHabitosProps {
    habitos: Habito[];
    onAñadirHabito?: () => void;
    onToggleHabito?: (id: number) => void;
    onEditarHabito?: (habito: Habito) => void;
    onEliminarHabito?: (id: number) => void;
    onPosponerHabito?: (id: number) => void;
    onPausarHabito?: (id: number) => void;
    onMarcarDiaHabito?: (habitoId: number, fecha: string, estado: 'completado' | 'pospuesto') => void;
    onDesmarcarDiaHabito?: (habitoId: number, fecha: string) => void;
    onActualizarHabito?: (id: number, datos: Partial<Habito>) => void;
    configuracion?: ConfiguracionHabitos;
}

interface FilaHabitoProps {
    habito: Habito;
    indice: number;
    onToggle?: (id: number) => void;
    onEditar?: (habito: Habito) => void;
    onEliminar?: (id: number) => void;
    onPosponer?: (id: number) => void;
    onPausar?: (id: number) => void;
    onMarcarDia?: (habitoId: number, fecha: string, estado: 'completado' | 'pospuesto') => void;
    onDesmarcarDia?: (habitoId: number, fecha: string) => void;
    onActualizar?: (id: number, datos: Partial<Habito>) => void;
    configuracion: ConfiguracionHabitos;
    estiloGrid: React.CSSProperties;
}

function FilaHabito({habito, indice: _indice, onToggle, onEditar, onEliminar, onPosponer, onPausar, onMarcarDia, onDesmarcarDia, onActualizar, configuracion, estiloGrid}: FilaHabitoProps): JSX.Element {
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
            <div className={`tablaFila tablaFilaEditable ${completadoHoy ? 'tablaFilaCompletada' : ''} ${configuracion.modoCompacto ? 'tablaFilaCompacta' : ''} ${habitoTocaHoy && !completadoHoy ? 'tablaFilaTocaHoy' : ''} ${estaPausado ? 'tablaFilaPausada' : ''}`} onClick={manejarEditar} onContextMenu={manejarClickDerecho} onMouseEnter={() => setMostrarAcciones(true)} onMouseLeave={() => setMostrarAcciones(false)} style={estiloGrid}>
                {/* Checkbox para completar rápidamente - Indice */}
                {configuracion.columnasVisibles.indice && (
                    <div className="tablaColumnaCheckbox" onClick={manejarToggle}>
                        <div className={`habitoCheckbox ${completadoHoy ? 'habitoCheckboxCompletado' : ''}`}>{completadoHoy && <Check size={10} />}</div>
                    </div>
                )}

                {/* Nombre y Tags */}
                <div className="tablaColumnaNombre">
                    <div className="filaNombreContenedor">
                        <span className={`filaNombre ${completadoHoy ? 'filaNombreCompletado' : ''}`}>{habito.nombre}</span>
                        <BadgeGroup>
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

export function TablaHabitos({habitos, onAñadirHabito, onToggleHabito, onEditarHabito, onEliminarHabito, onPosponerHabito, onPausarHabito, onMarcarDiaHabito, onDesmarcarDiaHabito, onActualizarHabito, configuracion = CONFIG_HABITOS_POR_DEFECTO}: TablaHabitosProps): JSX.Element {
    const {habitosVisibles, habitosPausados, estiloGrid} = useTablaHabitos(habitos, configuracion);

    return (
        <DashboardPanel id="tabla-habitos">
            {habitos.length === 0 ? (
                <EstadoVacio icono={<Target size={32} />} mensaje="No hay hábitos creados" textoBoton="+ Crear hábito" onAccion={onAñadirHabito} />
            ) : (
                <>
                    {/* Encabezado de tabla */}
                    <div className="tablaEncabezado" style={estiloGrid}>
                        {configuracion.columnasVisibles.indice && <div className="tablaColumnaCheckbox"></div>}
                        <div className="tablaColumnaNombre">HABITO</div>
                        {configuracion.columnasVisibles.historial && <div className="tablaColumnaHistorial">ACTIVIDAD</div>}
                        {configuracion.columnasVisibles.importancia && <div className="tablaColumnaPrioridad">PRIO</div>}
                        {configuracion.columnasVisibles.inactividad && <div className="tablaColumnaInactividad">DIAS</div>}
                        {configuracion.columnasVisibles.urgencia && <div className="tablaColumnaUrgencia">URGENCIA</div>}
                        {configuracion.columnasVisibles.racha && <div className="tablaColumnaRacha">RACHA</div>}
                        {configuracion.columnasVisibles.acciones && <div className="tablaColumnaAcciones"></div>}
                    </div>

                    {/* Filas de habitos activos */}
                    {habitosVisibles.map((habito, index) => (
                        <FilaHabito key={habito.id} habito={habito} indice={index} onToggle={onToggleHabito} onEditar={onEditarHabito} onEliminar={onEliminarHabito} onPosponer={onPosponerHabito} onPausar={onPausarHabito} onMarcarDia={onMarcarDiaHabito} onDesmarcarDia={onDesmarcarDiaHabito} onActualizar={onActualizarHabito} configuracion={configuracion} estiloGrid={estiloGrid} />
                    ))}

                    {/* Seccion de habitos pausados */}
                    {configuracion.mostrarPausados && habitosPausados.length > 0 && (
                        <>
                            <div className="tablaSeparadorPausados">
                                <span className="tablaSeparadorPausados__texto">Pausados ({habitosPausados.length})</span>
                            </div>
                            {habitosPausados.map((habito, index) => (
                                <FilaHabito key={habito.id} habito={habito} indice={index} onToggle={onToggleHabito} onEditar={onEditarHabito} onEliminar={onEliminarHabito} onPosponer={onPosponerHabito} onPausar={onPausarHabito} onMarcarDia={onMarcarDiaHabito} onDesmarcarDia={onDesmarcarDiaHabito} onActualizar={onActualizarHabito} configuracion={configuracion} estiloGrid={estiloGrid} />
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
