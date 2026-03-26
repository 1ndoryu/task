/*
 * useModalNotasExpandido
 * Hook que encapsula toda la lógica del modal de notas expandido.
 * Gestiona búsqueda, ordenamiento, carpetas, paneles y cierre seguro.
 */

import {useState, useEffect, useCallback, useMemo, useRef} from 'react';
import type {Nota, CarpetaNota} from '../../types/notas';
import {useNotasStore} from '../../stores/notasStore';
import {useCarpetasNotas} from '../../stores/carpetasNotasStore';
import {extraerTitulo} from '../../utils/notasUtils';
import {useEsMovil} from '../useEsMovil';

/* Tipos de ordenamiento disponibles */
type TipoOrdenamiento = 'modificacion' | 'creacion';

export interface UseModalNotasExpandidoProps {
    abierto: boolean;
    onCerrar: () => void;
}

export interface UseModalNotasExpandidoReturn {
    /* Store de notas */
    notas: Nota[];
    notaActiva: {id: number | null; contenido: string; modificada: boolean};
    cargando: boolean;
    guardando: boolean;
    error: string | null;
    seleccionarNota: (nota: Nota) => void;
    actualizarContenido: (contenido: string) => void;

    /* Carpetas */
    carpetas: CarpetaNota[];
    carpetaActiva: number | null | undefined;
    vistaActual: 'carpetas' | 'notas';
    cargandoCarpetas: boolean;
    seleccionarCarpeta: (id: number | null) => void;
    volverACarpetas: () => void;
    nombreCarpetaActiva: string;
    manejarCrearCarpeta: (nombre: string) => Promise<void>;
    manejarRenombrarCarpeta: (id: number, nombre: string) => Promise<void>;
    manejarEliminarCarpeta: (id: number) => Promise<void>;
    moverNota: (notaId: number, carpetaId: number | null) => Promise<boolean>;

    /* Búsqueda */
    terminoBusqueda: string;
    setTerminoBusqueda: (v: string) => void;
    resultadosBusqueda: Nota[] | null;
    buscando: boolean;

    /* Paneles y vista */
    maximizado: boolean;
    setMaximizado: (v: boolean) => void;
    mostrarLista: boolean;
    mostrarEditor: boolean;
    alternarPanelLista: () => void;
    alternarPanelEditor: () => void;

    /* Ordenamiento */
    ordenamiento: TipoOrdenamiento;
    alternarOrdenamiento: () => void;
    textoOrdenamiento: string;

    /* Notas procesadas */
    notasOrdenadas: Nota[];
    tituloActivo: string;

    /* Acciones */
    manejarEliminar: (notaId: number) => void;
    manejarCrearNuevaNota: () => void;
    manejarCerrarSeguro: () => Promise<void>;

    /* Clases del modal */
    claseModal: string;
}

export function useModalNotasExpandido({abierto, onCerrar}: UseModalNotasExpandidoProps): UseModalNotasExpandidoReturn {
    const {esMovil} = useEsMovil();

    /* Estado global de notas */
    const notas = useNotasStore(s => s.notas);
    const notaActiva = useNotasStore(s => s.notaActiva);
    const total = useNotasStore(s => s.total);
    const cargando = useNotasStore(s => s.cargando);
    const guardando = useNotasStore(s => s.guardando);
    const error = useNotasStore(s => s.error);
    const cargarNotas = useNotasStore(s => s.cargarNotas);
    const eliminarNota = useNotasStore(s => s.eliminarNota);
    const buscarNotas = useNotasStore(s => s.buscarNotas);
    const seleccionarNotaStore = useNotasStore(s => s.seleccionarNota);
    const crearNuevaNota = useNotasStore(s => s.crearNuevaNota);
    const actualizarContenido = useNotasStore(s => s.actualizarContenidoNotaActiva);

    /* [263A-7] En móvil, seleccionar una nota cierra el modal para que se abra en el panel scratchpad */
    const seleccionarNota = useCallback((nota: Nota) => {
        seleccionarNotaStore(nota);
        if (esMovil) onCerrar();
    }, [seleccionarNotaStore, esMovil, onCerrar]);

    /* Estado de carpetas */
    const {
        carpetas, carpetaActiva, vistaActual,
        cargando: cargandoCarpetas,
        cargarCarpetas, crearCarpeta, renombrarCarpeta,
        eliminarCarpeta, seleccionarCarpeta, moverNota,
        setVistaActual: _setVistaActual, volverACarpetas, obtenerNombreCarpetaActiva
    } = useCarpetasNotas();

    const [terminoBusqueda, setTerminoBusqueda] = useState('');
    const [resultadosBusqueda, setResultadosBusqueda] = useState<Nota[] | null>(null);
    const [buscando, setBuscando] = useState(false);
    const [maximizado, setMaximizado] = useState(false);
    const [ordenamiento, setOrdenamiento] = useState<TipoOrdenamiento>('modificacion');

    /* Estados separados para mostrar/ocultar lista y editor */
    const [mostrarLista, setMostrarLista] = useState(true);
    const [mostrarEditor, setMostrarEditor] = useState(true);
    const totalAnteriorRef = useRef<number | null>(null);

    /* Cierre seguro: si hay cambios sin guardar, guardar antes de cerrar */
    const cerrando = useRef(false);
    const manejarCerrarSeguro = useCallback(async () => {
        if (cerrando.current) return;
        cerrando.current = true;

        const estado = useNotasStore.getState();
        if (estado.notaActiva.modificada && estado.notaActiva.contenido.trim()) {
            await estado.guardarNotaActiva();
        }

        cerrando.current = false;
        onCerrar();
    }, [onCerrar]);

    /* Toggle para panel lista */
    const alternarPanelLista = useCallback(() => {
        setMostrarLista(prev => {
            if (prev && !mostrarEditor) {
                setMostrarEditor(true);
            }
            return !prev;
        });
    }, [mostrarEditor]);

    /* Toggle para panel editor */
    const alternarPanelEditor = useCallback(() => {
        setMostrarEditor(prev => {
            if (prev && !mostrarLista) {
                setMostrarLista(true);
            }
            return !prev;
        });
    }, [mostrarLista]);

    useEffect(() => {
        if (abierto) {
            cargarNotas();
            cargarCarpetas();
            setTerminoBusqueda('');
            setResultadosBusqueda(null);
        }
    }, [abierto, cargarNotas, cargarCarpetas]);

    useEffect(() => {
        if (!terminoBusqueda.trim()) {
            setResultadosBusqueda(null);
            return;
        }

        const timeout = setTimeout(async () => {
            setBuscando(true);
            const resultados = await buscarNotas(terminoBusqueda);
            setResultadosBusqueda(resultados);
            setBuscando(false);
        }, 300);

        return () => clearTimeout(timeout);
    }, [terminoBusqueda, buscarNotas]);

    useEffect(() => {
        if (!abierto) {
            totalAnteriorRef.current = null;
            return;
        }

        if (totalAnteriorRef.current !== null && totalAnteriorRef.current !== total) {
            cargarCarpetas();
        }

        totalAnteriorRef.current = total;
    }, [abierto, total, cargarCarpetas]);

    const manejarEliminar = useCallback(
        (notaId: number) => {
            eliminarNota(notaId);
        },
        [eliminarNota]
    );

    /* Crear nueva nota en la carpeta activa actual */
    const manejarCrearNuevaNota = useCallback(() => {
        crearNuevaNota(carpetaActiva);
    }, [crearNuevaNota, carpetaActiva]);

    /* Cambiar ordenamiento */
    const alternarOrdenamiento = useCallback(() => {
        setOrdenamiento(prev => (prev === 'modificacion' ? 'creacion' : 'modificacion'));
    }, []);

    /* Ordenar y filtrar notas por carpeta activa */
    const notasOrdenadas = useMemo(() => {
        let lista = resultadosBusqueda ?? notas;

        if (!resultadosBusqueda && carpetaActiva !== undefined) {
            lista = lista.filter(n => {
                if (carpetaActiva === null) {
                    return n.carpetaId === null || n.carpetaId === undefined;
                }
                return n.carpetaId === carpetaActiva;
            });
        }

        return [...lista].sort((a, b) => {
            if (ordenamiento === 'modificacion') {
                return new Date(b.fechaModificacion).getTime() - new Date(a.fechaModificacion).getTime();
            }
            return new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime();
        });
    }, [notas, resultadosBusqueda, ordenamiento, carpetaActiva]);

    const tituloActivo = useMemo(() => extraerTitulo(notaActiva.contenido), [notaActiva.contenido]);
    const nombreCarpetaActiva = obtenerNombreCarpetaActiva();

    /* Handlers para carpetas */
    const manejarCrearCarpeta = useCallback(
        async (nombre: string) => {
            await crearCarpeta(nombre);
        },
        [crearCarpeta]
    );

    const manejarRenombrarCarpeta = useCallback(
        async (id: number, nombre: string) => {
            await renombrarCarpeta(id, nombre);
        },
        [renombrarCarpeta]
    );

    const manejarEliminarCarpeta = useCallback(
        async (id: number) => {
            await eliminarCarpeta(id);
            await cargarNotas(true);
        },
        [eliminarCarpeta, cargarNotas]
    );

    /* Clases del modal */
    const textoOrdenamiento = ordenamiento === 'modificacion' ? 'Modificación' : 'Creación';
    const clasePaneles = !mostrarLista ? 'modalNotasExpandidoContenedor--soloEditor' : !mostrarEditor ? 'modalNotasExpandidoContenedor--soloLista' : '';
    const claseModal = `modalContenedor--expandido modalNotasExpandidoContenedor ${maximizado ? 'modalNotasExpandidoContenedor--maximizado' : ''} ${clasePaneles}`;

    return {
        notas,
        notaActiva,
        cargando,
        guardando,
        error,
        seleccionarNota,
        actualizarContenido,
        carpetas,
        carpetaActiva,
        vistaActual,
        cargandoCarpetas,
        seleccionarCarpeta,
        volverACarpetas,
        nombreCarpetaActiva,
        manejarCrearCarpeta,
        manejarRenombrarCarpeta,
        manejarEliminarCarpeta,
        moverNota,
        terminoBusqueda,
        setTerminoBusqueda,
        resultadosBusqueda,
        buscando,
        maximizado,
        setMaximizado,
        mostrarLista,
        mostrarEditor,
        alternarPanelLista,
        alternarPanelEditor,
        ordenamiento,
        alternarOrdenamiento,
        textoOrdenamiento,
        notasOrdenadas,
        tituloActivo,
        manejarEliminar,
        manejarCrearNuevaNota,
        manejarCerrarSeguro,
        claseModal
    };
}
