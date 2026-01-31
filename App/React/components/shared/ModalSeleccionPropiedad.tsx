/*
 * ModalSeleccionPropiedad
 * Modal centrado para seleccionar propiedades en BottomSheets móviles
 * Diseño: Lista de opciones, cierra al seleccionar
 * Reutilizable para: Proyecto, Prioridad, Urgencia, Fecha, Frecuencia, Importancia, etc.
 */

import type {ReactNode} from 'react';
import {X} from 'lucide-react';

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

export function ModalSeleccionPropiedad({estaAbierto, titulo, opciones, valorActual, onSeleccionar, onCerrar, permitirLimpiar = true, textoLimpiar = 'Sin asignar'}: ModalSeleccionPropiedadProps): JSX.Element | null {
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

    return (
        <div className="modalSeleccionPropiedadOverlay" onClick={manejarClickOverlay}>
            <div className="modalSeleccionPropiedad">
                {/* Encabezado */}
                <div className="modalSeleccionPropiedad__encabezado">
                    <span className="modalSeleccionPropiedad__titulo">{titulo}</span>
                    <button type="button" className="modalSeleccionPropiedad__cerrar" onClick={onCerrar} aria-label="Cerrar">
                        <X size={18} />
                    </button>
                </div>

                {/* Lista de opciones */}
                <div className="modalSeleccionPropiedad__lista">
                    {/* Opción para limpiar/quitar selección */}
                    {permitirLimpiar && (
                        <button type="button" className={`modalSeleccionPropiedad__opcion ${valorActual === undefined ? 'modalSeleccionPropiedad__opcion--activa' : ''}`} onClick={() => manejarSeleccion(undefined)}>
                            <span className="modalSeleccionPropiedad__opcionTexto">{textoLimpiar}</span>
                        </button>
                    )}

                    {opciones.map(opcion => (
                        <button key={opcion.id} type="button" className={`modalSeleccionPropiedad__opcion ${valorActual === opcion.id ? 'modalSeleccionPropiedad__opcion--activa' : ''} ${opcion.variante === 'peligroso' ? 'modalSeleccionPropiedad__opcion--peligroso' : ''}`} onClick={() => manejarSeleccion(opcion.id)}>
                            {opcion.icono && <span className="modalSeleccionPropiedad__opcionIcono">{opcion.icono}</span>}
                            <span className="modalSeleccionPropiedad__opcionTexto">{opcion.etiqueta}</span>
                            {opcion.descripcion && <span className="modalSeleccionPropiedad__opcionDescripcion">{opcion.descripcion}</span>}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
