/* [20-08-2026] Configuración de paneles del dashboard como sección del modal
 * global. Reutiliza ContenidoGestionPaneles (misma lógica que el modal
 * independiente: lista dinámica de paneles + plugins activos, con toggles de
 * visible/minimizado). Cada sección usa sus propios hooks, sin props del padre. */
import {ContenidoGestionPaneles} from '../../../dashboard/ModalGestionPaneles';
import {useConfiguracionLayout} from '../../../../hooks/useConfiguracionLayout';

export function SeccionConfigPaneles(): JSX.Element {
    const {visibilidad, toggleVisibilidadPanel} = useConfiguracionLayout();

    return (
        <ContenidoGestionPaneles visibilidad={visibilidad} onTogglePanel={toggleVisibilidadPanel} />
    );
}
