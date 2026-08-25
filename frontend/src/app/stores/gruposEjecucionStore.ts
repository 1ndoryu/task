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

/* [21-08-2026] Sincronización entre pestañas del store de grupos.
 * Los grupos no son una entidad del servidor: viven solo en localStorage
 * (glory_grupos_ejecucion), así que crear/renombrar/eliminar en una pestaña
 * nunca llegaba a las demás y un grupo borrado en una reaparecía en otra
 * (gruposConocidos conservaba el nombre). El evento `storage` de localStorage
 * es el canal nativo entre pestañas para esta clave: al recibirlo aplicamos
 * el estado remoto (last-write-wins). El guard de igualdad corta el bucle
 * (persist reescribe la misma clave, pero el evento solo se dispara si el
 * valor cambió de verdad). */
if (typeof window !== 'undefined') {
    window.addEventListener('storage', evento => {
        if (evento.key !== 'glory_grupos_ejecucion') return;
        if (!evento.newValue) return;
        try {
            const remoto = JSON.parse(evento.newValue) as {
                state?: {grupoPorPanel?: Record<string, string | null>; gruposConocidos?: string[]};
            };
            const estadoRemoto = remoto?.state;
            if (!estadoRemoto) return;
            const local = useGruposEjecucionStore.getState();
            const igual =
                JSON.stringify(local.grupoPorPanel) === JSON.stringify(estadoRemoto.grupoPorPanel ?? {}) &&
                JSON.stringify(local.gruposConocidos) === JSON.stringify(estadoRemoto.gruposConocidos ?? []);
            if (igual) return;
            useGruposEjecucionStore.setState({
                grupoPorPanel: estadoRemoto.grupoPorPanel ?? {},
                gruposConocidos: estadoRemoto.gruposConocidos ?? []
            });
        } catch {
            /* JSON inválido en la clave: ignorar (otra pestaña a medio escribir) */
        }
    });
}
