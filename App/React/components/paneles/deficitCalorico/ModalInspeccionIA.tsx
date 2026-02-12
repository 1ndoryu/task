/*
 * ModalInspeccionIA
 * Modal para mostrar el log detallado del proceso de IA
 * Útil para debugging y entender cómo la IA procesó la solicitud
 */

import {X} from 'lucide-react';

interface ModalInspeccionIAProps {
    estaAbierto: boolean;
    onCerrar: () => void;
    log: string[];
}

export function ModalInspeccionIA({estaAbierto, onCerrar, log}: ModalInspeccionIAProps): JSX.Element | null {
    if (!estaAbierto) return null;

    return (
        <div className="modalOverlay" onClick={onCerrar}>
            <div className="modalContenedor modalContenedor--mediana" onClick={e => e.stopPropagation()}>
                <div className="modalEncabezado">
                    <h2 className="modalTitulo">Proceso de IA - Inspección</h2>
                    <button type="button" className="modalCerrar" onClick={onCerrar} aria-label="Cerrar">
                        <X size={18} />
                    </button>
                </div>

                <div className="modalCuerpo">
                    <p className="modalDescripcion">Este es el log detallado del proceso de análisis de calorías con IA:</p>

                    <div className="modalInspeccionLog">
                        {log.map((linea, index) => {
                            const esError = linea.startsWith('[X]') || linea.startsWith('[!]');
                            const esExito = linea.includes('✓');
                            const esInput = linea.startsWith('[1]');

                            return (
                                <div key={index} className={`modalInspeccionLogLinea ${esError ? 'modalInspeccionLogLinea--error' : ''} ${esExito ? 'modalInspeccionLogLinea--exito' : ''} ${esInput ? 'modalInspeccionLogLinea--input' : ''}`}>
                                    {linea}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="modalFooter">
                    <button type="button" className="botonModal botonModal--secundario" onClick={onCerrar}>
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
