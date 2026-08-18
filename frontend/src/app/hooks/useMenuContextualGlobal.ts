/*
 * useMenuContextualGlobal
 * Hook para integrar menús contextuales con el sistema global de coordinación
 *
 * Uso estándar (con ID automático):
 * const {visible, posicion, abrir, cerrar, toggle} = useMenuContextualGlobal('mi-menu');
 *
 * Uso para listas (con ID estable):
 * const {visible, posicion, abrir, cerrar} = useMenuContextualConId(`tarea-${tarea.id}`);
 *
 * Beneficios:
 * - Solo un menú abierto a la vez en toda la app
 * - Toggle automático al hacer clic en el mismo trigger
 * - Cierre automático coordinado entre todos los menús
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

/*
 * Hook para menús contextuales con ID generado automáticamente
 * Usar cuando el componente NO está en una lista o el ID no es importante
 */
export function useMenuContextualGlobal(idPrefix?: string): UseMenuContextualGlobalReturn {
    /* ID único generado por React */
    const reactId = useId();
    const menuId = idPrefix ? `${idPrefix}-${reactId}` : reactId;

    return useMenuContextualConId(menuId);
}

/*
 * Hook para menús contextuales con ID estable
 * Usar cuando el componente está en una lista (map) y necesita un ID predecible
 * Ej: useMenuContextualConId(`tarea-${tarea.id}`)
 */
export function useMenuContextualConId(menuId: string): UseMenuContextualGlobalReturn {
    /* Estado local para posición */
    const [posicion, setPosicion] = useState<PosicionMenu>({x: 0, y: 0});

    /* Acceso al store global */
    const menuAbiertoId = useMenuContextualStore(s => s.menuAbiertoId);
    const abrirMenuGlobal = useMenuContextualStore(s => s.abrirMenu);
    const cerrarMenuGlobal = useMenuContextualStore(s => s.cerrarMenu);

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

    /*
     * Toggle: Si este menú está abierto lo cierra, si no lo abre
     * Importante: abrirMenu ya cierra cualquier otro menú abierto
     */
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
