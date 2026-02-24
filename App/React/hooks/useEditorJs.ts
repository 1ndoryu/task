/*
 * useEditorJs
 * Lógica extraída de EditorJs para cumplir SRP
 * Gestiona inicialización, lifecycle y cleanup del editor Editor.js
 *
 * IMPORTANTE: Usa refs para callbacks para evitar reinicializaciones.
 * Editor.js no es un controlled component, se inicializa una vez.
 */

import {useEffect, useRef} from 'react';
import EditorJS, {OutputData, API} from '@editorjs/editorjs';
import Header from '@editorjs/header';
import Paragraph from '@editorjs/paragraph';
import List from '@editorjs/list';
import Quote from '@editorjs/quote';
import Delimiter from '@editorjs/delimiter';

interface UseEditorJsParams {
    data?: OutputData;
    onChange?: (data: OutputData) => void;
    onReady?: (editor: EditorJS) => void;
    placeholder: string;
    readOnly: boolean;
    minHeight: number;
}

interface UseEditorJsReturn {
    holderRef: React.RefObject<HTMLDivElement>;
}

export function useEditorJs({data, onChange, onReady, placeholder, readOnly, minHeight}: UseEditorJsParams): UseEditorJsReturn {
    const editorRef = useRef<EditorJS | null>(null);
    const holderRef = useRef<HTMLDivElement>(null);

    /*
     * Refs para callbacks - evita que el editor se reinicialice
     * cuando el padre re-renderiza y pasa nuevas funciones
     */
    const onChangeRef = useRef(onChange);
    const onReadyRef = useRef(onReady);

    /* Actualizar refs cuando cambien las props (sin reinicializar editor) */
    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
        onReadyRef.current = onReady;
    }, [onReady]);

    /*
     * Inicializar Editor.js UNA SOLA VEZ
     * El array de dependencias está vacío para evitar reinicializaciones
     */
    useEffect(() => {
        if (editorRef.current) {
            return;
        }

        if (!holderRef.current) {
            console.error('[EditorJs] Holder element not found');
            return;
        }

        const abortController = new AbortController();

        const editor = new EditorJS({
            holder: holderRef.current,
            placeholder,
            readOnly,
            minHeight,
            data: data || undefined,
            tools: {
                header: {
                    class: Header,
                    config: {
                        placeholder: 'Titulo...',
                        levels: [1, 2, 3, 4],
                        defaultLevel: 2
                    }
                },
                paragraph: {
                    class: Paragraph,
                    inlineToolbar: true
                },
                list: {
                    class: List,
                    inlineToolbar: true,
                    config: {
                        defaultStyle: 'unordered'
                    }
                },
                quote: {
                    class: Quote,
                    inlineToolbar: true,
                    config: {
                        quotePlaceholder: 'Escribe una cita...',
                        captionPlaceholder: 'Autor'
                    }
                },
                delimiter: Delimiter
            },
            onChange: async (api: API) => {
                if (abortController.signal.aborted) return;
                if (onChangeRef.current) {
                    const outputData = await api.saver.save();
                    if (abortController.signal.aborted) return;
                    onChangeRef.current(outputData);
                }
            },
            onReady: () => {
                if (abortController.signal.aborted) return;
                if (onReadyRef.current && editorRef.current) {
                    onReadyRef.current(editorRef.current);
                }
            }
        });

        editorRef.current = editor;

        return () => {
            abortController.abort();
            if (editorRef.current && typeof editorRef.current.destroy === 'function') {
                editorRef.current.destroy();
                editorRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return {holderRef};
}

export type {OutputData};
