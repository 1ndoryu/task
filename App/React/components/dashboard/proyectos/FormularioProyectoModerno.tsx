/*
 * FormularioProyectoModerno
 * Formulario con el nuevo diseno estilo Linear
 * Usado dentro de ModalProyecto para la entrada de datos
 *
 * Fase 9: Layout moderno con titulo limpio, icono y propiedades compactas
 * Fase 9.2.4: Seccion de responsables para proyectos compartidos
 */

import type {NivelPrioridad, NivelUrgencia, Participante, CompaneroEquipo, RolCompartido, Adjunto} from '../../../types/dashboard';
import {CampoTituloLimpio, CampoSubtituloLimpio, SelectorIconoProyecto, PropiedadesCompactas, SeccionResponsables, ResumenTareasProyecto} from '../../shared';
import {SeccionAdjuntos} from '../SeccionAdjuntos';

interface FormularioProyectoModernoProps {
    nombre: string;
    onNombreChange: (valor: string) => void;
    descripcion: string;
    onDescripcionChange: (valor: string) => void;
    icono: string;
    colorIcono: string;
    onIconoChange: (icono: string, color: string) => void;
    prioridad: NivelPrioridad;
    onPrioridadChange: (valor: NivelPrioridad) => void;
    urgencia: NivelUrgencia | null;
    onUrgenciaChange: (valor: NivelUrgencia | null) => void;
    fechaLimite: string;
    onFechaLimiteChange: (valor: string) => void;
    errorNombre?: string;
    modoEdicion?: boolean;
    /* Participantes del proyecto (Fase 9.2.4) */
    participantes?: Participante[];
    /* Companeros disponibles para agregar */
    companeros?: CompaneroEquipo[];
    /* Callbacks para gestion de participantes */
    onAgregarParticipante?: (companeroId: number, rol: RolCompartido) => void;
    onRemoverParticipante?: (participanteId: number) => void;
    onCambiarRolParticipante?: (participanteId: number, nuevoRol: RolCompartido) => void;
    /* Si el usuario puede gestionar participantes */
    puedeGestionarParticipantes?: boolean;
    /* Adjuntos del proyecto (Fase 9.2.5) */
    adjuntos?: Adjunto[];
    onAdjuntosChange?: (adjuntos: Adjunto[]) => void;
    /* Estadisticas de tareas (Fase 9.2.7) */
    tareasCompletadas?: number;
    tareasPendientes?: number;
}

export function FormularioProyectoModerno({nombre, onNombreChange, descripcion, onDescripcionChange, icono, colorIcono, onIconoChange, prioridad, onPrioridadChange, urgencia, onUrgenciaChange, fechaLimite, onFechaLimiteChange, errorNombre, modoEdicion = false, participantes = [], companeros = [], onAgregarParticipante, onRemoverParticipante, onCambiarRolParticipante, puedeGestionarParticipantes = false, adjuntos = [], onAdjuntosChange, tareasCompletadas = 0, tareasPendientes = 0}: FormularioProyectoModernoProps): JSX.Element {
    /* Mostrar seccion de responsables solo en modo edicion */
    const mostrarResponsables = modoEdicion;

    return (
        <div id="formulario-proyecto-moderno" className="formularioProyectoModerno">
            {/* Titulo con icono */}
            <CampoTituloLimpio id="proyecto-nombre" valor={nombre} onChange={onNombreChange} placeholder="Nombre del proyecto..." error={errorNombre} autoFocus={!modoEdicion} iconoIzquierda={<SelectorIconoProyecto iconoId={icono} colorIcono={colorIcono} onCambio={onIconoChange} />} />

            {/* Descripcion/Lead */}
            <CampoSubtituloLimpio id="proyecto-descripcion" valor={descripcion} onChange={onDescripcionChange} placeholder="Describe brevemente el objetivo del proyecto..." />

            {/* Propiedades compactas con menus inline */}
            <PropiedadesCompactas prioridad={prioridad} onPrioridadChange={onPrioridadChange} urgencia={urgencia} onUrgenciaChange={onUrgenciaChange} fechaLimite={fechaLimite} onFechaLimiteChange={onFechaLimiteChange} />

            {/* Seccion de responsables (solo en modo edicion) */}
            {mostrarResponsables && <SeccionResponsables participantes={participantes} companeros={companeros} onAgregar={onAgregarParticipante} onRemover={onRemoverParticipante} onCambiarRol={onCambiarRolParticipante} puedeGestionar={puedeGestionarParticipantes} etiqueta="Responsables" />}

            {/* Seccion de adjuntos (Inline - Fase 9.2.5) */}
            {onAdjuntosChange && <SeccionAdjuntos adjuntos={adjuntos} onChange={onAdjuntosChange} estilo="moderno" />}

            {/* Resumen de Tareas (Solo en modo edicion) */}
            {modoEdicion && (tareasCompletadas > 0 || tareasPendientes > 0) && <ResumenTareasProyecto completadas={tareasCompletadas} pendientes={tareasPendientes} />}
        </div>
    );
}
