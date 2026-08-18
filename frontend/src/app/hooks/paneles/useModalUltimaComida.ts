/*
 * useModalUltimaComida
 * Lógica extraída de ModalUltimaComida para cumplir SRP
 * Gestiona selección de hora de última comida antes de iniciar ayuno
 */

import {useEffect, useMemo, useState} from 'react';

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

interface UseModalUltimaComidaParams {
    estaAbierto: boolean;
    onConfirmar: (horaUltimaComidaMs: number | undefined) => void;
    onCerrar: () => void;
}

interface UseModalUltimaComidaReturn {
    hora: string;
    setHora: (hora: string) => void;
    etiquetaDia: string;
    manejarConfirmar: () => void;
}

export function useModalUltimaComida({estaAbierto, onConfirmar, onCerrar}: UseModalUltimaComidaParams): UseModalUltimaComidaReturn {
    const valorPorDefecto = useMemo(() => formatearHoraParaInput(new Date()), []);
    const [hora, setHora] = useState(valorPorDefecto);

    useEffect(() => {
        if (!estaAbierto) return;
        setHora(formatearHoraParaInput(new Date()));
    }, [estaAbierto]);

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

    const manejarConfirmar = () => {
        const ahora = new Date();
        const ts = hora ? convertirHoraInputATimestamp(hora, ahora) : undefined;
        onConfirmar(ts);
        onCerrar();
    };

    return {
        hora,
        setHora,
        etiquetaDia,
        manejarConfirmar
    };
}
