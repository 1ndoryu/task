import {create} from 'zustand';
import {Nota, NotaActiva} from '../types/notas';
import {notasService} from '../services/notasService';
import {persistirNotaActivaId, extraerTitulo, emitirCambioNotaActiva, CONTENIDO_NOTA_NUEVA, obtenerNotaActivaIdGuardado} from '../utils/notasUtils';
import {notasIniciales} from '../data/datosIniciales';

interface NotasState {
    notas: Nota[];
    notaActiva: NotaActiva;
    total: number;
    hayMas: boolean;
    cargando: boolean;
    guardando: boolean;
    eliminando: boolean;
    error: string | null;
    offset: number;
    limite: number;
}

interface NotasActions {
    cargarNotas: (reiniciar?: boolean) => Promise<void>;
    cargarMas: () => Promise<void>;
    buscarNotas: (termino: string) => Promise<Nota[]>;
    seleccionarNota: (nota: Nota) => void;
    crearNuevaNota: () => void;
    actualizarContenidoNotaActiva: (contenido: string) => void;
    guardarNotaActiva: () => Promise<Nota | null>;
    eliminarNota: (id: number) => Promise<boolean>;
    limpiarError: () => void;
    establecerNotaActivaDesdeId: (id: number | null) => void;
    restaurarNotaActivaGuardada: () => void;
}

const LIMITE_POR_PAGINA = 50;

export const useNotasStore = create<NotasState & NotasActions>((set, get) => ({
    // Estado Inicial
    notas: [],
    notaActiva: {
        id: null,
        contenido: CONTENIDO_NOTA_NUEVA,
        modificada: false
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

    seleccionarNota: nota => {
        persistirNotaActivaId(nota.id);
        emitirCambioNotaActiva(nota.id);
        set({
            notaActiva: {
                id: nota.id,
                contenido: nota.contenido,
                modificada: false
            }
        });
    },

    crearNuevaNota: () => {
        persistirNotaActivaId(null);
        set({
            notaActiva: {
                id: null,
                contenido: CONTENIDO_NOTA_NUEVA,
                modificada: false
            }
        });
    },

    actualizarContenidoNotaActiva: contenido => {
        set(state => ({
            notaActiva: {
                ...state.notaActiva,
                contenido,
                modificada: true
            }
        }));
    },

    establecerNotaActivaDesdeId: id => {
        const {notas, notaActiva} = get();

        // Si ya es la misma, no hacer nada
        if (notaActiva.id === id) return;

        if (id === null) {
            get().crearNuevaNota();
            return;
        }

        const nota = notas.find(n => n.id === id);
        if (nota) {
            set({
                notaActiva: {
                    id: nota.id,
                    contenido: nota.contenido,
                    modificada: false
                }
            });
        }
    },

    restaurarNotaActivaGuardada: () => {
        const {notas, notaActiva} = get();
        const idGuardado = obtenerNotaActivaIdGuardado();

        if (idGuardado !== null) {
            const nota = notas.find(n => n.id === idGuardado);
            if (nota) {
                set({
                    notaActiva: {
                        id: nota.id,
                        contenido: nota.contenido,
                        modificada: false
                    }
                });
                return;
            }
        }

        /*
         * Si no hay nota guardada previamente y no hay notas en el servidor,
         * mostrar la nota de bienvenida para usuarios nuevos
         */
        if (notas.length === 0 && notaActiva.contenido === CONTENIDO_NOTA_NUEVA) {
            set({
                notaActiva: {
                    id: null,
                    contenido: notasIniciales,
                    modificada: true /* Marcar como modificada para que se guarde */
                }
            });
        }
    },

    guardarNotaActiva: async () => {
        const {notaActiva} = get();
        const contenido = notaActiva.contenido;

        if (!contenido.trim()) return null;

        set({guardando: true, error: null});
        const titulo = extraerTitulo(contenido);

        try {
            let notaGuardada: Nota;

            if (notaActiva.id) {
                // Actualizar
                notaGuardada = await notasService.actualizarNota(notaActiva.id, titulo, contenido);

                set(state => ({
                    guardando: false,
                    notas: state.notas.map(n => (n.id === notaGuardada.id ? notaGuardada : n)),
                    notaActiva: {...state.notaActiva, modificada: false}
                }));
            } else {
                // Crear
                notaGuardada = await notasService.crearNota(titulo, contenido);

                persistirNotaActivaId(notaGuardada.id);
                set(state => ({
                    guardando: false,
                    notas: [notaGuardada, ...state.notas],
                    total: state.total + 1,
                    notaActiva: {
                        id: notaGuardada.id,
                        contenido: notaGuardada.contenido,
                        modificada: false
                    }
                }));
            }
            return notaGuardada;
        } catch (error) {
            const mensaje = error instanceof Error ? error.message : 'Error al guardar';
            set({guardando: false, error: mensaje});
            return null;
        }
    },

    eliminarNota: async id => {
        const {notas, notaActiva, total} = get();
        const notaAEliminar = notas.find(n => n.id === id);
        const notaActivaAnterior = {...notaActiva};

        // Optimistic Update
        const nuevasNotas = notas.filter(n => n.id !== id);
        const nuevaActiva = notaActiva.id === id ? {id: null, contenido: CONTENIDO_NOTA_NUEVA, modificada: false} : notaActiva;

        set({
            eliminando: true,
            error: null,
            notas: nuevasNotas,
            total: total > 0 ? total - 1 : 0,
            notaActiva: nuevaActiva
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
                notaActiva: notaActivaAnterior
            });
            return false;
        }
    },

    limpiarError: () => set({error: null})
}));
