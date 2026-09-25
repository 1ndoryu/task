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

    /* Los 11 flags son booleanos: un toggle genérico por clave evita 11
     * callbacks idénticos. Los wrappers con nombre preservan la API pública. */
    type ClaveBooleana = keyof ConfiguracionTareas;
    const toggle = (clave: ClaveBooleana) => {
        setValor(prev => ({...prev, [clave]: !prev[clave]}));
    };

    const toggleOcultarCompletadas = () => toggle('ocultarCompletadas');

    const toggleOcultarBadgeProyecto = () => toggle('ocultarBadgeProyecto');

    const toggleEliminarCompletadasDespuesDeUnDia = () => toggle('eliminarCompletadasDespuesDeUnDia');

    const toggleMostrarHabitosEnEjecucion = () => toggle('mostrarHabitosEnEjecucion');

    const toggleModoCompacto = () => toggle('modoCompacto');

    const toggleOcultarSubtareasAutomaticamente = () => toggle('ocultarSubtareasAutomaticamente');

    const toggleIgnorarUrgenciaEnPrioridad = () => toggle('ignorarUrgenciaEnPrioridad');

    const toggleOcultarBadgeUrgencia = () => toggle('ocultarBadgeUrgencia');

    const toggleOcultarBadgeImportancia = () => toggle('ocultarBadgeImportancia');

    const toggleOcultarBadgeDificultad = () => toggle('ocultarBadgeDificultad');

    /* [318A-14] Toggle de tabs de grupos en el panel de tareas. */
    const toggleUsarTabsGrupos = () => toggle('usarTabsGrupos');

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
