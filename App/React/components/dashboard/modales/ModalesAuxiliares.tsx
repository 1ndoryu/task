/*
 * ModalesAuxiliares
 * Agrupa componentes auxiliares y modales de administración
 * Incluye: Toast, Tooltips, IndicadorArrastre, BarraPanelesOcultos, PanelAdministracion, ModalExperimentos
 */

import {Bell, Trash2} from 'lucide-react';
import {ToastDeshacer, TooltipSystem, BarraPanelesOcultos, IndicadorArrastre} from '../../shared';
import {PanelAdministracion} from '../../admin';
import {ModalExperimentos} from '../../experimentos/ModalExperimentos';

import type {DashboardCompletoRetorno} from '../../../hooks/useDashboardCompleto';
import type {AccionExperimento} from '../../experimentos/ModalExperimentos';

interface ModalesAuxiliaresProps {
    dashboard: DashboardCompletoRetorno['dashboard'];
    auth: DashboardCompletoRetorno['auth'];
    modales: DashboardCompletoRetorno['modales'];
    layout: DashboardCompletoRetorno['layout'];
    arrastre: DashboardCompletoRetorno['arrastre'];
    acciones: DashboardCompletoRetorno['acciones'];
    esAdmin: boolean;
}

export function ModalesAuxiliares({dashboard, auth, modales, layout, arrastre, acciones, esAdmin}: ModalesAuxiliaresProps): JSX.Element {
    const accionesExperimentos: AccionExperimento[] = [
        {
            id: 'notificacion-prueba',
            nombre: 'Crear Notificacion de Prueba',
            descripcion: 'Crea una notificacion de tipo solicitud_equipo para probar el sistema.',
            icono: <Bell size={20} />,
            ejecutar: acciones.crearNotificacionPrueba
        },
        {
            id: 'limpiar-actividad',
            nombre: 'Limpiar Actividad Completa',
            descripcion: 'Elimina todo el historial de actividad del mapa de calor.',
            icono: <Trash2 size={20} />,
            ejecutar: acciones.limpiarActividadCompleta
        }
    ];

    return (
        <>
            {/* Toast Deshacer */}
            {dashboard.accionDeshacer && <ToastDeshacer mensaje={dashboard.accionDeshacer.mensaje} tiempoRestante={dashboard.accionDeshacer.tiempoRestante} tiempoTotal={5000} onDeshacer={dashboard.ejecutarDeshacer} onDescartar={dashboard.descartarDeshacer} />}

            {/* Barra de Paneles Ocultos */}
            {auth.user && <BarraPanelesOcultos panelesOcultos={layout.panelesOcultos} onMostrarPanel={layout.mostrarPanel} />}

            {/* Sistema de Tooltips global */}
            <TooltipSystem />

            {/* Indicador de Arrastre de paneles */}
            <IndicadorArrastre panelArrastrando={arrastre.panelArrastrando} posicionMouse={arrastre.posicionMouse} />

            {/* Panel de Administración (solo admins) */}
            {esAdmin && <PanelAdministracion estaAbierto={modales.panelAdminAbierto} onCerrar={modales.cerrarPanelAdmin} />}

            {/* Modal de Experimentos */}
            <ModalExperimentos abierto={modales.modalExperimentosAbierto} onCerrar={modales.cerrarModalExperimentos} acciones={accionesExperimentos} />
        </>
    );
}
