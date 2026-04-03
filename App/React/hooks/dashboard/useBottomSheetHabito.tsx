/*
 * useBottomSheetHabito
 * Hook que encapsula toda la lógica del componente BottomSheetHabito.
 * Maneja estado del formulario, reset/carga, modales de selección,
 * badges de propiedades y guardado.
 */

import {useState, useRef, useEffect, useMemo} from 'react';
import {Repeat, Flag} from 'lucide-react';
import {obtenerTextoFrecuencia, obtenerTextoImportancia} from '../../utils/constantes';
import type {Habito} from '../../types/dashboard';

export interface BadgeActivoHabito {
    id: string;
    etiqueta: string;
    icono: JSX.Element;
    variante: 'frecuencia' | 'importancia';
}

/* Tipos de modales de selección */
export type ModalActivoHabito = 'frecuencia' | 'importancia' | null;

export interface DatosHabito {
    texto: string;
    frecuencia?: string;
    importancia?: string;
    /* ID de hábito existente para edición */
    id?: number;
}

export interface UseBottomSheetHabitoParams {
    estaAbierto: boolean;
    onCerrar: () => void;
    onGuardar: (datos: DatosHabito) => Promise<void>;
    valoresIniciales?: {
        frecuencia?: string;
        importancia?: string;
    };
    habitoExistente?: Habito;
}

export interface UseBottomSheetHabitoReturn {
    esEdicion: boolean;
    texto: string;
    setTexto: React.Dispatch<React.SetStateAction<string>>;
    frecuencia: string | undefined;
    setFrecuencia: React.Dispatch<React.SetStateAction<string | undefined>>;
    importancia: string | undefined;
    setImportancia: React.Dispatch<React.SetStateAction<string | undefined>>;
    cargando: boolean;
    modalActivo: ModalActivoHabito;
    setModalActivo: React.Dispatch<React.SetStateAction<ModalActivoHabito>>;
    inputRef: React.RefObject<HTMLInputElement | null>;
    badgesActivos: BadgeActivoHabito[];
    manejarGuardar: () => Promise<void>;
    manejarEliminarBadge: (id: string) => void;
}

export function useBottomSheetHabito({estaAbierto, onCerrar, onGuardar, valoresIniciales = {}, habitoExistente}: UseBottomSheetHabitoParams): UseBottomSheetHabitoReturn {
    const esEdicion = !!habitoExistente;
    const [texto, setTexto] = useState(habitoExistente?.nombre || '');
    const [frecuencia, setFrecuencia] = useState<string | undefined>(habitoExistente?.frecuencia?.tipo || valoresIniciales.frecuencia || 'diaria');
    const [importancia, setImportancia] = useState<string | undefined>(habitoExistente?.importancia || valoresIniciales.importancia || 'Media');
    const [cargando, setCargando] = useState(false);
    const [modalActivo, setModalActivo] = useState<ModalActivoHabito>(null);

    const inputRef = useRef<HTMLInputElement>(null);

    /* Ref para rastrear qué hábito se ha cargado (evita recargas innecesarias) */
    const habitoIdCargadoRef = useRef<number | undefined>(undefined);

    /* Autofocus al abrir */
    useEffect(() => {
        if (estaAbierto && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [estaAbierto]);

    /*
     * Reset al cerrar o cargar nuevo hábito
     * Bug fix: Solo resetear cuando estaAbierto pasa a false,
     * o cuando el ID de habitoExistente cambia (nuevo hábito a editar)
     */
    useEffect(() => {
        if (!estaAbierto) {
            /* Reset completo al cerrar */
            setTexto('');
            setFrecuencia(valoresIniciales.frecuencia || 'diaria');
            setImportancia(valoresIniciales.importancia || 'Media');
            setModalActivo(null);
            habitoIdCargadoRef.current = undefined;
        } else if (habitoExistente && habitoExistente.id !== habitoIdCargadoRef.current) {
            /* Cargar datos solo si es un hábito diferente al ya cargado */
            setTexto(habitoExistente.nombre);
            setFrecuencia(habitoExistente.frecuencia?.tipo || 'diaria');
            setImportancia(habitoExistente.importancia || 'Media');
            habitoIdCargadoRef.current = habitoExistente.id;
        } else if (!habitoExistente && estaAbierto && habitoIdCargadoRef.current === undefined) {
            /* Modo creación: aplicar valores iniciales solo la primera vez */
            setFrecuencia(valoresIniciales.frecuencia || 'diaria');
            setImportancia(valoresIniciales.importancia || 'Media');
            habitoIdCargadoRef.current = -1; /* Marcador para modo creación */
        }
    }, [estaAbierto, habitoExistente?.id]);

    const manejarGuardar = async () => {
        if (!texto.trim() || cargando) return;

        setCargando(true);
        try {
            await onGuardar({
                texto,
                frecuencia,
                importancia,
                id: habitoExistente?.id
            });
            onCerrar();
        } catch (error) {
            /* sentinel-disable-next-line fallo-sin-feedback — TO-DO: integrar useAlertas para toast de error */
            console.error('Error al guardar hábito:', error);
        } finally {
            setCargando(false);
        }
    };

    /* Construir lista de badges activos */
    const badgesActivos = useMemo(() => {
        const badges: BadgeActivoHabito[] = [];
        if (frecuencia) {
            badges.push({
                id: 'frecuencia',
                etiqueta: obtenerTextoFrecuencia(frecuencia) || frecuencia,
                icono: <Repeat size={10} />,
                variante: 'frecuencia' as const
            });
        }
        if (importancia) {
            badges.push({
                id: 'importancia',
                etiqueta: obtenerTextoImportancia(importancia) || importancia,
                icono: <Flag size={10} />,
                variante: 'importancia' as const
            });
        }
        return badges;
    }, [frecuencia, importancia]);

    /* Manejar eliminación de badge */
    const manejarEliminarBadge = (id: string) => {
        switch (id) {
            case 'frecuencia':
                setFrecuencia(undefined);
                break;
            case 'importancia':
                setImportancia(undefined);
                break;
        }
    };

    return {
        esEdicion,
        texto,
        setTexto,
        frecuencia,
        setFrecuencia,
        importancia,
        setImportancia,
        cargando,
        modalActivo,
        setModalActivo,
        inputRef,
        badgesActivos,
        manejarGuardar,
        manejarEliminarBadge
    };
}
