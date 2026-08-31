/*
 * Exportaciones del módulo Dashboard
 */

export {DashboardEncabezado} from './DashboardEncabezado';
export {SeccionEncabezado} from './SeccionEncabezado';
export {TablaHabitos} from './TablaHabitos';
export {ListaTareas} from './ListaTareas';
export {SubmenuNuevoInline} from './SubmenuNuevoInline';
export {Scratchpad} from './Scratchpad';
export {AccionesDatos} from './AccionesDatos';
export {FormularioHabito} from './FormularioHabito';
export {SelectorOrden} from './SelectorOrden';
export {PanelConfiguracionTarea} from './PanelConfiguracionTarea';
export {ModalConfiguracionScratchpad} from './ModalConfiguracionScratchpad';
export {ListaProyectos, FormularioProyecto, ModalConfiguracionProyectos} from './proyectos';
export {ModalLogin} from './ModalLogin';
export {PanelSeguridad} from './PanelSeguridad';
export {ModalConfiguracionLayout} from './ModalConfiguracionLayout';
export {ModalPerfil} from './ModalPerfil';
export {DashboardGrid} from './DashboardGrid';
export {DashboardModales} from './DashboardModales';
export {ModalNotasGuardadas} from './ModalNotasGuardadas';
export {ModalNotasExpandido} from './notas/ModalNotasExpandido';
export {SidebarMenu} from './SidebarMenu';
export {DashboardPanelView} from './DashboardPanelView';
export {DashboardSidebarGrid} from './DashboardSidebarGrid';
export {DashboardVistas} from './DashboardVistas';
export {BuscadorGlobal} from './BuscadorGlobal';
export {BottomSheetTarea} from './BottomSheetTarea';
export {BottomSheetHabito} from './BottomSheetHabito';
export {BottomSheetProyecto} from './BottomSheetProyecto';
export type {DatosFormulario} from '../../hooks/dashboard/useFormularioHabito';

/* Importar CSS multi-panel sidebar (efecto secundario) */
import '../../styles/dashboard/componentes/dashboardSidebarGrid.css';

/* [318A-2] CSS del Modo Vistas (grid libre configurable) */
import '../../styles/dashboard/componentes/dashboardVistas.css';
