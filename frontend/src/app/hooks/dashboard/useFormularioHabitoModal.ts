/*
 * useFormularioHabitoModal
 *
 * Estado de edición del formulario del modal de hábito (crear/editar),
 * extraído de useModalHabito para que ambos queden dentro del límite de
 * líneas. Encapsula el estado de edición, la sincronización desde la entidad,
 * la validación y la construcción de los datos a guardar (responsabilidad
 * única). No confundir con useFormularioHabito (formulario autónomo con tags).
 */

import {useEffect, useState} from 'react';
import type {NivelImportancia, DatosNuevoHabito, DatosNuevoSubHabito, FrecuenciaHabito, Habito, SubHabito, VentanaOportunidad} from '../../types/dashboard';
import {FRECUENCIA_POR_DEFECTO} from '../../types/dashboard';
import type {ReferenciaDependencia} from '../../types/dashboard';

export interface UseFormularioHabitoModalParams {
    habito?: Habito;
    subHabito?: SubHabito | null;
    esModoSubHabito: boolean;
    esHabitoEspecialAyuno: boolean;
}

export function useFormularioHabitoModal({habito, subHabito, esModoSubHabito, esHabitoEspecialAyuno}: UseFormularioHabitoModalParams) {
    /* Estado local para edición */
    const [nombre, setNombre] = useState((subHabito ? subHabito.nombre : habito?.nombre) || '');
    const [descripcion, setDescripcion] = useState(habito?.descripcion || '');
    const [icono, setIcono] = useState(habito?.icono || 'check-circle');
    const [colorIcono, setColorIcono] = useState(habito?.colorIcono || '#888888');
    const [importancia, setImportancia] = useState<NivelImportancia>((subHabito ? subHabito.importancia : habito?.importancia) || 'Media');
    const [frecuencia, setFrecuencia] = useState<FrecuenciaHabito>((subHabito ? subHabito.frecuencia : habito?.frecuencia) || FRECUENCIA_POR_DEFECTO);
    const [ventanaOportunidad, setVentanaOportunidad] = useState<VentanaOportunidad | undefined>(subHabito ? subHabito.ventanaOportunidad : habito?.ventanaOportunidad);
    const [dependencias, setDependencias] = useState<ReferenciaDependencia[]>((subHabito ? subHabito.dependencias : habito?.dependencias) || []);
    const [grupoEjecucion, setGrupoEjecucion] = useState<string | null>((subHabito ? undefined : habito?.grupoEjecucion) || null);
    const [errores, setErrores] = useState<{nombre?: string}>({});

    /* Sincronizar estado cuando cambia el hábito o subhábito */
    useEffect(() => {
        if (subHabito) {
            setNombre(subHabito.nombre);
            setDescripcion('');
            setIcono('check-circle');
            setColorIcono('#888888');
            setImportancia(subHabito.importancia);
            setFrecuencia(subHabito.frecuencia || FRECUENCIA_POR_DEFECTO);
            setVentanaOportunidad(subHabito.ventanaOportunidad);
            setDependencias(subHabito.dependencias || []);
            setGrupoEjecucion(null);
        } else if (habito) {
            setNombre(habito.nombre);
            setDescripcion(habito.descripcion || '');
            setIcono(habito.icono || 'check-circle');
            setColorIcono(habito.colorIcono || '#888888');
            setImportancia(habito.importancia);
            setFrecuencia(habito.frecuencia || FRECUENCIA_POR_DEFECTO);
            setVentanaOportunidad(habito.ventanaOportunidad);
            setDependencias(habito.dependencias || []);
            setGrupoEjecucion(habito.grupoEjecucion || null);
        } else {
            setNombre('');
            setDescripcion('');
            setIcono('check-circle');
            setColorIcono('#888888');
            setImportancia('Media');
            setFrecuencia(FRECUENCIA_POR_DEFECTO);
            setVentanaOportunidad(undefined);
            setDependencias([]);
            setGrupoEjecucion(null);
        }
        setErrores({});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [habito?.id, subHabito?.id]);

    /* Validar formulario (mínimo 2 chars para subhábitos, 3 para hábitos) */
    const validarFormulario = (): boolean => {
        const nuevosErrores: {nombre?: string} = {};
        const minLength = esModoSubHabito ? 2 : 3;

        if (!nombre.trim()) {
            nuevosErrores.nombre = 'El nombre es obligatorio';
        } else if (nombre.trim().length < minLength) {
            nuevosErrores.nombre = `El nombre debe tener al menos ${minLength} caracteres`;
        }

        setErrores(nuevosErrores);
        return Object.keys(nuevosErrores).length === 0;
    };

    /* Datos a guardar de un subhábito (edición) */
    const construirDatosSubHabito = (): DatosNuevoSubHabito => {
        return {
            nombre: nombre.trim(),
            importancia,
            frecuencia,
            ventanaOportunidad,
            dependencias
        };
    };

    /* Datos a guardar de un hábito (los subhábitos no exponen estos campos) */
    const construirDatosHabito = (): DatosNuevoHabito => {
        const nombreSeguro = esHabitoEspecialAyuno ? 'Ayuno' : nombre.trim();
        return {
            nombre: nombreSeguro,
            importancia,
            tags: [],
            frecuencia,
            descripcion: descripcion.trim() || undefined,
            icono,
            colorIcono,
            ventanaOportunidad,
            dependencias,
            grupoEjecucion
        };
    };

    return {
        nombre, setNombre,
        descripcion, setDescripcion,
        icono, setIcono,
        colorIcono, setColorIcono,
        importancia, setImportancia,
        frecuencia, setFrecuencia,
        ventanaOportunidad, setVentanaOportunidad,
        dependencias, setDependencias,
        grupoEjecucion, setGrupoEjecucion,
        errores,
        validarFormulario,
        construirDatosSubHabito,
        construirDatosHabito
    };
}