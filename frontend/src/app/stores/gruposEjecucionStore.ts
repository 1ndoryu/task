import {create} from 'zustand';
import {persist} from 'zustand/middleware';

export const GRUPO_SIN_GRUPO = '__sin_grupo__';

interface GruposEjecucionState {
    grupoPorPanel: Record<string, string | null>;
    gruposConocidos: string[];
}

interface GruposEjecucionActions {
    setGrupoPanel: (panelId: string, grupo: string | null) => void;
    getGrupoPanel: (panelId: string) => string | null;
    registrarGrupo: (grupo: string) => void;
    renombrarGrupo: (grupoViejo: string, grupoNuevo: string) => void;
    eliminarGrupo: (grupo: string) => void;
}

export const useGruposEjecucionStore = create<GruposEjecucionState & GruposEjecucionActions>()(
    persist(
        (set, get) => ({
            grupoPorPanel: {},
            gruposConocidos: [],

            setGrupoPanel: (panelId, grupo) => {
                set(state => ({
                    grupoPorPanel: {
                        ...state.grupoPorPanel,
                        [panelId]: grupo
                    }
                }));
            },

            getGrupoPanel: (panelId) => {
                return get().grupoPorPanel[panelId] ?? null;
            },

            registrarGrupo: (grupo) => {
                const normalizado = grupo.trim();
                if (!normalizado) return;
                set(state => {
                    if (state.gruposConocidos.includes(normalizado)) return state;
                    return {gruposConocidos: [...state.gruposConocidos, normalizado]};
                });
            },

            /* [20-08-2026] Renombrar un grupo actualiza gruposConocidos y los
             * paneles que apuntaban al nombre viejo (grupoPorPanel). */
            renombrarGrupo: (grupoViejo, grupoNuevo) => {
                const viejo = grupoViejo.trim();
                const nuevo = grupoNuevo.trim();
                if (!viejo || !nuevo || viejo === nuevo) return;
                set(state => ({
                    gruposConocidos: state.gruposConocidos.map(g => (g === viejo ? nuevo : g)),
                    grupoPorPanel: Object.fromEntries(
                        Object.entries(state.grupoPorPanel).map(([panelId, grupo]) => [
                            panelId,
                            grupo === viejo ? nuevo : grupo
                        ])
                    )
                }));
            },

            /* [20-08-2026] Eliminar un grupo lo quita de gruposConocidos y
             * limpia los paneles que lo tenian seleccionado (vuelven a null). */
            eliminarGrupo: (grupo) => {
                const normalizado = grupo.trim();
                set(state => ({
                    gruposConocidos: state.gruposConocidos.filter(g => g !== normalizado),
                    grupoPorPanel: Object.fromEntries(
                        Object.entries(state.grupoPorPanel).map(([panelId, grupoPanel]) => [
                            panelId,
                            grupoPanel === normalizado ? null : grupoPanel
                        ])
                    )
                }));
            }
        }),
        {
            name: 'glory_grupos_ejecucion'
        }
    )
);
