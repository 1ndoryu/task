/*
 * usePanelScratchpad
 * Lógica extraída de PanelScratchpad para cumplir SRP
 * Gestiona estado de notas con autoguardado debounced y modo enfoque
 */

import {useState, useEffect, useRef} from 'react';
import {useNotasStore} from '../../stores/notasStore';
import {extraerTitulo, CONTENIDO_NOTA_NUEVA} from '../../utils/notasUtils';
import {useAlertas} from '../useAlertas';
import type {NotaActiva} from '../../types/notas';

/* Constante para delay de autoguardado (ms) */
const DELAY_AUTOGUARDADO = 2000;

interface UsePanelScratchpadReturn {
    modalNotasExpandidoAbierto: boolean;
    setModalNotasExpandidoAbierto: (abierto: boolean) => void;
    modoEnfoque: boolean;
    setModoEnfoque: (activo: boolean) => void;
    notaActiva: NotaActiva;
    actualizarContenido: (contenido: string) => void;
    tituloActivo: string;
    esNotaNueva: boolean;
    manejarNuevaNota: () => void;
    manejarLimpiar: () => void;
    manejarAbrirCarpeta: () => Promise<void>;
}

export function usePanelScratchpad(): UsePanelScratchpadReturn {
    const [modalNotasExpandidoAbierto, setModalNotasExpandidoAbierto] = useState(false);
    const [modoEnfoque, setModoEnfoque] = useState(false);

    /* Estado global de notas */
    const notaActiva = useNotasStore(s => s.notaActiva);
    const notas = useNotasStore(s => s.notas);
    const crearNuevaNota = useNotasStore(s => s.crearNuevaNota);
    const actualizarContenido = useNotasStore(s => s.actualizarContenidoNotaActiva);
    const guardarNotaActiva = useNotasStore(s => s.guardarNotaActiva);
    const cargarNotas = useNotasStore(s => s.cargarNotas);
    const restaurarNotaActivaGuardada = useNotasStore(s => s.restaurarNotaActivaGuardada);

    /* Refs para autoguardado debounced */
    const timeoutGuardadoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const contenidoAnteriorRef = useRef<string>(notaActiva.contenido);

    const {mostrarExito} = useAlertas();

    /*
     * Efecto 1: Cargar notas al montar el componente
     * Solo se ejecuta una vez al inicio
     */
    useEffect(() => {
        cargarNotas(true);
    }, [cargarNotas]);

    /*
     * Efecto 2: Restaurar última nota activa cuando las notas se cargan
     * Se ejecuta cuando notas.length cambia de 0 a >0 (carga inicial completada)
     */
    useEffect(() => {
        if (notas.length > 0 && notaActiva.id === null && notaActiva.contenido === CONTENIDO_NOTA_NUEVA) {
            restaurarNotaActivaGuardada();
        }
    }, [notas.length, notaActiva.id, notaActiva.contenido, restaurarNotaActivaGuardada]);

    /*
     * Efecto 3: Autoguardado debounced
     * Se activa cuando el contenido cambia y está modificada
     * Usa debounce de 2 segundos para evitar guardar en cada keystroke
     */
    useEffect(() => {
        if (!notaActiva.modificada) return;
        if (notaActiva.contenido === contenidoAnteriorRef.current) return;
        if (notaActiva.contenido === CONTENIDO_NOTA_NUEVA) return;
        if (!notaActiva.contenido.trim()) return;

        if (timeoutGuardadoRef.current) {
            clearTimeout(timeoutGuardadoRef.current);
        }

        timeoutGuardadoRef.current = setTimeout(() => {
            guardarNotaActiva();
            contenidoAnteriorRef.current = notaActiva.contenido;
        }, DELAY_AUTOGUARDADO);

        return () => {
            if (timeoutGuardadoRef.current) {
                clearTimeout(timeoutGuardadoRef.current);
            }
        };
    }, [notaActiva.contenido, notaActiva.modificada, guardarNotaActiva]);

    const manejarNuevaNota = () => {
        crearNuevaNota();
        mostrarExito('Nueva nota creada');
    };

    const manejarLimpiar = () => {
        crearNuevaNota();
    };

    /* Guardar la nota activa antes de abrir el modal de notas guardadas */
    const manejarAbrirCarpeta = async () => {
        if (notaActiva.modificada && notaActiva.contenido.trim()) {
            await guardarNotaActiva();
        }
        setModalNotasExpandidoAbierto(true);
    };

    /* Título de la nota activa para mostrar en el encabezado */
    const tituloActivo = extraerTitulo(notaActiva.contenido);
    const esNotaNueva = notaActiva.id === null;

    return {
        modalNotasExpandidoAbierto,
        setModalNotasExpandidoAbierto,
        modoEnfoque,
        setModoEnfoque,
        notaActiva,
        actualizarContenido,
        tituloActivo,
        esNotaNueva,
        manejarNuevaNota,
        manejarLimpiar,
        manejarAbrirCarpeta
    };
}
