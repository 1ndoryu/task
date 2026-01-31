/*
 * useMenuContextualGlobal
 * Hook para integrar menús contextuales con el sistema global de coordinación
 *
 * Uso:
 * const {visible, posicion, abrir, cerrar, toggle} = useMenuContextualGlobal('mi-menu');
 *
 * Beneficios:
 * - Solo un menú abierto a la vez en toda la app
 * - Toggle automático al hacer clic en el mismo trigger
 * - Cierre automático al hacer clic fuera
 */

import {useState, useCallback, useId} from 'react';
import {useMenuContextualStore} from '../stores/menuContextualStore';

export interface PosicionMenu {
    x: number;
    y: number;
}

interface UseMenuContextualGlobalReturn {
    /* Si el menú está visible */
    visible: boolean;
    /* Posición del menú */
    posicion: PosicionMenu;
    /* Abre el menú en la posición indicada */
    abrir: (x: number, y: number) => void;
    /* Cierra el menú */
    cerrar: () => void;
    /* Toggle: abre si está cerrado, cierra si está abierto. Retorna si quedó abierto */
    toggle: (x: number, y: number) => boolean;
    /* ID único del menú */
    menuId: string;
}

export function useMenuContextualGlobal(idPrefix?: string): UseMenuContextualGlobalReturn {
    /* ID único generado por React */
    const reactId = useId();
    const menuId = idPrefix ? `${idPrefix}-${reactId}` : reactId;

    /* Estado local para posición */
    const [posicion, setPosicion] = useState<PosicionMenu>({x: 0, y: 0});

    /* Acceso al store global */
    const menuAbiertoId = useMenuContextualStore(s => s.menuAbiertoId);
    const abrirMenuGlobal = useMenuContextualStore(s => s.abrirMenu);
    const cerrarMenuGlobal = useMenuContextualStore(s => s.cerrarMenu);
    const toggleMenuGlobal = useMenuContextualStore(s => s.toggleMenu);

    const visible = menuAbiertoId === menuId;

    const abrir = useCallback(
        (x: number, y: number) => {
            setPosicion({x, y});
            abrirMenuGlobal(menuId);
        },
        [menuId, abrirMenuGlobal]
    );

    const cerrar = useCallback(() => {
        cerrarMenuGlobal(menuId);
    }, [menuId, cerrarMenuGlobal]);

    const toggle = useCallback(
        (x: number, y: number): boolean => {
            if (visible) {
                cerrarMenuGlobal(menuId);
                return false;
            } else {
                setPosicion({x, y});
                abrirMenuGlobal(menuId);
                return true;
            }
        },
        [menuId, visible, abrirMenuGlobal, cerrarMenuGlobal]
    );

    return {
        visible,
        posicion,
        abrir,
        cerrar,
        toggle,
        menuId
    };
}
