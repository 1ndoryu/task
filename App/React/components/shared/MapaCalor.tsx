/**
 * MapaCalor
 *
 * Componente reutilizable para visualizar actividad en formato heatmap
 * estilo GitHub. Muestra los últimos N días o meses en una cuadrícula
 * donde cada celda representa un día con su nivel de actividad.
 *
 * @package App/React/components/shared
 */

import {useMapaCalor} from '../../hooks/shared/useMapaCalor';

/* Tipos */
export interface DatosHeatmapProps {
    [fecha: string]: {
        nivel: number;
        total: number;
        tipos?: {
            [tipo: string]: number;
        };
    };
}

export interface MapaCalorProps {
    /* Datos del heatmap: fecha -> {nivel, total} */
    datos: DatosHeatmapProps;
    /* Periodo a mostrar ('auto' calcula segun ancho disponible) */
    periodo?: 'auto' | 'semana' | 'mes' | 'trimestre' | 'anio';
    /* Fecha de inicio personalizada (opcional) */
    fechaInicio?: string;
    /* Fecha de fin personalizada (opcional) */
    fechaFin?: string;
    /* Título del widget */
    titulo?: string;
    /* Callback al hacer click en un día */
    onClickDia?: (fecha: string, datos: {nivel: number; total: number}) => void;
    /* Mostrar leyenda */
    mostrarLeyenda?: boolean;
    /* Tamaño de las celdas */
    tamanoCelda?: 'pequeno' | 'normal' | 'grande';
    /* Modo compacto (solo muestra la cuadrícula) */
    compacto?: boolean;
    /* ID único para el componente */
    id?: string;
}

/* Nombres de días de la semana abreviados */
const DIAS_SEMANA = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

/* Nombres de meses abreviados */
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/* Formatea una fecha para mostrar en tooltip (T12:00:00 evita problemas de zona horaria) */
function formatearFecha(fecha: string): string {
    const date = new Date(fecha + 'T12:00:00');
    const dia = date.getDate();
    const mes = MESES[date.getMonth()];
    const anio = date.getFullYear();
    return `${dia} ${mes} ${anio}`;
}

/**
 * Componente principal del Mapa de Calor
 */
export function MapaCalor({datos, periodo = 'auto', fechaInicio, fechaFin, titulo, onClickDia, mostrarLeyenda = true, tamanoCelda = 'normal', compacto = false, id = 'mapaCalor'}: MapaCalorProps): JSX.Element {
    const {contenedorRef, fechas: _fechas, semanas, mesesVisibles, estadisticas} = useMapaCalor({datos, periodo, fechaInicio, fechaFin, tamanoCelda});

    /* Clase del contenedor según tamaño */
    const clasesTamano = {
        pequeno: 'mapaCalorCelda--pequeno',
        normal: '',
        grande: 'mapaCalorCelda--grande'
    };

    /* Renderizar celda de día */
    const renderCelda = (fecha: string, index: number) => {
        if (!fecha) {
            return <div key={`vacio-${index}`} className="mapaCalorCelda mapaCalorCelda--vacio" />;
        }

        const datosDia = datos[fecha] || {nivel: 0, total: 0};
        const nivel = datosDia.nivel;
        const esClickeable = Boolean(onClickDia);

        const tooltip = `${formatearFecha(fecha)}: ${datosDia.total} ${datosDia.total === 1 ? 'actividad' : 'actividades'}`;

        const handleClick = () => {
            if (onClickDia) {
                onClickDia(fecha, datosDia);
            }
        };

        return (
            <div
                key={fecha}
                className={`mapaCalorCelda mapaCalorCelda--nivel${nivel} ${clasesTamano[tamanoCelda]} ${esClickeable ? 'mapaCalorCelda--clickeable' : ''}`}
                title={tooltip}
                onClick={esClickeable ? handleClick : undefined}
                role={esClickeable ? 'button' : undefined}
                tabIndex={esClickeable ? 0 : undefined}
                onKeyDown={
                    esClickeable
                        ? e => {
                              if (e.key === 'Enter') handleClick();
                          }
                        : undefined
                }
            />
        );
    };

    return (
        <div ref={contenedorRef} id={id} className={`mapaCalorContenedor ${compacto ? 'mapaCalorContenedor--compacto' : ''} ${periodo === 'auto' ? 'mapaCalorContenedor--auto' : ''}`}>
            {/* Encabezado */}
            {!compacto && titulo && (
                <div className="mapaCalorEncabezado">
                    <h3 className="mapaCalorTitulo">{titulo}</h3>
                    <div className="mapaCalorEstadisticas">
                        <span className="mapaCalorStat">
                            <strong>{estadisticas.totalActividades}</strong> actividades
                        </span>
                        <span className="mapaCalorStat">
                            <strong>{estadisticas.diasConActividad}</strong> de {estadisticas.diasTotales} dias
                        </span>
                    </div>
                </div>
            )}

            {/* Cuadrícula principal */}
            <div className="mapaCalorCuerpo">
                {/* Etiquetas de meses */}
                {!compacto && periodo !== 'semana' && (
                    <div className="mapaCalorMeses">
                        {mesesVisibles.map((item, idx) => (
                            <span key={`mes-${idx}`} className="mapaCalorMes" style={{width: item.ancho > 0 ? `${item.ancho}px` : 'auto'}}>
                                {item.mes}
                            </span>
                        ))}
                    </div>
                )}

                <div className="mapaCalorContenido">
                    {/* Etiquetas de días de la semana */}
                    {!compacto && (
                        <div className="mapaCalorDiasSemana">
                            {DIAS_SEMANA.map((dia, idx) => (
                                <span key={`dia-${idx}`} className="mapaCalorDiaSemana">
                                    {idx % 2 === 1 ? dia : ''}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Cuadrícula de celdas */}
                    <div className="mapaCalorGrid">
                        {semanas.map((semana, idxSemana) => (
                            <div key={`semana-${idxSemana}`} className="mapaCalorSemana">
                                {semana.map((fecha, idxDia) => renderCelda(fecha, idxDia))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Leyenda */}
            {mostrarLeyenda && !compacto && (
                <div className="mapaCalorLeyenda">
                    <span className="mapaCalorLeyendaTexto">Menos</span>
                    <div className="mapaCalorLeyendaCeldas">
                        <div className="mapaCalorCelda mapaCalorCelda--nivel0" title="Sin actividad" />
                        <div className="mapaCalorCelda mapaCalorCelda--nivel1" title="Poca actividad" />
                        <div className="mapaCalorCelda mapaCalorCelda--nivel2" title="Actividad moderada" />
                        <div className="mapaCalorCelda mapaCalorCelda--nivel3" title="Buena actividad" />
                        <div className="mapaCalorCelda mapaCalorCelda--nivel4" title="Mucha actividad" />
                    </div>
                    <span className="mapaCalorLeyendaTexto">Mas</span>
                </div>
            )}
        </div>
    );
}
