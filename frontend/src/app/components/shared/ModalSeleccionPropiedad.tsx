/*
 * ModalSeleccionPropiedad
 * Modal centrado para seleccionar propiedades en BottomSheets móviles
 * Diseño: Lista de opciones, cierra al seleccionar
 * Reutilizable para: Proyecto, Prioridad, Urgencia, Fecha, Frecuencia, Importancia, etc.
 *
 * Nota: Usa Portal para renderizar fuera del BottomSheet y centrarse correctamente
 * (CSS position:fixed no funciona bien dentro de elementos con transform)
 */

import {type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {Boton} from '../ui/Boton';
import '../../styles/dashboard/componentes/bottomSheetCreacion.css';

interface OpcionPropiedad {
    id: string;
    etiqueta: string;
    icono?: ReactNode;
    descripcion?: string;
    variante?: 'normal' | 'activo' | 'peligroso';
}

interface ModalSeleccionPropiedadProps {
    estaAbierto: boolean;
    titulo: string;
    opciones: OpcionPropiedad[];
    valorActual?: string;
    onSeleccionar: (valor: string | undefined) => void;
    onCerrar: () => void;
    permitirLimpiar?: boolean;
    textoLimpiar?: string;
}

export function ModalSeleccionPropiedad({estaAbierto, titulo: _titulo, opciones, valorActual, onSeleccionar, onCerrar, permitirLimpiar = true, textoLimpiar = 'Sin asignar'}: ModalSeleccionPropiedadProps): JSX.Element | null {
    if (!estaAbierto) return null;

    const manejarSeleccion = (valor: string | undefined) => {
        onSeleccionar(valor);
        onCerrar();
    };

    const manejarClickOverlay = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onCerrar();
        }
    };

    /* [024A-7] Removida cabecera innecesaria. Cerrar via overlay click o seleccion. */
    /* Usar Portal para renderizar fuera del BottomSheet */
    const contenidoModal = (
        /* sentinel-disable-next-line componente-artesanal — modal con portal y posicionamiento especifico */
        <div className="modalSeleccionPropiedadOverlay" onClick={manejarClickOverlay}>
            <div className="modalSeleccionPropiedad">
                {/* Lista de opciones */}
                <div className="modalSeleccionPropiedad__lista">
                    {/* Opción para limpiar/quitar selección */}
                    {permitirLimpiar && (
                        <Boton type="button" claseAdicional={`modalSeleccionPropiedad__opcion ${valorActual === undefined ? 'modalSeleccionPropiedad__opcion--activa' : ''}`} onClick={() => manejarSeleccion(undefined)}>
                            <span className="modalSeleccionPropiedad__opcionTexto">{textoLimpiar}</span>
                        </Boton>
                    )}

                    {opciones.map(opcion => (
                        <Boton key={opcion.id} type="button" claseAdicional={`modalSeleccionPropiedad__opcion ${valorActual === opcion.id ? 'modalSeleccionPropiedad__opcion--activa' : ''} ${opcion.variante === 'peligroso' ? 'modalSeleccionPropiedad__opcion--peligroso' : ''}`} onClick={() => manejarSeleccion(opcion.id)}>
                            {opcion.icono && <span className="modalSeleccionPropiedad__opcionIcono">{opcion.icono}</span>}
                            <span className="modalSeleccionPropiedad__opcionTexto">{opcion.etiqueta}</span>
                            {opcion.descripcion && <span className="modalSeleccionPropiedad__opcionDescripcion">{opcion.descripcion}</span>}
                        </Boton>
                    ))}
                </div>
            </div>
        </div>
    );

    return createPortal(contenidoModal, document.body);
}
