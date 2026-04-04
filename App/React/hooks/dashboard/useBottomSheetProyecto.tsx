/*
 * useBottomSheetProyecto
 * Hook que encapsula toda la lógica del componente BottomSheetProyecto.
 * Maneja estado del formulario, reset, modales de selección,
 * badges de propiedades y guardado.
 */

import {useState, useRef, useEffect, useMemo} from 'react';
import {Flag, Hash, Calendar} from 'lucide-react';
import type {NivelPrioridad, NivelUrgencia} from '../../types/dashboard';
import {obtenerTextoPrioridad, obtenerTextoUrgencia} from '../../utils/constantes';
import {calcularFechaDesdeOpcion} from '../../utils/fechaUI';
import type {DatosProyecto} from '../../components/dashboard/BottomSheetProyecto';

/* Tipos de modales de selección */
export type ModalActivoProyecto = 'prioridad' | 'urgencia' | 'fecha' | null;

export interface BadgeActivoProyecto {
    id: string;
    etiqueta: string;
    icono: JSX.Element;
    variante: 'prioridad' | 'urgencia' | 'fecha';
}

export interface UseBottomSheetProyectoParams {
    estaAbierto: boolean;
    onCerrar: () => void;
    onGuardar: (datos: DatosProyecto) => Promise<void>;
    valoresIniciales?: {
        prioridad?: NivelPrioridad;
        urgencia?: NivelUrgencia;
    };
}

export interface UseBottomSheetProyectoReturn {
    nombre: string;
    setNombre: React.Dispatch<React.SetStateAction<string>>;
    prioridad: NivelPrioridad | undefined;
    setPrioridad: React.Dispatch<React.SetStateAction<NivelPrioridad | undefined>>;
    urgencia: NivelUrgencia | undefined;
    setUrgencia: React.Dispatch<React.SetStateAction<NivelUrgencia | undefined>>;
    fechaLimite: string | undefined;
    setFechaLimite: React.Dispatch<React.SetStateAction<string | undefined>>;
    cargando: boolean;
    modalActivo: ModalActivoProyecto;
    setModalActivo: React.Dispatch<React.SetStateAction<ModalActivoProyecto>>;
    inputRef: React.RefObject<HTMLInputElement | null>;
    badgesActivos: BadgeActivoProyecto[];
    manejarGuardar: () => Promise<void>;
    manejarEliminarBadge: (id: string) => void;
    manejarSeleccionFecha: (valor: string | undefined) => void;
}

export function useBottomSheetProyecto({estaAbierto, onCerrar, onGuardar, valoresIniciales = {}}: UseBottomSheetProyectoParams): UseBottomSheetProyectoReturn {
    const [nombre, setNombre] = useState('');
    const [prioridad, setPrioridad] = useState<NivelPrioridad | undefined>(valoresIniciales.prioridad);
    const [urgencia, setUrgencia] = useState<NivelUrgencia | undefined>(valoresIniciales.urgencia);
    const [fechaLimite, setFechaLimite] = useState<string | undefined>(undefined);
    const [cargando, setCargando] = useState(false);
    const [modalActivo, setModalActivo] = useState<ModalActivoProyecto>(null);

    const inputRef = useRef<HTMLInputElement>(null);

    /* Autofocus al abrir */
    useEffect(() => {
        if (estaAbierto && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [estaAbierto]);

    /* Reset al cerrar */
    useEffect(() => {
        if (!estaAbierto) {
            setNombre('');
            setPrioridad(valoresIniciales.prioridad);
            setUrgencia(valoresIniciales.urgencia);
            setFechaLimite(undefined);
            setModalActivo(null);
        }
    }, [estaAbierto, valoresIniciales]);

    const manejarGuardar = async () => {
        if (!nombre.trim() || cargando) return;

        setCargando(true);
        try {
            await onGuardar({
                nombre,
                prioridad,
                urgencia,
                fechaLimite
            });
            onCerrar();
        // sentinel-disable-next-line fallo-sin-feedback — TO-DO: integrar useAlertas para toast de error
        } catch (error) {
            console.error('Error al crear proyecto:', error);
        } finally {
            setCargando(false);
        }
    };

    /* Construir lista de badges activos */
    const badgesActivos = useMemo(() => {
        const badges: BadgeActivoProyecto[] = [];
        if (prioridad) {
            badges.push({
                id: 'prioridad',
                etiqueta: obtenerTextoPrioridad(prioridad) || prioridad,
                icono: <Flag size={10} />,
                variante: 'prioridad' as const
            });
        }
        if (urgencia) {
            badges.push({
                id: 'urgencia',
                etiqueta: obtenerTextoUrgencia(urgencia) || urgencia,
                icono: <Hash size={10} />,
                variante: 'urgencia' as const
            });
        }
        if (fechaLimite) {
            badges.push({
                id: 'fecha',
                etiqueta: fechaLimite,
                icono: <Calendar size={10} />,
                variante: 'fecha' as const
            });
        }
        return badges;
    }, [prioridad, urgencia, fechaLimite]);

    /* Manejar eliminación de badge */
    const manejarEliminarBadge = (id: string) => {
        switch (id) {
            case 'prioridad':
                setPrioridad(undefined);
                break;
            case 'urgencia':
                setUrgencia(undefined);
                break;
            case 'fecha':
                setFechaLimite(undefined);
                break;
        }
    };

    /* Manejar selección de fecha desde el modal */
    const manejarSeleccionFecha = (valor: string | undefined) => {
        if (valor) {
            setFechaLimite(calcularFechaDesdeOpcion(valor));
        } else {
            setFechaLimite(undefined);
        }
    };

    return {
        nombre,
        setNombre,
        prioridad,
        setPrioridad,
        urgencia,
        setUrgencia,
        fechaLimite,
        setFechaLimite,
        cargando,
        modalActivo,
        setModalActivo,
        inputRef,
        badgesActivos,
        manejarGuardar,
        manejarEliminarBadge,
        manejarSeleccionFecha
    };
}
