/* [H-F13-01] Helper toggle reutilizable por todas las secciones de configuración
 * de paneles (antes definido dentro de SeccionesConfigPaneles). */

import {ToggleSwitch} from '../../../shared/ToggleSwitch';

export function ItemToggle({titulo, descripcion, checked, onChange}: {titulo: string; descripcion: string; checked: boolean; onChange: () => void}) {
    return (
        <>
            <div className="itemOpcionConfig">
                <div className="detallesOpcionConfig">
                    <span className="tituloOpcionConfig">{titulo}</span>
                    <span className="descripcionOpcionConfig">{descripcion}</span>
                </div>
                <ToggleSwitch checked={checked} onChange={onChange} />
            </div>
            <div className="separadorOpcionesConfig" />
        </>
    );
}
