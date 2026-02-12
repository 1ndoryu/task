/*
 * ModalUltimaComida
 * Modal minimalista para preguntar la hora de la última comida antes de iniciar un ayuno.
 */

import {useMemo, useState} from 'react';
import {Play} from 'lucide-react';
import {Modal} from '../../shared/Modal';
import {SelectorRelojCircular} from './SelectorRelojCircular';

interface ModalUltimaComidaProps {
    estaAbierto: boolean;
    onCerrar: () => void;
    onConfirmar: (horaUltimaComidaMs: number | undefined) => void;
}

function formatearHoraParaInput(fecha: Date): string {
    const h = fecha.getHours().toString().padStart(2, '0');
    const m = fecha.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
}

function convertirHoraInputATimestamp(hora: string, ahora: Date): number {
    const [hhStr, mmStr] = hora.split(':');
    const hh = Number(hhStr);
    const mm = Number(mmStr);

    const candidato = new Date(ahora);
    candidato.setSeconds(0);
    candidato.setMilliseconds(0);
    candidato.setHours(hh, mm, 0, 0);

    /* Si la hora cae en el futuro, asumir que fue el día anterior */
    if (candidato.getTime() > ahora.getTime()) {
        candidato.setDate(candidato.getDate() - 1);
    }

    return candidato.getTime();
}

export function ModalUltimaComida({estaAbierto, onCerrar, onConfirmar}: ModalUltimaComidaProps): JSX.Element | null {
    const valorPorDefecto = useMemo(() => formatearHoraParaInput(new Date()), []);
    const [hora, setHora] = useState(valorPorDefecto);

    /* Calcular si la hora seleccionada se interpreta como hoy o ayer */
    const fechaInterpretada = useMemo(() => {
        if (!hora) return null;
        const ahora = new Date();
        const ts = convertirHoraInputATimestamp(hora, ahora);
        return new Date(ts);
    }, [hora]);

    const etiquetaDia = useMemo(() => {
        if (!fechaInterpretada) return '';
        const ahora = new Date();
        const esHoy = fechaInterpretada.getDate() === ahora.getDate();
        return esHoy ? 'Hoy' : 'Ayer';
    }, [fechaInterpretada]);

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
                    <button type="button" className="modalAyunoUltimaComidaBoton modalAyunoUltimaComidaBoton--secundario" onClick={onCerrar}>
                        Cancelar
                    </button>

                    <button
                        type="button"
                        className="modalAyunoUltimaComidaBoton modalAyunoUltimaComidaBoton--primario"
                        onClick={() => {
                            const ahora = new Date();
                            const ts = hora ? convertirHoraInputATimestamp(hora, ahora) : undefined;
                            onConfirmar(ts);
                            onCerrar();
                        }}
                        title="Iniciar ayuno">
                        <Play size={14} />
                        <span>Iniciar</span>
                    </button>
                </div>
            </div>
        </Modal>
    );
}
