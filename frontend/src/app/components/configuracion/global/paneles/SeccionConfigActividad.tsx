/* [233A-27] Configuración de la actividad (periodo, tipo, tamaño de celda, leyenda). */
import {Boton} from '../../../ui';
import {SeccionPanel, SelectorNivel} from '../../../shared';
import {useConfiguracionActividad} from '../../../../hooks/useConfiguracionActividad';
import type {PeriodoActividad, FiltroTipoActividad, TamanoCeldaActividad} from '../../../../hooks/useConfiguracionActividad';
import {ItemToggle} from './ItemToggle';

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
