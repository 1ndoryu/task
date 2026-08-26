/* [233A-27] Configuración de tareas para el modal global. */
import {useConfiguracionTareas} from '../../../../hooks/useConfiguracionTareas';
import {usePluginActivo} from '../../../../stores/pluginsStore';
import {ItemToggle} from './ItemToggle';

export function SeccionConfigTareas(): JSX.Element {
    const {configuracion, toggleOcultarCompletadas, toggleOcultarBadgeProyecto, toggleEliminarCompletadasDespuesDeUnDia, toggleMostrarHabitosEnEjecucion, toggleModoCompacto, toggleOcultarSubtareasAutomaticamente, toggleIgnorarUrgenciaEnPrioridad, toggleOcultarBadgeUrgencia, toggleOcultarBadgeImportancia, toggleOcultarBadgeDificultad} = useConfiguracionTareas();
    /* [28-08-2026] La opción de dificultad solo aplica con el plugin EXP activo. */
    const expActivo = usePluginActivo('exp');
    return (
        <div className="contenedorOpcionesConfig">
            <ItemToggle titulo="Ocultar tareas completadas" descripcion="Las tareas finalizadas no aparecerán en la lista" checked={configuracion.ocultarCompletadas} onChange={toggleOcultarCompletadas} />
            <ItemToggle titulo="Ocultar nombre de proyecto" descripcion="No mostrar el badge del proyecto en las tareas" checked={configuracion.ocultarBadgeProyecto} onChange={toggleOcultarBadgeProyecto} />
            <ItemToggle titulo="Ocultar badge de urgencia" descripcion="No mostrar el indicador de urgencia en las tareas" checked={configuracion.ocultarBadgeUrgencia} onChange={toggleOcultarBadgeUrgencia} />
            <ItemToggle titulo="Ocultar badge de importancia" descripcion="No mostrar el indicador de prioridad/importancia en las tareas" checked={configuracion.ocultarBadgeImportancia} onChange={toggleOcultarBadgeImportancia} />
            {expActivo && (
                <ItemToggle titulo="Ocultar badge de dificultad" descripcion="No mostrar la barra de dificultad (plugin EXP) en las tareas" checked={configuracion.ocultarBadgeDificultad} onChange={toggleOcultarBadgeDificultad} />
            )}
            <ItemToggle titulo="Colapsar subtareas automáticamente" descripcion="Las subtareas estarán colapsadas por defecto" checked={configuracion.ocultarSubtareasAutomaticamente} onChange={toggleOcultarSubtareasAutomaticamente} />
            <ItemToggle titulo="Limpieza automática" descripcion="Eliminar tareas completadas después de 24 horas" checked={configuracion.eliminarCompletadasDespuesDeUnDia} onChange={toggleEliminarCompletadasDespuesDeUnDia} />
            <ItemToggle titulo="Mostrar hábitos en Ejecución" descripcion="Los hábitos de hoy aparecerán como tareas en la lista" checked={configuracion.mostrarHabitosEnEjecucion} onChange={toggleMostrarHabitosEnEjecucion} />
            <ItemToggle titulo="Modo compacto" descripcion="Reducir el tamaño de la fuente y el espaciado" checked={configuracion.modoCompacto} onChange={toggleModoCompacto} />
            <ItemToggle titulo="Ignorar urgencia en Prioridad" descripcion="Permite reordenar tareas con la misma prioridad arrastrándolas sin que la urgencia interfiera" checked={configuracion.ignorarUrgenciaEnPrioridad} onChange={toggleIgnorarUrgenciaEnPrioridad} />
        </div>
    );
}
