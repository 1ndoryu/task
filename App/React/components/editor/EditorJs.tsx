/**
 * EditorJs - Wrapper de Editor.js para React
 *
 * IMPORTANTE: Este componente usa refs para callbacks para evitar
 * reinicializaciones del editor. Editor.js no es un controlled component,
 * se inicializa una vez y luego maneja su propio estado interno.
 */

import type {Ref} from 'react';
import type EditorJS from '@editorjs/editorjs';
import type {OutputData} from '@editorjs/editorjs';
import {useEditorJs} from '../../hooks/useEditorJs';

interface EditorJsProps {
    id?: string;
    data?: OutputData;
    onChange?: (data: OutputData) => void;
    onReady?: (editor: EditorJS) => void;
    placeholder?: string;
    readOnly?: boolean;
    minHeight?: number;
}

export function EditorJs({id = 'editorjs-container', data, onChange, onReady, placeholder = 'Escribe aqui o presiona Tab para ver los bloques...', readOnly = false, minHeight = 300}: EditorJsProps): JSX.Element {
    const {holderRef} = useEditorJs({data, onChange, onReady, placeholder, readOnly, minHeight});

    return (
        <div id="editorjs-wrapper" className="editorjs-contenedor">
            <div id={id} ref={holderRef as Ref<HTMLDivElement>} />
        </div>
    );
}

export default EditorJs;
export type {OutputData};
