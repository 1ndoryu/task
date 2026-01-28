/*
 * useDashboard
 * Hook personalizado para la logica del dashboard
 * Responsabilidad unica: orquestar estado y acciones del dashboard
 * Refactorizado: Delega lógica a hooks especializados en ./dashboard/
 */

import {useState, useCallback, useEffect, useRef} from 'react';
import type {Habito, Tarea, Proyecto, ConfiguracionDashboard, DatosNuevoHabito, DatosEdicionTarea} from '../types/dashboard';
import {exportarDatos, importarDatos} from '../services/dataService';
import {useDeshacer} from './useDeshacer';
import {useTareas} from './useTareas';
import {useProyectos, DatosNuevoProyecto} from './useProyectos';
import type {DashboardData} from './useDashboardApi';
import {useHabitosStore} from '../stores/habitosStore'; // Necesario para importación masiva

/* Hooks segregados */
import {useDashboardData} from './dashboard/useDashboardData';
import {useDashboardSync} from './dashboard/useDashboardSync';
import {useDashboardHabitos} from './dashboard/useDashboardHabitos';

interface UseDashboardReturn {
    habitos: Habito[];
    tareas: Tarea[];
    notas: string;
    toggleTarea: (id: number) => void;
    crearTarea: (datos: DatosEdicionTarea) => void;
    editarTarea: (id: number, datos: DatosEdicionTarea) => void;
    eliminarTarea: (id: number) => void;
    actualizarNotas: (valor: string) => void;
    toggleHabito: (id: number) => void;
    posponerHabito: (id: number) => void;
    pausarHabito: (id: number) => void;
    actualizarHistorialHabito: (id: number, fecha: string, estado: 'completado' | 'pospuesto' | null) => void;
    actualizarOrdenTareasHabito: (habitoId: number, tareasIds: number[]) => void;
    crearHabito: (datos: DatosNuevoHabito) => void;
    editarHabito: (id: number, datos: DatosNuevoHabito) => void;
    eliminarHabito: (id: number) => void;
    modalCrearHabitoAbierto: boolean;
    abrirModalCrearHabito: () => void;
    cerrarModalCrearHabito: () => void;
    habitoEditando: Habito | null;
    abrirModalEditarHabito: (habito: Habito) => void;
    cerrarModalEditarHabito: () => void;
    exportarTodosDatos: () => void;
    importarTodosDatos: (archivo: File) => void;
    importando: importandoState;
    mensajeEstado: string | null;
    tipoMensaje: 'exito' | 'error' | null;
    cargandoDatos: boolean;
    accionDeshacer: {
        mensaje: string;
        tiempoRestante: number;
    } | null;
    ejecutarDeshacer: () => void;
    descartarDeshacer: () => void;
    reordenarTareas: (tareas: Tarea[]) => void;
    proyectos?: Proyecto[];
    crearProyecto: (datos: DatosNuevoProyecto) => void;
    editarProyecto: (id: number, datos: Partial<Proyecto>) => void;
    eliminarProyecto: (id: number) => void;
    cambiarEstadoProyecto: (id: number, nuevoEstado: Proyecto['estado']) => void;
    sincronizacion: {
        sincronizado: boolean;
        pendiente: boolean;
        error: string | null;
        estaLogueado: boolean;
        sincronizarAhora: () => Promise<void>;
    };
}

// Fix for importando type in interface
type importandoState = boolean;

export function useDashboard(): UseDashboardReturn {
    // 1. Gestión de Datos Locales (Tareas, Notas, Proyectos)
    const {tareas, setTareas, notas, setNotas, proyectos, setProyectos, cargandoDatosLocales} = useDashboardData();

    // 2. Sistema de Mensajes y Deshacer
    const [mensajeEstado, setMensajeEstado] = useState<string | null>(null);
    const [tipoMensaje, setTipoMensaje] = useState<'exito' | 'error' | null>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const mostrarMensaje = useCallback((mensaje: string, tipo: 'exito' | 'error') => {
        setMensajeEstado(mensaje);
        setTipoMensaje(tipo);

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            setMensajeEstado(null);
            setTipoMensaje(null);
        }, 4000);
    }, []);

    const {accionActual, registrarAccion, deshacer: ejecutarDeshacer, descartarAccion: descartarDeshacer, tiempoRestante} = useDeshacer();

    // Limpieza de timeout
    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    // 3. Gestión de Hábitos
    const {habitos, cargandoHabitos, toggleHabito, posponerHabito, pausarHabito, actualizarHistorialHabito, actualizarOrdenTareasHabito, crearHabito, editarHabito, eliminarHabito, modalCrearHabitoAbierto, abrirModalCrearHabito, cerrarModalCrearHabito, habitoEditando, abrirModalEditarHabito, cerrarModalEditarHabito} = useDashboardHabitos({registrarAccion, mostrarMensaje});

    const cargandoDatos = cargandoHabitos || cargandoDatosLocales;

    // 4. Sincronización
    const {sincronizacion} = useDashboardSync({
        habitos,
        tareas,
        proyectos,
        notas,
        setTareas,
        setProyectos,
        setNotas,
        cargandoDatos
    });

    // 5. Hooks delegados para Proyectos y Tareas
    const {crearProyecto, editarProyecto, eliminarProyecto, cambiarEstadoProyecto} = useProyectos({
        proyectos,
        setProyectos,
        registrarAccion,
        mostrarMensaje
    });

    const {toggleTarea, crearTarea, editarTarea, eliminarTarea, reordenarTareas} = useTareas({
        tareas,
        setTareas,
        registrarAccion,
        mostrarMensaje
    });

    // 6. Utilidades Varias (Notas, Import/Export)
    const actualizarNotas = useCallback(
        (valor: string) => {
            setNotas(valor);
        },
        [setNotas]
    );

    const exportarTodosDatos = useCallback(() => {
        try {
            exportarDatos(habitos, tareas, notas, proyectos);
            mostrarMensaje('Datos exportados correctamente', 'exito');
        } catch (error) {
            mostrarMensaje('Error al exportar datos', 'error');
        }
    }, [habitos, tareas, notas, proyectos, mostrarMensaje]);

    const [importando, setImportando] = useState(false);
    const storeSetHabitos = useHabitosStore(state => state.setHabitos);

    const importarTodosDatos = useCallback(
        async (archivo: File) => {
            setImportando(true);
            try {
                const datos = await importarDatos(archivo);
                storeSetHabitos(datos.habitos);
                setTareas(datos.tareas);
                if (datos.proyectos) setProyectos(datos.proyectos);
                setNotas(datos.notas || '');
                mostrarMensaje(`Datos restaurados (${datos.habitos.length} habitos, ${datos.tareas.length} tareas, ${datos.proyectos?.length || 0} proyectos)`, 'exito');
            } catch (error) {
                const mensaje = error instanceof Error ? error.message : 'Error desconocido';
                mostrarMensaje(mensaje, 'error');
            } finally {
                setImportando(false);
            }
        },
        [mostrarMensaje, storeSetHabitos, setTareas, setProyectos, setNotas]
    );

    return {
        habitos,
        tareas,
        proyectos,
        notas,
        toggleTarea,
        crearTarea,
        editarTarea,
        eliminarTarea,
        crearProyecto,
        editarProyecto,
        eliminarProyecto,
        cambiarEstadoProyecto,
        actualizarNotas,
        toggleHabito,
        posponerHabito,
        pausarHabito,
        actualizarHistorialHabito,
        actualizarOrdenTareasHabito,
        crearHabito,
        editarHabito,
        eliminarHabito,
        modalCrearHabitoAbierto,
        abrirModalCrearHabito,
        cerrarModalCrearHabito,
        habitoEditando,
        abrirModalEditarHabito,
        cerrarModalEditarHabito,
        exportarTodosDatos,
        importarTodosDatos,
        importando,
        mensajeEstado,
        tipoMensaje,
        cargandoDatos,
        accionDeshacer: accionActual
            ? {
                  mensaje: accionActual.mensaje,
                  tiempoRestante
              }
            : null,
        ejecutarDeshacer,
        descartarDeshacer,
        reordenarTareas,
        sincronizacion
    };
}
