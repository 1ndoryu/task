/*
 * MenuContextual
 * Componente de menu contextual reutilizable para click derecho
 * Responsabilidad unica: mostrar acciones contextuales en posicion del cursor
 */

import {ChevronRight, Check} from 'lucide-react';
import {createPortal} from 'react-dom';
import {Boton} from '../ui';
import {useMenuContextual} from '../../hooks/shared/useMenuContextual';

export interface OpcionMenu {
    id: string;
    etiqueta: string;
    icono?: React.ReactNode;
    peligroso?: boolean;
    deshabilitado?: boolean;
    separadorDespues?: boolean;
    subOpciones?: OpcionMenu[];
    /* [19-08-2026] Marca la opcion como activa (valor actual de un selector
     * convertido a submenu) y la muestra con un check. */
    marcada?: boolean;
}

interface MenuContextualProps {
    opciones: OpcionMenu[];
    posicionX: number;
    posicionY: number;
    onSeleccionar: (opcionId: string) => void;
    onCerrar: () => void;
    esSubmenu?: boolean;
    footer?: React.ReactNode;
}

export function MenuContextual({opciones, posicionX, posicionY, onSeleccionar, onCerrar, esSubmenu = false, footer}: MenuContextualProps): JSX.Element {
    const {menuRef, opcionActivaId, estiloSubmenu, manejarClick, manejarMouseEnterOpcion} = useMenuContextual({posicionX, posicionY, onSeleccionar, onCerrar, esSubmenu});

    /* [318A-9] Portal a body: el menú usa position:fixed con coordenadas del
     * viewport, pero si se renderiza inline dentro de un ancestro con
     * transform (p. ej. .dashboardSidebarPanel--visible con translateY(0))
     * el fixed se rompe y el menú aparece desplazado lejos del cursor.
     * Portaleado a body, fixed es siempre relativo al viewport. Las variables
     * --dashboard-* están en :root (variables.css), así que no se pierde tema.
     * Solo se portaléa el menú raíz: los submenús usan position:absolute
     * relativo a .menuContextualItemWrapper y deben seguir anidados dentro. */
    const menu = (
        <div id={esSubmenu ? undefined : 'menu-contextual'} ref={menuRef as React.RefObject<HTMLDivElement>} className={`menuContextual ${esSubmenu ? 'menuContextualSubmenu' : ''}`} role="menu" aria-orientation="vertical" style={esSubmenu ? estiloSubmenu : undefined}>
            {opciones.map(opcion => (
                <div key={opcion.id} className="menuContextualItemWrapper posicionRelativa" onMouseEnter={() => manejarMouseEnterOpcion(opcion.id)}>
                    <Boton type="button" variante="ghost" claseAdicional={`menuContextualOpcion ${opcion.peligroso ? 'menuContextualOpcionPeligrosa' : ''} ${opcion.deshabilitado ? 'menuContextualOpcionDeshabilitada' : ''} ${opcionActivaId === opcion.id && opcion.subOpciones ? 'menuContextualOpcionActiva' : ''}`} onClick={() => manejarClick(opcion)} disabled={opcion.deshabilitado} role="menuitem">
                        {opcion.icono && <span className="menuContextualIcono">{opcion.icono}</span>}
                        <span className="menuContextualEtiqueta">{opcion.etiqueta}</span>
                        {opcion.marcada && (
                            <span className="menuContextualMarca">
                                <Check size={12} />
                            </span>
                        )}
                        {opcion.subOpciones && opcion.subOpciones.length > 0 && (
                            <span className="menuContextualFlecha">
                                <ChevronRight size={12} />
                            </span>
                        )}
                    </Boton>

                    {/* Renderizar Submenu si esta activo */}
                    {opcion.subOpciones && opcion.subOpciones.length > 0 && opcionActivaId === opcion.id && <MenuContextual opciones={opcion.subOpciones} posicionX={0} posicionY={0} onSeleccionar={onSeleccionar} onCerrar={onCerrar} esSubmenu={true} />}

                    {opcion.separadorDespues && <div className="menuContextualSeparador" />}
                </div>
            ))}

            {footer && (
                <>
                    <div className="menuContextualSeparador" />
                    <div className="menuContextualFooter" role="none">{footer}</div>
                </>
            )}
        </div>
    );

    return esSubmenu ? menu : createPortal(menu, document.body);
}

export type {MenuContextualProps};
