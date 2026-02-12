/*
 * PanelActividad
 * Componente que renderiza el panel de actividad con mapa de calor
 * Nota: En móvil el header del panel se oculta via CSS (Fase 10.8.3)
 *
 * Muestra un heatmap estilo GitHub con la actividad del usuario
 * Configurable por periodo y tipo de actividad
 *
 * IMPORTANTE: Este panel solo está disponible para usuarios Premium
 */

import {useCallback, useEffect, useMemo, useState} from 'react';
import {Settings, Maximize2, Lock} from 'lucide-react';
import {SeccionEncabezado} from '../dashboard';
import {MapaCalor, OverlayEnfoque} from '../shared';
import {useActividad} from '../../hooks/useActividad';
import type {ConfiguracionActividad} from '../../hooks/useConfiguracionActividad';
import {obtenerDetalleActividadDia, type DetalleActividadItem} from '../../services/actividadService';
import {useSuscripcionStore} from '../../stores/suscripcionStore';
import {Boton} from '../ui';

interface PanelActividadProps {
    configuracion: ConfiguracionActividad;
    onAbrirModalConfigActividad: () => void;
    onAbrirUpgrade?: () => void;
    renderHandleArrastre: (titulo?: string) => JSX.Element;
    handleMinimizar: JSX.Element;
}

/*
 * Componente para mostrar mensaje de bloqueo para usuarios FREE
 */
function MensajeBloqueoFree({onAbrirUpgrade}: {onAbrirUpgrade?: () => void}): JSX.Element {
    return (
        <div className="panelActividadBloqueado">
            <Lock size={24} />
            <p className="panelActividadBloqueadoTitulo">Panel de Actividad Premium</p>
            <p className="panelActividadBloqueadoTexto">
                El mapa de calor de actividad está disponible exclusivamente para usuarios Premium.
            </p>
            {onAbrirUpgrade && (
                <Boton variante="primario" claseAdicional="panelActividadBloqueadoBoton" onClick={onAbrirUpgrade}>
                    Ver planes Premium
                </Boton>
            )}
        </div>
    );
}

/*
 * Formatea el tipo de actividad en texto legible unificado
 * Ejemplo: "Tarea completada" + nombre = 'Tarea "Nombre de la tarea"'
 */
function formatearActividadUnificada(tipo: DetalleActividadItem['tipo'], nombre: string | null): string {
    const tipoBase = {
        tarea_completada: 'Tarea',
        habito_cumplido: 'Hábito',
        nota_creada: 'Nota',
        adjunto_subido: 'Adjunto',
        tarea_desmarcada: 'Tarea desmarcada',
        habito_desmarcado: 'Hábito desmarcado',
        habito_pospuesto: 'Hábito pospuesto'
    }[tipo] || 'Actividad';

    if (!nombre) return tipoBase;

    /* Formato unificado: Tipo "Nombre" */
    return `${tipoBase} "${nombre}"`;
}

function formatearDuracionTracking(item: DetalleActividadItem): string | null {
    const minutosDetalle = item.detalles?.tiempoTrackingMinutos;
    if (typeof minutosDetalle === 'number' && Number.isFinite(minutosDetalle) && minutosDetalle >= 0) {
        const horas = Math.floor(minutosDetalle / 60);
        const minutosRestantes = minutosDetalle % 60;
        if (horas > 0) {
            return `${horas}h ${String(minutosRestantes).padStart(2, '0')}m`;
        }
        return `${minutosDetalle}m`;
    }

    const msDetalle = item.detalles?.tiempoTrackingMs;
    if (typeof msDetalle === 'number' && Number.isFinite(msDetalle) && msDetalle >= 0) {
        const minutosTotales = Math.round(msDetalle / 60000);
        const horas = Math.floor(minutosTotales / 60);
        const minutosRestantes = minutosTotales % 60;
        if (horas > 0) {
            return `${horas}h ${String(minutosRestantes).padStart(2, '0')}m`;
        }
        return `${minutosTotales}m`;
    }

    const textoDetalle = item.detalles?.tiempoTrackingFormateado;
    if (typeof textoDetalle === 'string' && textoDetalle.trim().length > 0) {
        return textoDetalle.trim();
    }

    return null;
}

export function PanelActividad({configuracion, onAbrirModalConfigActividad, onAbrirUpgrade, renderHandleArrastre, handleMinimizar}: PanelActividadProps): JSX.Element {
    /* Verificar si el usuario es Premium */
    const esPremium = useSuscripcionStore(s => s.esPremium());

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

    /* Cargar datos al montar y cuando cambie la configuracion (solo si es Premium) */
    useEffect(() => {
        if (!esPremium) return;
        cargarHeatmap({
            periodo: configuracion.periodo,
            tipo: tipoFiltro
        });
    }, [configuracion.periodo, configuracion.filtroTipo, cargarHeatmap, tipoFiltro, esPremium]);

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

    /*
     * Formatea la hora recibida del backend
     * TAREA 2: La hora se almacena en la zona horaria del servidor (WordPress)
     * que puede diferir de la zona del cliente. El backend ya guarda la hora
     * local del servidor con current_time(), así que la mostramos directamente.
     */
    const formatearHora = useCallback((hora: string | null) => {
        if (!hora) return '--:--';
        /* Mostrar solo HH:MM de la hora guardada */
        return hora.slice(0, 5);
    }, []);

    /*
     * Obtiene el nombre del elemento para mostrar en la lista unificada
     */
    const obtenerNombreElemento = useCallback((item: DetalleActividadItem): string | null => {
        const nombreDetalles = typeof item.detalles?.elementoNombre === 'string' ? item.detalles.elementoNombre : null;
        const nombreDirecto = item.elementoNombre || nombreDetalles;
        return nombreDirecto || null;
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
                        <Boton variante="ghost" claseAdicional="panelActividadDetalleBoton" onClick={() => setFechaDetalle(null)}>
                            Ocultar
                        </Boton>
                    </div>

                    {detalleCargando ? (
                        <div className="panelActividadDetalleEstado">Cargando detalle...</div>
                    ) : detalleError ? (
                        <div className="panelActividadDetalleError">{detalleError}</div>
                    ) : detalleItems.length === 0 ? (
                        <div className="panelActividadDetalleVacio">Sin actividad registrada</div>
                    ) : (
                        <ul className="panelActividadDetalleLista panelActividadDetalleLista--unificada">
                            {detalleItems.map(item => {
                                const nombreElemento = obtenerNombreElemento(item);
                                const nombreProyecto = obtenerNombreProyecto(item);
                                const textoUnificado = formatearActividadUnificada(item.tipo, nombreElemento);
                                const duracionTracking = formatearDuracionTracking(item);

                                return (
                                    <li key={item.id} className="panelActividadDetalleItemUnificado">
                                        <span className="panelActividadDetalleTexto">
                                            {textoUnificado}
                                            {nombreProyecto && <span className="panelActividadDetalleProyectoTag"> · {nombreProyecto}</span>}
                                            {duracionTracking && <span className="panelActividadDetalleTrackingTag"> · {duracionTracking}</span>}
                                        </span>
                                        <span className="panelActividadDetalleHora">{formatearHora(item.hora)}</span>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            );
        },
        [fechaDetalle, detalleCargando, detalleError, detalleItems, formatearFechaDetalle, formatearHora, obtenerNombreElemento, obtenerNombreProyecto]
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
                        {/* Estadisticas compactas - solo si es Premium */}
                        {esPremium && estadisticas && (
                            <span className="panelActividadStats">
                                <span className="panelActividadStat">{diasActivos} dias</span>
                                <span className="panelActividadStat">{totalActividades} acciones</span>
                            </span>
                        )}
                        {esPremium && (
                            <>
                                <Boton variante="ghost" claseAdicional="selectorBadgeBoton selectorBadgeBoton--soloIcono" onClick={onAbrirModalConfigActividad} title="Configuracion">
                                    <span className="selectorBadgeIcono">
                                        <Settings size={12} />
                                    </span>
                                </Boton>
                                <Boton variante="ghost" claseAdicional="selectorBadgeBoton selectorBadgeBoton--soloIcono" onClick={() => setModoEnfoque(true)} title="Modo enfoque">
                                    <span className="selectorBadgeIcono">
                                        <Maximize2 size={12} />
                                    </span>
                                </Boton>
                            </>
                        )}
                        {handleMinimizar}
                    </>
                }
            />

            {/* Contenido condicional según plan */}
            {!esPremium ? (
                <MensajeBloqueoFree onAbrirUpgrade={onAbrirUpgrade} />
            ) : (
                <>
                    {/* Mapa de calor - siempre muestra datos si existen, recarga en segundo plano */}
                    <div className="panelActividadCuerpo">{estado.error ? <div className="panelActividadError">{estado.error}</div> : estado.cargaInicial && Object.keys(estado.heatmap).length === 0 ? <div className="panelActividadCargando">Cargando actividad...</div> : <MapaCalor id="panelActividadMapa" datos={estado.heatmap} periodo={configuracion.periodo} tamanoCelda={configuracion.tamanoCelda} mostrarLeyenda={configuracion.mostrarLeyenda} compacto={false} onClickDia={manejarClickDia} />}</div>
                    <DetalleActividadDia />
                </>
            )}

            {esPremium && (
                <OverlayEnfoque estaActivo={modoEnfoque} onCerrar={() => setModoEnfoque(false)} titulo="Actividad">
                    <div className="panelActividadCuerpo">{estado.error ? <div className="panelActividadError">{estado.error}</div> : estado.cargaInicial && Object.keys(estado.heatmap).length === 0 ? <div className="panelActividadCargando">Cargando actividad...</div> : <MapaCalor id="panelActividadMapaEnfoque" datos={estado.heatmap} periodo={configuracion.periodo} tamanoCelda={configuracion.tamanoCelda} mostrarLeyenda={configuracion.mostrarLeyenda} compacto={false} onClickDia={manejarClickDia} />}</div>
                    <DetalleActividadDia />
                </OverlayEnfoque>
            )}
        </div>
    );
}
