/*
 * FormularioProyecto
 * Formulario para crear/editar un proyecto
 * Responsabilidad unica: capturar datos del proyecto con validacion
 *
 * Usa campos compartidos: CampoTexto, CampoPrioridad, CampoFechaLimite
 */

import type {NivelPrioridad} from '../../../types/dashboard';
import type {DatosNuevoProyecto} from '../../../hooks/useProyectos';
import {useFormularioProyecto} from '../../../hooks/dashboard/useFormularioProyecto';
import {AccionesFormulario, CampoTexto, CampoPrioridad, CampoUrgencia, CampoFechaLimite} from '../../shared';

interface FormularioProyectoProps {
    onGuardar: (datos: DatosNuevoProyecto) => void;
    onCancelar: () => void;
    onEliminar?: () => void;
    datosIniciales?: DatosNuevoProyecto;
    guardando?: boolean;
    modoEdicion?: boolean;
}

export function FormularioProyecto({onGuardar, onCancelar, onEliminar, datosIniciales, guardando = false, modoEdicion = false}: FormularioProyectoProps): JSX.Element {
    const {
        nombre, setNombre,
        descripcion, setDescripcion,
        prioridad, setPrioridad,
        urgencia, setUrgencia,
        fechaLimite, setFechaLimite,
        errores,
        manejarSubmit
    } = useFormularioProyecto({datosIniciales, onGuardar});

    return (
        <form id="formulario-proyecto" className="formularioHabito" onSubmit={manejarSubmit}>
            {/* Campo Nombre - Campo reutilizable */}
            <CampoTexto id="proyecto-nombre" titulo="Nombre del proyecto" valor={nombre} onChange={setNombre} placeholder="Ej: Lanzar Web Personal" error={errores.nombre} autoFocus disabled={guardando} />

            {/* Campo Descripcion - Campo reutilizable */}
            <CampoTexto id="proyecto-descripcion" titulo="Descripcion (opcional)" valor={descripcion} onChange={setDescripcion} placeholder="Describe brevemente el objetivo del proyecto..." tipo="textarea" filas={3} disabled={guardando} />

            {/* Campo Prioridad - Campo reutilizable */}
            <CampoPrioridad<NivelPrioridad> tipo="prioridad" valor={prioridad} onChange={val => setPrioridad(val || 'media')} permitirNulo={false} disabled={guardando} />

            {/* Campo Urgencia - Campo reutilizable */}
            <CampoUrgencia valor={urgencia} onChange={setUrgencia} permitirNulo={true} disabled={guardando} />

            {/* Campo Fecha Limite - Campo reutilizable */}
            <CampoFechaLimite titulo="Fecha limite (opcional)" valor={fechaLimite} onChange={setFechaLimite} mostrarBotonLimpiar={true} disabled={guardando} />

            {/* Acciones */}
            <AccionesFormulario onCancelar={onCancelar} textoGuardar={modoEdicion ? 'Guardar cambios' : 'Crear proyecto'} guardando={guardando} onEliminar={modoEdicion && onEliminar ? onEliminar : undefined} textoEliminar="Eliminar proyecto" />
        </form>
    );
}
