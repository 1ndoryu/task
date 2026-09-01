/* [233A-27] Configuración de hábitos: tolerancia de urgencia y columnas visibles. */
import {Boton} from '../../../ui';
import {useConfiguracionHabitos} from '../../../../hooks/useConfiguracionHabitos';
import {useEsDispositivoMovil} from '../../../../hooks/useEsMovil';
import type {ColumnasHabitos, ToleranciaPreset} from '../../../../hooks/useConfiguracionHabitos';
import {ToggleSwitch} from '../../../shared/ToggleSwitch';
import {ItemToggle} from './ItemToggle';

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
            {/* [014A-13] Modo compacto siempre activo en móvil — ocultar toggle */}
            {!esMovil && <ItemToggle titulo="Modo Compacto" descripcion="Reducir el espaciado vertical de las filas" checked={configuracion.modoCompacto} onChange={toggleModoCompacto} />}
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
