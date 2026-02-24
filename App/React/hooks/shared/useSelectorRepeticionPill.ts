/*
 * useSelectorRepeticionPill
 * Lógica extraída de SelectorRepeticionPill para cumplir SRP
 * Gestiona panel expandible de selección de repetición para tareas
 */

import {useState, useRef, useEffect} from 'react';
import type {FrecuenciaHabito, TipoFrecuencia, DiaSemana} from '../../types/dashboard';

const DIAS_SEMANA: {dia: DiaSemana; corto: string}[] = [
    {dia: 'lunes', corto: 'L'},
    {dia: 'martes', corto: 'M'},
    {dia: 'miercoles', corto: 'X'},
    {dia: 'jueves', corto: 'J'},
    {dia: 'viernes', corto: 'V'},
    {dia: 'sabado', corto: 'S'},
    {dia: 'domingo', corto: 'D'}
];

interface UseSelectorRepeticionPillParams {
    tieneRepeticion: boolean;
    onTieneRepeticionChange: (valor: boolean) => void;
    frecuencia: FrecuenciaHabito;
    onFrecuenciaChange: (frecuencia: FrecuenciaHabito) => void;
    deshabilitado: boolean;
}

interface UseSelectorRepeticionPillReturn {
    panelAbierto: boolean;
    posicionPanel: {x: number; y: number};
    botonRef: React.RefObject<HTMLButtonElement>;
    panelRef: React.RefObject<HTMLDivElement>;
    descripcion: string;
    activarRepeticion: () => void;
    cerrarPanel: () => void;
    desactivarRepeticion: (e: React.MouseEvent) => void;
    manejarCambioTipo: (nuevoTipo: TipoFrecuencia) => void;
    manejarCambioDias: (nuevoDias: number) => void;
    manejarCambioVecesMes: (nuevasVeces: number) => void;
}

export function useSelectorRepeticionPill({tieneRepeticion, onTieneRepeticionChange, frecuencia, onFrecuenciaChange, deshabilitado}: UseSelectorRepeticionPillParams): UseSelectorRepeticionPillReturn {
    const [panelAbierto, setPanelAbierto] = useState(false);
    const [posicionPanel, setPosicionPanel] = useState({x: 0, y: 0});
    const botonRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    /* Obtener descripción corta de la frecuencia */
    const obtenerDescripcion = (): string => {
        if (!tieneRepeticion) return 'Repetir';
        switch (frecuencia.tipo) {
            case 'diario':
                return 'Diario';
            case 'cadaXDias':
                return `Cada ${frecuencia.cadaDias || 2}d`;
            case 'semanal':
                return 'Semanal';
            case 'diasEspecificos': {
                const dias = frecuencia.diasSemana || [];
                if (dias.length === 0) return 'Sin días';
                if (dias.length === 7) return 'Diario';
                return dias.map(d => DIAS_SEMANA.find(ds => ds.dia === d)?.corto || d).join('');
            }
            case 'mensual':
                return `${frecuencia.vecesAlMes || 4}x/mes`;
            default:
                return 'Repetir';
        }
    };

    const abrirPanel = () => {
        if (deshabilitado) return;
        if (botonRef.current) {
            const rect = botonRef.current.getBoundingClientRect();
            setPosicionPanel({x: rect.left, y: rect.bottom + 4});
        }
        setPanelAbierto(true);
    };

    const cerrarPanel = () => setPanelAbierto(false);

    /* Cerrar al hacer click fuera */
    useEffect(() => {
        if (!panelAbierto) return;

        const manejarClickFuera = (evento: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(evento.target as Node) && botonRef.current && !botonRef.current.contains(evento.target as Node)) {
                cerrarPanel();
            }
        };

        const manejarEscape = (evento: KeyboardEvent) => {
            if (evento.key === 'Escape') cerrarPanel();
        };

        document.addEventListener('mousedown', manejarClickFuera);
        document.addEventListener('keydown', manejarEscape);

        return () => {
            document.removeEventListener('mousedown', manejarClickFuera);
            document.removeEventListener('keydown', manejarEscape);
        };
    }, [panelAbierto]);

    const manejarCambioTipo = (nuevoTipo: TipoFrecuencia) => {
        const nuevaFrecuencia: FrecuenciaHabito = {tipo: nuevoTipo};

        if (nuevoTipo === 'cadaXDias') {
            nuevaFrecuencia.cadaDias = 2;
        } else if (nuevoTipo === 'diasEspecificos') {
            nuevaFrecuencia.diasSemana = ['lunes', 'miercoles', 'viernes'];
        } else if (nuevoTipo === 'mensual') {
            nuevaFrecuencia.vecesAlMes = 4;
        }

        onFrecuenciaChange(nuevaFrecuencia);
    };

    const manejarCambioDias = (nuevoDias: number) => {
        onFrecuenciaChange({...frecuencia, cadaDias: Math.max(2, Math.min(30, nuevoDias))});
    };

    const manejarCambioVecesMes = (nuevasVeces: number) => {
        onFrecuenciaChange({...frecuencia, vecesAlMes: Math.max(1, Math.min(30, nuevasVeces))});
    };

    const activarRepeticion = () => {
        if (!tieneRepeticion) {
            onTieneRepeticionChange(true);
            onFrecuenciaChange({tipo: 'diario'});
        }
        abrirPanel();
    };

    const desactivarRepeticion = (e: React.MouseEvent) => {
        e.stopPropagation();
        onTieneRepeticionChange(false);
        cerrarPanel();
    };

    return {
        panelAbierto,
        posicionPanel,
        botonRef,
        panelRef,
        descripcion: obtenerDescripcion(),
        activarRepeticion,
        cerrarPanel,
        desactivarRepeticion,
        manejarCambioTipo,
        manejarCambioDias,
        manejarCambioVecesMes
    };
}
