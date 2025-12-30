/*
 * FormularioTareaModerno
 * Formulario con el nuevo diseno estilo Linear para tareas
 * Usado dentro de PanelConfiguracionTarea para la entrada de datos
 *
 * Fase 9.4: Layout moderno con titulo limpio, propiedades compactas
 * Reutiliza componentes de Fase 9.2 (CampoTituloLimpio, PropiedadesCompactas, etc.)
 */

import type {NivelPrioridad, NivelUrgencia, Participante, Proyecto, Adjunto, FrecuenciaHabito} from '../../../types/dashboard';
import {CampoTituloLimpio, CampoSubtituloLimpio, PropiedadesCompactas, SelectorEstadoPill, SelectorProyectoPill, SelectorRepeticionPill, FilaPropiedades} from '../../shared';
import {SeccionAdjuntos} from '../SeccionAdjuntos';
import {SelectorAsignado} from '../../compartidos/SelectorAsignado';
import {SeccionPanel} from '../../shared';

interface FormularioTareaModernoProps {
    /* Campos principales */
    texto: string;
    onTextoChange: (valor: string) => void;
    descripcion: string;
    onDescripcionChange: (valor: string) => void;
    /* Estado de la tarea */
    completado: boolean;
    onCompletadoChange?: (valor: boolean) => void;
    /* Propiedades */
    prioridad: NivelPrioridad | null;
    onPrioridadChange: (valor: NivelPrioridad) => void;
    urgencia: NivelUrgencia | null;
    onUrgenciaChange: (valor: NivelUrgencia | null) => void;
    fechaLimite: string;
    onFechaLimiteChange: (valor: string) => void;
    /* Proyecto */
    proyectoId?: number;
    proyectos?: Proyecto[];
    onProyectoChange?: (proyectoId: number | undefined) => void;
    /* Repeticion */
    tieneRepeticion: boolean;
    onTieneRepeticionChange: (valor: boolean) => void;
    frecuencia: FrecuenciaHabito;
    onFrecuenciaChange: (frecuencia: FrecuenciaHabito) => void;
    /* Asignacion */
    participantes?: Participante[];
    asignadoA: number | null;
    asignadoANombre: string;
    asignadoAAvatar: string;
    onAsignacionChange?: (usuarioId: number | null, nombre: string, avatar: string) => void;
    /* Adjuntos */
    adjuntos?: Adjunto[];
    onAdjuntosChange?: (adjuntos: Adjunto[]) => void;
    /* Modo */
    modoEdicion?: boolean;
    errorTexto?: string;
}

export function FormularioTareaModerno({texto, onTextoChange, descripcion, onDescripcionChange, completado, onCompletadoChange, prioridad, onPrioridadChange, urgencia, onUrgenciaChange, fechaLimite, onFechaLimiteChange, proyectoId, proyectos = [], onProyectoChange, tieneRepeticion, onTieneRepeticionChange, frecuencia, onFrecuenciaChange, participantes = [], asignadoA, asignadoANombre, asignadoAAvatar, onAsignacionChange, adjuntos = [], onAdjuntosChange, modoEdicion = false, errorTexto}: FormularioTareaModernoProps): JSX.Element {
    /* Mostrar selector de proyecto solo si hay proyectos y callback */
    const mostrarProyecto = proyectos.length > 0 && onProyectoChange;

    /* Mostrar asignacion solo si hay participantes */
    const mostrarAsignacion = participantes.length > 0 && onAsignacionChange;

    /* Handler de asignacion adaptado al formato de SelectorAsignado */
    const manejarAsignacion = (usuarioId: number | null, nombre: string, avatar: string) => {
        onAsignacionChange?.(usuarioId, nombre, avatar);
    };

    /* Determinar si mostrar la fila de opciones */
    const mostrarFilaOpciones = modoEdicion || mostrarProyecto || true; /* Siempre mostrar repeticion */

    return (
        <div id="formulario-tarea-moderno" className="formularioProyectoModerno">
            {/* Titulo */}
            <CampoTituloLimpio id="tarea-nombre" valor={texto} onChange={onTextoChange} placeholder="Nombre de la tarea..." error={errorTexto} autoFocus={!modoEdicion} />

            {/* Descripcion */}
            <CampoSubtituloLimpio id="tarea-descripcion" valor={descripcion} onChange={onDescripcionChange} placeholder="Notas adicionales sobre esta tarea..." />

            {/* Propiedades compactas (Prioridad, Urgencia, Fecha) */}
            <PropiedadesCompactas prioridad={prioridad || 'media'} onPrioridadChange={onPrioridadChange} urgencia={urgencia} onUrgenciaChange={onUrgenciaChange} fechaLimite={fechaLimite} onFechaLimiteChange={onFechaLimiteChange} />

            {/* Opciones: Estado, Proyecto, Repeticion */}
            {mostrarFilaOpciones && (
                <FilaPropiedades etiqueta="Opciones">
                    {/* Estado - Solo en modo edicion */}
                    {modoEdicion && onCompletadoChange && <SelectorEstadoPill completada={completado} onChange={onCompletadoChange} />}

                    {/* Proyecto - Solo si hay proyectos disponibles */}
                    {mostrarProyecto && <SelectorProyectoPill proyectos={proyectos} proyectoActualId={proyectoId} onChange={onProyectoChange} />}

                    {/* Repeticion */}
                    <SelectorRepeticionPill tieneRepeticion={tieneRepeticion} onTieneRepeticionChange={onTieneRepeticionChange} frecuencia={frecuencia} onFrecuenciaChange={onFrecuenciaChange} />
                </FilaPropiedades>
            )}

            {/* Asignacion (solo si hay participantes) */}
            {mostrarAsignacion && (
                <SeccionPanel titulo="Asignar a">
                    <SelectorAsignado participantes={participantes} asignadoActual={asignadoA} onAsignar={manejarAsignacion} />
                </SeccionPanel>
            )}

            {/* Adjuntos */}
            {onAdjuntosChange && <SeccionAdjuntos adjuntos={adjuntos} onChange={onAdjuntosChange} estilo="moderno" />}
        </div>
    );
}
