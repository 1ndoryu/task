/*
 * ModalesCompartir
 * Agrupa modales relacionados con compartir y equipos
 * Incluye: ModalCompartir (proyecto/tarea), ModalEquipos, ModalNotificaciones
 */

import {ModalEquipos} from '../../equipos';
import {ModalNotificaciones} from '../../notificaciones';
import {ModalCompartir} from '../../compartidos';

import type {DashboardCompletoRetorno} from '../../../hooks/useDashboardCompleto';

interface ModalesCompartirProps {
    modales: DashboardCompletoRetorno['modales'];
    equipos: DashboardCompletoRetorno['equipos'];
    compartir: DashboardCompletoRetorno['compartir'];
    notificaciones: DashboardCompletoRetorno['notificaciones'];
    acciones: DashboardCompletoRetorno['acciones'];
}

export function ModalesCompartir({modales, equipos, compartir, notificaciones, acciones}: ModalesCompartirProps): JSX.Element {
    return (
        <>
            {/* Modal Notificaciones */}
            {modales.modalNotificacionesAbierto && <ModalNotificaciones notificaciones={notificaciones.notificaciones} noLeidas={notificaciones.noLeidas} total={notificaciones.total} cargando={notificaciones.cargando} cargandoPrimeraVez={notificaciones.cargandoPrimeraVez} posicionX={modales.posicionModalNotificaciones.x} posicionY={modales.posicionModalNotificaciones.y} onMarcarLeida={notificaciones.marcarLeida} onMarcarTodasLeidas={notificaciones.marcarTodasLeidas} onEliminar={notificaciones.eliminar} onClickNotificacion={acciones.manejarClickNotificacionIndividual} onCerrar={modales.cerrarModalNotificaciones} />}

            {/* Modal Equipos */}
            <ModalEquipos estaAbierto={modales.modalEquiposAbierto} onCerrar={modales.cerrarModalEquipos} />

            {/* Modal Compartir Proyecto */}
            <ModalCompartir visible={compartir.proyectoCompartiendo !== null} onCerrar={compartir.cerrarModalCompartirProyecto} tipo="proyecto" elementoId={compartir.proyectoCompartiendo?.id ?? 0} elementoNombre={compartir.proyectoCompartiendo?.nombre ?? ''} companeros={equipos.companeros} participantes={compartir.participantesProyecto} cifradoActivo={false} onCompartir={compartir.manejarCompartirElemento} onCambiarRol={compartir.manejarCambiarRolCompartido} onDejarDeCompartir={compartir.manejarDejarDeCompartir} cargandoParticipantes={compartir.cargando} />

            {/* Modal Compartir Tarea */}
            <ModalCompartir visible={compartir.tareaCompartiendo !== null} onCerrar={compartir.cerrarModalCompartirTarea} tipo="tarea" elementoId={compartir.tareaCompartiendo?.id ?? 0} elementoNombre={compartir.tareaCompartiendo?.texto ?? ''} companeros={equipos.companeros} participantes={compartir.participantesTarea} cifradoActivo={false} onCompartir={compartir.manejarCompartirTareaElemento} onCambiarRol={compartir.manejarCambiarRolTareaCompartida} onDejarDeCompartir={compartir.manejarDejarDeCompartir} cargandoParticipantes={compartir.cargando} />
        </>
    );
}
