/*
 * useFormularioHabito
 * Hook que gestiona el estado del formulario de creación/edición de hábitos.
 * Incluye: validación, manejo de tags y submit.
 */

import {useState, useCallback} from 'react';
import type {NivelImportancia, DatosNuevoHabito, FrecuenciaHabito} from '../../types/dashboard';
import {FRECUENCIA_POR_DEFECTO} from '../../types/dashboard';

type DatosFormulario = DatosNuevoHabito;

interface UseFormularioHabitoParams {
    onGuardar: (datos: DatosFormulario) => void;
    datosIniciales?: DatosFormulario;
    guardando?: boolean;
}

export function useFormularioHabito({onGuardar, datosIniciales, guardando = false}: UseFormularioHabitoParams) {
    const [nombre, setNombre] = useState(datosIniciales?.nombre || '');
    const [importancia, setImportancia] = useState<NivelImportancia>(datosIniciales?.importancia || 'Media');
    const [tags, setTags] = useState<string[]>(datosIniciales?.tags || []);
    const [frecuencia, setFrecuencia] = useState<FrecuenciaHabito>(datosIniciales?.frecuencia || FRECUENCIA_POR_DEFECTO);
    const [nuevoTag, setNuevoTag] = useState('');
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

    const manejarSubmit = (evento: React.FormEvent) => {
        evento.preventDefault();
        if (!validarFormulario()) return;

        onGuardar({
            nombre: nombre.trim(),
            importancia,
            tags,
            frecuencia
        });
    };

    const agregarTag = () => {
        const tagLimpio = nuevoTag
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '');

        if (tagLimpio && !tags.includes(tagLimpio) && tags.length < 5) {
            setTags([...tags, tagLimpio]);
            setNuevoTag('');
        }
    };

    const manejarTeclaTag = (evento: React.KeyboardEvent) => {
        if (evento.key === 'Enter') {
            evento.preventDefault();
            agregarTag();
        }
    };

    const eliminarTag = (tagAEliminar: string) => {
        setTags(tags.filter(t => t !== tagAEliminar));
    };

    return {
        nombre, setNombre,
        importancia, setImportancia,
        tags,
        frecuencia, setFrecuencia,
        nuevoTag, setNuevoTag,
        errores,
        manejarSubmit,
        agregarTag,
        manejarTeclaTag,
        eliminarTag,
        guardando
    };
}

export type {DatosFormulario};
