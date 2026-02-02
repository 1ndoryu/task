/*
 * TablaHabitos
 * Componente para mostrar la tabla de hábitos prioritarios
 * Responsabilidad única: renderizar lista de hábitos con su estado
 * Tarea 0.5: BottomSheet para hábitos en móvil
 */

import {useState, useCallback, useMemo} from 'react';
import {useMenuContextualConId} from '../../hooks/useMenuContextualGlobal';
import {useEsMovil} from '../../hooks/useEsMovil';
import {Clock, Flame, Target, Check, Pause, AlertTriangle} from 'lucide-react';
import type {Habito} from '../../types/dashboard';
import {FRECUENCIA_POR_DEFECTO} from '../../types/dashboard';
import {tocaHoy, describirFrecuencia, obtenerIntervaloFrecuencia, calcularUmbralInactividad} from '../../utils/frecuenciaHabitos';
import {MenuContextualAdaptivo} from '../shared/MenuContextualAdaptivo';
import {DashboardPanel} from '../shared/DashboardPanel';
import {EstadoVacio} from '../shared/EstadoVacio';
import {BadgeInfo, BadgeGroup} from '../shared/BadgeInfo';
import {AccionesItem} from '../shared/AccionesItem';
import type {VarianteBadge} from '../shared/BadgeInfo';
import {ConfiguracionHabitos, CONFIG_HABITOS_POR_DEFECTO} from '../../hooks/useConfiguracionHabitos';
import {HistorialHabitoInline} from '../shared/HistorialHabito';
import type {EstadoHabito} from '../../types/historialHabitos';
import {obtenerFechaHoy} from '../../utils/fecha';
import {generarOpcionesMenuHabito, MENU_HABITO_IDS, extraerImportanciaDeOpcion} from '../../config/opcionesMenuHabito';

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
    onActualizarHabito?: (id: number, datos: any) => void;
    configuracion?: ConfiguracionHabitos;
}

function obtenerVariantePrioridad(importancia: Habito['importancia']): VarianteBadge {
    switch (importancia) {
        case 'Muy Alta':
            return 'prioridadMuyAlta';
        case 'Alta':
            return 'prioridadAlta';
        case 'Media':
            return 'prioridadMedia';
        case 'Baja':
            return 'prioridadBaja';
    }
}

/*
 * Determina si el habito fue completado hoy
 */
function fueCompletadoHoy(ultimoCompletado: string | undefined): boolean {
    if (!ultimoCompletado) return false;
    const hoy = obtenerFechaHoy();
    return ultimoCompletado === hoy;
}

/*
 * Determina si el habito fue pospuesto hoy
 */
function fuePospuestoHoy(historialPospuestos: string[] | undefined): boolean {
    if (!historialPospuestos || historialPospuestos.length === 0) return false;
    const hoy = obtenerFechaHoy();
    return historialPospuestos.includes(hoy);
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
    onActualizar?: (id: number, datos: any) => void;
    configuracion: ConfiguracionHabitos;
    estiloGrid: React.CSSProperties;
}

/* Interfaz MenuContextualEstado ya no es necesaria, usa hook global */

function FilaHabito({habito, indice, onToggle, onEditar, onEliminar, onPosponer, onPausar, onMarcarDia, onDesmarcarDia, onActualizar, configuracion, estiloGrid}: FilaHabitoProps): JSX.Element {
    /* Advertencia de racha: mostrar cuando faltan pocos dias para perderla */
    const DIAS_ADVERTENCIA_RACHA = 2;

    /* Detectar viewport móvil para cambiar comportamiento de click */
    const {esMovil} = useEsMovil();

    /* Menú contextual coordinado globalmente - Solo un menú abierto a la vez */
    const menuContextual = useMenuContextualConId(`habito-${habito.id}`);
    const [mostrarAcciones, setMostrarAcciones] = useState(false);

    /* Frecuencia del habito */
    const frecuencia = habito.frecuencia || FRECUENCIA_POR_DEFECTO;
    const umbralInactividad = calcularUmbralInactividad(frecuencia);

    /* Calculos basados en el umbral de la frecuencia */
    const esUrgente = habito.diasInactividad > Math.floor(umbralInactividad * 0.4);
    const porcentajeUrgencia = Math.min((habito.diasInactividad / umbralInactividad) * 100, 100);
    const completadoHoy = fueCompletadoHoy(habito.ultimoCompletado);

    const habitoTocaHoy = tocaHoy(frecuencia, habito.ultimoCompletado);
    const pospuestoHoy = fuePospuestoHoy(habito.historialPospuestos);
    const textoFrecuencia = describirFrecuencia(frecuencia);
    const intervaloFrecuencia = obtenerIntervaloFrecuencia(frecuencia);

    /* Logica de advertencia de racha */
    const diasAntesDePerder = umbralInactividad - habito.diasInactividad;
    const rachaEnPeligro = habito.racha > 0 && diasAntesDePerder <= DIAS_ADVERTENCIA_RACHA && diasAntesDePerder > 0;
    const rachaPerdida = habito.diasInactividad > umbralInactividad;

    /* Construir historial directamente desde los arrays del hábito */
    const historialParaComponente = useMemo((): {[fecha: string]: EstadoHabito} => {
        const resultado: {[fecha: string]: EstadoHabito} = {};

        /* Marcar dias completados */
        if (habito.historialCompletados) {
            for (const fecha of habito.historialCompletados) {
                resultado[fecha] = 'completado';
            }
        }

        /* Marcar dias pospuestos (sobrescribe completados si hay conflicto) */
        if (habito.historialPospuestos) {
            for (const fecha of habito.historialPospuestos) {
                resultado[fecha] = 'pospuesto';
            }
        }

        return resultado;
    }, [habito.historialCompletados, habito.historialPospuestos]);

    const manejarToggle = useCallback(
        (evento: React.MouseEvent) => {
            evento.stopPropagation();
            onToggle?.(habito.id);
        },
        [onToggle, habito.id]
    );

    const manejarEditar = useCallback(() => {
        /* En móvil: abrir menú contextual (BottomSheet) en vez de ir directo a editar */
        if (esMovil) {
            menuContextual.toggle(window.innerWidth / 2, window.innerHeight / 2);
            return;
        }
        onEditar?.(habito);
    }, [onEditar, habito, esMovil, menuContextual]);

    /* Usa sistema global para coordinar cierres entre tareas y hábitos */
    const manejarClickDerecho = useCallback(
        (evento: React.MouseEvent) => {
            evento.preventDefault();
            evento.stopPropagation();
            /* toggle: si el menú de este hábito ya está abierto, lo cierra; si no, lo abre (cerrando cualquier otro) */
            menuContextual.toggle(evento.clientX, evento.clientY);
        },
        [menuContextual]
    );

    /* Usando configuración centralizada de menú para consistencia entre paneles */
    const estaPausado = habito.pausado ?? false;
    const opcionesMenu = useMemo(
        () =>
            generarOpcionesMenuHabito({
                completadoHoy,
                estaPausado,
                tieneActualizar: !!onActualizar
            }),
        [completadoHoy, estaPausado, onActualizar]
    );

    const manejarOpcionMenu = useCallback(
        (opcionId: string) => {
            switch (opcionId) {
                case MENU_HABITO_IDS.EDITAR:
                    onEditar?.(habito);
                    break;
                case MENU_HABITO_IDS.TOGGLE:
                    onToggle?.(habito.id);
                    break;
                case MENU_HABITO_IDS.POSPONER:
                    onPosponer?.(habito.id);
                    break;
                case MENU_HABITO_IDS.PAUSAR:
                    onPausar?.(habito.id);
                    break;
                case MENU_HABITO_IDS.ELIMINAR:
                    onEliminar?.(habito.id);
                    break;
            }
            /* Manejar cambio de importancia */
            const nuevaImportancia = extraerImportanciaDeOpcion(opcionId);
            if (nuevaImportancia) {
                onActualizar?.(habito.id, {
                    ...habito,
                    importancia: nuevaImportancia
                });
            }
        },
        [habito, onEditar, onToggle, onPosponer, onPausar, onEliminar, onActualizar]
    );

    /* Determinar clase de urgencia para la barra */
    const obtenerClaseUrgencia = (): string => {
        if (completadoHoy) return 'barraRellenoCompletado';
        if (porcentajeUrgencia >= 80) return 'barraRellenoUrgenteCritico';
        if (esUrgente) return 'barraRellenoUrgente';
        if (porcentajeUrgencia >= 40) return 'barraRellenoAdvertencia';
        return '';
    };

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
                        <BadgeInfo tipo="prioridad" texto={habito.importancia.toUpperCase()} variante={obtenerVariantePrioridad(habito.importancia)} />
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
                                <div className={`barraRellenoNueva ${obtenerClaseUrgencia()}`} style={{width: `${porcentajeUrgencia}%`}}></div>
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
    /* Filtrar habitos segun configuracion */
    const habitosVisibles = habitos.filter(habito => {
        /* Ocultar habitos pausados (se muestran en seccion separada) */
        if (habito.pausado) {
            return false;
        }
        if (configuracion.ocultarCompletadosHoy && fueCompletadoHoy(habito.ultimoCompletado)) {
            return false;
        }
        return true;
    });

    /* Habitos pausados para mostrar en seccion separada */
    const habitosPausados = habitos.filter(habito => habito.pausado);

    const obtenerGridTemplate = () => {
        const widths = [];
        if (configuracion.columnasVisibles.indice) widths.push('2rem');
        /* Nombre siempre visible */
        widths.push('3fr');
        if (configuracion.columnasVisibles.historial) widths.push('auto');
        if (configuracion.columnasVisibles.importancia) widths.push('1fr');
        if (configuracion.columnasVisibles.inactividad) widths.push('1fr');
        if (configuracion.columnasVisibles.urgencia) widths.push('2fr');
        if (configuracion.columnasVisibles.racha) widths.push('1.5fr');
        if (configuracion.columnasVisibles.acciones) widths.push('auto');
        return widths.join(' ');
    };

    const estiloGrid = {gridTemplateColumns: obtenerGridTemplate()};

    return (
        <DashboardPanel id="tabla-habitos">
            {/* Estado vacio cuando no hay habitos */}
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
