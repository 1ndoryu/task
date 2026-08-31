/*
 * useModalHabito
 * Hook que encapsula toda la lógica del modal de crear/editar hábito.
 * Gestiona estado del formulario, validación, auto-guardado,
 * subhábitos, tareas del hábito y panel de chat.
 */

import {useState, useCallback, useEffect, useMemo, useRef} from 'react';
import type {Habito, SubHabito, Tarea, DatosNuevoSubHabito} from '../../types/dashboard';
import type {EstadoHabito} from '../../components/shared';
import type {UseModalHabitoProps, UseModalHabitoReturn} from './modalHabitoTipos';
import {usePanelChat} from '../usePanelChat';
import {useFormularioHabitoModal} from './useFormularioHabitoModal';
import {useHabitosStore} from '../../stores/habitosStore';
import {usePluginsStore} from '../../stores/pluginsStore';
import {useExpStore} from '../../plugins/exp/store';
import {estimarDificultad} from '../../plugins/exp/service';
import type {Dificultad} from '../../plugins/exp/types';
import {obtenerFechaHoy} from '../../utils/fecha';
export type {
    DatosFormulario,
    UseModalHabitoProps,
    UseModalHabitoReturn,
    BaseModalHabito,
    CallbacksModalHabito,
    UmhEdicion,
    UmhAtributos,
    UmhGrupo,
    UmhChat,
    UmhSubHabitos
} from './modalHabitoTipos';


export function useModalHabito({
    estaAbierto,
    onCerrar,
    onGuardar,
    onPausarHabito,
    habito,
    participantes = [],
    tareas = [],
    onActualizarOrdenTareasHabito,
    subHabito,
    habitoPadre
}: UseModalHabitoProps): UseModalHabitoReturn {
    const modoEdicion = !!habito && !subHabito;
    const esModoSubHabito = Boolean(subHabito);

    const habitoAyunoId = usePluginsStore(s => (s.configuracionPlugins['ayuno'] as unknown as {habitoId?: number} | undefined)?.habitoId);
    const esHabitoEspecialAyuno = !!(habito && habitoAyunoId && habito.id === habitoAyunoId);

    /* Estado local para edición (extracto a useFormularioHabito) */
    const form = useFormularioHabitoModal({habito, subHabito, esModoSubHabito, esHabitoEspecialAyuno});
    const {nombre, setNombre, descripcion, setDescripcion, icono, setIcono, colorIcono, setColorIcono, importancia, setImportancia, frecuencia, setFrecuencia, ventanaOportunidad, setVentanaOportunidad, dependencias, setDependencias, grupoEjecucion, setGrupoEjecucion, errores, validarFormulario, construirDatosSubHabito, construirDatosHabito} = form;

    /* [28-08-2026] Dificultad del plugin EXP: misma escala que la importancia.
     * Se lee del store (dificultades[String(id)]) y se asigna automáticamente al
     * abrir la edición de un hábito sin dificultad. */
    const dificultades = useExpStore(s => s.dificultades);
    const asignarDificultad = useExpStore(s => s.asignarDificultad);
    const [dificultad, setDificultad] = useState<Dificultad>('Media');

    /* Hook para panel de chat (solo en modo hábito) */
    const {chatVisible, toggleChat, tieneMensajesSinLeer, participantesChat, mostrarChatColumna} = usePanelChat({
        elementoId: habito?.id,
        elementoTipo: 'habito',
        participantes,
        habilitado: modoEdicion && !esModoSubHabito
    });

    /* Estado de cumplimiento de hoy y acciones del store */
    const toggleHabito = useHabitosStore(state => state.toggleHabito);
    const posponerHabito = useHabitosStore(state => state.posponerHabito);
    const toggleSubHabito = useHabitosStore(state => state.toggleSubHabito);
    const posponerSubHabito = useHabitosStore(state => state.posponerSubHabitoConTiempo);
    const crearSubHabito = useHabitosStore(state => state.crearSubHabito);
    const editarSubHabito = useHabitosStore(state => state.editarSubHabito);
    const eliminarSubHabito = useHabitosStore(state => state.eliminarSubHabito);
    /* [217A-3] Acciones de historial retroactivo para subhábitos */
    const marcarDiaSubHabito = useHabitosStore(state => state.marcarDiaSubHabito);
    const desmarcarDiaSubHabito = useHabitosStore(state => state.desmarcarDiaSubHabito);
    const hoy = obtenerFechaHoy();

    let estadoHoy: EstadoHabito = 'pendiente';
    if (subHabito) {
        if (subHabito.historialCompletados?.includes(hoy)) estadoHoy = 'completado';
        else if (subHabito.historialPospuestos?.includes(hoy)) estadoHoy = 'pospuesto';
    } else if (habito) {
        if (habito.historialCompletados?.includes(hoy)) estadoHoy = 'completado';
        else if (habito.historialPospuestos?.includes(hoy)) estadoHoy = 'pospuesto';
    }

    /* Callbacks para subhábitos */
    const manejarCrearSubHabito = useCallback(
        (datos: DatosNuevoSubHabito) => {
            if (habito) crearSubHabito(habito.id, datos);
        },
        [habito, crearSubHabito]
    );

    const manejarEditarSubHabito = useCallback(
        (subHabitoId: number, datos: DatosNuevoSubHabito) => {
            if (habito) editarSubHabito(habito.id, subHabitoId, datos);
        },
        [habito, editarSubHabito]
    );

    const manejarEliminarSubHabito = useCallback(
        (subHabitoId: number) => {
            if (habito) eliminarSubHabito(habito.id, subHabitoId);
        },
        [habito, eliminarSubHabito]
    );

    const manejarToggleSubHabito = useCallback(
        (subHabitoId: number) => {
            if (habito) toggleSubHabito(habito.id, subHabitoId);
        },
        [habito, toggleSubHabito]
    );

    /* [28-08-2026] Sincronizar dificultad desde el store EXP y asignación
     * automática al abrir la edición de un hábito SIN dificultad. Clave
     * String(habito.id) — idéntica a la que usa el plugin EXP (useExpPlugin).
     * La frecuenciaDesc replica h.frecuencia?.tipo ?? 'diario' del plugin. */
    const ultimoHabitoIdRef = useRef<number | undefined>(undefined);
    /* [28-08-2026] Cuando el usuario cambia la dificultad manualmente con la pill
     * se marca un override para que la estimación automática (aún en vuelo al
     * abrir) no pise su elección al resolver. */
    const overrideManualRef = useRef(false);
    useEffect(() => {
        const idHabito = esModoSubHabito ? subHabito?.id : habito?.id;
        if (idHabito == null || typeof idHabito !== 'number') {
            ultimoHabitoIdRef.current = undefined;
            return;
        }
        if (idHabito !== ultimoHabitoIdRef.current) {
            ultimoHabitoIdRef.current = idHabito;
            if (idHabito == null) return;
            /* Cambio de entidad: resetear el override y sincronizar desde el store. */
            overrideManualRef.current = false;
            setDificultad(dificultades[String(idHabito)] ?? 'Media');
            return;
        }
        /* Si la tarea/hábito ya cambió y la dificultad ya fue asignada en vivo,
         * no volver a estimar (evita loops). */
    }, [esModoSubHabito, subHabito?.id, habito?.id]);

    /* Wrapper del setter: cancela la auto-estimación pendiente si el usuario
     * elige manualmente (la pill usa onDificultadChange = setDificultad). */
    const manejarCambioDificultad = useCallback((valor: Dificultad) => {
        overrideManualRef.current = true;
        setDificultad(valor);
    }, []);

    /* Asignación automática (solo modo edición de hábito, no subhábito) cuando
     * la entidad no tiene dificultad en el store EXP. */
    const idParaEstimar = modoEdicion && !esModoSubHabito ? habito?.id : undefined;
    useEffect(() => {
        if (idParaEstimar == null) return;
        if (dificultades[String(idParaEstimar)]) return;
        if (!habito) return;
        let cancelado = false;
        const promesa = estimarDificultad({
            nombre: habito.nombre,
            importancia: habito.importancia,
            frecuenciaDesc: habito.frecuencia?.tipo ?? 'diario',
            extras: habito.descripcion
        });
        promesa.then(d => {
            if (cancelado) return;
            /* No pisar una elección manual del usuario. */
            if (overrideManualRef.current) return;
            asignarDificultad(idParaEstimar, d);
            setDificultad(d);
        });
        return () => { cancelado = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [modoEdicion, esModoSubHabito, habito?.id]);

    /* Filtrar y ordenar tareas que pertenecen a este hábito */
    const tareasDelHabito = useMemo(() => {
        if (!habito) return [];
        const tareasHabito = tareas.filter(t => t.habitoId === habito.id);

        if (habito.tareasIds && habito.tareasIds.length > 0) {
            const ordenMap = new Map(habito.tareasIds.map((id, index) => [id, index]));
            return [...tareasHabito].sort((a, b) => {
                const ordenA = ordenMap.get(a.id) ?? 999;
                const ordenB = ordenMap.get(b.id) ?? 999;
                return ordenA - ordenB;
            });
        }

        return tareasHabito;
    }, [habito, tareas]);

    /* Sincronizar estado cuando cambia el hábito o subhábito (vive en useFormularioHabito) */

    /* Manejador de cambio de estado del hábito o subhábito */
    const manejarCambioEstado = useCallback(
        (nuevoEstado: EstadoHabito) => {
            if (subHabito && habitoPadre) {
                if (nuevoEstado === 'completado') {
                    toggleSubHabito(habitoPadre.id, subHabito.id);
                } else if (nuevoEstado === 'pospuesto') {
                    posponerSubHabito(habitoPadre.id, subHabito.id, null);
                } else if (nuevoEstado === 'pendiente') {
                    if (estadoHoy === 'completado') toggleSubHabito(habitoPadre.id, subHabito.id);
                    else if (estadoHoy === 'pospuesto') posponerSubHabito(habitoPadre.id, subHabito.id, null);
                }
            } else if (habito) {
                if (nuevoEstado === 'completado') {
                    toggleHabito(habito.id);
                } else if (nuevoEstado === 'pospuesto') {
                    posponerHabito(habito.id);
                } else if (nuevoEstado === 'pendiente') {
                    if (estadoHoy === 'completado') toggleHabito(habito.id);
                    else if (estadoHoy === 'pospuesto') posponerHabito(habito.id);
                }
            }
        },
        [subHabito, habitoPadre, habito, estadoHoy, toggleSubHabito, posponerSubHabito, toggleHabito, posponerHabito]
    );

    /* Validar formulario (vive en useFormularioHabito) */
    const validarFormularioMemo = validarFormulario;

    /* Guardar hábito o subhábito */
    const manejarGuardar = useCallback(() => {
        if (!validarFormulario()) return;

        if (esModoSubHabito && subHabito && habitoPadre) {
            editarSubHabito(habitoPadre.id, subHabito.id, construirDatosSubHabito());
        } else {
            onGuardar(construirDatosHabito());
        }
        /* [28-08-2026] Persistir la dificultad (manual o auto-estimada) en el
         * store EXP al guardar la edición de un hábito con id. Clave
         * String(habito.id) idéntica al plugin; es el único modo con id real
         * (el subhábito no tiene dificultad y al crear aún no hay id). */
        if (!esModoSubHabito && habito && typeof habito.id === 'number') {
            asignarDificultad(habito.id, dificultad);
        }
        onCerrar();
    }, [esModoSubHabito, subHabito, habitoPadre, habito, dificultad, validarFormulario, construirDatosSubHabito, construirDatosHabito, editarSubHabito, onGuardar, onCerrar, asignarDificultad]);

    /* Auto-guardado: al cerrar el modal, guardar si hay nombre válido */
    const manejarCerrarConGuardado = useCallback(() => {
        const minLength = esModoSubHabito ? 2 : 3;
        if (nombre.trim().length >= minLength) {
            manejarGuardar();
        } else {
            onCerrar();
        }
    }, [nombre, manejarGuardar, onCerrar, esModoSubHabito]);

    /* Callback para reordenar tareas del hábito */
    const manejarReordenarTareas = useCallback(
        (tareasIds: number[]) => {
            if (habito && onActualizarOrdenTareasHabito) {
                onActualizarOrdenTareasHabito(habito.id, tareasIds);
            }
        },
        [habito, onActualizarOrdenTareasHabito]
    );

    /* [217A-3] Callbacks de historial retroactivo para subhábitos (mapa de calor).
     * Usa EstadoHabito de historialHabitos (sin 'pendiente') porque el mapa de calor
     * solo genera completado/pospuesto/null. 'pendiente' se maneja como null (desmarcar). */
    const manejarMarcarDiaSubHabito = useCallback(
        (fecha: string, estado: EstadoHabito) => {
            if (!habitoPadre || !subHabito) return false;
            /* 'pendiente' no es un estado del historial — tratar como desmarcar */
            if (estado === 'pendiente') return desmarcarDiaSubHabito(habitoPadre.id, subHabito.id, fecha);
            return marcarDiaSubHabito(habitoPadre.id, subHabito.id, fecha, estado);
        },
        [habitoPadre, subHabito, marcarDiaSubHabito, desmarcarDiaSubHabito]
    );
    const manejarDesmarcarDiaSubHabito = useCallback(
        (fecha: string) => {
            if (habitoPadre && subHabito) return desmarcarDiaSubHabito(habitoPadre.id, subHabito.id, fecha);
            return false;
        },
        [habitoPadre, subHabito, desmarcarDiaSubHabito]
    );

    /* Callback para pausar hábito o subhábito */
    const manejarPausarHabito = esModoSubHabito && subHabito && habitoPadre
        ? () => {
              editarSubHabito(habitoPadre.id, subHabito.id, {
                  nombre: subHabito.nombre,
                  importancia: subHabito.importancia,
                  frecuencia: subHabito.frecuencia
              });
          }
        : habito && onPausarHabito
          ? () => onPausarHabito(habito.id)
          : undefined;

    return {
        modoEdicion,
        nombre,
        setNombre,
        descripcion,
        setDescripcion,
        icono,
        setIcono,
        colorIcono,
        setColorIcono,
        importancia,
        setImportancia,
        dificultad, setDificultad: manejarCambioDificultad,
        frecuencia, setFrecuencia,
        ventanaOportunidad, setVentanaOportunidad,
        dependencias, setDependencias,
        grupoEjecucion, setGrupoEjecucion,
        errores, esHabitoEspecialAyuno, esModoSubHabito,
        estadoHoy,
        manejarCambioEstado,
        chatVisible,
        toggleChat,
        tieneMensajesSinLeer,
        participantesChat,
        mostrarChatColumna,
        tareasDelHabito,
        manejarReordenarTareas,
        manejarCrearSubHabito,
        manejarEditarSubHabito,
        manejarEliminarSubHabito,
        manejarToggleSubHabito,
        manejarMarcarDiaSubHabito,
        manejarDesmarcarDiaSubHabito,
        manejarGuardar,
        manejarCerrarConGuardado,
        manejarPausarHabito
    };
}
