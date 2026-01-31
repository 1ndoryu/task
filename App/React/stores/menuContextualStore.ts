/*
 * menuContextualStore
 * Store global para coordinar el cierre de menús contextuales
 *
 * Responsabilidad única: Garantizar que solo un menú contextual esté abierto a la vez
 * - Cada menú se registra con un ID único al abrirse
 * - Cuando un menú se abre, cierra automáticamente los demás
 * - Permite toggle (abrir/cerrar) en el mismo trigger
 */

import {create} from 'zustand';

interface MenuContextualState {
    /* ID del menú actualmente abierto (null si ninguno) */
    menuAbiertoId: string | null;
    /* Contador para generar IDs únicos */
    contadorId: number;
}

interface MenuContextualActions {
    /* Abre un menú y cierra cualquier otro. Retorna el ID asignado */
    abrirMenu: (id: string) => void;
    /* Cierra un menú específico o cualquiera si no se especifica ID */
    cerrarMenu: (id?: string) => void;
    /* Toggle: si el menú está abierto lo cierra, si no lo abre. Retorna si quedó abierto */
    toggleMenu: (id: string) => boolean;
    /* Genera un ID único para un menú */
    generarId: () => string;
    /* Verifica si un menú específico está abierto */
    estaAbierto: (id: string) => boolean;
}

export const useMenuContextualStore = create<MenuContextualState & MenuContextualActions>((set, get) => ({
    menuAbiertoId: null,
    contadorId: 0,

    abrirMenu: (id: string) => {
        set({menuAbiertoId: id});
    },

    cerrarMenu: (id?: string) => {
        const estado = get();
        /* Si se especifica ID, solo cerrar si coincide */
        if (id === undefined || estado.menuAbiertoId === id) {
            set({menuAbiertoId: null});
        }
    },

    toggleMenu: (id: string) => {
        const estado = get();
        if (estado.menuAbiertoId === id) {
            /* Está abierto, lo cerramos */
            set({menuAbiertoId: null});
            return false;
        } else {
            /* No está abierto, lo abrimos (cierra cualquier otro) */
            set({menuAbiertoId: id});
            return true;
        }
    },

    generarId: () => {
        const nuevoId = get().contadorId + 1;
        set({contadorId: nuevoId});
        return `menu-${nuevoId}`;
    },

    estaAbierto: (id: string) => {
        return get().menuAbiertoId === id;
    }
}));
