/*
 * MenuContextual
 * Componente de menu contextual reutilizable para click derecho
 * Responsabilidad unica: mostrar acciones contextuales en posicion del cursor
 */

import {useEffect, useRef, useCallback, useState} from 'react';
import {ChevronRight} from 'lucide-react';

interface OpcionMenu {
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
                /* Solo cerrar si no es un submenu (el menu principal maneja el cierre global) */
                /* O si el click fue en un elemento que no es parte de NINGUN menu contextual */
                if (!esSubmenu) {
                    // Logica simplificada: dejar que el padre maneje clicks fuera si es complejo,
                    // pero aqui asumimos que onCerrar cierra todo el arbol.
                    // Verificamos si el click fue en un submenu hijo:
                    // (Esto es dificil sin un contexto global, pero por ahora confiamos en la propagacion o una capa transparente)
                    // Mejor estrategia para submenus: No cerrarse solos por click outside, dejar al root.
                    onCerrar();
                }
            }
        };

        const manejarEscape = (evento: KeyboardEvent) => {
            if (evento.key === 'Escape') {
                onCerrar();
            }
        };

        /* Usar timeout para evitar cerrar inmediatamente */
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
    }, [onCerrar]);

    /* Posicionar el menu despues de renderizar */
    useEffect(() => {
        if (menuRef.current) {
            const {x, y} = calcularPosicion();
            menuRef.current.style.left = `${x}px`;
            menuRef.current.style.top = `${y}px`;
        }
    }, [calcularPosicion]);

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

            /* Si tiene subopciones, no hacemos nada al click (el hover maneja la vista), 
               o podriamos alternar visibilidad en movil. Por ahora asumimos desktop hover. */
            if (opcion.subOpciones && opcion.subOpciones.length > 0) return;

            onSeleccionar(opcion.id);
            onCerrar();
        },
        [onSeleccionar, onCerrar]
    );

    const manejarMouseEnterOpcion = (opcionId: string) => {
        setOpcionActivaId(opcionId);
    };

    /* Calcular posicion del submenu: A la derecha del item actual */
    /* Necesitamos referencias a los items para saber su posicion exacta? 
       Podemos estimar o usar un ref map. Simplifiquemos: width del menu padre. */
    const getSubmenuPos = () => {
        if (!menuRef.current) return {x: 0, y: 0};
        const rect = menuRef.current.getBoundingClientRect();
        /* X = derecha del menu padre, Y = misma Y que el menu padre + offset del item? 
           No, el subMenu necesita renderizarse relativo al item. 
           Mejor renderizar el submenu DENTRO del item pero con position absolute/fixed.
        */
        return {x: rect.width, y: 0}; // Relativo al item
    };

    return (
        <div
            id={esSubmenu ? undefined : 'menu-contextual'}
            ref={menuRef}
            className={`menuContextual ${esSubmenu ? 'menuContextualSubmenu' : ''}`}
            role="menu"
            aria-orientation="vertical"
            /* Si es submenu, la posicion la maneja el padre relative o styles inline */
            style={!esSubmenu ? undefined : {left: '100%', top: 0}}>
            {opciones.map(opcion => (
                <div key={opcion.id} className="menuContextualItemWrapper" onMouseEnter={() => manejarMouseEnterOpcion(opcion.id)} style={{position: 'relative'}}>
                    <button type="button" className={`menuContextualOpcion ${opcion.peligroso ? 'menuContextualOpcionPeligrosa' : ''} ${opcion.deshabilitado ? 'menuContextualOpcionDeshabilitada' : ''} ${opcionActivaId === opcion.id && opcion.subOpciones ? 'menuContextualOpcionActiva' : ''}`} onClick={() => manejarClick(opcion)} disabled={opcion.deshabilitado} role="menuitem">
                        {opcion.icono && <span className="menuContextualIcono">{opcion.icono}</span>}
                        <span className="menuContextualEtiqueta">{opcion.etiqueta}</span>
                        {opcion.subOpciones && opcion.subOpciones.length > 0 && (
                            <span className="menuContextualFlecha">
                                <ChevronRight size={12} />
                            </span>
                        )}
                    </button>

                    {/* Renderizar Submenu si esta activo */}
                    {opcion.subOpciones && opcion.subOpciones.length > 0 && opcionActivaId === opcion.id && <MenuContextual opciones={opcion.subOpciones} posicionX={0} /* Irrelevante por CSS relativo */ posicionY={0} onSeleccionar={onSeleccionar} onCerrar={onCerrar} /* Pasar cierre global */ esSubmenu={true} />}

                    {opcion.separadorDespues && <div className="menuContextualSeparador" />}
                </div>
            ))}
        </div>
    );
}

export type {OpcionMenu, MenuContextualProps};
