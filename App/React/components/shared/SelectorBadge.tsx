/*
 * SelectorBadge
 * Componente de selección estilizado como badge con menú desplegable
 * Reemplaza selects nativos por una interfaz más elegante tipo badge
 */

import {useState, useRef, useEffect, useCallback} from 'react';
import type {ReactNode} from 'react';
import {Boton} from '../ui';

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
    const [menuAbierto, setMenuAbierto] = useState(false);
    const contenedorRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const opcionActual = opciones.find(o => o.id === valorActual);

    /* Cerrar al hacer click fuera */
    const cerrarMenu = useCallback(() => {
        setMenuAbierto(false);
    }, []);

    useEffect(() => {
        if (!menuAbierto) return;

        const manejarClickFuera = (evento: MouseEvent) => {
            if (contenedorRef.current && !contenedorRef.current.contains(evento.target as Node)) {
                cerrarMenu();
            }
        };

        const manejarEscape = (evento: KeyboardEvent) => {
            if (evento.key === 'Escape') {
                cerrarMenu();
            }
        };

        /* Delay para evitar cerrar inmediatamente */
        const timeout = setTimeout(() => {
            document.addEventListener('click', manejarClickFuera);
        }, 0);

        document.addEventListener('keydown', manejarEscape);

        return () => {
            clearTimeout(timeout);
            document.removeEventListener('click', manejarClickFuera);
            document.removeEventListener('keydown', manejarEscape);
        };
    }, [menuAbierto, cerrarMenu]);

    /* Posicionar menú usando position: fixed para evitar que se corte por overflow: hidden */
    useEffect(() => {
        if (!menuAbierto || !menuRef.current || !contenedorRef.current) return;

        const menu = menuRef.current;
        const contenedor = contenedorRef.current;
        const rectContenedor = contenedor.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;

        /* Posicionamiento inicial debajo del botón */
        let top = rectContenedor.bottom + 4;
        let left = rectContenedor.left;

        /* Obtener dimensiones del menú después de renderizado */
        const rectMenu = menu.getBoundingClientRect();

        /* Ajuste Vertical: Mostrar arriba si no hay espacio abajo */
        const espacioAbajo = viewportHeight - rectContenedor.bottom;
        if (espacioAbajo < 150) {
            top = rectContenedor.top - rectMenu.height - 4;
        }

        /* Ajuste Horizontal: Evitar que se salga por la derecha */
        if (left + rectMenu.width > viewportWidth - 10) {
            left = viewportWidth - rectMenu.width - 10;
        }

        /* Evitar que se salga por la izquierda */
        if (left < 10) {
            left = 10;
        }

        menu.style.top = `${top}px`;
        menu.style.left = `${left}px`;
    }, [menuAbierto]);

    const seleccionarOpcion = (opcion: OpcionBadge<T>) => {
        onChange(opcion.id);
        cerrarMenu();
    };

    return (
        <div id="selector-badge-contenedor" ref={contenedorRef} className={`selectorBadgeContenedor ${className}`.trim()}>
            <Boton type="button" variante="ghost" claseAdicional={`selectorBadgeBoton ${soloIcono ? 'selectorBadgeBoton--soloIcono' : 'selectorBadgeBotonCompacto'} ${menuAbierto ? 'selectorBadgeBotonActivo' : ''}`} onClick={() => setMenuAbierto(!menuAbierto)} title={titulo ? `${titulo}: ${opcionActual?.etiqueta}` : opcionActual?.etiqueta}>
                {soloIcono ? (
                    /* En modo soloIcono, mostrar solo un icono: el de la opción activa o el principal como fallback */
                    <span className="selectorBadgeIcono">{opcionActual?.icono || icono}</span>
                ) : (
                    /* En modo normal, mostrar ambos si existen */
                    <>
                        {icono && <span className="selectorBadgeIcono">{icono}</span>}
                        {opcionActual?.icono && <span className="selectorBadgeOpcionIcono">{opcionActual.icono}</span>}
                    </>
                )}
            </Boton>

            {menuAbierto && (
                <div ref={menuRef} className="selectorBadgeMenu" role="menu">
                    {opciones.map(opcion => (
                        <Boton key={opcion.id} type="button" variante="ghost" claseAdicional={`selectorBadgeOpcion ${opcion.id === valorActual ? 'selectorBadgeOpcionActiva' : ''}`} onClick={() => seleccionarOpcion(opcion)} role="menuitem">
                            {opcion.icono && <span className="selectorBadgeOpcionIcono">{opcion.icono}</span>}
                            <span className="selectorBadgeOpcionTexto">{opcion.etiqueta}</span>
                            {opcion.descripcion && <span className="selectorBadgeOpcionDesc">{opcion.descripcion}</span>}
                        </Boton>
                    ))}
                </div>
            )}
        </div>
    );
}
