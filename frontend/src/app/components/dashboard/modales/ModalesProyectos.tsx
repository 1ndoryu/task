/*
 * ModalesProyectos
 * Agrupa modales relacionados con proyectos
 * Incluye: ModalProyecto (crear/editar), BottomSheetProyecto (móvil)
 */

import {ModalProyecto} from '../proyectos/ModalProyecto';
import {BottomSheetProyecto} from '../BottomSheetProyecto';

import type {DashboardCompletoRetorno} from '../../../hooks/useDashboardCompleto';
import type {NivelPrioridad, NivelUrgencia} from '../../../types/dashboard';
import type {DatosProyecto} from '../BottomSheetProyecto';

interface ModalesProyectosProps {
    dashboard: DashboardCompletoRetorno['dashboard'];
    modales: DashboardCompletoRetorno['modales'];
    equipos: DashboardCompletoRetorno['equipos'];
    compartir: DashboardCompletoRetorno['compartir'];
    acciones: DashboardCompletoRetorno['acciones'];
    esMovil: boolean;
    manejarCrearProyectoConLimite: (datos: {nombre: string; prioridad?: NivelPrioridad; urgencia?: NivelUrgencia; fechaLimite?: string}) => void;
    manejarGuardarProyectoBottomSheet: (datos: DatosProyecto) => Promise<void>;
}

export function ModalesProyectos({dashboard, modales, equipos, compartir, acciones, esMovil, manejarCrearProyectoConLimite, manejarGuardarProyectoBottomSheet}: ModalesProyectosProps): JSX.Element {
    return (
        <>
            {/* Modal crear proyecto */}
            <ModalProyecto estaAbierto={modales.modalCrearProyectoAbierto} onCerrar={modales.cerrarModalCrearProyecto} onGuardar={manejarCrearProyectoConLimite} tareas={dashboard.tareas} />

            {/* Modal editar proyecto */}
            <ModalProyecto estaAbierto={modales.proyectoEditando !== null} onCerrar={modales.cerrarModalEditarProyecto} onGuardar={acciones.manejarGuardarEdicionProyecto} proyecto={modales.proyectoEditando ?? undefined} participantes={modales.proyectoEditando ? (compartir.cacheParticipantesProyecto.get(modales.proyectoEditando.id) ?? []) : []} companeros={equipos.companeros} onAgregarParticipante={(companeroId, rol) => modales.proyectoEditando && compartir.manejarCompartirElemento(companeroId, rol)} onRemoverParticipante={compartir.manejarDejarDeCompartir} onCambiarRolParticipante={compartir.manejarCambiarRolCompartido} tareas={dashboard.tareas} onToggleTarea={dashboard.toggleTarea} />

            {/* BottomSheet móvil para crear proyecto */}
            {esMovil && modales.modalCreacionRapida === 'proyecto' && (
                <BottomSheetProyecto
                    estaAbierto={true}
                    onCerrar={modales.cerrarCreacionRapida}
                    onGuardar={manejarGuardarProyectoBottomSheet}
                    valoresIniciales={{
                        prioridad: modales.valoresCreacionRapida.prioridad as NivelPrioridad | undefined,
                        urgencia: modales.valoresCreacionRapida.urgencia as NivelUrgencia | undefined
                    }}
                />
            )}
        </>
    );
}
