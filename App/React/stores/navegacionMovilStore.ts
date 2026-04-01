/*
 * stores/navegacionMovilStore.ts
 * [014A-12] Store para configurar qué paneles aparecen en la barra inferior móvil.
 * Persiste en localStorage. Máximo 4 botones (el FAB central es fijo).
 * Por defecto: ejecucion, proyectos, habitos, notas (los 4 originales hardcoded).
 */

import {create} from 'zustand';
import {persist} from 'zustand/middleware';

const MAX_BOTONES = 4;
const BOTONES_DEFECTO = ['ejecucion', 'proyectos', 'habitos', 'notas'];

interface NavegacionMovilState {
    botonesBarraInferior: string[];
    agregarBoton: (idPagina: string) => void;
    quitarBoton: (idPagina: string) => void;
    reordenarBotones: (ids: string[]) => void;
    estaEnBarra: (idPagina: string) => boolean;
}

export const useNavegacionMovilStore = create<NavegacionMovilState>()(
    persist(
        (set, get) => ({
            botonesBarraInferior: BOTONES_DEFECTO,

            agregarBoton: (idPagina: string) => {
                const {botonesBarraInferior} = get();
                if (botonesBarraInferior.includes(idPagina)) return;
                if (botonesBarraInferior.length >= MAX_BOTONES) return;
                set({botonesBarraInferior: [...botonesBarraInferior, idPagina]});
            },

            quitarBoton: (idPagina: string) => {
                const {botonesBarraInferior} = get();
                set({botonesBarraInferior: botonesBarraInferior.filter(id => id !== idPagina)});
            },

            reordenarBotones: (ids: string[]) => {
                set({botonesBarraInferior: ids.slice(0, MAX_BOTONES)});
            },

            estaEnBarra: (idPagina: string) => {
                return get().botonesBarraInferior.includes(idPagina);
            }
        }),
        {name: 'glory-nav-movil'}
    )
);

export const MAX_BOTONES_BARRA = MAX_BOTONES;
