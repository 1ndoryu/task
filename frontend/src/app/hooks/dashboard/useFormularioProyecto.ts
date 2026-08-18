/*
 * useFormularioProyecto
 * Hook que gestiona el estado y validación del formulario de proyecto.
 * Incluye: campos del formulario, errores de validación y submit handler.
 */

import {useState, useCallback} from 'react';
import type {NivelPrioridad, NivelUrgencia} from '../../types/dashboard';
import type {DatosNuevoProyecto} from '../useProyectos';

interface UseFormularioProyectoParams {
    datosIniciales?: DatosNuevoProyecto;
    onGuardar: (datos: DatosNuevoProyecto) => void;
}

export function useFormularioProyecto({datosIniciales, onGuardar}: UseFormularioProyectoParams) {
    const [nombre, setNombre] = useState(datosIniciales?.nombre || '');
    const [descripcion, setDescripcion] = useState(datosIniciales?.descripcion || '');
    const [prioridad, setPrioridad] = useState<NivelPrioridad>(datosIniciales?.prioridad || 'media');
    const [urgencia, setUrgencia] = useState<NivelUrgencia | null>(datosIniciales?.urgencia || null);
    const [fechaLimite, setFechaLimite] = useState(datosIniciales?.fechaLimite || '');
    const [errores, setErrores] = useState<{nombre?: string}>({});

    const validarFormulario = useCallback((): boolean => {
        const nuevosErrores: {nombre?: string} = {};

        if (!nombre.trim()) {
            nuevosErrores.nombre = 'El nombre es obligatorio';
        } else if (nombre.trim().length < 3) {
            nuevosErrores.nombre = 'El nombre debe tener al menos 3 caracteres';
        }

        setErrores(nuevosErrores);
        return Object.keys(nuevosErrores).length === 0;
    }, [nombre]);

    const manejarSubmit = useCallback(
        (evento: React.FormEvent) => {
            evento.preventDefault();

            if (!validarFormulario()) return;

            onGuardar({
                nombre: nombre.trim(),
                descripcion: descripcion.trim() || undefined,
                prioridad,
                urgencia: urgencia || undefined,
                fechaLimite: fechaLimite || undefined
            });
        },
        [validarFormulario, onGuardar, nombre, descripcion, prioridad, urgencia, fechaLimite]
    );

    return {
        nombre, setNombre,
        descripcion, setDescripcion,
        prioridad, setPrioridad,
        urgencia, setUrgencia,
        fechaLimite, setFechaLimite,
        errores,
        manejarSubmit
    };
}
