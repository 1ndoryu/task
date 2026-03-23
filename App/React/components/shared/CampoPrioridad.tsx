/*
 * CampoPrioridad
 * Selector de prioridad/importancia reutilizable
 * [233A-45] Usa arrays y decoracion centralizados de nivelesConfig.
 * Wrapper de SelectorNivel con configuracion predefinida.
 */

import type {NivelPrioridad, NivelImportancia} from '../../types/dashboard';
import {NIVELES_PRIORIDAD, NIVELES_IMPORTANCIA, decoracionSelectorPrioridad, decoracionSelectorImportancia} from '../../utils/nivelesConfig';
import {SeccionPanel} from './SeccionPanel';
import {SelectorNivel} from './SelectorNivel';

type TipoCampo = 'prioridad' | 'importancia';

interface CampoPrioridadProps<T extends NivelPrioridad | NivelImportancia> {
    tipo?: TipoCampo;
    valor: T | null;
    onChange: (valor: T | null) => void;
    permitirNulo?: boolean;
    disabled?: boolean;
    titulo?: string;
}

export function CampoPrioridad<T extends NivelPrioridad | NivelImportancia>({tipo = 'prioridad', valor, onChange, permitirNulo = true, disabled = false, titulo}: CampoPrioridadProps<T>): JSX.Element {
    const niveles = (tipo === 'prioridad' ? NIVELES_PRIORIDAD : NIVELES_IMPORTANCIA) as T[];
    const decoracion = tipo === 'prioridad' ? decoracionSelectorPrioridad() : decoracionSelectorImportancia();
    const tituloFinal = titulo || (tipo === 'prioridad' ? 'Prioridad' : 'Importancia');

    const manejarSeleccion = (nivel: T) => {
        if (permitirNulo && valor === nivel) {
            onChange(null);
        } else {
            onChange(nivel);
        }
    };

    return (
        <SeccionPanel titulo={tituloFinal}>
            <SelectorNivel<T> niveles={niveles} seleccionado={valor} onSeleccionar={manejarSeleccion} disabled={disabled} decoracion={decoracion} />
        </SeccionPanel>
    );
}
