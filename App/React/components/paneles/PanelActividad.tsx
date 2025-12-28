/*
 * PanelActividad
 * Componente que renderiza el panel de actividad con mapa de calor
 *
 * Muestra un heatmap estilo GitHub con la actividad del usuario
 * Configurable por periodo y tipo de actividad
 */

import {useEffect, useMemo} from 'react';
import {Activity, Settings} from 'lucide-react';
import {SeccionEncabezado} from '../dashboard';
import {MapaCalor} from '../shared';
import {useActividad} from '../../hooks/useActividad';
import type {ConfiguracionActividad} from '../../hooks/useConfiguracionActividad';

interface PanelActividadProps {
    configuracion: ConfiguracionActividad;
    onAbrirModalConfigActividad: () => void;
    renderHandleArrastre: (titulo?: string) => JSX.Element;
    handleMinimizar: JSX.Element;
}

export function PanelActividad({configuracion, onAbrirModalConfigActividad, renderHandleArrastre, handleMinimizar}: PanelActividadProps): JSX.Element {
    /* Calcular filtros para pasar al hook (para cache inicial) */
    const tipoFiltro = configuracion.filtroTipo === 'todo' ? undefined : configuracion.filtroTipo;
    const filtrosIniciales = useMemo(
        () => ({
            periodo: configuracion.periodo,
            tipo: tipoFiltro
        }),
        [configuracion.periodo, tipoFiltro]
    );

    const {estado, cargarHeatmap} = useActividad(filtrosIniciales);

    /* Cargar datos al montar y cuando cambie la configuracion */
    useEffect(() => {
        cargarHeatmap({
            periodo: configuracion.periodo,
            tipo: tipoFiltro
        });
    }, [configuracion.periodo, configuracion.filtroTipo, cargarHeatmap, tipoFiltro]);

    /* Determinar titulo segun filtro */
    const obtenerSubtitulo = (): string => {
        if (configuracion.filtroTipo === 'tarea_completada') return 'Tareas completadas';
        if (configuracion.filtroTipo === 'habito_cumplido') return 'Habitos cumplidos';
        return 'Todas las actividades';
    };

    /* Estadisticas para el encabezado */
    const estadisticas = estado.estadisticas;
    const diasActivos = estadisticas?.diasActivos ?? 0;
    const totalActividades = estadisticas ? Object.values(estadisticas.totales).reduce((a, b) => a + b, 0) : 0;

    return (
        <div className="panelDashboard internaColumna">
            <SeccionEncabezado
                icono={null}
                titulo={renderHandleArrastre('Actividad') as any}
                subtitulo={obtenerSubtitulo()}
                acciones={
                    <>
                        {/* {handleArrastre} eliminado */}
                        {/* Estadisticas compactas */}
                        {estadisticas && (
                            <span className="panelActividadStats">
                                <span className="panelActividadStat">{diasActivos} dias</span>
                                <span className="panelActividadStat">{totalActividades} acciones</span>
                            </span>
                        )}
                        {/* Boton configuracion */}
                        <button className="selectorBadgeBoton" onClick={onAbrirModalConfigActividad} title="Configuracion">
                            <span className="selectorBadgeIcono">
                                <Settings size={10} />
                            </span>
                        </button>
                        {handleMinimizar}
                    </>
                }
            />

            {/* Mapa de calor - siempre muestra datos si existen, recarga en segundo plano */}
            <div className="panelActividadCuerpo">{estado.error ? <div className="panelActividadError">{estado.error}</div> : estado.cargaInicial && Object.keys(estado.heatmap).length === 0 ? <div className="panelActividadCargando">Cargando actividad...</div> : <MapaCalor id="panelActividadMapa" datos={estado.heatmap} periodo={configuracion.periodo} tamanoCelda={configuracion.tamanoCelda} mostrarLeyenda={configuracion.mostrarLeyenda} compacto={false} />}</div>
        </div>
    );
}
