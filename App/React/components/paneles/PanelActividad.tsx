/*
 * PanelActividad
 * Componente que renderiza el panel de actividad con mapa de calor
 * Nota: En móvil el header del panel se oculta via CSS (Fase 10.8.3)
 *
 * Muestra un heatmap estilo GitHub con la actividad del usuario
 * Configurable por periodo y tipo de actividad
 */

import {useEffect, useMemo, useState} from 'react';
import {Settings, Maximize2} from 'lucide-react';
import {SeccionEncabezado} from '../dashboard';
import {MapaCalor, OverlayEnfoque} from '../shared';
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
    const [modoEnfoque, setModoEnfoque] = useState(false);

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
                variante="panelHeader"
                acciones={
                    <>
                        {/* Estadisticas compactas */}
                        {estadisticas && (
                            <span className="panelActividadStats">
                                <span className="panelActividadStat">{diasActivos} dias</span>
                                <span className="panelActividadStat">{totalActividades} acciones</span>
                            </span>
                        )}
                        <button className="selectorBadgeBoton selectorBadgeBoton--soloIcono" onClick={onAbrirModalConfigActividad} title="Configuracion">
                            <span className="selectorBadgeIcono">
                                <Settings size={12} />
                            </span>
                        </button>
                        <button className="selectorBadgeBoton selectorBadgeBoton--soloIcono" onClick={() => setModoEnfoque(true)} title="Modo enfoque">
                            <span className="selectorBadgeIcono">
                                <Maximize2 size={12} />
                            </span>
                        </button>
                        {handleMinimizar}
                    </>
                }
            />

            {/* Mapa de calor - siempre muestra datos si existen, recarga en segundo plano */}
            <div className="panelActividadCuerpo">{estado.error ? <div className="panelActividadError">{estado.error}</div> : estado.cargaInicial && Object.keys(estado.heatmap).length === 0 ? <div className="panelActividadCargando">Cargando actividad...</div> : <MapaCalor id="panelActividadMapa" datos={estado.heatmap} periodo={configuracion.periodo} tamanoCelda={configuracion.tamanoCelda} mostrarLeyenda={configuracion.mostrarLeyenda} compacto={false} />}</div>

            <OverlayEnfoque estaActivo={modoEnfoque} onCerrar={() => setModoEnfoque(false)} titulo="Actividad">
                <div className="panelActividadCuerpo">{estado.error ? <div className="panelActividadError">{estado.error}</div> : estado.cargaInicial && Object.keys(estado.heatmap).length === 0 ? <div className="panelActividadCargando">Cargando actividad...</div> : <MapaCalor id="panelActividadMapaEnfoque" datos={estado.heatmap} periodo={configuracion.periodo} tamanoCelda={configuracion.tamanoCelda} mostrarLeyenda={configuracion.mostrarLeyenda} compacto={false} />}</div>
            </OverlayEnfoque>
        </div>
    );
}
