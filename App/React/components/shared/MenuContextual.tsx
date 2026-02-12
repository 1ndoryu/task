/*
 * MenuContextual
 * Componente de menu contextual reutilizable para click derecho
 * Responsabilidad unica: mostrar acciones contextuales en posicion del cursor
 */

import {useEffect, useRef, useCallback, useState} from 'react';
import {ChevronRight} from 'lucide-react';

export interface OpcionMenu {
    id: string;
    etiqueta: string;
    icono?: React.ReactNode;
    peligroso?: boolean;
    deshabilitado?: boolean;
    separadorDespues?: boolean;
    subOpciones?: OpcionMenu[];
}

interface MenuContextualProps {
    opciones: OpcionMenu[];
    posicionX: number;
    posicionY: number;
    onSeleccionar: (opcionId: string) => void;
    onCerrar: () => void;
    esSubmenu?: boolean;
}

export function MenuContextual({opciones, posicionX, posicionY, onSeleccionar, onCerrar, esSubmenu = false}: MenuContextualProps): JSX.Element {
    const menuRef = useRef<HTMLDivElement>(null);
    const [opcionActivaId, setOpcionActivaId] = useState<string | null>(null);
    const [estiloSubmenu, setEstiloSubmenu] = useState<React.CSSProperties>({
        left: '100%',
        top: 0,
        marginLeft: '4px'
    });

    /* Ajustar posicion si el menu se sale de la pantalla */
    const calcularPosicion = useCallback(() => {
        if (!menuRef.current) return {x: posicionX, y: posicionY};

        const menu = menuRef.current;
        const menuRect = menu.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let ajusteX = posicionX;
        let ajusteY = posicionY;

        /* Ajustar si se sale por la derecha */
        if (posicionX + menuRect.width > viewportWidth - 10) {
            ajusteX = viewportWidth - menuRect.width - 10;
        }

        /* Ajustar si se sale por abajo */
        if (posicionY + menuRect.height > viewportHeight - 10) {
            ajusteY = viewportHeight - menuRect.height - 10;
        }

        return {x: Math.max(10, ajusteX), y: Math.max(10, ajusteY)};
    }, [posicionX, posicionY]);

    /* Cerrar al hacer click fuera */
    useEffect(() => {
        const manejarClickFuera = (evento: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(evento.target as Node)) {
                if (!esSubmenu) {
                    onCerrar();
                }
            }
        };

        const manejarEscape = (evento: KeyboardEvent) => {
            if (evento.key === 'Escape') {
                onCerrar();
            }
        };

        const timeout = setTimeout(() => {
            document.addEventListener('click', manejarClickFuera);
            document.addEventListener('contextmenu', manejarClickFuera);
        }, 0);

        document.addEventListener('keydown', manejarEscape);

        return () => {
            clearTimeout(timeout);
            document.removeEventListener('click', manejarClickFuera);
            document.removeEventListener('contextmenu', manejarClickFuera);
            document.removeEventListener('keydown', manejarEscape);
        };
    }, [onCerrar, esSubmenu]);

    /* Posicionar el menu despues de renderizar */
    useEffect(() => {
        if (menuRef.current && !esSubmenu) {
            const {x, y} = calcularPosicion();
            menuRef.current.style.left = `${x}px`;
            menuRef.current.style.top = `${y}px`;
        }
    }, [calcularPosicion, esSubmenu]);

    /* Si es submenu, ajustar posición para no salirse de la pantalla */
    useEffect(() => {
        if (!esSubmenu || !menuRef.current) return;

        const menu = menuRef.current;
        const rect = menu.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let left: string | number = '100%';
        let right: string | number = 'auto';
        let top: number = 0;
        let marginLeft = '4px';

        /* Ajustar si se sale por la derecha - mostrar a la izquierda */
        if (rect.right > viewportWidth - 10) {
            left = 'auto';
            right = '100%';
            marginLeft = '-4px';
        }

        /* Ajustar si se sale por abajo - mover hacia arriba */
        if (rect.bottom > viewportHeight - 10) {
            const overflow = rect.bottom - (viewportHeight - 10);
            top = -overflow;
        }

        setEstiloSubmenu({left, right, top, marginLeft});
    }, [esSubmenu]);

    /* Agregar clase al body para ocultar tooltips */
    useEffect(() => {
        document.body.classList.add('menu-contextual-abierto');
        return () => {
            document.body.classList.remove('menu-contextual-abierto');
        };
    }, []);

    const manejarClick = useCallback(
        (opcion: OpcionMenu) => {
            if (opcion.deshabilitado) return;
            if (opcion.subOpciones && opcion.subOpciones.length > 0) return;

            onSeleccionar(opcion.id);
            onCerrar();
        },
        [onSeleccionar, onCerrar]
    );

    const manejarMouseEnterOpcion = (opcionId: string) => {
        setOpcionActivaId(opcionId);
    };

    return (
        <div id={esSubmenu ? undefined : 'menu-contextual'} ref={menuRef} className={`menuContextual ${esSubmenu ? 'menuContextualSubmenu' : ''}`} role="menu" aria-orientation="vertical" style={esSubmenu ? estiloSubmenu : undefined}>
            {opciones.map(opcion => (
                <div key={opcion.id} className="menuContextualItemWrapper" onMouseEnter={() => manejarMouseEnterOpcion(opcion.id)} style={{position: 'relative'}}>
                    <Boton type="button" variante="ghost" claseAdicional={`menuContextualOpcion ${opcion.peligroso ? 'menuContextualOpcionPeligrosa' : ''} ${opcion.deshabilitado ? 'menuContextualOpcionDeshabilitada' : ''} ${opcionActivaId === opcion.id && opcion.subOpciones ? 'menuContextualOpcionActiva' : ''}`} onClick={() => manejarClick(opcion)} disabled={opcion.deshabilitado} role="menuitem">
                        {opcion.icono && <span className="menuContextualIcono">{opcion.icono}</span>}
                        <span className="menuContextualEtiqueta">{opcion.etiqueta}</span>
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
        </div>
    );
}

export type {OpcionMenu, MenuContextualProps};
