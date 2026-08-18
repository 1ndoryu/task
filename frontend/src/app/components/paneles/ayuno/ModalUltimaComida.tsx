/*
 * ModalUltimaComida
 * Modal minimalista para preguntar la hora de la última comida antes de iniciar un ayuno.
 */

import {Play} from 'lucide-react';
import {Modal} from '../../shared/Modal';
import {SelectorRelojCircular} from './SelectorRelojCircular';
import {Boton} from '../../ui';
import {useModalUltimaComida} from '../../../hooks/paneles/useModalUltimaComida';

interface ModalUltimaComidaProps {
    estaAbierto: boolean;
    onCerrar: () => void;
    onConfirmar: (horaUltimaComidaMs: number | undefined) => void;
}

export function ModalUltimaComida({estaAbierto, onCerrar, onConfirmar}: ModalUltimaComidaProps): JSX.Element | null {
    const {hora, setHora, etiquetaDia, manejarConfirmar} = useModalUltimaComida({estaAbierto, onConfirmar, onCerrar});

    if (!estaAbierto) return null;

    return (
        <Modal estaAbierto={estaAbierto} onCerrar={onCerrar} titulo="Última comida" claseExtra="modalAyunoUltimaComida">
            <div className="modalAyunoUltimaComidaContenido">
                <p className="modalAyunoUltimaComidaTexto">¿A qué hora fue tu última comida?</p>

                <div className="selectorRelojWrapper">
                    <SelectorRelojCircular valor={hora} onChange={setHora} intervaloMinutos={5} radio={110} />
                </div>

                <div className="modalAyunoUltimaComidaInfo">
                    <span className={`modalAyunoUltimaComidaDia ${etiquetaDia === 'Ayer' ? 'modalAyunoUltimaComidaDia--ayer' : ''}`}>{etiquetaDia}</span>
                </div>

                <div className="modalAyunoUltimaComidaAcciones">
                    <Boton type="button" variante="secundario" onClick={onCerrar}>
                        Cancelar
                    </Boton>

                    <Boton
                        type="button"
                        variante="primario"
                        onClick={manejarConfirmar}
                        title="Iniciar ayuno">
                        <Play size={14} />
                        <span>Iniciar</span>
                    </Boton>
                </div>
            </div>
        </Modal>
    );
}
