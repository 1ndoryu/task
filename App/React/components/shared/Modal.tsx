/*
 * Modal
 * Componente modal reutilizable con overlay y animaciones
 * Responsabilidad unica: contenedor modal generico
 *
 * Fase 10.2: Agrega boton "Volver" para version movil
 * Fase 10.8.6: Header compacto movil - solo icono, titulo visible, layout <- | Titulo | X
 */

import {useEffect, useCallback, useState} from 'react';
import {X, ArrowLeft} from 'lucide-react';

export interface ModalProps {
    estaAbierto: boolean;
    onCerrar: () => void;
    titulo: string;
    children: React.ReactNode;
    claseExtra?: string;
    /* Elementos opcionales a mostrar a la derecha del encabezado */
    accionesEncabezado?: React.ReactNode;
    /* Si true, no muestra la X de cerrar */
    ocultarBotonCerrar?: boolean;
}

/* Hook para detectar si estamos en movil */
function useEsMovil(breakpoint: number = 480): boolean {
    const [esMovil, setEsMovil] = useState(false);

    useEffect(() => {
        const verificar = () => {
            setEsMovil(window.innerWidth <= breakpoint);
        };

        verificar();
        window.addEventListener('resize', verificar);
        return () => window.removeEventListener('resize', verificar);
    }, [breakpoint]);

    return esMovil;
}

export function Modal({estaAbierto, onCerrar, titulo, children, claseExtra = '', accionesEncabezado, ocultarBotonCerrar = false}: ModalProps): JSX.Element | null {
    const esMovil = useEsMovil();

    /*
     * Cierra el modal al presionar Escape
     */
    const manejarTecla = useCallback(
        (evento: KeyboardEvent) => {
            if (evento.key === 'Escape') {
                onCerrar();
            }
        },
        [onCerrar]
    );

    useEffect(() => {
        if (estaAbierto) {
            document.addEventListener('keydown', manejarTecla);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', manejarTecla);
            document.body.style.overflow = '';
        };
    }, [estaAbierto, manejarTecla]);

    const manejarClickOverlay = (evento: React.MouseEvent<HTMLDivElement>) => {
        if (evento.target === evento.currentTarget) {
            onCerrar();
        }
    };

    if (!estaAbierto) return null;

    return (
        <div className="modalOverlay" onClick={manejarClickOverlay}>
            <div className={`modalContenedor ${claseExtra}`} role="dialog" aria-modal="true" aria-labelledby="modal-titulo">
                <div className={`modalEncabezado ${esMovil ? 'modalEncabezado--movil' : ''}`}>
                    {/* Boton Volver en movil - solo icono, sin texto */}
                    {esMovil && (
                        <button className="modalBotonVolver" onClick={onCerrar} aria-label="Volver" type="button">
                            <ArrowLeft size={18} />
                        </button>
                    )}
                    {/* Titulo: siempre visible, con clase especial en movil */}
                    <h2 id="modal-titulo" className={`modalTitulo ${esMovil ? 'modalTitulo--movilCompacto' : ''}`}>
                        {titulo}
                    </h2>
                    <div className="modalAccionesEncabezado">
                        {accionesEncabezado}
                        {/* En movil, mostrar X solo si no hay boton volver visible */}
                        {!ocultarBotonCerrar && !esMovil && (
                            <button className="modalBotonCerrar" onClick={onCerrar} aria-label="Cerrar modal" type="button">
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>
                <div className="modalContenido">{children}</div>
            </div>
        </div>
    );
}
