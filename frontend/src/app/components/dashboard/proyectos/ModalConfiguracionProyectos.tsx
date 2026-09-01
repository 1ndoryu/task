/*
 * ModalConfiguracionProyectos
 * Modal para ajustar preferencias de visualización de proyectos
 * [318A-3] Migrado al sistema centralizado: toggles declarativos con
 * FormularioConfiguracion (visual-neutral).
 */

import {Modal} from '../../shared/Modal';
import {FormularioConfiguracion} from '../../shared/FormularioConfiguracion';
import type {CampoEspecificacion} from '../../shared/CampoEspecificacion';
import type {ConfiguracionProyectos} from '../../../hooks/useConfiguracionProyectos';

interface ModalConfiguracionProyectosProps {
    estaAbierto: boolean;
    onCerrar: () => void;
    configuracion: ConfiguracionProyectos;
    onToggleCompletados: () => void;
    onToggleTareasCompletadas: () => void;
    onToggleProgreso: () => void;
    onToggleModoCompacto: () => void;
}

export function ModalConfiguracionProyectos({estaAbierto, onCerrar, configuracion, onToggleCompletados, onToggleTareasCompletadas, onToggleProgreso, onToggleModoCompacto}: ModalConfiguracionProyectosProps): JSX.Element {
    const campos: CampoEspecificacion<ConfiguracionProyectos>[] = [
        {
            clave: 'ocultarCompletados',
            titulo: 'Ocultar proyectos completados',
            descripcion: 'Los proyectos finalizados no aparecerán en la lista principal',
            tipo: 'toggle',
            alCambiar: () => onToggleCompletados()
        },
        {
            clave: 'ocultarTareasCompletadas',
            titulo: 'Ocultar tareas completadas',
            descripcion: 'Las tareas finalizadas no aparecerán dentro de los proyectos',
            tipo: 'toggle',
            alCambiar: () => onToggleTareasCompletadas()
        },
        {
            clave: 'mostrarProgreso',
            titulo: 'Mostrar progreso',
            descripcion: 'Visualizar la barra de progreso de tareas',
            tipo: 'toggle',
            alCambiar: () => onToggleProgreso()
        },
        {
            clave: 'modoCompacto',
            titulo: 'Modo Compacto',
            descripcion: 'Reducir el tamaño de la fuente y el espaciado',
            tipo: 'toggle',
            alCambiar: () => onToggleModoCompacto()
        }
    ];

    return (
        <Modal estaAbierto={estaAbierto} onCerrar={onCerrar} titulo="Configuración de Proyectos">
            <FormularioConfiguracion
                campos={campos}
                valores={configuracion}
                alCambiar={() => {
                    /* La persistencia la manejan los alCambiar de cada campo. */
                }}
            />
        </Modal>
    );
}