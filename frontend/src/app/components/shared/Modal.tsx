/*
 * Modal
 * Componente modal reutilizable con overlay y animaciones
 * Responsabilidad unica: contenedor modal generico
 *
 * Fase 10.2: Agrega boton "Volver" para version movil
 * Fase 10.8.6: Header compacto movil - solo icono, titulo visible, layout <- | Titulo | X
 */

import {X, ArrowLeft} from 'lucide-react';
import {Boton} from '../ui';
import {useModal} from '../../hooks/shared/useModal';

export interface ModalProps {
    estaAbierto: boolean;
    onCerrar: () => void;
    titulo: string;
    children: React.ReactNode;
    claseExtra?: string;
    /* Clase CSS adicional para el overlay (fondo) */
    claseOverlay?: string;
    /* Elementos opcionales a mostrar a la derecha del encabezado */
    accionesEncabezado?: React.ReactNode;
    /* Si true, no muestra la X de cerrar */
    ocultarBotonCerrar?: boolean;
    /* [303A-7] Clase CSS adicional para el div .modalContenido (permite overrides de padding por modal) */
    claseContenido?: string;
}

export function Modal({estaAbierto, onCerrar, titulo, children, claseExtra = '', claseOverlay = '', accionesEncabezado, ocultarBotonCerrar = false, claseContenido = ''}: ModalProps): JSX.Element | null {
    const {esMovil, esTablet, manejarClickOverlay} = useModal({estaAbierto, onCerrar});

    /* [034A-9] Mostrar flecha de retroceso en movil y tablet (<=768px) para que
     * siempre exista un boton visible de cierre. Corrige el caso donde
     * ocultarBotonCerrar=true y no habia ningun cierre visible en pantallas intermedias. */
    const mostrarFlechaRetroceso = esTablet;

    if (!estaAbierto) return null;

    return (
        <div className={`modalOverlay ${claseOverlay}`} onClick={manejarClickOverlay}>
            <div className={`modalContenedor ${claseExtra}`} role="dialog" aria-modal="true" aria-labelledby="modal-titulo">
                <div className={`modalEncabezado ${esMovil ? 'modalEncabezado--movil' : ''}`}>
                    {/* Boton Volver en movil/tablet - solo icono, sin texto */}
                    {mostrarFlechaRetroceso && (
                        <Boton variante="icono" soloIcono onClick={onCerrar} aria-label="Volver">
                            <ArrowLeft size={18} />
                        </Boton>
                    )}
                    {/* Titulo: siempre visible, con clase especial en movil */}
                    <h2 id="modal-titulo" className={`modalTitulo ${esMovil ? 'modalTitulo--movilCompacto' : ''}`}>
                        {titulo}
                    </h2>
                    <div className="modalAccionesEncabezado">
                        {accionesEncabezado}
                        {/* X visible solo en desktop (>768px) y si no esta oculto */}
                        {!ocultarBotonCerrar && !mostrarFlechaRetroceso && (
                            <Boton variante="icono" soloIcono onClick={onCerrar} aria-label="Cerrar modal">
                                <X size={14} />
                            </Boton>
                        )}
                    </div>
                </div>
                <div className={`modalContenido ${claseContenido}`}>{children}</div>
            </div>
        </div>
    );
}
