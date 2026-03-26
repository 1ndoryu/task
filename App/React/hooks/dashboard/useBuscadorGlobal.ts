/*
 * useBuscadorGlobal
 * Hook que encapsula toda la lógica del componente BuscadorGlobal.
 * Maneja búsqueda local (tareas, hábitos, proyectos), búsqueda async de notas,
 * click fuera para cerrar y selección de resultados.
 */

import {useState, useEffect, useRef, useMemo} from 'react';
import {useNotasStore, PANEL_SCRATCHPAD} from '../../stores/notasStore';
import type {Tarea, Habito, Proyecto} from '../../types/dashboard';
import type {Nota} from '../../types/notas';

type ResultadoBusqueda = {
    tipo: 'tarea' | 'habito' | 'proyecto' | 'nota';
    id: number;
    titulo: string;
    original: Tarea | Habito | Proyecto | Nota;
};

export interface UseBuscadorGlobalParams {
    tareas: Tarea[];
    habitos: Habito[];
    proyectos: Proyecto[];
    onSeleccionarTarea: (tarea: Tarea) => void;
    onSeleccionarHabito: (habito: Habito) => void;
    onSeleccionarProyecto: (proyecto: Proyecto) => void;
}

export interface UseBuscadorGlobalReturn {
    busqueda: string;
    setBusqueda: React.Dispatch<React.SetStateAction<string>>;
    mostrarResultados: boolean;
    setMostrarResultados: React.Dispatch<React.SetStateAction<boolean>>;
    contenedorRef: React.RefObject<HTMLDivElement | null>;
    resultados: ResultadoBusqueda[];
    manejarSeleccion: (resultado: ResultadoBusqueda) => void;
}

export type {ResultadoBusqueda};

export function useBuscadorGlobal({tareas, habitos, proyectos, onSeleccionarTarea, onSeleccionarHabito, onSeleccionarProyecto}: UseBuscadorGlobalParams): UseBuscadorGlobalReturn {
    const [busqueda, setBusqueda] = useState('');
    const [resultadosNotas, _setResultadosNotas] = useState<ResultadoBusqueda[]>([]);
    const [mostrarResultados, setMostrarResultados] = useState(false);

    const contenedorRef = useRef<HTMLDivElement>(null);

    /* 1. Filtrado de datos locales (Tareas, Habitos, Proyectos) - SIN EFFECT */
    const resultadosLocales = useMemo(() => {
        if (!busqueda.trim()) return [];

        const termino = busqueda.toLowerCase();
        const nuevosResultados: ResultadoBusqueda[] = [];

        tareas.forEach(tarea => {
            if (tarea.texto.toLowerCase().includes(termino)) {
                nuevosResultados.push({
                    tipo: 'tarea',
                    id: tarea.id,
                    titulo: tarea.texto,
                    original: tarea
                });
            }
        });

        habitos.forEach(habito => {
            if (habito.nombre.toLowerCase().includes(termino)) {
                nuevosResultados.push({
                    tipo: 'habito',
                    id: habito.id,
                    titulo: habito.nombre,
                    original: habito
                });
            }
        });

        proyectos.forEach(proyecto => {
            if (proyecto.nombre.toLowerCase().includes(termino)) {
                nuevosResultados.push({
                    tipo: 'proyecto',
                    id: proyecto.id,
                    titulo: proyecto.nombre,
                    original: proyecto
                });
            }
        });

        return nuevosResultados;
    }, [busqueda, tareas, habitos, proyectos]);

    /* 3. Combinar resultados finales */
    const resultados = useMemo(() => {
        return [...resultadosLocales, ...resultadosNotas].slice(0, 10);
    }, [resultadosLocales, resultadosNotas]);

    /* Manejo de clicks fuera */
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (contenedorRef.current && !contenedorRef.current.contains(event.target as Node)) {
                setMostrarResultados(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const manejarSeleccion = (resultado: ResultadoBusqueda) => {
        if (resultado.tipo === 'tarea') {
            onSeleccionarTarea(resultado.original as Tarea);
        } else if (resultado.tipo === 'habito') {
            onSeleccionarHabito(resultado.original as Habito);
        } else if (resultado.tipo === 'proyecto') {
            onSeleccionarProyecto(resultado.original as Proyecto);
        } else if (resultado.tipo === 'nota') {
            useNotasStore.getState().seleccionarNota(PANEL_SCRATCHPAD, resultado.original as Nota);
        }
        setBusqueda('');
        setMostrarResultados(false);
    };

    return {
        busqueda,
        setBusqueda,
        mostrarResultados,
        setMostrarResultados,
        contenedorRef,
        resultados,
        manejarSeleccion
    };
}
