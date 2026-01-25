/*
 * PanelActividad
 * Componente que renderiza el panel de actividad con mapa de calor
 * Nota: En móvil el header del panel se oculta via CSS (Fase 10.8.3)
 *
 * Muestra un heatmap estilo GitHub con la actividad del usuario
 * Configurable por periodo y tipo de actividad
 */

import {useCallback, useEffect, useMemo, useState} from 'react';
import {Settings, Maximize2} from 'lucide-react';
import {SeccionEncabezado} from '../dashboard';
import {MapaCalor, OverlayEnfoque} from '../shared';
import {useActividad} from '../../hooks/useActividad';
import type {ConfiguracionActividad} from '../../hooks/useConfiguracionActividad';
import {obtenerDetalleActividadDia, type DetalleActividadItem} from '../../services/actividadService';

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
    const [fechaDetalle, setFechaDetalle] = useState<string | null>(null);
    const [detalleItems, setDetalleItems] = useState<DetalleActividadItem[]>([]);
    const [detalleCargando, setDetalleCargando] = useState(false);
    const [detalleError, setDetalleError] = useState<string | null>(null);

    /* Cargar datos al montar y cuando cambie la configuracion */
    useEffect(() => {
        cargarHeatmap({
            periodo: configuracion.periodo,
            tipo: tipoFiltro
        });
    }, [configuracion.periodo, configuracion.filtroTipo, cargarHeatmap, tipoFiltro]);

    const cargarDetalleDia = useCallback(
        async (fecha: string) => {
            setDetalleCargando(true);
            setDetalleError(null);
            try {
                const items = await obtenerDetalleActividadDia({
                    fecha,
                    tipo: tipoFiltro
                });
                setDetalleItems(items);
            } catch (error) {
                const mensaje = error instanceof Error ? error.message : 'Error al cargar detalle de actividad';
                setDetalleError(mensaje);
                setDetalleItems([]);
            } finally {
                setDetalleCargando(false);
            }
        },
        [tipoFiltro]
    );

    const manejarClickDia = useCallback(
        (fecha: string) => {
            if (fechaDetalle === fecha) {
                setFechaDetalle(null);
                setDetalleItems([]);
                setDetalleError(null);
                return;
            }
            setFechaDetalle(fecha);
            cargarDetalleDia(fecha);
        },
        [fechaDetalle, cargarDetalleDia]
    );

    useEffect(() => {
        if (fechaDetalle) {
            cargarDetalleDia(fechaDetalle);
        }
    }, [fechaDetalle, cargarDetalleDia]);

    useEffect(() => {
        if (!fechaDetalle) return;
        setDetalleItems([]);
        setDetalleError(null);
    }, [tipoFiltro, fechaDetalle]);

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

    const formatearFechaDetalle = useCallback((fecha: string) => {
        const fechaObj = new Date(`${fecha}T12:00:00`);
        return fechaObj.toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }, []);

    const obtenerEtiquetaTipo = useCallback((tipo: DetalleActividadItem['tipo']) => {
        switch (tipo) {
            case 'tarea_completada':
                return 'Tarea completada';
            case 'habito_cumplido':
                return 'Habito cumplido';
            case 'nota_creada':
                return 'Nota creada';
            case 'adjunto_subido':
                return 'Adjunto subido';
            case 'tarea_desmarcada':
                return 'Tarea desmarcada';
            case 'habito_desmarcado':
                return 'Habito desmarcado';
            case 'habito_pospuesto':
                return 'Habito pospuesto';
            default:
                return 'Actividad';
        }
    }, []);

    const formatearHora = useCallback((hora: string | null) => {
        if (!hora) return '--:--';
        return hora.slice(0, 5);
    }, []);

    const obtenerNombreElemento = useCallback((item: DetalleActividadItem): string | null => {
        const nombreDetalles = typeof item.detalles?.elementoNombre === 'string' ? item.detalles.elementoNombre : null;
        const nombreDirecto = item.elementoNombre || nombreDetalles;
        if (nombreDirecto) return nombreDirecto;
        if (item.elementoId) {
            if (item.elementoTipo === 'habito' || item.tipo.startsWith('habito_')) return `Habito #${item.elementoId}`;
            if (item.elementoTipo === 'tarea' || item.tipo.startsWith('tarea_') || item.tipo === 'adjunto_subido') return `Tarea #${item.elementoId}`;
            if (item.elementoTipo === 'nota' || item.tipo === 'nota_creada') return `Nota #${item.elementoId}`;
            if (item.elementoTipo === 'proyecto') return `Proyecto #${item.elementoId}`;
            return `Elemento #${item.elementoId}`;
        }
        return null;
    }, []);

    const obtenerNombreProyecto = useCallback((item: DetalleActividadItem): string | null => {
        const nombreDetalles = typeof item.detalles?.proyectoNombre === 'string' ? item.detalles.proyectoNombre : null;
        return item.proyectoNombre || nombreDetalles || null;
    }, []);

    const DetalleActividadDia = useCallback(
        () => {
            if (!fechaDetalle) return null;

            return (
                <div className="panelActividadDetalle">
                    <div className="panelActividadDetalleEncabezado">
                        <span className="panelActividadDetalleTitulo">Detalle del {formatearFechaDetalle(fechaDetalle)}</span>
                        <button className="panelActividadDetalleBoton" onClick={() => setFechaDetalle(null)}>
                            Ocultar
                        </button>
                    </div>

                    {detalleCargando ? (
                        <div className="panelActividadDetalleEstado">Cargando detalle...</div>
                    ) : detalleError ? (
                        <div className="panelActividadDetalleError">{detalleError}</div>
                    ) : detalleItems.length === 0 ? (
                        <div className="panelActividadDetalleVacio">Sin actividad registrada</div>
                    ) : (
                        <ul className="panelActividadDetalleLista">
                            {detalleItems.map(item => {
                                const nombreElemento = obtenerNombreElemento(item);
                                const nombreProyecto = obtenerNombreProyecto(item);

                                return (
                                <li key={item.id} className="panelActividadDetalleItem">
                                    <div className="panelActividadDetalleInfo">
                                        <span className="panelActividadDetalleTipo">{obtenerEtiquetaTipo(item.tipo)}</span>
                                        {nombreElemento && <span className="panelActividadDetalleElemento">{nombreElemento}</span>}
                                        {nombreProyecto && <span className="panelActividadDetalleProyecto">{nombreProyecto}</span>}
                                    </div>
                                    <span className="panelActividadDetalleHora">{formatearHora(item.hora)}</span>
                                </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            );
        },
        [fechaDetalle, detalleCargando, detalleError, detalleItems, formatearFechaDetalle, formatearHora, obtenerEtiquetaTipo, obtenerNombreElemento, obtenerNombreProyecto]
    );

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
            <div className="panelActividadCuerpo">{estado.error ? <div className="panelActividadError">{estado.error}</div> : estado.cargaInicial && Object.keys(estado.heatmap).length === 0 ? <div className="panelActividadCargando">Cargando actividad...</div> : <MapaCalor id="panelActividadMapa" datos={estado.heatmap} periodo={configuracion.periodo} tamanoCelda={configuracion.tamanoCelda} mostrarLeyenda={configuracion.mostrarLeyenda} compacto={false} onClickDia={manejarClickDia} />}</div>
            <DetalleActividadDia />

            <OverlayEnfoque estaActivo={modoEnfoque} onCerrar={() => setModoEnfoque(false)} titulo="Actividad">
                <div className="panelActividadCuerpo">{estado.error ? <div className="panelActividadError">{estado.error}</div> : estado.cargaInicial && Object.keys(estado.heatmap).length === 0 ? <div className="panelActividadCargando">Cargando actividad...</div> : <MapaCalor id="panelActividadMapaEnfoque" datos={estado.heatmap} periodo={configuracion.periodo} tamanoCelda={configuracion.tamanoCelda} mostrarLeyenda={configuracion.mostrarLeyenda} compacto={false} onClickDia={manejarClickDia} />}</div>
                <DetalleActividadDia />
            </OverlayEnfoque>
        </div>
    );
}
