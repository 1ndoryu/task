import {useLocalStorage, CLAVES_LOCALSTORAGE} from '../useLocalStorage';
import {validarTareas, validarNotas, validarProyectos} from '../../utils/validadores';
import {tareasIniciales, notasIniciales, proyectosIniciales, tareasProyectosIniciales} from '../../data/datosIniciales';
import type {Tarea, Proyecto} from '../../types/dashboard';

interface DashboardDataReturn {
    tareas: Tarea[];
    setTareas: (valor: Tarea[] | ((prev: Tarea[]) => Tarea[])) => void;
    cargandoTareas: boolean;
    notas: string;
    setNotas: (valor: string | ((prev: string) => string)) => void;
    cargandoNotas: boolean;
    proyectos: Proyecto[];
    setProyectos: (valor: Proyecto[] | ((prev: Proyecto[]) => Proyecto[])) => void;
    cargandoProyectos: boolean;
    cargandoDatosLocales: boolean;
}

export function useDashboardData(): DashboardDataReturn {
    const {
        valor: tareas,
        setValor: setTareas,
        cargando: cargandoTareas
    } = useLocalStorage<Tarea[]>(CLAVES_LOCALSTORAGE.tareas, {
        valorPorDefecto: [...tareasIniciales, ...tareasProyectosIniciales],
        validarValor: validarTareas
    });

    const {
        valor: notas,
        setValor: setNotas,
        cargando: cargandoNotas
    } = useLocalStorage<string>(CLAVES_LOCALSTORAGE.notas, {
        valorPorDefecto: notasIniciales,
        validarValor: validarNotas
    });

    const {
        valor: proyectos,
        setValor: setProyectos,
        cargando: cargandoProyectos
    } = useLocalStorage<Proyecto[]>(CLAVES_LOCALSTORAGE.proyectos, {
        valorPorDefecto: proyectosIniciales,
        validarValor: validarProyectos
    });

    const cargandoDatosLocales = cargandoTareas || cargandoNotas || cargandoProyectos;

    return {
        tareas,
        setTareas,
        cargandoTareas,
        notas,
        setNotas,
        cargandoNotas,
        proyectos,
        setProyectos,
        cargandoProyectos,
        cargandoDatosLocales
    };
}
