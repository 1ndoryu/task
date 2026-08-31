/*
 * Range
 * Componente reutilizable para input range (slider) con el lenguaje visual
 * del sistema: track fino y thumb cuadrado con borde del acento.
 * [318A-2 fb] Unifica las 3 implementaciones previas (configExpRange custom,
 * range nativo del agente con accent-color, y .input.input--range del chat
 * IA que heredaba el padding de un campo de texto) en una sola.
 */

interface RangeProps {
    min: number;
    max: number;
    step?: number;
    value: number;
    onChange: (value: number) => void;
    disabled?: boolean;
    'aria-label'?: string;
    className?: string;
}

export function Range({min, max, step = 1, value, onChange, disabled = false, 'aria-label': ariaLabel, className = ''}: RangeProps): JSX.Element {
    return (
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={e => onChange(Number(e.target.value))}
            disabled={disabled}
            aria-label={ariaLabel}
            className={`range ${className}`}
        />
    );
}

export type {RangeProps};
