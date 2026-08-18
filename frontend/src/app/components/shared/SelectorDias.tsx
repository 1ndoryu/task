/*
 * SelectorDias
 * Componente reutilizable para seleccionar dias de la semana
 */

import type {DiaSemana} from '../../types/dashboard';
import {Boton} from '../ui';

interface SelectorDiasProps {
    seleccionados: DiaSemana[];
    onChange: (dias: DiaSemana[]) => void;
    deshabilitado?: boolean;
}

const DIAS_SEMANA: {dia: DiaSemana; etiqueta: string; corto: string}[] = [
    {dia: 'lunes', etiqueta: 'Lunes', corto: 'L'},
    {dia: 'martes', etiqueta: 'Martes', corto: 'M'},
    {dia: 'miercoles', etiqueta: 'Miercoles', corto: 'X'},
    {dia: 'jueves', etiqueta: 'Jueves', corto: 'J'},
    {dia: 'viernes', etiqueta: 'Viernes', corto: 'V'},
    {dia: 'sabado', etiqueta: 'Sabado', corto: 'S'},
    {dia: 'domingo', etiqueta: 'Domingo', corto: 'D'}
];

export function SelectorDias({seleccionados, onChange, deshabilitado = false}: SelectorDiasProps): JSX.Element {
    const manejarToggle = (dia: DiaSemana) => {
        if (deshabilitado) return;

        const yaSeleccionado = seleccionados.includes(dia);
        let nuevosDias: DiaSemana[];

        if (yaSeleccionado) {
            nuevosDias = seleccionados.filter(d => d !== dia);
        } else {
            nuevosDias = [...seleccionados, dia];
        }

        onChange(nuevosDias);
    };

    return (
        <div className="selectorDias">
            {DIAS_SEMANA.map(({dia, corto, etiqueta}) => (
                <Boton key={dia} type="button" variante="ghost" claseAdicional={`selectorDiaBoton ${seleccionados.includes(dia) ? 'selectorDiaBotonActivo' : ''}`} onClick={() => manejarToggle(dia)} disabled={deshabilitado} title={etiqueta}>
                    {corto}
                </Boton>
            ))}
        </div>
    );
}

export type {SelectorDiasProps};
