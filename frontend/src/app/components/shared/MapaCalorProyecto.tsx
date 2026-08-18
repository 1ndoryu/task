/**
 * MapaCalorProyecto
 *
 * Componente especializado para visualizar la actividad de un proyecto.
 * Muestra las tareas completadas del proyecto en formato heatmap.
 *
 * @package App/React/components/shared
 */

import {useEffect} from 'react';
import {useActividad} from '../../hooks/useActividad';
import {MapaCalor, type DatosHeatmapProps} from './MapaCalor';

/* Tipos */
interface MapaCalorProyectoProps {
    proyectoId: number;
    periodo?: 'semana' | 'mes' | 'trimestre';
    compacto?: boolean;
}

/**
 * Componente para visualizar la actividad de un proyecto
 */
export function MapaCalorProyecto({proyectoId, periodo = 'mes', compacto = false}: MapaCalorProyectoProps): JSX.Element {
    const {estado, cargarHeatmap} = useActividad();
    const {cargando, error, heatmap, estadisticas} = estado;

    /* Cargar datos al montar o cambiar el proyecto */
    useEffect(() => {
        if (proyectoId > 0) {
            cargarHeatmap({
                periodo,
                proyectoId,
                tipo: 'tarea_completada'
            });
        }
    }, [proyectoId, periodo, cargarHeatmap]);

    /* Convertir heatmap al formato esperado por MapaCalor */
    const datosFormateados: DatosHeatmapProps = heatmap as unknown as DatosHeatmapProps;

    if (cargando) {
        return (
            <div id="mapa-calor-proyecto" className="mapaCalorProyectoContenedor mapaCalorProyectoContenedor--cargando">
                <span className="mapaCalorProyectoCargando">Cargando actividad...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div id="mapa-calor-proyecto" className="mapaCalorProyectoContenedor mapaCalorProyectoContenedor--error">
                <span className="mapaCalorProyectoError">{error}</span>
            </div>
        );
    }

    /* Verificar si hay datos */
    const hayDatos = Object.keys(datosFormateados).length > 0;

    if (!hayDatos && !cargando) {
        return (
            <div id="mapa-calor-proyecto" className="mapaCalorProyectoContenedor mapaCalorProyectoContenedor--vacio">
                <span className="mapaCalorProyectoVacio">Sin actividad registrada</span>
            </div>
        );
    }

    return (
        <div id="mapa-calor-proyecto" className={`mapaCalorProyectoContenedor ${compacto ? 'mapaCalorProyectoContenedor--compacto' : ''}`}>
            {/* Encabezado con estadísticas */}
            {!compacto && estadisticas && (
                <div className="mapaCalorProyectoEncabezado">
                    <div className="mapaCalorProyectoStats">
                        <span className="mapaCalorProyectoStat">
                            <strong>{estadisticas.totales?.tarea_completada || 0}</strong> tareas completadas
                        </span>
                        <span className="mapaCalorProyectoStat">
                            <strong>{estadisticas.diasActivos || 0}</strong> dias activos
                        </span>
                    </div>
                </div>
            )}

            {/* Mapa de calor */}
            <MapaCalor datos={datosFormateados} periodo={periodo} compacto={compacto} mostrarLeyenda={!compacto} tamanoCelda={compacto ? 'pequeno' : 'normal'} id={`mapaCalorProyecto-${proyectoId}`} />
        </div>
    );
}
