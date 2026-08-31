/*
 * ToggleSwitch
 * Componente reutilizable para interruptor boolean (on/off)
 */

interface ToggleSwitchProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    className?: string;
    disabled?: boolean;
    /* [318A-2 fb] Etiqueta accesible opcional (p. ej. "Activar plugin").
     * Se aplica al label para que el toggle sea anunciado por lectores. */
    'aria-label'?: string;
}

export function ToggleSwitch({checked, onChange, className = '', disabled = false, 'aria-label': ariaLabel}: ToggleSwitchProps): JSX.Element {
    return (
        <label className={`toggleSwitch ${className}`} aria-label={ariaLabel}>
            <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} disabled={disabled} />
            <span className="toggleSlider" />
        </label>
    );
}

export type {ToggleSwitchProps};
