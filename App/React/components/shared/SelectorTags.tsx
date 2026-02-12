/*
 * SelectorTags
 * Selector para gestionar etiquetas (tags)
 * Estilo Linear: pills removibles + input para agregar
 *
 * Fase 9.7.3: Organización de Propiedades en Tareas
 */

import {useState, useRef, useEffect} from 'react';
import {Tag, Plus, X} from 'lucide-react';
import {Boton} from '../ui';

interface SelectorTagsProps {
    tags: string[];
    onTagsChange: (tags: string[]) => void;
    placeholder?: string;
}

export function SelectorTags({tags, onTagsChange, placeholder = 'Nueva etiqueta...'}: SelectorTagsProps): JSX.Element {
    /* Normalizar tags - validación defensiva */
    const tagsNormalizados = Array.isArray(tags) ? tags : [];
    const [mostrandoInput, setMostrandoInput] = useState(false);
    const [nuevoTag, setNuevoTag] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const contenedorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (mostrandoInput && inputRef.current) {
            inputRef.current.focus();
        }
    }, [mostrandoInput]);

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

    const agregarTag = () => {
        if (nuevoTag.trim()) {
            const tagLimpio = nuevoTag.trim();
            if (!tagsNormalizados.includes(tagLimpio)) {
                onTagsChange([...tagsNormalizados, tagLimpio]);
            }

            setNuevoTag('');
            /* Mantener input abierto para agregar mas tags */
            /* setMostrandoInput(false); */
            if (inputRef.current) inputRef.current.focus();
        }
    };

    const removerTag = (tagARemover: string) => {
        onTagsChange(tagsNormalizados.filter(t => t !== tagARemover));
    };

    const manejarKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            agregarTag();
        } else if (e.key === 'Escape') {
            setMostrandoInput(false);
            setNuevoTag('');
        }
    };

    return (
        <div className="propiedadesCompactas__contenido" ref={contenedorRef} style={{flexWrap: 'wrap'}}>
            {/* Lista de tags existentes - Estilo Pill consistente */}
            {tagsNormalizados.map(tag => (
                <div key={tag} className="propiedadesCompactas__item">
                    <Boton type="button" variante="ghost" claseAdicional="pillOpcion" onClick={() => removerTag(tag)} title={`Remover: ${tag}`}>
                        <Tag size={14} />
                        <span>{tag}</span>
                        <div className="pillOpcion__hoverIcon">
                            <X size={12} />
                        </div>
                    </Boton>
                </div>
            ))}

            {/* Input o Boton para agregar */}
            <div className="propiedadesCompactas__item">
                {mostrandoInput ? (
                    <div className="pillOpcion pillOpcion--input">
                        <Plus size={14} />
                        <input
                            ref={inputRef}
                            type="text"
                            className="selectorTags__input"
                            value={nuevoTag}
                            onChange={e => setNuevoTag(e.target.value)}
                            onKeyDown={manejarKeyDown}
                            placeholder="Etiqueta"
                            onBlur={() => {
                                if (!nuevoTag) setMostrandoInput(false);
                            }}
                        />
                    </div>
                ) : (
                    <Boton type="button" variante="ghost" claseAdicional="pillOpcion pillOpcion--vacio" onClick={() => setMostrandoInput(true)} title="Agregar etiqueta">
                        <Plus size={14} />
                        <span>Etiqueta</span>
                    </Boton>
                )}
            </div>
        </div>
    );
}
