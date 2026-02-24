/*
 * SelectorHoraAyuno
 * Selector minimalista para elegir una hora (HH:MM) con estilo del dashboard.
 */

import {useMemo} from 'react';
import {Select} from '../../ui';

interface SelectorHoraAyunoProps {
    valor: string;
    onChange: (valor: string) => void;
    intervaloMinutos?: number;
}

function normalizarHora(hora: string): {hh: string; mm: string} {
    const [hhRaw, mmRaw] = hora.split(':');
    const hh = (hhRaw ?? '00').padStart(2, '0').slice(0, 2);
    const mm = (mmRaw ?? '00').padStart(2, '0').slice(0, 2);
    return {hh, mm};
}

export function SelectorHoraAyuno({valor, onChange, intervaloMinutos = 5}: SelectorHoraAyunoProps): JSX.Element {
    const {hh, mm} = useMemo(() => normalizarHora(valor), [valor]);

    const horas = useMemo(() => Array.from({length: 24}, (_, i) => i.toString().padStart(2, '0')), []);
    const minutos = useMemo(() => {
        const paso = Math.max(1, Math.min(30, intervaloMinutos));
        const lista: string[] = [];
        for (let i = 0; i < 60; i += paso) {
            lista.push(i.toString().padStart(2, '0'));
        }
        /* Asegurar que el valor actual exista aunque no coincida con el paso */
        if (!lista.includes(mm)) {
            lista.push(mm);
            lista.sort();
        }
        return lista;
    }, [intervaloMinutos, mm]);

    const manejarCambiarHora = (nuevaHora: string) => {
        onChange(`${nuevaHora}:${mm}`);
    };

    const manejarCambiarMinuto = (nuevoMinuto: string) => {
        onChange(`${hh}:${nuevoMinuto}`);
    };

    return (
        <div className="selectorHoraAyuno" aria-label="Selector de hora">
            <Select claseAdicional="selectorHoraAyunoSelect" value={hh} onChange={e => manejarCambiarHora(e.target.value)} aria-label="Hora" opciones={horas.map(h => ({valor: h, etiqueta: h}))} />
            <span className="selectorHoraAyunoSeparador" aria-hidden="true">:</span>
            <Select claseAdicional="selectorHoraAyunoSelect" value={mm} onChange={e => manejarCambiarMinuto(e.target.value)} aria-label="Minutos" opciones={minutos.map(m => ({valor: m, etiqueta: m}))} />
        </div>
    );
}
