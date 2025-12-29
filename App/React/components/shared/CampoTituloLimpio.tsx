/*
 * CampoTituloLimpio
 * Input sin borde visible para titulos principales
 * Estilo Linear: transparente, font grande, borde sutil en focus
 *
 * Fase 9.2.2: Base del nuevo look de configuracion
 */

import {useRef, useEffect} from 'react';

interface CampoTituloLimpioProps {
    id?: string;
    valor: string;
    onChange: (valor: string) => void;
    placeholder?: string;
    error?: string;
    autoFocus?: boolean;
    disabled?: boolean;
    /* Icono opcional a la izquierda (ej: SelectorIconoProyecto) */
    iconoIzquierda?: React.ReactNode;
}

export function CampoTituloLimpio({id, valor, onChange, placeholder = 'Sin titulo...', error, autoFocus = false, disabled = false, iconoIzquierda}: CampoTituloLimpioProps): JSX.Element {
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (autoFocus && inputRef.current) {
            inputRef.current.focus();
        }
    }, [autoFocus]);

    const claseInput = `campoTituloLimpio__input${error ? ' campoTituloLimpio__input--error' : ''}`;

    return (
        <div id={id ? `${id}-contenedor` : undefined} className="campoTituloLimpio">
            {iconoIzquierda && <div className="campoTituloLimpio__icono">{iconoIzquierda}</div>}
            <div className="campoTituloLimpio__contenedor">
                <input ref={inputRef} id={id} type="text" className={claseInput} value={valor} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled} />
                {error && <span className="campoTituloLimpio__error">{error}</span>}
            </div>
        </div>
    );
}
