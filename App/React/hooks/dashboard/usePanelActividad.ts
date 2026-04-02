/*
 * usePanelActividad
 * Hook que gestiona la lógica del panel de actividad.
 * Incluye: estado del heatmap, detalle por día, data fetching y formateo.
 */

import {useState, useCallback, useEffect, useMemo} from 'react';
import type {ConfiguracionActividad} from '../useConfiguracionActividad';
import {useActividad} from '../useActividad';
import {obtenerDetalleActividadDia, eliminarActividad, type DetalleActividadItem} from '../../services/actividadService';
import {useSuscripcionStore} from '../../stores/suscripcionStore';

interface UsePanelActividadParams {
    configuracion: ConfiguracionActividad;
}

export function usePanelActividad({configuracion}: UsePanelActividadParams) {
    const esPremium = useSuscripcionStore(s => s.esPremium());

    const tipoFiltro = configuracion.filtroTipo === 'todo' ? undefined : configuracion.filtroTipo;
    const filtrosIniciales = useMemo(
        () => ({periodo: configuracion.periodo, tipo: tipoFiltro}),
        [configuracion.periodo, tipoFiltro]
    );

    const {estado, cargarHeatmap} = useActividad(filtrosIniciales);
    const [modoEnfoque, setModoEnfoque] = useState(false);
    const [fechaDetalle, setFechaDetalle] = useState<string | null>(null);
    const [detalleItems, setDetalleItems] = useState<DetalleActividadItem[]>([]);
    const [detalleCargando, setDetalleCargando] = useState(false);
    const [detalleError, setDetalleError] = useState<string | null>(null);

    /* Cargar datos al montar y cuando cambie la configuración (solo Premium) */
    useEffect(() => {
        if (!esPremium) return;
        cargarHeatmap({periodo: configuracion.periodo, tipo: tipoFiltro});
    }, [configuracion.periodo, configuracion.filtroTipo, cargarHeatmap, tipoFiltro, esPremium]);

    const cargarDetalleDia = useCallback(
        async (fecha: string) => {
            setDetalleCargando(true);
            setDetalleError(null);
            try {
                const items = await obtenerDetalleActividadDia({fecha, tipo: tipoFiltro});
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

    const obtenerSubtitulo = (): string => {
        if (configuracion.filtroTipo === 'tarea_completada') return 'Tareas completadas';
        if (configuracion.filtroTipo === 'habito_cumplido') return 'Habitos cumplidos';
        return 'Todas las actividades';
    };

    const estadisticas = estado.estadisticas;
    const diasActivos = estadisticas?.diasActivos ?? 0;
    const totalActividades = estadisticas ? Object.values(estadisticas.totales).reduce((a, b) => a + b, 0) : 0;

    const formatearFechaDetalle = useCallback((fecha: string) => {
        const fechaObj = new Date(`${fecha}T12:00:00`);
        return fechaObj.toLocaleDateString('es-ES', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'});
    }, []);

    const formatearHora = useCallback((hora: string | null) => {
        if (!hora) return '--:--';
        return hora.slice(0, 5);
    }, []);

    const obtenerNombreElemento = useCallback((item: DetalleActividadItem): string | null => {
        const nombreDetalles = typeof item.detalles?.elementoNombre === 'string' ? item.detalles.elementoNombre : null;
        return item.elementoNombre || nombreDetalles || null;
    }, []);

    const obtenerNombreProyecto = useCallback((item: DetalleActividadItem): string | null => {
        const nombreDetalles = typeof item.detalles?.proyectoNombre === 'string' ? item.detalles.proyectoNombre : null;
        return item.proyectoNombre || nombreDetalles || null;
    }, []);

    /* [024A-34] Eliminar una actividad individual. Optimista: quita del array y recarga. */
    const eliminarItem = useCallback(
        async (actividadId: number) => {
            setDetalleItems(prev => prev.filter(i => i.id !== actividadId));
            const exito = await eliminarActividad(actividadId);
            if (!exito && fechaDetalle) {
                cargarDetalleDia(fechaDetalle);
            }
        },
        [fechaDetalle, cargarDetalleDia]
    );

    return {
        esPremium, estado,
        modoEnfoque, setModoEnfoque,
        fechaDetalle, setFechaDetalle,
        detalleItems, detalleCargando, detalleError,
        tipoFiltro, manejarClickDia,
        obtenerSubtitulo, diasActivos, totalActividades,
        formatearFechaDetalle, formatearHora,
        obtenerNombreElemento, obtenerNombreProyecto,
        eliminarItem
    };
}

export type {DetalleActividadItem};
