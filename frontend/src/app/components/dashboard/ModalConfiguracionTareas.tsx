/*
 * ModalConfiguracionTareas
 * Modal para ajustar preferencias de visualización de tareas
 * [318A-3] Migrado al sistema centralizado: toggles declarativos con
 * FormularioConfiguracion; los separadores automáticos replican el patrón
 * previo itemOpcionConfig (visual-neutral).
 */

import {Modal} from '../shared/Modal';
import {FormularioConfiguracion} from '../shared/FormularioConfiguracion';
import type {CampoEspecificacion} from '../shared/CampoEspecificacion';
import type {ConfiguracionTareas} from '../../hooks/useConfiguracionTareas';
import {usePluginActivo} from '../../stores/pluginsStore';

interface MctModalBase {
    estaAbierto: boolean;
    onCerrar: () => void;
    configuracion: ConfiguracionTareas;
}

interface MctTogglesVisibilidad {
    onToggleCompletadas: () => void;
    onToggleBadgeProyecto: () => void;
    onToggleEliminarCompletadas: () => void;
    onToggleMostrarHabitos: () => void;
    onToggleModoCompacto: () => void;
    onToggleOcultarSubtareas: () => void;
    onToggleIgnorarUrgencia: () => void;
}

interface MctTogglesBadges {
    onToggleEstilos?: () => void;
    /* [28-08-2026] Badges globales del panel. */
    onToggleBadgeUrgencia: () => void;
    onToggleBadgeImportancia: () => void;
    onToggleBadgeDificultad: () => void;
}

interface ModalConfiguracionTareasProps extends MctModalBase, MctTogglesVisibilidad, MctTogglesBadges {}

export function ModalConfiguracionTareas({estaAbierto, onCerrar, configuracion, onToggleCompletadas, onToggleBadgeProyecto, onToggleEliminarCompletadas, onToggleMostrarHabitos, onToggleModoCompacto, onToggleOcultarSubtareas, onToggleIgnorarUrgencia, onToggleBadgeUrgencia, onToggleBadgeImportancia, onToggleBadgeDificultad}: ModalConfiguracionTareasProps): JSX.Element {
    /* [28-08-2026] La opción de dificultad solo aplica con el plugin EXP activo. */
    const expActivo = usePluginActivo('exp');

    const campos: CampoEspecificacion<ConfiguracionTareas>[] = [
        {
            clave: 'ocultarCompletadas',
            titulo: 'Ocultar tareas completadas',
            descripcion: 'Las tareas finalizadas no apareceran en la lista principal',
            tipo: 'toggle',
            alCambiar: () => onToggleCompletadas()
        },
        {
            clave: 'ocultarBadgeProyecto',
            titulo: 'Ocultar nombre de proyecto',
            descripcion: 'No mostrar el badge del proyecto en las tareas de la lista',
            tipo: 'toggle',
            alCambiar: () => onToggleBadgeProyecto()
        },
        /* Badge de urgencia (global) */
        {
            clave: 'ocultarBadgeUrgencia',
            titulo: 'Ocultar badge de urgencia',
            descripcion: 'No mostrar el indicador de urgencia en las tareas',
            tipo: 'toggle',
            alCambiar: () => onToggleBadgeUrgencia()
        },
        /* Badge de importancia (global) */
        {
            clave: 'ocultarBadgeImportancia',
            titulo: 'Ocultar badge de importancia',
            descripcion: 'No mostrar el indicador de prioridad/importancia en las tareas',
            tipo: 'toggle',
            alCambiar: () => onToggleBadgeImportancia()
        },
        /* Badge de dificultad (global, solo plugin EXP) */
        {
            clave: 'ocultarBadgeDificultad',
            titulo: 'Ocultar badge de dificultad',
            descripcion: 'No mostrar la barra de dificultad (plugin EXP) en las tareas',
            tipo: 'toggle',
            cuando: () => expActivo,
            alCambiar: () => onToggleBadgeDificultad()
        },
        {
            clave: 'ocultarSubtareasAutomaticamente',
            titulo: 'Colapsar subtareas automáticamente',
            descripcion: 'Las subtareas estarán colapsadas por defecto',
            tipo: 'toggle',
            alCambiar: () => onToggleOcultarSubtareas()
        },
        {
            clave: 'eliminarCompletadasDespuesDeUnDia',
            titulo: 'Limpieza automática',
            descripcion: 'Eliminar tareas completadas después de 24 horas',
            tipo: 'toggle',
            alCambiar: () => onToggleEliminarCompletadas()
        },
        {
            clave: 'mostrarHabitosEnEjecucion',
            titulo: 'Mostrar hábitos en Ejecución',
            descripcion: 'Los hábitos que tocan hoy aparecerán como tareas en la lista',
            tipo: 'toggle',
            alCambiar: () => onToggleMostrarHabitos()
        },
        {
            clave: 'modoCompacto',
            titulo: 'Modo Compacto',
            descripcion: 'Reducir el tamaño de la fuente y el espaciado',
            tipo: 'toggle',
            alCambiar: () => onToggleModoCompacto()
        },
        {
            clave: 'ignorarUrgenciaEnPrioridad',
            titulo: 'Ignorar urgencia en Prioridad',
            descripcion: 'Permite reordenar tareas (y hábitos) de igual prioridad sin que la urgencia altere el orden',
            tipo: 'toggle',
            alCambiar: () => onToggleIgnorarUrgencia()
        }
    ];

    return (
        <Modal estaAbierto={estaAbierto} onCerrar={onCerrar} titulo="Configuracion de Vista">
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