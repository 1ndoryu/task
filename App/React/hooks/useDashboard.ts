/*
 * useDashboard
 * Hook personalizado para la logica del dashboard
 * Responsabilidad unica: orquestar estado y acciones del dashboard
 * Delega lógica de tareas a useTareas
 * Delega lógica de hábitos al store de Zustand
 * Incluye persistencia automatica en localStorage
 */

import {useState, useCallback, useEffect, useRef, useMemo} from 'react';
import type {Habito, Tarea, Proyecto, ConfiguracionDashboard, DatosNuevoHabito, DatosEdicionTarea} from '../types/dashboard';
import {exportarDatos, importarDatos} from '../services/dataService';
import {useLocalStorage, CLAVES_LOCALSTORAGE} from './useLocalStorage';
import {useDeshacer} from './useDeshacer';
import {useTareas} from './useTareas';
import {useProyectos, DatosNuevoProyecto} from './useProyectos';
import {useSincronizacion} from './useSincronizacion';
import type {DashboardData} from './useDashboardApi';

/* Store de Zustand para hábitos (fuente única de verdad) */
import {useHabitosStore} from '../stores/habitosStore';

/* Utilidades extraidas a modulos separados */
import {validarTareas, validarNotas, validarProyectos} from '../utils/validadores';
import {migrarYActualizarHabitos} from '../utils/migracionHabitos';
import {tareasIniciales, notasIniciales, proyectosIniciales, tareasProyectosIniciales} from '../data/datosIniciales';

/*
 * Configuracion por defecto del dashboard
 * Umbral de 7 dias para resetear racha, advertencia a 2 dias
 */
const CONFIGURACION_POR_DEFECTO: ConfiguracionDashboard = {
    umbralReseteoRacha: 7,
    diasAdvertenciaRacha: 2
};

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
    /* Actualiza el historial de un hábito (para sincronizar con columna de actividad) */
    actualizarHistorialHabito: (id: number, fecha: string, estado: 'completado' | 'pospuesto' | null) => void;
    crearHabito: (datos: DatosNuevoHabito) => void;
    editarHabito: (id: number, datos: DatosNuevoHabito) => void;
    eliminarHabito: (id: number) => void;
    modalCrearHabitoAbierto: boolean;
    abrirModalCrearHabito: () => void;
    cerrarModalCrearHabito: () => void;
    /* Modal de edicion */
    habitoEditando: Habito | null;
    abrirModalEditarHabito: (habito: Habito) => void;
    cerrarModalEditarHabito: () => void;
    exportarTodosDatos: () => void;
    importarTodosDatos: (archivo: File) => void;
    importando: boolean;
    mensajeEstado: string | null;
    tipoMensaje: 'exito' | 'error' | null;
    cargandoDatos: boolean;
    /* Sistema de deshacer */
    accionDeshacer: {
        mensaje: string;
        tiempoRestante: number;
    } | null;
    ejecutarDeshacer: () => void;
    descartarDeshacer: () => void;
    reordenarTareas: (tareas: Tarea[]) => void;
    /* Proyectos */
    proyectos?: Proyecto[];
    crearProyecto: (datos: DatosNuevoProyecto) => void;
    editarProyecto: (id: number, datos: Partial<Proyecto>) => void;
    eliminarProyecto: (id: number) => void;
    cambiarEstadoProyecto: (id: number, nuevoEstado: Proyecto['estado']) => void;
    /* Sincronización */
    sincronizacion: {
        sincronizado: boolean;
        pendiente: boolean;
        error: string | null;
        estaLogueado: boolean;
        sincronizarAhora: () => Promise<void>;
    };
}

export function useDashboard(): UseDashboardReturn {
    /*
     * Store de Zustand para hábitos (fuente única de verdad)
     * El store maneja persistencia automática via middleware persist
     */
    const habitosRaw = useHabitosStore(state => state.habitos);
    const storeSetHabitos = useHabitosStore(state => state.setHabitos);
    const storeToggleHabito = useHabitosStore(state => state.toggleHabito);
    const storePosponerHabito = useHabitosStore(state => state.posponerHabito);
    const storeCrearHabito = useHabitosStore(state => state.crearHabito);
    const storeEditarHabito = useHabitosStore(state => state.editarHabito);
    const storeEliminarHabito = useHabitosStore(state => state.eliminarHabito);
    const storeActualizarHistorial = useHabitosStore(state => state.actualizarHistorialHabito);
    const storeRestaurarHabito = useHabitosStore(state => state.restaurarHabito);
    const storeInicializado = useHabitosStore(state => state.inicializado);

    /* Flag de cargando para hábitos desde store */
    const cargandoHabitos = !storeInicializado;

    /* Configuracion del dashboard (por ahora usa valores por defecto) */
    const configuracion = CONFIGURACION_POR_DEFECTO;

    /* Habitos migrados, con dias de inactividad actualizados y rachas reseteadas si aplica */
    const habitos = migrarYActualizarHabitos(habitosRaw, configuracion);

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

    /*
     * Hook de proyectos - delega logica CRUD a useProyectos
     */
    const {
        valor: proyectos,
        setValor: setProyectos,
        cargando: cargandoProyectos
    } = useLocalStorage<Proyecto[]>(CLAVES_LOCALSTORAGE.proyectos, {
        valorPorDefecto: proyectosIniciales,
        validarValor: validarProyectos
    });

    const cargandoDatos = cargandoHabitos || cargandoTareas || cargandoNotas || cargandoProyectos;

    /*
     * Sincronización con servidor WordPress
     * Solo activa si el usuario está logueado
     */
    const datosParaSync = useMemo(
        () => ({
            habitos,
            tareas,
            proyectos,
            notas
        }),
        [habitos, tareas, proyectos, notas]
    );

    const handleDatosServidor = useCallback(
        (datos: DashboardData) => {
            /*
             * Al recibir datos del servidor, REEMPLAZAR completamente los datos locales.
             * Esto es importante porque al iniciar sesión en otro dispositivo,
             * los datos del servidor son la fuente de verdad.
             * NO verificamos si hay datos - el servidor puede tener arrays vacíos
             * que son datos válidos (el usuario borró todo).
             */
            if (datos.habitos !== undefined) storeSetHabitos(datos.habitos);
            if (datos.tareas !== undefined) setTareas(datos.tareas);
            if (datos.proyectos !== undefined) setProyectos(datos.proyectos);
            if (datos.notas !== undefined) setNotas(datos.notas);
        },
        [storeSetHabitos, setTareas, setProyectos, setNotas]
    );

    const {estado: estadoSync, sincronizarAhora, marcarCambiosPendientes, estaLogueado, cargandoDesdeServidor} = useSincronizacion(datosParaSync, handleDatosServidor);

    /* Marcar cambios pendientes cuando los datos cambian */
    const datosVersion = useRef({habitos: '', tareas: '', proyectos: '', notas: ''});

    useEffect(() => {
        /*
         * Crear un hash simple del contenido para detectar cambios reales.
         * No solo contamos el length porque cambios en el contenido (parentId, texto, etc.)
         * no cambiarían el length pero sí necesitan sincronizarse.
         */
        const hashSimple = (arr: unknown[]): string => {
            if (arr.length === 0) return '0';
            /* Usamos JSON.stringify para capturar cambios en cualquier campo */
            return `${arr.length}_${JSON.stringify(arr).length}`;
        };

        const nuevaVersion = {
            habitos: hashSimple(habitos),
            tareas: hashSimple(tareas),
            proyectos: hashSimple(proyectos),
            notas: notas.slice(0, 100)
        };

        /*
         * Solo sincronizar si hubo cambios reales después de la carga inicial.
         * IMPORTANTE: No marcar cambios pendientes mientras estamos cargando datos del servidor,
         * ya que esos datos ya están sincronizados y no necesitan subirse de nuevo.
         * Esto evita el parpadeo rojo->verde del badge de sincronización.
         */
        if (!cargandoDatos && !cargandoDesdeServidor && JSON.stringify(nuevaVersion) !== JSON.stringify(datosVersion.current)) {
            datosVersion.current = nuevaVersion;
            marcarCambiosPendientes();
        }
    }, [habitos, tareas, proyectos, notas, cargandoDatos, cargandoDesdeServidor, marcarCambiosPendientes]);

    const [importando, setImportando] = useState(false);
    const [mensajeEstado, setMensajeEstado] = useState<string | null>(null);
    const [tipoMensaje, setTipoMensaje] = useState<'exito' | 'error' | null>(null);
    const [modalCrearHabitoAbierto, setModalCrearHabitoAbierto] = useState(false);
    const [habitoEditando, setHabitoEditando] = useState<Habito | null>(null);

    /* Sistema de deshacer */
    const {accionActual, registrarAccion, deshacer: ejecutarDeshacer, descartarAccion: descartarDeshacer, tiempoRestante} = useDeshacer();

    /*
     * Ref para el timeout de mensajes
     * Permite limpiar correctamente al desmontar
     */
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

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

    /*
     * Hook de proyectos - delega logica CRUD a useProyectos
     */
    const {crearProyecto, editarProyecto, eliminarProyecto, cambiarEstadoProyecto} = useProyectos({
        proyectos,
        setProyectos,
        registrarAccion,
        mostrarMensaje
    });

    /*
     * Hook de tareas - delega toda la lógica CRUD a useTareas
     */
    const {toggleTarea, crearTarea, editarTarea, eliminarTarea, reordenarTareas} = useTareas({
        tareas,
        setTareas,
        registrarAccion,
        mostrarMensaje
    });

    const actualizarNotas = useCallback(
        (valor: string) => {
            setNotas(valor);
        },
        [setNotas]
    );

    /*
     * Control del modal de crear hábito
     */
    const abrirModalCrearHabito = useCallback(() => {
        setModalCrearHabitoAbierto(true);
    }, []);

    const cerrarModalCrearHabito = useCallback(() => {
        setModalCrearHabitoAbierto(false);
    }, []);

    /*
     * Control del modal de editar habito
     */
    const abrirModalEditarHabito = useCallback((habito: Habito) => {
        setHabitoEditando(habito);
    }, []);

    const cerrarModalEditarHabito = useCallback(() => {
        setHabitoEditando(null);
    }, []);

    /*
     * Crea un nuevo habito usando el store de Zustand
     */
    const crearHabito = useCallback(
        (datos: DatosNuevoHabito) => {
            storeCrearHabito(datos);
            setModalCrearHabitoAbierto(false);
            mostrarMensaje(`Habito "${datos.nombre}" creado`, 'exito');
        },
        [storeCrearHabito, mostrarMensaje]
    );

    /*
     * Edita un habito existente usando el store de Zustand
     */
    const editarHabito = useCallback(
        (id: number, datos: DatosNuevoHabito) => {
            const habitoAnterior = habitos.find(h => h.id === id);
            if (!habitoAnterior) return;

            storeEditarHabito(id, datos);
            setHabitoEditando(null);
            mostrarMensaje(`Habito "${datos.nombre}" actualizado`, 'exito');

            registrarAccion(`"${datos.nombre}" editado`, () => {
                storeRestaurarHabito(habitoAnterior);
            });
        },
        [habitos, storeEditarHabito, storeRestaurarHabito, mostrarMensaje, registrarAccion]
    );

    /*
     * Elimina un habito usando el store de Zustand
     */
    const eliminarHabito = useCallback(
        (id: number) => {
            const habitoEliminado = storeEliminarHabito(id);
            if (!habitoEliminado) return;

            setHabitoEditando(null);
            mostrarMensaje(`Habito "${habitoEliminado.nombre}" eliminado`, 'exito');

            registrarAccion(`"${habitoEliminado.nombre}" eliminado`, () => {
                storeRestaurarHabito(habitoEliminado);
            });
        },
        [storeEliminarHabito, storeRestaurarHabito, mostrarMensaje, registrarAccion]
    );

    /*
     * Toggle de habito usando el store de Zustand
     */
    const toggleHabito = useCallback(
        (id: number) => {
            const resultado = storeToggleHabito(id);
            if (!resultado) return;

            const {accion, estadoAnterior} = resultado;
            const mensaje = accion === 'completado' ? `"${estadoAnterior.nombre}" completado` : `"${estadoAnterior.nombre}" desmarcado`;

            registrarAccion(mensaje, () => {
                storeRestaurarHabito(estadoAnterior);
            });
        },
        [storeToggleHabito, storeRestaurarHabito, registrarAccion]
    );

    /*
     * Posponer hábito usando el store de Zustand
     */
    const posponerHabito = useCallback(
        (id: number) => {
            const resultado = storePosponerHabito(id);
            if (!resultado) return;

            const {accion, estadoAnterior} = resultado;

            if (accion === 'pospuesto') {
                mostrarMensaje(`"${estadoAnterior.nombre}" pospuesto para hoy`, 'exito');
            }

            const mensaje = accion === 'pospuesto' ? `"${estadoAnterior.nombre}" pospuesto` : `"${estadoAnterior.nombre}" ya no está pospuesto`;

            registrarAccion(mensaje, () => {
                storeRestaurarHabito(estadoAnterior);
            });
        },
        [storePosponerHabito, storeRestaurarHabito, registrarAccion, mostrarMensaje]
    );

    /*
     * Actualizar historial de hábito usando el store de Zustand
     */
    const actualizarHistorialHabito = useCallback(
        (id: number, fecha: string, estado: 'completado' | 'pospuesto' | null) => {
            storeActualizarHistorial(id, fecha, estado);
        },
        [storeActualizarHistorial]
    );

    const exportarTodosDatos = useCallback(() => {
        try {
            exportarDatos(habitos, tareas, notas, proyectos);
            mostrarMensaje('Datos exportados correctamente', 'exito');
        } catch (error) {
            mostrarMensaje('Error al exportar datos', 'error');
        }
    }, [habitos, tareas, notas, proyectos, mostrarMensaje]);

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
        actualizarHistorialHabito,
        crearHabito,
        editarHabito,
        eliminarHabito,
        modalCrearHabitoAbierto,
        abrirModalCrearHabito,
        cerrarModalCrearHabito,
        /* Modal de edicion */
        habitoEditando,
        abrirModalEditarHabito,
        cerrarModalEditarHabito,
        exportarTodosDatos,
        importarTodosDatos,
        importando,
        mensajeEstado,
        tipoMensaje,
        cargandoDatos,
        /* Sistema de deshacer */
        accionDeshacer: accionActual
            ? {
                  mensaje: accionActual.mensaje,
                  tiempoRestante
              }
            : null,
        ejecutarDeshacer,
        descartarDeshacer,
        reordenarTareas,
        /* Sincronización */
        sincronizacion: {
            sincronizado: estadoSync.sincronizado,
            pendiente: estadoSync.pendiente,
            error: estadoSync.error,
            estaLogueado,
            sincronizarAhora
        }
    };
}
