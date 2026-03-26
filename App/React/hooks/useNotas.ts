/**
 * Hook para el sistema de notas del Scratchpad
 *
 * REFACTORIZADO: Ahora actúa como un wrapper/controlador sobre `notasStore`.
 * Mantiene la interfaz original para no romper componentes existentes,
 * pero delega la lógica de estado y negocio al store de Zustand.
 *
 * @package App/React/hooks
 */

import {useEffect, useRef, useCallback} from 'react';
import {useNotasStore, PANEL_SCRATCHPAD} from '../stores/notasStore';
import {EVENTO_NOTA_ACTIVA, extraerTitulo, obtenerNotaActivaIdGuardado, CONTENIDO_NOTA_NUEVA} from '../utils/notasUtils';
import {Nota, NotaActiva} from '../types/notas';

/* Re-exportamos tipos para compatibilidad */
export type {Nota, NotaActiva};

/* [263A-12] Nota vacía para el selector */
const NOTA_VACIA: NotaActiva = {id: null, contenido: CONTENIDO_NOTA_NUEVA, modificada: false};

export interface EstadoNotas {
    cargando: boolean;
    guardando: boolean;
    eliminando: boolean;
    error: string | null;
    notas: Nota[];
    total: number;
    hayMas: boolean;
    notaActiva: NotaActiva;
}

interface UseNotasReturn {
    estado: EstadoNotas;
    cargarNotas: () => Promise<void>;
    guardarNotaActiva: () => Promise<Nota | null>;
    eliminarNota: (id: number) => Promise<boolean>;
    buscarNotas: (termino: string) => Promise<Nota[]>;
    cargarMas: () => Promise<void>;
    limpiarError: () => void;
    seleccionarNota: (nota: Nota) => void;
    crearNuevaNota: () => void;
    actualizarContenido: (contenido: string) => void;
    obtenerTituloDeContenido: (contenido: string) => string;
}

/**
 * Hook principal para el sistema de notas (Legacy Wrapper)
 * @deprecated Este hook causa re-renders masivos al suscribirse a todo el store.
 * Por favor usar `useNotasStore` directamente con selectores atómicos.
 */
export function useNotas(): UseNotasReturn {
    useEffect(() => {
        console.warn('useNotas is deprecated. Use useNotasStore instead to prevent performance issues.');
    }, []);

    /* Consumir el store — [263A-12] acciones ahora requieren panelId, usamos PANEL_SCRATCHPAD por defecto */
    const notas = useNotasStore(s => s.notas);
    const notaActiva = useNotasStore(s => s.notasActivaPorPanel[PANEL_SCRATCHPAD]) ?? NOTA_VACIA;
    const total = useNotasStore(s => s.total);
    const hayMas = useNotasStore(s => s.hayMas);
    const cargando = useNotasStore(s => s.cargando);
    const guardando = useNotasStore(s => s.guardando);
    const eliminando = useNotasStore(s => s.eliminando);
    const error = useNotasStore(s => s.error);
    const cargarNotasStore = useNotasStore(s => s.cargarNotas);
    const cargarMasStore = useNotasStore(s => s.cargarMas);
    const buscarNotasStore = useNotasStore(s => s.buscarNotas);
    const seleccionarNotaStore = useNotasStore(s => s.seleccionarNota);
    const crearNuevaNotaStore = useNotasStore(s => s.crearNuevaNota);
    const actualizarContenidoNotaActivaStore = useNotasStore(s => s.actualizarContenidoNotaActiva);
    const guardarNotaActivaStore = useNotasStore(s => s.guardarNotaActiva);
    const eliminarNota = useNotasStore(s => s.eliminarNota);
    const limpiarError = useNotasStore(s => s.limpiarError);
    const establecerNotaActivaDesdeIdStore = useNotasStore(s => s.establecerNotaActivaDesdeId);
    const restaurarNotaActivaGuardadaStore = useNotasStore(s => s.restaurarNotaActivaGuardada);

    /* Wrappers para añadir panelId por defecto */
    const seleccionarNota = useCallback((nota: Nota) => seleccionarNotaStore(PANEL_SCRATCHPAD, nota), [seleccionarNotaStore]);
    const crearNuevaNota = useCallback(() => crearNuevaNotaStore(PANEL_SCRATCHPAD), [crearNuevaNotaStore]);
    const actualizarContenidoNotaActiva = useCallback((c: string) => actualizarContenidoNotaActivaStore(PANEL_SCRATCHPAD, c), [actualizarContenidoNotaActivaStore]);
    const guardarNotaActiva = useCallback(() => guardarNotaActivaStore(PANEL_SCRATCHPAD), [guardarNotaActivaStore]);
    const establecerNotaActivaDesdeId = useCallback((id: number | null) => establecerNotaActivaDesdeIdStore(PANEL_SCRATCHPAD, id), [establecerNotaActivaDesdeIdStore]);
    const restaurarNotaActivaGuardada = useCallback(() => restaurarNotaActivaGuardadaStore(PANEL_SCRATCHPAD), [restaurarNotaActivaGuardadaStore]);

    /* Refs para control de efectos (migrados del hook original) */
    const yaRestauradoRef = useRef(false);
    const autoguardadoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const contenidoAnteriorRef = useRef<string>(notaActiva.contenido);

    /* 1. Cargar notas al montar */
    useEffect(() => {
        cargarNotasStore(true);
    }, []); // eslint-disable-line

    /* 2. Escuchar cambios de nota activa en otras instancias/ventanas */
    useEffect(() => {
        const manejarNotaActiva = (evento: Event) => {
            const detalle = (evento as CustomEvent<{id: number | null}>).detail;
            if (detalle !== undefined) {
                establecerNotaActivaDesdeId(detalle.id);
            }
        };

        window.addEventListener(EVENTO_NOTA_ACTIVA, manejarNotaActiva);
        return () => {
            window.removeEventListener(EVENTO_NOTA_ACTIVA, manejarNotaActiva);
        };
    }, [establecerNotaActivaDesdeId]);

    /* 3. Restaurar última nota activa del localStorage */
    useEffect(() => {
        if (cargando || yaRestauradoRef.current) return;

        const idGuardado = obtenerNotaActivaIdGuardado();
        if (idGuardado !== null) {
            restaurarNotaActivaGuardada();
            yaRestauradoRef.current = true;
        }
    }, [cargando, restaurarNotaActivaGuardada]);

    /* 4. Autoguardado con debounce */
    useEffect(() => {
        /* No autoguardar si el contenido no ha cambiado */
        if (notaActiva.contenido === contenidoAnteriorRef.current) {
            return;
        }

        /* No autoguardar contenido vacío o placeholder por defecto */
        if (!notaActiva.contenido.trim() || notaActiva.contenido === CONTENIDO_NOTA_NUEVA) {
            contenidoAnteriorRef.current = notaActiva.contenido;
            return;
        }

        if (autoguardadoTimeoutRef.current) {
            clearTimeout(autoguardadoTimeoutRef.current);
        }

        autoguardadoTimeoutRef.current = setTimeout(async () => {
            contenidoAnteriorRef.current = notaActiva.contenido;
            await guardarNotaActiva();
        }, 2000);

        return () => {
            if (autoguardadoTimeoutRef.current) {
                clearTimeout(autoguardadoTimeoutRef.current);
            }
        };
    }, [notaActiva.contenido, guardarNotaActiva]);

    /* Wrappers para mantener la firma original */
    const cargarNotasWrapper = useCallback(async () => {
        await cargarNotasStore(true);
    }, [cargarNotasStore]);

    const buscarNotasWrapper = useCallback(
        async (termino: string) => {
            return await buscarNotasStore(termino);
        },
        [buscarNotasStore]
    );

    const obtenerTituloDeContenido = useCallback((contenido: string) => {
        return extraerTitulo(contenido);
    }, []);

    /* Construir el objeto estado compatible */
    const estado: EstadoNotas = {
        cargando,
        guardando,
        eliminando,
        error,
        notas,
        total,
        hayMas,
        notaActiva
    };

    return {
        estado,
        cargarNotas: cargarNotasWrapper,
        guardarNotaActiva,
        eliminarNota,
        buscarNotas: buscarNotasWrapper,
        cargarMas: cargarMasStore,
        limpiarError,
        seleccionarNota,
        crearNuevaNota,
        actualizarContenido: actualizarContenidoNotaActiva,
        obtenerTituloDeContenido
    };
}
