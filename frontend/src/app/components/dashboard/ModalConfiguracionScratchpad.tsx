/*
 * ModalConfiguracionScratchpad
 * Modal para ajustar opciones del Scratchpad
 * [318A-3] Migrado al sistema centralizado: campos declarativos con
 * FormularioConfiguracion (visual-neutral, mismos Select/selectOpcionConfig).
 */

import {Modal} from '../shared/Modal';
import {FormularioConfiguracion} from '../shared/FormularioConfiguracion';
import type {CampoEspecificacion} from '../shared/CampoEspecificacion';
import type {ConfiguracionScratchpad, TamanoFuente, AlturaScratchpad} from '../../hooks/useConfiguracionScratchpad';

interface ModalConfiguracionScratchpadProps {
    estaAbierto: boolean;
    onCerrar: () => void;
    configuracion: ConfiguracionScratchpad;
    onCambiarFuente: (t: TamanoFuente) => void;
    onCambiarAltura: (a: AlturaScratchpad) => void;
    onCambiarIntervalo: (i: number) => void;
}

export function ModalConfiguracionScratchpad({estaAbierto, onCerrar, configuracion, onCambiarFuente, onCambiarAltura: _onCambiarAltura, onCambiarIntervalo}: ModalConfiguracionScratchpadProps): JSX.Element {
    const campos: CampoEspecificacion<ConfiguracionScratchpad>[] = [
        {
            clave: 'tamanoFuente',
            titulo: 'Tamaño de fuente',
            descripcion: 'Ajustar legibilidad del texto',
            tipo: 'select',
            opciones: [
                {valor: 'pequeno', etiqueta: 'Pequeño'},
                {valor: 'normal', etiqueta: 'Normal'},
                {valor: 'grande', etiqueta: 'Grande'}
            ],
            alCambiar: (valor) => onCambiarFuente(valor as TamanoFuente)
        },
        {
            clave: 'autoGuardadoIntervalo',
            titulo: 'Auto-guardado',
            descripcion: 'Tiempo de espera antes de guardar',
            tipo: 'select',
            opciones: [
                {valor: 500, etiqueta: 'Rápido (0.5s)'},
                {valor: 1500, etiqueta: 'Normal (1.5s)'},
                {valor: 3000, etiqueta: 'Relax (3s)'}
            ],
            alCambiar: (valor) => onCambiarIntervalo(Number(valor))
        }
    ];

    return (
        <Modal estaAbierto={estaAbierto} onCerrar={onCerrar} titulo="Configuración Scratchpad">
            <FormularioConfiguracion
                campos={campos}
                valores={configuracion}
                alCambiar={() => {
                    /* La persistencia la manejan los alCambiar de cada campo. */
                }}
            />
        </Modal>
    );
}