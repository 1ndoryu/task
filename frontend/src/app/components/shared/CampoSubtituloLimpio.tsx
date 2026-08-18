/*
 * CampoSubtituloLimpio
 * Textarea sin borde para subtitulos o descripciones breves
 * Similar a CampoTituloLimpio pero font menor y color apagado
 *
 * Fase 9.2.2: Campo "lead" o resumen breve
 */

import {useRef, useEffect, useCallback} from 'react';

interface CampoSubtituloLimpioProps {
    id?: string;
    valor: string;
    onChange: (valor: string) => void;
    placeholder?: string;
    disabled?: boolean;
    /* Numero maximo de filas para auto-expand */
    maxFilas?: number;
}

export function CampoSubtituloLimpio({id, valor, onChange, placeholder = 'Anade una descripcion...', disabled = false, maxFilas = 5}: CampoSubtituloLimpioProps): JSX.Element {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    /* Auto-expand del textarea */
    const ajustarAltura = useCallback(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        /* Resetear altura para recalcular */
        textarea.style.height = 'auto';

        /* Calcular altura maxima basada en lineas */
        const lineaAltura = 20;
        const alturaMaxima = lineaAltura * maxFilas;

        /* Ajustar al contenido o maximo */
        const nuevaAltura = Math.min(textarea.scrollHeight, alturaMaxima);
        textarea.style.height = `${nuevaAltura}px`;
    }, [maxFilas]);

    useEffect(() => {
        ajustarAltura();
    }, [valor, ajustarAltura]);

    const manejarCambio = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange(e.target.value);
    };

    return <textarea ref={textareaRef} id={id} className="campoSubtituloLimpio__input" value={valor} onChange={manejarCambio} placeholder={placeholder} disabled={disabled} rows={1} />;
}
