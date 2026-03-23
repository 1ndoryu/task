/* [233A-27] Secciones de configuración de paneles para el modal global
 * Componentes: SeccionConfigTareas, SeccionConfigHabitos, SeccionConfigProyectos,
 * SeccionConfigScratchpad, SeccionConfigActividad
 * Cada sección usa su hook directamente — no depende de props del padre */

import {ToggleSwitch} from '../../shared/ToggleSwitch';
import {Boton} from '../../ui';
import {Select} from '../../ui';
import {useConfiguracionTareas} from '../../../hooks/useConfiguracionTareas';
import {useConfiguracionHabitos} from '../../../hooks/useConfiguracionHabitos';
import {useConfiguracionProyectos} from '../../../hooks/useConfiguracionProyectos';
import {useConfiguracionScratchpad} from '../../../hooks/useConfiguracionScratchpad';
import {useConfiguracionActividad} from '../../../hooks/useConfiguracionActividad';
import {useEsDispositivoMovil} from '../../../hooks/useEsMovil';
import type {ColumnasHabitos, ToleranciaPreset} from '../../../hooks/useConfiguracionHabitos';
import type {TamanoFuente} from '../../../hooks/useConfiguracionScratchpad';
import type {PeriodoActividad, FiltroTipoActividad, TamanoCeldaActividad} from '../../../hooks/useConfiguracionActividad';
import {SeccionPanel, SelectorNivel} from '../../shared';

/* Helper reutilizable para items toggle */
function ItemToggle({titulo, descripcion, checked, onChange}: {titulo: string; descripcion: string; checked: boolean; onChange: () => void}) {
    return (
        <>
            <div className="itemOpcionConfig">
                <div className="detallesOpcionConfig">
                    <span className="tituloOpcionConfig">{titulo}</span>
                    <span className="descripcionOpcionConfig">{descripcion}</span>
                </div>
                <ToggleSwitch checked={checked} onChange={onChange} />
            </div>
            <div className="separadorOpcionesConfig" />
        </>
    );
}

/* ── TAREAS ────────────────────────────────────────────── */
export function SeccionConfigTareas(): JSX.Element {
    const {configuracion, toggleOcultarCompletadas, toggleOcultarBadgeProyecto, toggleEliminarCompletadasDespuesDeUnDia, toggleMostrarHabitosEnEjecucion, toggleModoCompacto, toggleOcultarSubtareasAutomaticamente} = useConfiguracionTareas();
    return (
        <div className="contenedorOpcionesConfig">
            <ItemToggle titulo="Ocultar tareas completadas" descripcion="Las tareas finalizadas no aparecerán en la lista" checked={configuracion.ocultarCompletadas} onChange={toggleOcultarCompletadas} />
            <ItemToggle titulo="Ocultar nombre de proyecto" descripcion="No mostrar el badge del proyecto en las tareas" checked={configuracion.ocultarBadgeProyecto} onChange={toggleOcultarBadgeProyecto} />
            <ItemToggle titulo="Colapsar subtareas automáticamente" descripcion="Las subtareas estarán colapsadas por defecto" checked={configuracion.ocultarSubtareasAutomaticamente} onChange={toggleOcultarSubtareasAutomaticamente} />
            <ItemToggle titulo="Limpieza automática" descripcion="Eliminar tareas completadas después de 24 horas" checked={configuracion.eliminarCompletadasDespuesDeUnDia} onChange={toggleEliminarCompletadasDespuesDeUnDia} />
            <ItemToggle titulo="Mostrar hábitos en Ejecución" descripcion="Los hábitos de hoy aparecerán como tareas en la lista" checked={configuracion.mostrarHabitosEnEjecucion} onChange={toggleMostrarHabitosEnEjecucion} />
            <ItemToggle titulo="Modo compacto" descripcion="Reducir el tamaño de la fuente y el espaciado" checked={configuracion.modoCompacto} onChange={toggleModoCompacto} />
        </div>
    );
}

/* ── HÁBITOS ───────────────────────────────────────────── */
const PRESETS_INFO: Record<Exclude<ToleranciaPreset, 'personalizado'>, {etiqueta: string; descripcion: string}> = {
    muyEstricto: {etiqueta: 'Muy Estricto', descripcion: '1 día = urgente, 2+ = bloqueante'},
    estricto: {etiqueta: 'Estricto', descripcion: '2 días = urgente, 4+ = bloqueante'},
    moderado: {etiqueta: 'Moderado', descripcion: '3 días = urgente, 5+ = bloqueante'},
    relajado: {etiqueta: 'Relajado', descripcion: '1 semana = urgente, 2+ = bloqueante'}
};

const INFO_COLUMNAS: Record<keyof ColumnasHabitos, {etiqueta: string; descripcion: string}> = {
    indice: {etiqueta: 'Índice (#)', descripcion: 'Checkbox para completar'},
    nombre: {etiqueta: 'Nombre', descripcion: 'Nombre del hábito (fijo)'},
    historial: {etiqueta: 'Actividad (5 días)', descripcion: 'Historial visual reciente'},
    racha: {etiqueta: 'Racha', descripcion: 'Contador de días seguidos'},
    frecuencia: {etiqueta: 'Frecuencia', descripcion: 'Si es diario, semanal...'},
    importancia: {etiqueta: 'Importancia', descripcion: 'Badge de prioridad'},
    tocaHoy: {etiqueta: 'Toca Hoy', descripcion: 'Indicador visual'},
    acciones: {etiqueta: 'Acciones', descripcion: 'Botones rápidos'},
    urgencia: {etiqueta: 'Urgencia', descripcion: 'Barra de progreso visual'},
    inactividad: {etiqueta: 'Inactividad', descripcion: 'Días sin realizar'}
};

const COLUMNAS_MOVIL: Array<keyof ColumnasHabitos> = ['indice', 'historial', 'importancia'];

export function SeccionConfigHabitos(): JSX.Element {
    const {configuracion, toggleOcultarCompletadosHoy, toggleModoCompacto, toggleMostrarPausados, toggleColumnaVisible, cambiarToleranciaPreset} = useConfiguracionHabitos();
    const esMovil = useEsDispositivoMovil();
    const columnas = esMovil ? (Object.keys(configuracion.columnasVisibles) as Array<keyof ColumnasHabitos>).filter(c => COLUMNAS_MOVIL.includes(c)) : (Object.keys(configuracion.columnasVisibles) as Array<keyof ColumnasHabitos>);

    return (
        <div className="contenedorOpcionesConfig">
            <ItemToggle titulo="Ocultar hábitos completados hoy" descripcion="Los hábitos realizados desaparecerán hasta mañana" checked={configuracion.ocultarCompletadosHoy} onChange={toggleOcultarCompletadosHoy} />
            <ItemToggle titulo="Modo Compacto" descripcion="Reducir el espaciado vertical de las filas" checked={configuracion.modoCompacto} onChange={toggleModoCompacto} />
            <ItemToggle titulo="Mostrar hábitos pausados" descripcion="Incluye sección separada con hábitos en pausa" checked={configuracion.mostrarPausados} onChange={toggleMostrarPausados} />

            {!esMovil && (
                <div className="seccionConfiguracion">
                    <h4 className="tituloSeccionConfig">Tolerancia de Urgencia</h4>
                    <span className="descripcionSeccionConfig">Define qué tan estricto es el sistema al marcar hábitos como urgentes</span>
                    <div className="gridOpcionesTolerancia">
                        {(Object.keys(PRESETS_INFO) as Array<Exclude<ToleranciaPreset, 'personalizado'>>).map(preset => (
                            <Boton key={preset} type="button" claseAdicional={`botonPresetTolerancia ${configuracion.toleranciaPreset === preset ? 'botonPresetTolerancia--activo' : ''}`} onClick={() => cambiarToleranciaPreset(preset)}>
                                <span className="etiquetaPreset">{PRESETS_INFO[preset].etiqueta}</span>
                                <span className="descripcionPreset">{PRESETS_INFO[preset].descripcion}</span>
                            </Boton>
                        ))}
                    </div>
                    <div className="separadorOpcionesConfig" />
                </div>
            )}

            <div className="seccionConfiguracion">
                <h4 className="tituloSeccionConfig">Columnas Visibles</h4>
                <div className="gridOpcionesColumnas">
                    {columnas.map(col => col === 'nombre' ? null : (
                        <div key={col} className="itemColumnaConfig">
                            <div className="infoColumnaConfig">
                                <span className="etiquetaColumna">{INFO_COLUMNAS[col].etiqueta}</span>
                                <span className="descripcionColumna">{INFO_COLUMNAS[col].descripcion}</span>
                            </div>
                            <ToggleSwitch checked={configuracion.columnasVisibles[col]} onChange={() => toggleColumnaVisible(col)} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ── PROYECTOS ─────────────────────────────────────────── */
export function SeccionConfigProyectos(): JSX.Element {
    const {configuracion, toggleOcultarCompletados, toggleOcultarTareasCompletadas, toggleMostrarProgreso, toggleModoCompacto} = useConfiguracionProyectos();
    return (
        <div className="contenedorOpcionesConfig">
            <ItemToggle titulo="Ocultar proyectos completados" descripcion="Los proyectos finalizados no aparecerán en la lista" checked={configuracion.ocultarCompletados} onChange={toggleOcultarCompletados} />
            <ItemToggle titulo="Ocultar tareas completadas" descripcion="Las tareas finalizadas no aparecerán dentro de los proyectos" checked={configuracion.ocultarTareasCompletadas} onChange={toggleOcultarTareasCompletadas} />
            <ItemToggle titulo="Mostrar progreso" descripcion="Visualizar la barra de progreso de tareas" checked={configuracion.mostrarProgreso} onChange={toggleMostrarProgreso} />
            <ItemToggle titulo="Modo Compacto" descripcion="Reducir el tamaño de la fuente y el espaciado" checked={configuracion.modoCompacto} onChange={toggleModoCompacto} />
        </div>
    );
}

/* ── SCRATCHPAD ────────────────────────────────────────── */
export function SeccionConfigScratchpad(): JSX.Element {
    const {configuracion, cambiarTamanoFuente, cambiarAutoGuardado} = useConfiguracionScratchpad();
    return (
        <div className="contenedorOpcionesConfig">
            <div className="itemOpcionConfig">
                <div className="detallesOpcionConfig">
                    <span className="tituloOpcionConfig">Tamaño de fuente</span>
                    <span className="descripcionOpcionConfig">Ajustar legibilidad del texto</span>
                </div>
                <Select claseAdicional="selectOpcionConfig" value={configuracion.tamanoFuente} onChange={e => cambiarTamanoFuente(e.target.value as TamanoFuente)} opciones={[{valor: 'pequeno', etiqueta: 'Pequeño'}, {valor: 'normal', etiqueta: 'Normal'}, {valor: 'grande', etiqueta: 'Grande'}]} />
            </div>
            <div className="separadorOpcionesConfig" />
            <div className="itemOpcionConfig">
                <div className="detallesOpcionConfig">
                    <span className="tituloOpcionConfig">Auto-guardado</span>
                    <span className="descripcionOpcionConfig">Tiempo de espera antes de guardar</span>
                </div>
                <Select claseAdicional="selectOpcionConfig" value={configuracion.autoGuardadoIntervalo} onChange={e => cambiarAutoGuardado(Number(e.target.value))} opciones={[{valor: 500, etiqueta: 'Rápido (0.5s)'}, {valor: 1500, etiqueta: 'Normal (1.5s)'}, {valor: 3000, etiqueta: 'Relax (3s)'}]} />
            </div>
        </div>
    );
}

/* ── ACTIVIDAD ────────────────────────────────────────── */
const PERIODOS: {valor: PeriodoActividad; etiqueta: string}[] = [
    {valor: 'auto', etiqueta: 'Automático'},
    {valor: 'semana', etiqueta: '7 días'},
    {valor: 'mes', etiqueta: '30 días'},
    {valor: 'trimestre', etiqueta: '3 meses'},
    {valor: 'anio', etiqueta: '1 año'}
];

const FILTROS_TIPO: {valor: FiltroTipoActividad; etiqueta: string}[] = [
    {valor: 'todo', etiqueta: 'Todas'},
    {valor: 'tarea_completada', etiqueta: 'Solo tareas'},
    {valor: 'habito_cumplido', etiqueta: 'Solo hábitos'}
];

const TAMANOS: TamanoCeldaActividad[] = ['pequeno', 'normal', 'grande'];

export function SeccionConfigActividad(): JSX.Element {
    const {configuracion, cambiarPeriodo, cambiarFiltroTipo, cambiarTamanoCelda, toggleLeyenda} = useConfiguracionActividad();
    return (
        <div className="formularioHabito">
            <SeccionPanel titulo="Periodo de visualización">
                <div className="selectorPeriodoActividad">
                    {PERIODOS.map(({valor, etiqueta}) => (
                        <Boton key={valor} type="button" claseAdicional={`selectorPeriodoBoton ${configuracion.periodo === valor ? 'selectorPeriodoBoton--activo' : ''}`} onClick={() => cambiarPeriodo(valor)}>
                            {etiqueta}
                        </Boton>
                    ))}
                </div>
            </SeccionPanel>
            <SeccionPanel titulo="Tipo de actividad">
                <div className="selectorPeriodoActividad">
                    {FILTROS_TIPO.map(({valor, etiqueta}) => (
                        <Boton key={valor} type="button" claseAdicional={`selectorPeriodoBoton ${configuracion.filtroTipo === valor ? 'selectorPeriodoBoton--activo' : ''}`} onClick={() => cambiarFiltroTipo(valor)}>
                            {etiqueta}
                        </Boton>
                    ))}
                </div>
            </SeccionPanel>
            <SeccionPanel titulo="Tamaño de celdas">
                <SelectorNivel<TamanoCeldaActividad> niveles={TAMANOS} seleccionado={configuracion.tamanoCelda} onSeleccionar={cambiarTamanoCelda} />
            </SeccionPanel>
            <SeccionPanel titulo="Opciones visuales">
                <ItemToggle titulo="Mostrar Leyenda" descripcion="Muestra la leyenda de colores del mapa" checked={configuracion.mostrarLeyenda} onChange={toggleLeyenda} />
            </SeccionPanel>
        </div>
    );
}
