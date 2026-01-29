import {useState, useCallback} from 'react';
import {useHabitosStore} from '../../stores/habitosStore';
import {migrarYActualizarHabitos} from '../../utils/migracionHabitos';
import type {Habito, ConfiguracionDashboard, DatosNuevoHabito} from '../../types/dashboard';

const CONFIGURACION_POR_DEFECTO: ConfiguracionDashboard = {
    umbralReseteoRacha: 7,
    diasAdvertenciaRacha: 2
};

interface UseDashboardHabitosProps {
    registrarAccion: (mensaje: string, accionDeshacer: () => void) => void;
    mostrarMensaje: (mensaje: string, tipo: 'exito' | 'error') => void;
}

export function useDashboardHabitos({registrarAccion, mostrarMensaje}: UseDashboardHabitosProps) {
    const habitosRaw = useHabitosStore(state => state.habitos);
    const storeToggleHabito = useHabitosStore(state => state.toggleHabito);
    const storePosponerHabito = useHabitosStore(state => state.posponerHabito);
    const storePausarHabito = useHabitosStore(state => state.pausarHabito);
    const storeCrearHabito = useHabitosStore(state => state.crearHabito);
    const storeEditarHabito = useHabitosStore(state => state.editarHabito);
    const storeEliminarHabito = useHabitosStore(state => state.eliminarHabito);
    const storeActualizarHistorial = useHabitosStore(state => state.actualizarHistorialHabito);
    const storeActualizarOrdenTareasHabito = useHabitosStore(state => state.actualizarOrdenTareasHabito);
    const storeRestaurarHabito = useHabitosStore(state => state.restaurarHabito);
    const storeInicializado = useHabitosStore(state => state.inicializado);

    /* Flag de cargando para hábitos desde store */
    const cargandoHabitos = !storeInicializado;

    /* Habitos migrados, con dias de inactividad actualizados y rachas reseteadas si aplica */
    const habitos = migrarYActualizarHabitos(habitosRaw, CONFIGURACION_POR_DEFECTO);

    const [modalCrearHabitoAbierto, setModalCrearHabitoAbierto] = useState(false);
    const [habitoEditando, setHabitoEditando] = useState<Habito | null>(null);

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
     * Solo guarda y registra acción si hubo cambios reales
     */
    const editarHabito = useCallback(
        (id: number, datos: DatosNuevoHabito) => {
            const habitoAnterior = habitos.find(h => h.id === id);
            if (!habitoAnterior) return;

            /* Verificar si hubo cambios reales comparando campos relevantes */
            /* Normalizamos valores para evitar falsos positivos (undefined vs '') */
            const descripcionAnterior = habitoAnterior.descripcion || '';
            const descripcionNueva = datos.descripcion || '';
            const iconoAnterior = habitoAnterior.icono || 'check-circle';
            const iconoNuevo = datos.icono || 'check-circle';
            const colorAnterior = habitoAnterior.colorIcono || '#888888';
            const colorNuevo = datos.colorIcono || '#888888';

            /* Normalizamos frecuencia (puede ser undefined en hábitos antiguos) */
            const frecuenciaAnterior = habitoAnterior.frecuencia || {tipo: 'diario'};
            const frecuenciaNueva = datos.frecuencia || {tipo: 'diario'};

            const huboCambios = habitoAnterior.nombre !== datos.nombre || habitoAnterior.importancia !== datos.importancia || descripcionAnterior !== descripcionNueva || iconoAnterior !== iconoNuevo || colorAnterior !== colorNuevo || JSON.stringify(frecuenciaAnterior) !== JSON.stringify(frecuenciaNueva);

            /* Si no hubo cambios, solo cerrar el modal sin guardar ni registrar acción */
            if (!huboCambios) {
                setHabitoEditando(null);
                return;
            }

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
     * Pausar/Reanudar hábito usando el store de Zustand
     */
    const pausarHabito = useCallback(
        (id: number) => {
            const resultado = storePausarHabito(id);
            if (!resultado) return;

            const {accion, estadoAnterior} = resultado;

            if (accion === 'pausado') {
                mostrarMensaje(`"${estadoAnterior.nombre}" pausado`, 'exito');
            } else {
                mostrarMensaje(`"${estadoAnterior.nombre}" reanudado`, 'exito');
            }

            const mensaje = accion === 'pausado' ? `"${estadoAnterior.nombre}" pausado` : `"${estadoAnterior.nombre}" reanudado`;

            registrarAccion(mensaje, () => {
                storeRestaurarHabito(estadoAnterior);
            });
        },
        [storePausarHabito, storeRestaurarHabito, registrarAccion, mostrarMensaje]
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

    /*
     * Actualizar orden de tareas del hábito - Fase 14.8
     * Delega al store de Zustand
     */
    const actualizarOrdenTareasHabito = useCallback(
        (habitoId: number, tareasIds: number[]) => {
            storeActualizarOrdenTareasHabito(habitoId, tareasIds);
        },
        [storeActualizarOrdenTareasHabito]
    );

    return {
        habitos,
        cargandoHabitos,
        /* Acciones */
        toggleHabito,
        posponerHabito,
        pausarHabito,
        actualizarHistorialHabito,
        actualizarOrdenTareasHabito,
        crearHabito,
        editarHabito,
        eliminarHabito,
        /* Estado de Modales */
        modalCrearHabitoAbierto,
        abrirModalCrearHabito,
        cerrarModalCrearHabito,
        abrirModalEditarHabito,
        cerrarModalEditarHabito,
        /* Utilidades de sistema */
        setHabitos: useHabitosStore.getState().setHabitos
    };
}
