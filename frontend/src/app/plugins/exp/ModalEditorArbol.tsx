/*
 * plugins/exp/ModalEditorArbol.tsx
 * Modal del plugin Game para dibujar a mano los 5 estados del árbol de vida.
 *
 * Envuelve el editor de pixel art AGNÓSTICO (glory-core/components/pixelart)
 * y lo especializa:
 * - 5 pestañas (0/25/50/75/100%): la copa de cada estado se precarga desde
 *   ArbolVida (copa por defecto o la versión editada persistida en el store).
 * - El tronco/raíces van como celdas `bloqueadas` (no editables).
 * - Pintar/borrar persiste la copa COMPLETA del estado en `glory-exp`
 *   (copasArbol), de modo que el render del árbol (ArbolVida) la refleja.
 * - Botón "Volver a por defecto" restablece la copa base de ArbolVida.
 *
 * Autocontenido (no usa useModalesDashboard): se abre/cierra desde PanelExp.
 */

import {useState} from 'react';
import {Pencil, RotateCcw} from 'lucide-react';
import {EditorPixelArt} from '../../../glory-core/components/pixelart/EditorPixelArt';
import {ArbolVida, CELDAS_TRONCO, copaPorDefecto, ESTADOS_ARBOL, type EstadoVida} from './ArbolVida';
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

    /* Copa completa actual del estado seleccionado: editada (persistida) o por defecto. */
    const editada = copasArbol[String(estadoSel)];
    const copaActual: Set<string> = editada
        ? new Set(editada.filter(k => !CELDAS_TRONCO.has(k)))
        : copaPorDefecto(estadoSel);

    /* `onCambio` recibe la copa completa pintada por el usuario; se persiste al
     * store (array) para que ArbolVida la use como reemplazo. */
    const manejarCambio = (siguiente: Set<string>) => {
        const limpia = new Set<string>();
        for (const c of siguiente) {
            if (!CELDAS_TRONCO.has(c)) limpia.add(c);
        }
        asignarCopaArbol(estadoSel, limpia);
    };

    return (
        <div className="modalEditorArbolOverlay" onMouseDown={e => { if (e.target === e.currentTarget) onCerrar(); }}>
            <div className="modalEditorArbol" role="dialog" aria-modal="true" aria-label="Editor del árbol de vida">
                <div className="modalEditorArbolCabecera">
                    <span className="modalEditorArbolTitulo">
                        <Pencil size={14} /> Editor del árbol de vida
                    </span>
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
                        <div className="modalEditorArbolLienzoTitulo">Dibuja la copa de {estadoSel}%</div>
                        <EditorPixelArt
                            dimensiones={16}
                            activas={new Set(copaActual)}
                            onCambio={(nuevas) => manejarCambio(nuevas)}
                            bloqueadas={CELDAS_TRONCO}
                            colorRelleno="#ffffff"
                            mostrarCuadricula={true}
                        />
                        {editada && (
                            <button
                                type="button"
                                className="modalEditorArbolRestaurar"
                                onClick={() => restablecerCopaArbol(estadoSel)}
                            >
                                <RotateCcw size={13} /> Volver a la copa por defecto
                            </button>
                        )}
                    </div>

                    {/* Vista previa en vivo */}
                    <div className="modalEditorArbolPreview">
                        <div className="modalEditorArbolPreviewTitulo">Vista previa · {estadoSel}%</div>
                        <div className="modalEditorArbolPreviewArbol">
                            <ArbolVida vida={estadoSel} copaEditada={copaActual} />
                        </div>
                        <p className="modalEditorArbolAyuda">
                            Click pinta · arrastra dibuja de corrido · borrador borra.
                            El tronco está fijo y no se puede editar.
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