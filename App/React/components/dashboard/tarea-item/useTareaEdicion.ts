import {useState, useCallback, useRef, useEffect, type KeyboardEvent} from 'react';
import {useEsMovil} from '../../../hooks/useEsMovil';
import type {Tarea, DatosEdicionTarea} from '../../../types/dashboard';
import {esTareaHabito} from '../../../types/dashboard';

interface UseTareaEdicionProps {
    tarea: Tarea;
    onEditar?: (datos: DatosEdicionTarea) => void;
    onEliminar?: () => void;
    onIndent?: () => void;
    onOutdent?: () => void;
    onCrearNueva?: (parentId: number | undefined, tareaActualId: number) => void;
    onConfigurar?: () => void;
}

export function useTareaEdicion({tarea, onEditar, onEliminar, onIndent, onOutdent, onCrearNueva, onConfigurar}: UseTareaEdicionProps) {
    /* Estado local */
    const [editando, setEditando] = useState(tarea.texto === '');
    const [textoEditado, setTextoEditado] = useState(tarea.texto);
    const inputRef = useRef<HTMLInputElement>(null);

    /* Detectar viewport móvil */
    const {esTablet: esMovilOTablet} = useEsMovil();

    /* Detectar si es habito */
    const esHabito = esTareaHabito(tarea);

    /* Efecto para enfocar y seleccionar texto al editar */
    useEffect(() => {
        if (editando && inputRef.current) {
            inputRef.current.focus();
            /* Bug fix: No seleccionar todo el texto automaticamente, poner cursor al final */
            const length = inputRef.current.value.length;
            inputRef.current.setSelectionRange(length, length);
        }
    }, [editando]);

    const iniciarEdicion = useCallback(() => {
        /* No permitir edición inline en tareas-hábito */
        if (esHabito) return;

        /* En móvil/tablet: abrir modal de configuración en vez de edición inline */
        if (esMovilOTablet) {
            onConfigurar?.();
            return;
        }
        setTextoEditado(tarea.texto);
        setEditando(true);
    }, [tarea.texto, esHabito, esMovilOTablet, onConfigurar]);

    const cancelEdicion = useCallback(() => {
        setTextoEditado(tarea.texto);
        setEditando(false);
    }, [tarea.texto]);

    const guardarEdicion = useCallback(() => {
        const textoLimpio = textoEditado.trim();
        if (textoLimpio.length === 0) {
            cancelEdicion();
            return;
        }

        if (textoLimpio !== tarea.texto) {
            onEditar?.({texto: textoLimpio});
        }
        setEditando(false);
    }, [textoEditado, tarea.texto, onEditar, cancelEdicion]);

    const manejarTecla = useCallback(
        (evento: KeyboardEvent<HTMLInputElement>) => {
            if (evento.key === 'Enter') {
                evento.preventDefault();
                const textoLimpio = textoEditado.trim();
                /* Solo crear nueva tarea si la actual tiene texto válido */
                if (textoLimpio.length > 0) {
                    guardarEdicion();
                    /* Crear nueva tarea debajo, heredando parentId si es subtarea */
                    onCrearNueva?.(tarea.parentId, tarea.id);
                }
            } else if (evento.key === 'Backspace' && textoEditado === '') {
                evento.preventDefault();
                onEliminar?.();
            } else if (evento.key === 'Escape') {
                cancelEdicion();
            } else if (evento.key === 'Tab') {
                /* Soporte para identacion/desidentacion */
                evento.preventDefault();

                if (evento.shiftKey) {
                    onOutdent?.();
                } else {
                    onIndent?.();
                }
            }
        },
        [guardarEdicion, cancelEdicion, onIndent, onOutdent, onCrearNueva, tarea.parentId, tarea.id, textoEditado, onEliminar]
    );

    return {
        editando,
        textoEditado,
        setTextoEditado,
        inputRef,
        iniciarEdicion,
        guardarEdicion,
        cancelEdicion,
        manejarTecla
    };
}
