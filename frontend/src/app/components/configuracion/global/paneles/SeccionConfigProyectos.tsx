/* [233A-27] Configuración de proyectos para el modal global. */
import {useConfiguracionProyectos} from '../../../../hooks/useConfiguracionProyectos';
import {ItemToggle} from './ItemToggle';

export function SeccionConfigProyectos(): JSX.Element {
    const {configuracion, toggleOcultarCompletados, toggleOcultarTareasCompletadas, toggleMostrarProgreso, toggleModoCompacto} = useConfiguracionProyectos();
    return (
        <div className="contenedorOpcionesConfig">
            <ItemToggle titulo="Ocultar proyectos completados" descripcion="Los proyectos finalizados no aparecerán en la lista" checked={configuracion.ocultarCompletados} onChange={toggleOcultarCompletados} />
            <ItemToggle titulo="Ocultar tareas completadas" descripcion="Las tareas finalizadas no aparecerán dentro de los proyectos" checked={configuracion.ocultarTareasCompletadas} onChange={toggleOcultarTareasCompletadas} />
            <ItemToggle titulo="Mostrar progreso" descripcion="Visualizar la barra de progreso de tareas" checked={configuracion.mostrarProgreso} onChange={toggleMostrarProgreso} />
            <ItemToggle titulo="Modo Compacto" descripcion="Reducir el tamaño de la fuente y el espaciado" checked={configuracion.modoCompacto} onChange={toggleModoCompacto} />
        </div>
    );
}
