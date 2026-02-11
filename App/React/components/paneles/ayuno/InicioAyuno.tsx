/*
 * InicioAyuno
 * Bloque SRP para iniciar un ayuno solicitando la hora de la última comida.
 */

import {useEffect, useMemo, useState} from 'react';
import {Play, X} from 'lucide-react';

interface InicioAyunoProps {
    deshabilitado?: boolean;
    onIniciar: (horaUltimaComidaMs: number | undefined) => void;
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

export function InicioAyuno({deshabilitado = false, onIniciar}: InicioAyunoProps): JSX.Element {
    const [preguntando, setPreguntando] = useState(false);
    const [horaUltimaComida, setHoraUltimaComida] = useState('');

    const valorPorDefecto = useMemo(() => formatearHoraParaInput(new Date()), []);

    useEffect(() => {
        if (!preguntando) return;
        setHoraUltimaComida(valorPorDefecto);
    }, [preguntando, valorPorDefecto]);

    if (!preguntando) {
        return (
            <button
                className="panelAyunoBoton panelAyunoBoton--iniciar"
                onClick={() => !deshabilitado && setPreguntando(true)}
                type="button"
                disabled={deshabilitado}
            >
                <Play size={16} />
                <span>Comenzar ayuno</span>
            </button>
        );
    }

    return (
        <div className="panelAyunoInicio">
            <div className="panelAyunoInicioFila">
                <label className="panelAyunoInicioLabel" htmlFor="ayuno-hora-ultima-comida">Última comida</label>
                <input
                    id="ayuno-hora-ultima-comida"
                    className="panelAyunoInicioInput"
                    type="time"
                    value={horaUltimaComida}
                    onChange={e => setHoraUltimaComida(e.target.value)}
                    disabled={deshabilitado}
                />
            </div>

            <div className="panelAyunoInicioAcciones">
                <button
                    className="panelAyunoBoton panelAyunoBoton--secundario"
                    onClick={() => setPreguntando(false)}
                    type="button"
                    disabled={deshabilitado}
                    title="Cancelar"
                >
                    <X size={16} />
                    <span>Cancelar</span>
                </button>
                <button
                    className="panelAyunoBoton panelAyunoBoton--iniciar"
                    onClick={() => {
                        const ahora = new Date();
                        const ts = horaUltimaComida ? convertirHoraInputATimestamp(horaUltimaComida, ahora) : undefined;
                        onIniciar(ts);
                        setPreguntando(false);
                    }}
                    type="button"
                    disabled={deshabilitado}
                    title="Iniciar ayuno"
                >
                    <Play size={16} />
                    <span>Iniciar</span>
                </button>
            </div>
        </div>
    );
}
