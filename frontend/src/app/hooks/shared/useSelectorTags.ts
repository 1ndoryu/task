/*
 * useSelectorTags
 * Hook que encapsula la lógica del selector de tags:
 * mostrar/ocultar input, agregar/remover tags, click-outside,
 * auto-focus y manejo de teclado.
 */

import {useState, useRef, useEffect, useCallback} from 'react';

interface UseSelectorTagsParams {
    tags: string[];
    onTagsChange: (tags: string[]) => void;
}

export function useSelectorTags({tags, onTagsChange}: UseSelectorTagsParams) {
    /* Normalizar tags - validación defensiva */
    const tagsNormalizados = Array.isArray(tags) ? tags : [];
    const [mostrandoInput, setMostrandoInput] = useState(false);
    const [nuevoTag, setNuevoTag] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const contenedorRef = useRef<HTMLDivElement>(null);

    /* Auto-focus al mostrar input */
    useEffect(() => {
        if (mostrandoInput && inputRef.current) {
            inputRef.current.focus();
        }
    }, [mostrandoInput]);

    /* Click outside para cerrar input */
    useEffect(() => {
        const manejarClickFuera = (e: MouseEvent) => {
            if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
                setMostrandoInput(false);
                setNuevoTag('');
            }
        };

        if (mostrandoInput) {
            document.addEventListener('mousedown', manejarClickFuera);
        }

        return () => {
            document.removeEventListener('mousedown', manejarClickFuera);
        };
    }, [mostrandoInput]);

    /* Agregar tag nuevo */
    const agregarTag = useCallback(() => {
        if (nuevoTag.trim()) {
            const tagLimpio = nuevoTag.trim();
            if (!tagsNormalizados.includes(tagLimpio)) {
                onTagsChange([...tagsNormalizados, tagLimpio]);
            }
            setNuevoTag('');
            /* Mantener input abierto para agregar mas tags */
            if (inputRef.current) inputRef.current.focus();
        }
    }, [nuevoTag, tagsNormalizados, onTagsChange]);

    /* Remover tag existente */
    const removerTag = useCallback(
        (tagARemover: string) => {
            onTagsChange(tagsNormalizados.filter(t => t !== tagARemover));
        },
        [tagsNormalizados, onTagsChange]
    );

    /* Manejar teclas en input */
    const manejarKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                agregarTag();
            } else if (e.key === 'Escape') {
                setMostrandoInput(false);
                setNuevoTag('');
            }
        },
        [agregarTag]
    );

    /* Mostrar input */
    const abrirInput = useCallback(() => {
        setMostrandoInput(true);
    }, []);

    /* Manejar blur del input */
    const manejarBlur = useCallback(() => {
        if (!nuevoTag) setMostrandoInput(false);
    }, [nuevoTag]);

    return {
        tagsNormalizados,
        mostrandoInput,
        nuevoTag,
        setNuevoTag,
        inputRef,
        contenedorRef,
        agregarTag,
        removerTag,
        manejarKeyDown,
        abrirInput,
        manejarBlur
    };
}
