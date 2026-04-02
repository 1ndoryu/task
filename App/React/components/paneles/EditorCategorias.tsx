/* [024A-30] EditorCategorias
 * UI inline para gestionar categorías de grupos de Facebook.
 * CRUD completo: crear, renombrar, cambiar icono/color, reordenar, eliminar.
 * Lógica extraída a useEditorCategorias. */
/* sentinel-disable-file emoji-unicode */
/* sentinel-disable-file css-inline — backgroundColor es dinámico por usuario, no puede ser clase CSS */

import {Plus, Trash2, ChevronUp, X, Save} from 'lucide-react';
import {Boton, Input} from '../ui';
import {useEditorCategorias, ICONOS_PRESET, COLORES_PRESET} from '../../hooks/paneles/useEditorCategorias';
import type {CategoriaGrupoFb} from '../../stores/gruposFbStore';

interface EditorCategoriasProps {
    categorias: CategoriaGrupoFb[];
    onGuardar: (categorias: Omit<CategoriaGrupoFb, 'id' | 'orden'>[]) => Promise<void>;
    onCerrar: () => void;
}

export function EditorCategorias({categorias, onGuardar, onCerrar}: EditorCategoriasProps): JSX.Element {
    const {
        locales, guardando, error, pickerAbierto, refContenedor,
        agregar, eliminar, actualizar, mover, togglePicker, guardar
    } = useEditorCategorias(categorias, onGuardar, onCerrar);

    return (
        <div className="editorCategorias" ref={refContenedor}>
            <div className="editorCategorias__header">
                <span className="editorCategorias__titulo">Gestionar categorías</span>
                <Boton variante="badge" soloIcono onClick={onCerrar} icono={<X size={12} />} title="Cerrar" />
            </div>

            <div className="editorCategorias__lista">
                {locales.map((cat, index) => (
                    <div key={cat.key} className="editorCategorias__fila">
                        <Boton
                            variante="badge"
                            soloIcono
                            onClick={() => mover(index, -1)}
                            icono={<ChevronUp size={11} />}
                            title="Subir"
                            claseAdicional="editorCategorias__grip"
                        />

                        {/* Icono picker */}
                        <div className="editorCategorias__iconoContenedor">
                            <Boton
                                variante="badge"
                                soloIcono
                                onClick={() => togglePicker('icono', cat.key)}
                                title="Cambiar icono"
                                claseAdicional="editorCategorias__iconoBtn"
                                icono={<span>{cat.icono}</span>}
                            />
                            {pickerAbierto?.tipo === 'icono' && pickerAbierto.key === cat.key && (
                                <div className="editorCategorias__picker editorCategorias__pickerIconos">
                                    {ICONOS_PRESET.map(ic => (
                                        <Boton
                                            key={ic}
                                            variante="badge"
                                            soloIcono
                                            claseAdicional={`editorCategorias__pickerItem ${cat.icono === ic ? 'editorCategorias__pickerItem--activo' : ''}`}
                                            onClick={() => { actualizar(cat.key, 'icono', ic); togglePicker('icono', cat.key); }}
                                            icono={<span>{ic}</span>}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Color picker — inline style necesario: el color es dinámico por usuario */}
                        <div className="editorCategorias__colorContenedor">
                            <span
                                className="editorCategorias__colorBtn"
                                style={{backgroundColor: cat.color}}
                                onClick={() => togglePicker('color', cat.key)}
                                role="button"
                                tabIndex={0}
                                title="Cambiar color"
                            />
                            {pickerAbierto?.tipo === 'color' && pickerAbierto.key === cat.key && (
                                <div className="editorCategorias__picker editorCategorias__pickerColores">
                                    {COLORES_PRESET.map(cl => (
                                        <span
                                            key={cl}
                                            className={`editorCategorias__colorMuestra ${cat.color === cl ? 'editorCategorias__colorMuestra--activo' : ''}`}
                                            style={{backgroundColor: cl}}
                                            onClick={() => { actualizar(cat.key, 'color', cl); togglePicker('color', cat.key); }}
                                            role="button"
                                            tabIndex={0}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Nombre */}
                        <Input
                            tipo="text"
                            claseAdicional="editorCategorias__nombre"
                            value={cat.nombre}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => actualizar(cat.key, 'nombre', e.target.value)}
                            placeholder="Nombre de categoría"
                        />

                        {/* Eliminar */}
                        <Boton
                            variante="badge"
                            soloIcono
                            onClick={() => eliminar(cat.key)}
                            icono={<Trash2 size={11} />}
                            title="Eliminar categoría"
                            claseAdicional="editorCategorias__eliminar"
                        />
                    </div>
                ))}

                {locales.length === 0 && (
                    <div className="editorCategorias__vacio">No hay categorías. Agrega una.</div>
                )}
            </div>

            {error && <div className="editorCategorias__error">{error}</div>}

            <div className="editorCategorias__acciones">
                <Boton variante="badge" onClick={agregar} icono={<Plus size={11} />}>
                    Agregar
                </Boton>
                <Boton variante="ghost" onClick={guardar} icono={<Save size={11} />} disabled={guardando}>
                    {guardando ? 'Guardando...' : 'Guardar'}
                </Boton>
            </div>
        </div>
    );
}
