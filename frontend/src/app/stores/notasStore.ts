import {create} from 'zustand';
import {Nota, NotaActiva} from '../types/notas';
import {notasService} from '../services/notasService';
import {extraerTitulo, emitirCambioNotaActiva, CONTENIDO_NOTA_NUEVA, obtenerNotaActivaPanelGuardada, persistirNotaActivaPanel} from '../utils/notasUtils';
import {notasIniciales} from '../data/datosIniciales';
import {devWarn} from '../utils/devLog';

/* [263A-12] ID del panel scratchpad base. Solo este panel persiste su nota en localStorage y emite eventos de tab sync. */
export const PANEL_SCRATCHPAD = 'scratchpad';

/* [263A-12] Nota vacía para paneles sin estado previo */
const NOTA_VACIA: NotaActiva = {id: null, contenido: CONTENIDO_NOTA_NUEVA, modificada: false};

/* [28-08-2026] Guardado de nota en vuelo (no reactivo). Serializa llamadas
 * concurrentes a guardarNotaActiva: el autoguardado debounced, el guardado
 * manual y el modal expandido pueden dispararse casi juntos mientras la nota
 * activa aún no tiene id (id=null); ambos leerían id nulo y llamarían a
 * crearNota → la nota aparecía DUPLICADA en la lista. El segundo llamada
 * espera al primero y re-evalúa el estado fresco: si aquel asignó id, pasa
 * por el camino de update en vez de crear otra fila igual. */
let guardadoNotaEnVuelo: Promise<Nota | null> | null = null;

interface NotasState {
    notas: Nota[];
    /* [263A-12] Cada panel scratchpad tiene su propia nota activa independiente */
    notasActivaPorPanel: Record<string, NotaActiva>;
    total: number;
    hayMas: boolean;
    cargando: boolean;
    guardando: boolean;
    eliminando: boolean;
    error: string | null;
    offset: number;
    limite: number;
}

/* [ISP] Acciones divididas por dominio: carga/listado vs nota activa por panel. */
interface NotasActionsListado {
    cargarNotas: (reiniciar?: boolean) => Promise<void>;
    cargarMas: () => Promise<void>;
    buscarNotas: (termino: string) => Promise<Nota[]>;
    eliminarNota: (id: string) => Promise<boolean>;
    limpiarError: () => void;
}

interface NotasActionsActiva {
    /* [263A-12] Acciones de nota activa parametrizadas por panelId */
    seleccionarNota: (panelId: string, nota: Nota) => void;
    crearNuevaNota: (panelId: string, carpetaId?: string | null) => void;
    actualizarContenidoNotaActiva: (panelId: string, contenido: string) => void;
    guardarNotaActiva: (panelId: string) => Promise<Nota | null>;
    establecerNotaActivaDesdeId: (panelId: string, id: string | null) => void;
    restaurarNotaActivaGuardada: (panelId: string) => void;
}

interface NotasActions extends NotasActionsListado, NotasActionsActiva {
}

const LIMITE_POR_PAGINA = 50;

/* [263A-12] Helper: obtiene la nota activa de un panel o la nota vacía por defecto */
export function obtenerNotaPanel(state: NotasState, panelId: string): NotaActiva {
    return state.notasActivaPorPanel[panelId] ?? NOTA_VACIA;
}

export const useNotasStore = create<NotasState & NotasActions>((set, get) => ({
    // Estado Inicial
    notas: [],
    /* [263A-12] Cada panel tiene su propia nota activa */
    notasActivaPorPanel: {
        [PANEL_SCRATCHPAD]: {
            id: null,
            contenido: CONTENIDO_NOTA_NUEVA,
            modificada: false
        }
    },
    total: 0,
    hayMas: false,
    cargando: false,
    guardando: false,
    eliminando: false,
    error: null,
    offset: 0,
    limite: LIMITE_POR_PAGINA,

    // Acciones
    cargarNotas: async (reiniciar = false) => {
        const {limite, offset, cargando} = get();
        if (cargando) return;

        set({cargando: true, error: null});
        const nuevoOffset = reiniciar ? 0 : offset;

        try {
            const respuesta = await notasService.cargarNotas(limite, nuevoOffset);

            set(state => ({
                cargando: false,
                notas: reiniciar ? respuesta.notas : [...state.notas, ...respuesta.notas],
                total: respuesta.total,
                hayMas: respuesta.hayMas,
                offset: nuevoOffset + respuesta.notas.length
            }));
        } catch (error) {
            const mensaje = error instanceof Error ? error.message : 'Error al cargar notas';
            set({cargando: false, error: mensaje});
        }
    },

    cargarMas: async () => {
        const {hayMas, cargando} = get();
        if (!hayMas || cargando) return;
        await get().cargarNotas(false);
    },

    buscarNotas: async termino => {
        return await notasService.buscarNotas(termino);
    },

    /* [263A-12] Cada acción recibe panelId. Todos los paneles persisten su nota activa. */
    seleccionarNota: (panelId, nota) => {
        persistirNotaActivaPanel(panelId, nota.id);
        if (panelId === PANEL_SCRATCHPAD) {
            emitirCambioNotaActiva(nota.id);
        }
        set(state => ({
            notasActivaPorPanel: {
                ...state.notasActivaPorPanel,
                [panelId]: {
                    id: nota.id,
                    contenido: nota.contenido,
                    modificada: false
                }
            }
        }));
    },

    crearNuevaNota: (panelId, carpetaId?) => {
        persistirNotaActivaPanel(panelId, null);
        set(state => ({
            notasActivaPorPanel: {
                ...state.notasActivaPorPanel,
                [panelId]: {
                    id: null,
                    contenido: CONTENIDO_NOTA_NUEVA,
                    modificada: false,
                    carpetaId: carpetaId ?? null
                }
            }
        }));
    },

    actualizarContenidoNotaActiva: (panelId, contenido) => {
        set(state => {
            const notaActual = state.notasActivaPorPanel[panelId];
            if (!notaActual) return state;
            return {
                notasActivaPorPanel: {
                    ...state.notasActivaPorPanel,
                    [panelId]: {
                        ...notaActual,
                        contenido,
                        modificada: true
                    }
                }
            };
        });
    },

    establecerNotaActivaDesdeId: (panelId, id) => {
        const {notas, notasActivaPorPanel} = get();
        const notaActual = notasActivaPorPanel[panelId];

        if (notaActual?.id === id) return;

        if (id === null) {
            get().crearNuevaNota(panelId);
            return;
        }

        const nota = notas.find(n => n.id === id);
        if (nota) {
            set(state => ({
                notasActivaPorPanel: {
                    ...state.notasActivaPorPanel,
                    [panelId]: {
                        id: nota.id,
                        contenido: nota.contenido,
                        modificada: false
                    }
                }
            }));
        }
    },

    restaurarNotaActivaGuardada: (panelId) => {
        const {notas, notasActivaPorPanel} = get();
        const notaActual = notasActivaPorPanel[panelId] ?? NOTA_VACIA;
        const idGuardado = obtenerNotaActivaPanelGuardada(panelId);

        if (idGuardado !== null) {
            const nota = notas.find(n => n.id === idGuardado);
            if (nota) {
                set(state => ({
                    notasActivaPorPanel: {
                        ...state.notasActivaPorPanel,
                        [panelId]: {
                            id: nota.id,
                            contenido: nota.contenido,
                            modificada: false
                        }
                    }
                }));
                return;
            }
        }

        /*
         * Si no hay nota guardada previamente y no hay notas en el servidor,
         * mostrar la nota de bienvenida para usuarios nuevos
         */
        if (notas.length === 0 && notaActual.contenido === CONTENIDO_NOTA_NUEVA) {
            set(state => ({
                notasActivaPorPanel: {
                    ...state.notasActivaPorPanel,
                    [panelId]: {
                        id: null,
                        contenido: notasIniciales,
                        modificada: true
                    }
                }
            }));
        }
    },

    guardarNotaActiva: async (panelId) => {
        /* [28-08-2026] Ver guardadoNotaEnVuelo: serializa y re-evalúa con estado
         * fresco tras la espera, así el segundo llamada actualiza en vez de duplicar. */
        if (guardadoNotaEnVuelo) {
            await guardadoNotaEnVuelo.catch(() => undefined);
        }
        const promesa = ejecutarGuardadoNota(panelId);
        guardadoNotaEnVuelo = promesa;
        try {
            return await promesa;
        } finally {
            if (guardadoNotaEnVuelo === promesa) guardadoNotaEnVuelo = null;
        }
    },

    /* [263A-12] Al eliminar, resetear TODOS los paneles que tengan esa nota abierta */
    eliminarNota: async id => {
        const {notas, notasActivaPorPanel, total} = get();
        const notaAEliminar = notas.find(n => n.id === id);
        const notasPorPanelAnterior = {...notasActivaPorPanel};

        // Optimistic Update
        const nuevasNotas = notas.filter(n => n.id !== id);
        const nuevasNotasPorPanel: Record<string, NotaActiva> = {};
        for (const [pid, nota] of Object.entries(notasActivaPorPanel)) {
            nuevasNotasPorPanel[pid] = nota.id === id
                ? {id: null, contenido: CONTENIDO_NOTA_NUEVA, modificada: false}
                : nota;
        }

        set({
            eliminando: true,
            error: null,
            notas: nuevasNotas,
            total: total > 0 ? total - 1 : 0,
            notasActivaPorPanel: nuevasNotasPorPanel
        });

        try {
            await notasService.eliminarNota(id);
            set({eliminando: false});
            return true;
        } catch (error) {
            const mensaje = error instanceof Error ? error.message : 'Error al eliminar';

            // Rollback
            const notasRestauradas = notaAEliminar ? [...nuevasNotas, notaAEliminar].sort((a, b) => new Date(b.fechaModificacion).getTime() - new Date(a.fechaModificacion).getTime()) : notas;

            set({
                eliminando: false,
                error: mensaje,
                notas: notasRestauradas,
                total: total,
                notasActivaPorPanel: notasPorPanelAnterior
            });
            return false;
        }
    },

    limpiarError: () => set({error: null})
}));

/* [28-08-2026] Implementación del guardado, extraída del store para poder
 * serializarla desde guardarNotaActiva (ver guardadoNotaEnVuelo). Usa
 * getState/setState porque vive fuera del closure de create(). */
async function ejecutarGuardadoNota(panelId: string): Promise<Nota | null> {
    const notaActiva = useNotasStore.getState().notasActivaPorPanel[panelId];
    if (!notaActiva) return null;
    const contenido = notaActiva.contenido;

    if (!contenido.trim()) return null;

    useNotasStore.setState({guardando: true, error: null});
    const titulo = extraerTitulo(contenido);

    try {
        let notaGuardada: Nota;

        if (notaActiva.id) {
            // Actualizar
            notaGuardada = await notasService.actualizarNota(notaActiva.id, titulo, contenido);

            useNotasStore.setState(state => ({
                guardando: false,
                notas: state.notas.map(n => (n.id === notaGuardada.id ? notaGuardada : n)),
                notasActivaPorPanel: {
                    ...state.notasActivaPorPanel,
                    [panelId]: {...(state.notasActivaPorPanel[panelId] ?? NOTA_VACIA), modificada: false}
                }
            }));
        } else {
            // Crear
            notaGuardada = await notasService.crearNota(titulo, contenido);

            /*
             * Si la nota se creó desde una carpeta activa, moverla ahí.
             * La API de crearNota no acepta carpetaId, así que hacemos un
             * segundo paso: mover la nota recién creada a su carpeta destino.
             */
            if (notaActiva.carpetaId) {
                try {
                    await notasService.moverNota(notaGuardada.id, notaActiva.carpetaId);
                    notaGuardada = {...notaGuardada, carpetaId: notaActiva.carpetaId};
                } catch (error) {
                    /* [H-F11-07] Si falla el mover, la nota queda en General: no crítico,
                     * pero se registra en DEV en vez de tragarse el error */
                    devWarn('notasStore', 'No se pudo mover la nota a su carpeta; queda en General', {notaId: notaGuardada.id, carpetaId: notaActiva.carpetaId, error});
                }
            }

            persistirNotaActivaPanel(panelId, notaGuardada.id);
            useNotasStore.setState(state => ({
                guardando: false,
                notas: [notaGuardada, ...state.notas],
                total: state.total + 1,
                notasActivaPorPanel: {
                    ...state.notasActivaPorPanel,
                    [panelId]: {
                        id: notaGuardada.id,
                        contenido: notaGuardada.contenido,
                        modificada: false,
                        carpetaId: notaGuardada.carpetaId
                    }
                }
            }));
        }
        return notaGuardada;
    } catch (error) {
        const mensaje = error instanceof Error ? error.message : 'Error al guardar';
        useNotasStore.setState({guardando: false, error: mensaje});
        return null;
    }
}
