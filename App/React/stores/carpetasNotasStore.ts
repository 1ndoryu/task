/*
 * Store de Carpetas de Notas (Zustand)
 * Maneja el estado de las carpetas para organizar notas
 */

import {create} from 'zustand';
import {CarpetaNota} from '../types/notas';
import {carpetasNotasService, notasService} from '../services/notasService';

interface CarpetasNotasState {
    carpetas: CarpetaNota[];
    carpetaActiva: number | null; /* null = General */
    cargando: boolean;
    error: string | null;
    vistaActual: 'carpetas' | 'notas';
}

interface CarpetasNotasActions {
    cargarCarpetas: () => Promise<void>;
    crearCarpeta: (nombre: string) => Promise<CarpetaNota | null>;
    renombrarCarpeta: (id: number, nombre: string) => Promise<boolean>;
    eliminarCarpeta: (id: number) => Promise<boolean>;
    seleccionarCarpeta: (id: number | null) => void;
    moverNota: (notaId: number, carpetaId: number | null) => Promise<boolean>;
    setVistaActual: (vista: 'carpetas' | 'notas') => void;
    volverACarpetas: () => void;
    obtenerNombreCarpetaActiva: () => string;
}

export type CarpetasNotasStore = CarpetasNotasState & CarpetasNotasActions;

export const useCarpetasNotasStore = create<CarpetasNotasStore>((set, get) => ({
    /* Estado inicial */
    carpetas: [],
    carpetaActiva: null,
    cargando: false,
    error: null,
    vistaActual: 'notas',

    /* Acciones */
    cargarCarpetas: async () => {
        set({cargando: true, error: null});

        try {
            const carpetas = await carpetasNotasService.listar();
            set({carpetas, cargando: false});
        } catch (error) {
            const mensaje = error instanceof Error ? error.message : 'Error al cargar carpetas';
            set({cargando: false, error: mensaje});
        }
    },

    crearCarpeta: async (nombre: string) => {
        set({cargando: true, error: null});

        try {
            const carpeta = await carpetasNotasService.crear(nombre);
            set(state => ({
                carpetas: [...state.carpetas, carpeta],
                cargando: false
            }));
            return carpeta;
        } catch (error) {
            const mensaje = error instanceof Error ? error.message : 'Error al crear carpeta';
            set({cargando: false, error: mensaje});
            return null;
        }
    },

    renombrarCarpeta: async (id: number, nombre: string) => {
        try {
            await carpetasNotasService.renombrar(id, nombre);
            set(state => ({
                carpetas: state.carpetas.map(c => (c.id === id ? {...c, nombre} : c))
            }));
            return true;
        } catch (error) {
            const mensaje = error instanceof Error ? error.message : 'Error al renombrar';
            set({error: mensaje});
            return false;
        }
    },

    eliminarCarpeta: async (id: number) => {
        const {carpetaActiva} = get();

        try {
            await carpetasNotasService.eliminar(id);

            set(state => ({
                carpetas: state.carpetas.filter(c => c.id !== id),
                /* Si la carpeta eliminada era la activa, volver a General */
                carpetaActiva: carpetaActiva === id ? null : state.carpetaActiva
            }));

            /* Recargar carpetas para actualizar contadores */
            get().cargarCarpetas();
            return true;
        } catch (error) {
            const mensaje = error instanceof Error ? error.message : 'Error al eliminar';
            set({error: mensaje});
            return false;
        }
    },

    seleccionarCarpeta: (id: number | null) => {
        set({carpetaActiva: id, vistaActual: 'notas'});
    },

    moverNota: async (notaId: number, carpetaId: number | null) => {
        try {
            await notasService.moverNota(notaId, carpetaId);
            /* Recargar carpetas para actualizar contadores */
            get().cargarCarpetas();
            return true;
        } catch (error) {
            const mensaje = error instanceof Error ? error.message : 'Error al mover nota';
            set({error: mensaje});
            return false;
        }
    },

    setVistaActual: (vista: 'carpetas' | 'notas') => {
        set({vistaActual: vista});
    },

    volverACarpetas: () => {
        set({vistaActual: 'carpetas'});
    },

    obtenerNombreCarpetaActiva: () => {
        const {carpetas, carpetaActiva} = get();
        if (carpetaActiva === null) return 'General';
        const carpeta = carpetas.find(c => c.id === carpetaActiva);
        return carpeta?.nombre || 'General';
    }
}));

/* Hook conveniente para acceder al store */
export const useCarpetasNotas = () => {
    const carpetas = useCarpetasNotasStore(s => s.carpetas);
    const carpetaActiva = useCarpetasNotasStore(s => s.carpetaActiva);
    const cargando = useCarpetasNotasStore(s => s.cargando);
    const error = useCarpetasNotasStore(s => s.error);
    const vistaActual = useCarpetasNotasStore(s => s.vistaActual);
    const cargarCarpetas = useCarpetasNotasStore(s => s.cargarCarpetas);
    const crearCarpeta = useCarpetasNotasStore(s => s.crearCarpeta);
    const renombrarCarpeta = useCarpetasNotasStore(s => s.renombrarCarpeta);
    const eliminarCarpeta = useCarpetasNotasStore(s => s.eliminarCarpeta);
    const seleccionarCarpeta = useCarpetasNotasStore(s => s.seleccionarCarpeta);
    const moverNota = useCarpetasNotasStore(s => s.moverNota);
    const setVistaActual = useCarpetasNotasStore(s => s.setVistaActual);
    const volverACarpetas = useCarpetasNotasStore(s => s.volverACarpetas);
    const obtenerNombreCarpetaActiva = useCarpetasNotasStore(s => s.obtenerNombreCarpetaActiva);

    return {
        carpetas,
        carpetaActiva,
        cargando,
        error,
        vistaActual,
        cargarCarpetas,
        crearCarpeta,
        renombrarCarpeta,
        eliminarCarpeta,
        seleccionarCarpeta,
        moverNota,
        setVistaActual,
        volverACarpetas,
        obtenerNombreCarpetaActiva
    };
};
