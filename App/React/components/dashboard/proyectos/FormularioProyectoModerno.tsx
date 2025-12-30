/*
 * FormularioProyectoModerno
 * Formulario con el nuevo diseno estilo Linear
 * Usado dentro de ModalProyecto para la entrada de datos
 *
 * Fase 9: Layout moderno con titulo limpio, icono y propiedades compactas
 * Fase 9.2.4: Seccion de responsables para proyectos compartidos
 * Fase 9.6: Selector de estado de proyecto
 */

import type {NivelPrioridad, NivelUrgencia, Participante, CompaneroEquipo, RolCompartido, Adjunto, Tarea, Hito} from '../../../types/dashboard';
import {CampoTituloLimpio, CampoSubtituloLimpio, SelectorIconoProyecto, PropiedadesCompactas, SeccionResponsables, SelectorEstadoProyectoPill, FilaPropiedades} from '../../shared';
import type {EstadoProyecto} from '../../shared';
import {SeccionAdjuntos} from '../SeccionAdjuntos';
import {ListaHitos} from './ListaHitos';

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
    /* Estado del proyecto (Fase 9.6) */
    estado?: EstadoProyecto;
    onEstadoChange?: (estado: EstadoProyecto) => void;
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
    /* Tareas para la lista compacta (Fase 9.2.7) - DEPRECADO POR HITOS */
    tareas?: Tarea[];
    onToggleTarea?: (id: number) => void;
    /* Hitos del proyecto (Fase 9.2.7) */
    hitos?: Hito[];
    onHitosChange?: (hitos: Hito[]) => void;
}

export function FormularioProyectoModerno({nombre, onNombreChange, descripcion, onDescripcionChange, icono, colorIcono, onIconoChange, prioridad, onPrioridadChange, urgencia, onUrgenciaChange, fechaLimite, onFechaLimiteChange, estado = 'activo', onEstadoChange, errorNombre, modoEdicion = false, participantes = [], companeros = [], onAgregarParticipante, onRemoverParticipante, onCambiarRolParticipante, puedeGestionarParticipantes = false, adjuntos = [], onAdjuntosChange, tareas = [], onToggleTarea, hitos = [], onHitosChange}: FormularioProyectoModernoProps): JSX.Element {
    /* Mostrar seccion de responsables solo en modo edicion */
    const mostrarResponsables = modoEdicion;

    return (
        <div id="formulario-proyecto-moderno" className="formularioProyectoModerno">
            {/* Icono del proyecto (arriba del titulo) */}
            <div style={{marginBottom: 'var(--dashboard-espacioXs)'}}>
                <SelectorIconoProyecto iconoId={icono} colorIcono={colorIcono} onCambio={onIconoChange} />
            </div>

            {/* Titulo sin icono integrado */}
            <CampoTituloLimpio id="proyecto-nombre" valor={nombre} onChange={onNombreChange} placeholder="Nombre del proyecto..." error={errorNombre} autoFocus={!modoEdicion} />

            {/* Descripcion/Lead */}
            <CampoSubtituloLimpio id="proyecto-descripcion" valor={descripcion} onChange={onDescripcionChange} placeholder="Describe brevemente el objetivo del proyecto..." />

            {/* Propiedades compactas con menus inline */}
            <PropiedadesCompactas prioridad={prioridad} onPrioridadChange={onPrioridadChange} urgencia={urgencia} onUrgenciaChange={onUrgenciaChange} fechaLimite={fechaLimite} onFechaLimiteChange={onFechaLimiteChange} />

            {/* Estado del proyecto (Fase 9.6) - Solo en modo edicion */}
            {modoEdicion && onEstadoChange && (
                <FilaPropiedades etiqueta="Estado">
                    <SelectorEstadoProyectoPill estado={estado} onChange={onEstadoChange} />
                </FilaPropiedades>
            )}

            {/* Seccion de responsables (solo en modo edicion) */}
            {mostrarResponsables && <SeccionResponsables participantes={participantes} companeros={companeros} onAgregar={onAgregarParticipante} onRemover={onRemoverParticipante} onCambiarRol={onCambiarRolParticipante} puedeGestionar={puedeGestionarParticipantes} etiqueta="Miembros" />}

            {/* Seccion de adjuntos (Inline - Fase 9.2.5) */}
            {onAdjuntosChange && <SeccionAdjuntos adjuntos={adjuntos} onChange={onAdjuntosChange} estilo="moderno" />}

            {/* Lista de Hitos (Fase 9.2.7) */}
            {onHitosChange && <ListaHitos hitos={hitos} onChange={onHitosChange} />}
        </div>
    );
}
