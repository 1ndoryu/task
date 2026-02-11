/*
 * ModalConfigDeficitCalorico
 * Modal dedicado para la configuración de Déficit Calórico.
 * Evita abrir ModalPlugins (requisito UX).
 */

import {Modal} from '../shared/Modal';
import {ConfigDeficitCalorico} from './ConfigDeficitCalorico';

interface ModalConfigDeficitCaloricoProps {
    abierto: boolean;
    onCerrar: () => void;
}

export function ModalConfigDeficitCalorico({abierto, onCerrar}: ModalConfigDeficitCaloricoProps): JSX.Element | null {
    if (!abierto) return null;

    return (
        <Modal estaAbierto={abierto} onCerrar={onCerrar} titulo="Configurar Déficit Calórico" claseExtra="modalPlugins">
            <div className="modalPluginsCuerpo">
                <ConfigDeficitCalorico onCerrar={onCerrar} />
            </div>
        </Modal>
    );
}
