import {useLocalStorage} from './useLocalStorage';

export interface ConfiguracionTareas {
    ocultarCompletadas: boolean;
    ocultarBadgeProyecto: boolean;
    eliminarCompletadasDespuesDeUnDia: boolean;
    /* Mostrar hábitos que "tocan hoy" como tareas en Ejecución */
    mostrarHabitosEnEjecucion: boolean;
    modoCompacto: boolean;
    /* Ocultar subtareas automáticamente (colapsadas por defecto) */
    ocultarSubtareasAutomaticamente: boolean;
    /* Ignorar urgencia en el ordenamiento por prioridad para permitir drag reorder */
    ignorarUrgenciaEnPrioridad: boolean;
    /* [28-08-2026] Ocultar badges en las filas de tareas del panel (global).
     * La de dificultad solo aplica cuando el plugin EXP está activo. */
    ocultarBadgeUrgencia: boolean;
    ocultarBadgeImportancia: boolean;
    ocultarBadgeDificultad: boolean;
    /* [318A-14] Tabs de grupos en el panel de tareas (cada grupo es una tab). */
    usarTabsGrupos: boolean;
}

/* 
 * Configuración por defecto de tareas
 * mostrarHabitosEnEjecucion: true para usuarios nuevos (Beta: mejor experiencia inicial)
 * ocultarSubtareasAutomaticamente: false para mantener subtareas expandidas
 */
export const CONFIG_POR_DEFECTO: ConfiguracionTareas = {
    ocultarCompletadas: true,
    ocultarBadgeProyecto: true,
    eliminarCompletadasDespuesDeUnDia: false,
    mostrarHabitosEnEjecucion: true,
    modoCompacto: false,
    ocultarSubtareasAutomaticamente: false,
    ignorarUrgenciaEnPrioridad: false,
    ocultarBadgeUrgencia: false,
    ocultarBadgeImportancia: false,
    ocultarBadgeDificultad: false,
    /* [318A-14] Tabs de grupos: activo por defecto (paridad con selector). */
    usarTabsGrupos: true
};

export function useConfiguracionTareas() {
    const {valor, setValor} = useLocalStorage<ConfiguracionTareas>('glory_config_tareas', {
        valorPorDefecto: CONFIG_POR_DEFECTO
    });

    const toggleOcultarCompletadas = () => {
        setValor(prev => ({...prev, ocultarCompletadas: !prev.ocultarCompletadas}));
    };

    const toggleOcultarBadgeProyecto = () => {
        setValor(prev => ({...prev, ocultarBadgeProyecto: !prev.ocultarBadgeProyecto}));
    };

    const toggleEliminarCompletadasDespuesDeUnDia = () => {
        setValor(prev => ({...prev, eliminarCompletadasDespuesDeUnDia: !prev.eliminarCompletadasDespuesDeUnDia}));
    };

    const toggleMostrarHabitosEnEjecucion = () => {
        setValor(prev => ({...prev, mostrarHabitosEnEjecucion: !prev.mostrarHabitosEnEjecucion}));
    };

    const toggleModoCompacto = () => {
        setValor(prev => ({...prev, modoCompacto: !prev.modoCompacto}));
    };

    const toggleOcultarSubtareasAutomaticamente = () => {
        setValor(prev => ({...prev, ocultarSubtareasAutomaticamente: !prev.ocultarSubtareasAutomaticamente}));
    };

    const toggleIgnorarUrgenciaEnPrioridad = () => {
        setValor(prev => ({...prev, ignorarUrgenciaEnPrioridad: !prev.ignorarUrgenciaEnPrioridad}));
    };

    const toggleOcultarBadgeUrgencia = () => {
        setValor(prev => ({...prev, ocultarBadgeUrgencia: !prev.ocultarBadgeUrgencia}));
    };

    const toggleOcultarBadgeImportancia = () => {
        setValor(prev => ({...prev, ocultarBadgeImportancia: !prev.ocultarBadgeImportancia}));
    };

    const toggleOcultarBadgeDificultad = () => {
        setValor(prev => ({...prev, ocultarBadgeDificultad: !prev.ocultarBadgeDificultad}));
    };

    /* [318A-14] Toggle de tabs de grupos en el panel de tareas. */
    const toggleUsarTabsGrupos = () => {
        setValor(prev => ({...prev, usarTabsGrupos: !prev.usarTabsGrupos}));
    };

    return {
        /* [318A-14] Merge con defaults: la config guardada puede ser anterior a
         * un campo nuevo (ej: usarTabsGrupos), así que siempre se completa con
         * CONFIG_POR_DEFECTO para que el campo nunca quede undefined. */
        configuracion: {...CONFIG_POR_DEFECTO, ...valor},
        actualizarConfiguracion: setValor,
        toggleOcultarCompletadas,
        toggleOcultarBadgeProyecto,
        toggleEliminarCompletadasDespuesDeUnDia,
        toggleMostrarHabitosEnEjecucion,
        toggleModoCompacto,
        toggleOcultarSubtareasAutomaticamente,
        toggleIgnorarUrgenciaEnPrioridad,
        toggleOcultarBadgeUrgencia,
        toggleOcultarBadgeImportancia,
        toggleOcultarBadgeDificultad,
        toggleUsarTabsGrupos
    };
}
