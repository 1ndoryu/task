/*
 * SelectorBadge
 * Componente de selección estilizado como badge con menú desplegable
 * Reemplaza selects nativos por una interfaz más elegante tipo badge
 */

import type {ReactNode, Ref} from 'react';
import {createPortal} from 'react-dom';
import {Boton} from '../ui';
import {useSelectorBadge} from '../../hooks/shared/useSelectorBadge';

export interface OpcionBadge<T extends string = string> {
    id: T;
    etiqueta: string;
    icono?: ReactNode;
    descripcion?: string;
}

interface SelectorBadgeProps<T extends string = string> {
    opciones: OpcionBadge<T>[];
    valorActual: T;
    onChange: (valor: T) => void;
    icono?: ReactNode;
    titulo?: string;
    className?: string;
    soloIcono?: boolean;
}

export function SelectorBadge<T extends string = string>({opciones, valorActual, onChange, icono, titulo, className = '', soloIcono = false}: SelectorBadgeProps<T>): JSX.Element {
    const {menuAbierto, contenedorRef, menuRef, opcionActual, toggleMenu, seleccionarOpcion} = useSelectorBadge({opciones, valorActual, onChange});

    return (
        <div id="selector-badge-contenedor" ref={contenedorRef as Ref<HTMLDivElement>} className={`selectorBadgeContenedor ${className}`.trim()}>
            <Boton
                type="button"
                variante="badge"
                soloIcono={soloIcono}
                activo={menuAbierto}
                icono={soloIcono ? (opcionActual?.icono || icono) : undefined}
                claseAdicional={!soloIcono ? 'selectorBadgeBotonCompacto' : ''}
                onClick={toggleMenu}
                title={titulo ? `${titulo}: ${opcionActual?.etiqueta}` : opcionActual?.etiqueta}
            >
                {!soloIcono && (
                    <>
                        {icono && <span className="selectorBadgeIcono">{icono}</span>}
                        {opcionActual?.icono && <span className="selectorBadgeOpcionIcono">{opcionActual.icono}</span>}
                    </>
                )}
            </Boton>

            {/* [233A-23] Portal: saca el menú del DOM del panel para evitar que opacity en .seccionAcciones
             * cree un stacking context que atrape el z-index y herede transparencia al menú */}
            {menuAbierto && createPortal(
                <div ref={menuRef as Ref<HTMLDivElement>} className="selectorBadgeMenu" role="menu">
                    {opciones.map(opcion => (
                        <Boton key={opcion.id} type="button" variante="ghost" claseAdicional={`selectorBadgeOpcion ${opcion.id === valorActual ? 'selectorBadgeOpcionActiva' : ''}`} onClick={() => seleccionarOpcion(opcion)} role="menuitem">
                            {opcion.icono && <span className="selectorBadgeOpcionIcono">{opcion.icono}</span>}
                            <span className="selectorBadgeOpcionTexto">{opcion.etiqueta}</span>
                            {opcion.descripcion && <span className="selectorBadgeOpcionDesc">{opcion.descripcion}</span>}
                        </Boton>
                    ))}
                </div>,
                document.body
            )}
        </div>
    );
}
