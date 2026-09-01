/* [H-F13-01] Helper toggle reutilizable por todas las secciones de configuración
 * de paneles (antes definido dentro de SeccionesConfigPaneles).
 * [318A-3] Migrado al sistema centralizado: delega en FormCampo (mismo layout
 * itemOpcionConfig) y mantiene el separador posterior que usan sus consumidores. */

import {ToggleSwitch} from '../../../shared/ToggleSwitch';
import {FormCampo} from '../../../shared/FormCampo';

export function ItemToggle({titulo, descripcion, checked, onChange}: {titulo: string; descripcion: string; checked: boolean; onChange: () => void}) {
    return (
        <>
            <FormCampo
                titulo={titulo}
                descripcion={descripcion}
                control={<ToggleSwitch checked={checked} onChange={onChange} />}
            />
            <div className="separadorOpcionesConfig" />
        </>
    );
}