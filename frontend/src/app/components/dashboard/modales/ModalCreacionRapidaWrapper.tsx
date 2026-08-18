/*
 * ModalCreacionRapidaWrapper
 * Decide si mostrar el modal de escritorio o los BottomSheets móviles
 * Unifica la lógica de detección esMovil en un solo lugar
 *
 * Nota: Los BottomSheets para cada tipo de entidad están en sus respectivos
 * componentes modulares (ModalesTareas, ModalesHabitos, ModalesProyectos)
 * Este componente solo maneja el modal de escritorio
 */

import {ModalCreacionRapida} from '../ModalCreacionRapida';

import type {DashboardCompletoRetorno} from '../../../hooks/useDashboardCompleto';
import type {DatosCreacionRapida} from '../../../types/creacionRapida';
import type {DatosCreacion} from '../../../hooks/dashboard/useModalCreacionRapida';

interface ModalCreacionRapidaWrapperProps {
    dashboard: DashboardCompletoRetorno['dashboard'];
    modales: DashboardCompletoRetorno['modales'];
    esMovil: boolean;
    manejarGuardarRapido: (datos: DatosCreacionRapida) => Promise<void>;
}

export function ModalCreacionRapidaWrapper({dashboard, modales, esMovil, manejarGuardarRapido}: ModalCreacionRapidaWrapperProps): JSX.Element | null {
    /* En móvil, los BottomSheets se manejan en los componentes modulares específicos */
    if (esMovil) return null;
    if (!modales.modalCreacionRapida) return null;

    return <ModalCreacionRapida tipo={modales.modalCreacionRapida} proyectos={dashboard.proyectos} valoresIniciales={modales.valoresCreacionRapida} onCerrar={modales.cerrarCreacionRapida} onGuardar={manejarGuardarRapido as unknown as (datos: DatosCreacion) => Promise<void>} onCambiarTipo={modales.abrirCreacionRapida} />;
}
