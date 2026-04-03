/*
 * ModalInspeccionIA
 * Modal para mostrar el log detallado del proceso de IA
 * Útil para debugging y entender cómo la IA procesó la solicitud
 */

import {X} from 'lucide-react';
import {Boton} from '../../ui';

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
                    <Boton variante="icono" onClick={onCerrar} icono={<X size={18} />} title="Cerrar" />
                </div>

                <div className="modalCuerpo">
                    <p className="modalDescripcion">Este es el log detallado del proceso de análisis de calorías con IA:</p>

                    <div className="modalInspeccionLog">
                        {log.map((linea, index) => {
                            const esError = linea.startsWith('[X]') || linea.startsWith('[!]');
                            /* sentinel-disable-next-line emoji-en-codigo — detecta lineas exitosas del log */
                            const esExito = linea.includes('✓');
                            const esInput = linea.startsWith('[1]');

                            return (
                                <div key={`log-${index}`} className={`modalInspeccionLogLinea ${esError ? 'modalInspeccionLogLinea--error' : ''} ${esExito ? 'modalInspeccionLogLinea--exito' : ''} ${esInput ? 'modalInspeccionLogLinea--input' : ''}`}>
                                    {linea}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="modalFooter">
                    <Boton variante="secundario" onClick={onCerrar}>
                        Cerrar
                    </Boton>
                </div>
            </div>
        </div>
    );
}
