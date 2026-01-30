/*
 * InputNuevaTarea
 * Componente para crear nuevas tareas con input siempre visible
 * Estilo unificado con "+ Añadir" de hábitos para coherencia visual
 *
 * Comportamiento:
 * - Click en "+ Añadir" sin texto: abre modal de creación (si onAbrirModalCrear existe)
 * - Click con texto o Enter: crea tarea directamente
 */

import {useState, useCallback, useRef, type KeyboardEvent, type ChangeEvent} from 'react';
import {Check} from 'lucide-react';
import type {DatosEdicionTarea} from '../../types/dashboard';

interface InputNuevaTareaProps {
    onCrear: (datos: DatosEdicionTarea) => void;
    /* Callback opcional para abrir modal de creación completo */
    onAbrirModalCrear?: () => void;
}

export function InputNuevaTarea({onCrear, onAbrirModalCrear}: InputNuevaTareaProps): JSX.Element {
    const [texto, setTexto] = useState('');
    const [enfocado, setEnfocado] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const manejarEnvio = useCallback(() => {
        const textoLimpio = texto.trim();
        if (textoLimpio.length === 0) return;

        onCrear({texto: textoLimpio});
        setTexto('');
        /* Mantener el foco para permitir crear varias tareas seguidas */
        inputRef.current?.focus();
    }, [texto, onCrear]);

    const manejarTecla = useCallback(
        (evento: KeyboardEvent<HTMLInputElement>) => {
            if (evento.key === 'Enter') {
                manejarEnvio();
            } else if (evento.key === 'Escape') {
                setTexto('');
                inputRef.current?.blur();
            }
        },
        [manejarEnvio]
    );

    const manejarCambioTexto = useCallback((evento: ChangeEvent<HTMLInputElement>) => {
        setTexto(evento.target.value);
    }, []);

    const tieneTexto = texto.trim().length > 0;

    /* Manejar click en "+ Añadir" cuando no hay texto */
    const manejarClickAñadir = useCallback(() => {
        if (onAbrirModalCrear) {
            onAbrirModalCrear();
        } else {
            /* Fallback: enfocar el input */
            inputRef.current?.focus();
        }
    }, [onAbrirModalCrear]);

    return (
        <div className={`tareaNuevoInline ${enfocado || tieneTexto ? 'tareaNuevoInlineActivo' : ''}`} onClick={manejarClickAñadir}>
            {!enfocado && !tieneTexto && (
                <span className="tareaNuevoInlineTexto" onClick={manejarClickAñadir} style={{cursor: 'pointer'}}>
                    + Añadir
                </span>
            )}
            <input
                id="input-nueva-tarea-global"
                ref={inputRef}
                type="text"
                className={`tareaNuevoInlineInput ${enfocado || tieneTexto ? '' : 'tareaNuevoInlineInputOculto'}`}
                placeholder="Escribe una tarea..."
                value={texto}
                onChange={manejarCambioTexto}
                onKeyDown={manejarTecla}
                onFocus={() => setEnfocado(true)}
                onBlur={() => {
                    setEnfocado(false);
                    /* Guardar si hay texto al perder foco */
                    if (texto.trim().length > 0) {
                        manejarEnvio();
                    }
                }}
            />
            {tieneTexto && (
                <button className="tareaNuevoInlineConfirmar" onClick={manejarEnvio} title="Crear tarea (Enter)">
                    <Check size={12} />
                </button>
            )}
        </div>
    );
}
