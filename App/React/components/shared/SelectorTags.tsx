/*
 * SelectorTags
 * Selector para gestionar etiquetas (tags)
 * Estilo Linear: pills removibles + input para agregar
 * Lógica extraída a useSelectorTags
 *
 * Fase 9.7.3: Organización de Propiedades en Tareas
 */

import {Tag, Plus, X} from 'lucide-react';
import {Boton, Input} from '../ui';
import {useSelectorTags} from '../../hooks/shared/useSelectorTags';

interface SelectorTagsProps {
    tags: string[];
    onTagsChange: (tags: string[]) => void;
    placeholder?: string;
}

export function SelectorTags({tags, onTagsChange, placeholder = 'Nueva etiqueta...'}: SelectorTagsProps): JSX.Element {
    const {tagsNormalizados, mostrandoInput, nuevoTag, setNuevoTag, inputRef, contenedorRef, agregarTag, removerTag, manejarKeyDown, abrirInput, manejarBlur} = useSelectorTags({tags, onTagsChange});

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
                        <Input
                            ref={inputRef}
                            tipo="text"
                            claseAdicional="selectorTags__input"
                            value={nuevoTag}
                            onChange={e => setNuevoTag(e.target.value)}
                            onKeyDown={manejarKeyDown}
                            placeholder="Etiqueta"
                            onBlur={manejarBlur}
                        />
                    </div>
                ) : (
                    <Boton type="button" variante="ghost" claseAdicional="pillOpcion pillOpcion--vacio" onClick={abrirInput} title="Agregar etiqueta">
                        <Plus size={14} />
                        <span>Etiqueta</span>
                    </Boton>
                )}
            </div>
        </div>
    );
}
