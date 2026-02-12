/*
 * ModalConfiguracionActividad
 * Modal para configurar el panel de actividad
 */

import {Modal, SeccionPanel, SelectorNivel, ToggleSwitch} from '../shared';
import {Boton} from '../shared/Boton';
import type {ConfiguracionActividad, PeriodoActividad, FiltroTipoActividad, TamanoCeldaActividad} from '../../hooks/useConfiguracionActividad';

interface ModalConfiguracionActividadProps {
    estaAbierto: boolean;
    onCerrar: () => void;
    configuracion: ConfiguracionActividad;
    onCambiarPeriodo: (periodo: PeriodoActividad) => void;
    onCambiarFiltroTipo: (filtro: FiltroTipoActividad) => void;
    onCambiarTamanoCelda: (tamano: TamanoCeldaActividad) => void;
    onToggleLeyenda: () => void;
}

const PERIODOS: {valor: PeriodoActividad; etiqueta: string}[] = [
    {valor: 'auto', etiqueta: 'Automatico'},
    {valor: 'semana', etiqueta: '7 dias'},
    {valor: 'mes', etiqueta: '30 dias'},
    {valor: 'trimestre', etiqueta: '3 meses'},
    {valor: 'anio', etiqueta: '1 año'}
];

const FILTROS_TIPO: {valor: FiltroTipoActividad; etiqueta: string}[] = [
    {valor: 'todo', etiqueta: 'Todas'},
    {valor: 'tarea_completada', etiqueta: 'Solo tareas'},
    {valor: 'habito_cumplido', etiqueta: 'Solo habitos'}
];

const TAMANOS: TamanoCeldaActividad[] = ['pequeno', 'normal', 'grande'];

export function ModalConfiguracionActividad({estaAbierto, onCerrar, configuracion, onCambiarPeriodo, onCambiarFiltroTipo, onCambiarTamanoCelda, onToggleLeyenda}: ModalConfiguracionActividadProps): JSX.Element {
    return (
        <Modal estaAbierto={estaAbierto} onCerrar={onCerrar} titulo="Configuracion de Actividad">
            <div id="modal-config-actividad" className="formularioHabito">
                {/* Periodo de tiempo */}
                <SeccionPanel titulo="Periodo de visualizacion">
                    <div className="selectorPeriodoActividad">
                        {PERIODOS.map(({valor, etiqueta}) => (
                            <Boton key={valor} type="button" claseAdicional={`selectorPeriodoBoton ${configuracion.periodo === valor ? 'selectorPeriodoBoton--activo' : ''}`} onClick={() => onCambiarPeriodo(valor)}>
                                {etiqueta}
                            </Boton>
                        ))}
                    </div>
                </SeccionPanel>

                {/* Filtro por tipo */}
                <SeccionPanel titulo="Tipo de actividad">
                    <div className="selectorPeriodoActividad">
                        {FILTROS_TIPO.map(({valor, etiqueta}) => (
                            <Boton key={valor} type="button" claseAdicional={`selectorPeriodoBoton ${configuracion.filtroTipo === valor ? 'selectorPeriodoBoton--activo' : ''}`} onClick={() => onCambiarFiltroTipo(valor)}>
                                {etiqueta}
                            </Boton>
                        ))}
                    </div>
                </SeccionPanel>

                {/* Tamano de celdas */}
                <SeccionPanel titulo="Tamano de celdas">
                    <SelectorNivel<TamanoCeldaActividad> niveles={TAMANOS} seleccionado={configuracion.tamanoCelda} onSeleccionar={onCambiarTamanoCelda} />
                </SeccionPanel>

                {/* Opcion de leyenda */}
                <SeccionPanel titulo="Opciones visuales">
                    <div className="opcionesVisualesActividad">
                        <label className="opcionVisualActividad">
                            <ToggleSwitch checked={configuracion.mostrarLeyenda} onChange={onToggleLeyenda} />
                            <span>Mostrar leyenda</span>
                        </label>
                    </div>
                </SeccionPanel>
            </div>
        </Modal>
    );
}
