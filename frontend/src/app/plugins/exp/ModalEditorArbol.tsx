/*
 * plugins/exp/ModalEditorArbol.tsx
 * Modal del plugin Game para dibujar a mano los 5 estados del árbol de vida.
 *
 * Envuelve el editor de pixel art AGNÓSTICO (glory-core/components/pixelart)
 * y lo especializa:
 * - 5 pestañas (0/25/50/75/100%): la imagen de cada estado se precarga desde
 *   ArbolVida (árbol por defecto o la versión editada persistida en el store).
 * - Todo es editable, incluido el tronco: el usuario puede borrarlo o
 *   redibujarlo; la imagen guardada reemplaza por completo a la por defecto.
 * - Pintar/borrar persiste la imagen COMPLETA del estado en `glory-exp`
 *   (copasArbol), de modo que el render del árbol (ArbolVida) la refleja.
 * - Botón "Volver a por defecto" restablece el árbol base de ArbolVida.
 *
 * Autocontenido (no usa useModalesDashboard): se abre/cierra desde PanelExp.
 */

import {useState} from 'react';
import {RotateCcw} from 'lucide-react';
import {EditorPixelArt} from '../../../glory-core/components/pixelart/EditorPixelArt';
import {ArbolVida, celdasCompletas, ESTADOS_ARBOL, type EstadoVida} from './ArbolVida';
import {useExpStore} from './store';
import {Boton} from '../../components/ui/Boton';
import './modalEditorArbol.css';

interface ModalEditorArbolProps {
    activo: boolean;
    onCerrar: () => void;
}

export function ModalEditorArbol({activo, onCerrar}: ModalEditorArbolProps): JSX.Element | null {
    const [estadoSel, setEstadoSel] = useState<EstadoVida>(100);
    const copasArbol = useExpStore(s => s.copasArbol);
    const asignarCopaArbol = useExpStore(s => s.asignarCopaArbol);
    const restablecerCopaArbol = useExpStore(s => s.restablecerCopaArbol);

    if (!activo) return null;

    /* Imagen completa actual del estado seleccionado: editada (persistida) o
     * por defecto. Incluye el tronco: el usuario decide si lo conserva. */
    const editada = copasArbol[String(estadoSel)];
    const imagenActual: Set<string> = celdasCompletas(estadoSel, editada ? new Set(editada) : undefined);

    /* `onCambio` recibe la imagen completa pintada por el usuario (tronco
     * incluido si lo conservó); se persiste al store (array) para que
     * ArbolVida la use como reemplazo completo del estado. */
    const manejarCambio = (siguiente: Set<string>) => {
        asignarCopaArbol(estadoSel, new Set(siguiente));
    };

    return (
        <div className="modalEditorArbolOverlay" onMouseDown={e => { if (e.target === e.currentTarget) onCerrar(); }}>
            <div className="modalEditorArbol" role="dialog" aria-modal="true" aria-label="Editor del árbol de vida">
                <div className="modalEditorArbolCabecera">
                    <span className="modalEditorArbolTitulo">Editor del árbol de vida</span>
                    <button type="button" className="modalEditorArbolCerrar" onClick={onCerrar} aria-label="Cerrar">×</button>
                </div>

                {/* Pestañas de estado */}
                <div className="modalEditorArbolPestanas" role="tablist" aria-label="Estado de vida">
                    {ESTADOS_ARBOL.map(e => {
                        const editado = Boolean(copasArbol[String(e)]);
                        return (
                            <button
                                key={e}
                                role="tab"
                                aria-selected={estadoSel === e}
                                className={`modalEditorArbolPestana ${estadoSel === e ? 'modalEditorArbolPestana--activa' : ''}`}
                                onClick={() => setEstadoSel(e)}
                            >
                                <span>{e}%</span>
                                {editado && <span className="modalEditorArbolPestanaPunto" title="Personalizado" />}
                            </button>
                        );
                    })}
                </div>

                <div className="modalEditorArbolCuerpo">
                    {/* Editor de pixel art del estado */}
                    <div className="modalEditorArbolLienzo">
                        <div className="modalEditorArbolLienzoTitulo">Dibuja el árbol de {estadoSel}%</div>
                        <EditorPixelArt
                            dimensiones={16}
                            activas={new Set(imagenActual)}
                            onCambio={(nuevas) => manejarCambio(nuevas)}
                            colorRelleno="#ffffff"
                            mostrarCuadricula={true}
                        />
                        {editada && (
                            <button
                                type="button"
                                className="modalEditorArbolRestaurar"
                                onClick={() => restablecerCopaArbol(estadoSel)}
                            >
                                <RotateCcw size={13} /> Volver al árbol por defecto
                            </button>
                        )}
                    </div>

                    {/* Vista previa en vivo */}
                    <div className="modalEditorArbolPreview">
                        <div className="modalEditorArbolPreviewTitulo">Vista previa · {estadoSel}%</div>
                        <div className="modalEditorArbolPreviewArbol">
                            <ArbolVida vida={estadoSel} copaEditada={imagenActual} />
                        </div>
                        <p className="modalEditorArbolAyuda">
                            Click pinta · arrastra dibuja de corrido · borrador borra.
                            Todo es editable, incluido el tronco.
                        </p>
                    </div>
                </div>

                <div className="modalEditorArbolPie">
                    <Boton type="button" variante="primario" onClick={onCerrar}>Listo</Boton>
                </div>
            </div>
        </div>
    );
}