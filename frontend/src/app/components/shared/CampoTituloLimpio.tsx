/*
 * CampoTituloLimpio
 * Textarea sin borde visible para titulos principales
 * Estilo Linear: transparente, font grande, borde sutil en focus
 * Soporta titulos largos con salto de linea automatico
 *
 * Fase 9.2.2: Base del nuevo look de configuracion
 */

import {useRef, useEffect, useCallback} from 'react';

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
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    /* Ajustar altura del textarea automaticamente */
    const ajustarAltura = useCallback(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    }, []);

    useEffect(() => {
        if (autoFocus && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [autoFocus]);

    /* Ajustar altura cuando cambia el valor */
    useEffect(() => {
        ajustarAltura();
    }, [valor, ajustarAltura]);

    const manejarCambio = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange(e.target.value);
    };

    /* Prevenir salto de linea con Enter (comportamiento de input) */
    const manejarTecla = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
        }
    };

    const claseInput = `campoTituloLimpio__input${error ? ' campoTituloLimpio__input--error' : ''}`;

    return (
        <div id={id ? `${id}-contenedor` : undefined} className="campoTituloLimpio">
            {iconoIzquierda && <div className="campoTituloLimpio__icono">{iconoIzquierda}</div>}
            <div className="campoTituloLimpio__contenedor">
                <textarea ref={textareaRef} id={id} className={claseInput} value={valor} onChange={manejarCambio} onKeyDown={manejarTecla} placeholder={placeholder} disabled={disabled} rows={1} />
                {error && <span className="campoTituloLimpio__error">{error}</span>}
            </div>
        </div>
    );
}
