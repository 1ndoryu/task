/*
 * GrupoTareasHeader
 * Encabezado de grupo/sección con título editable y botón de colapso
 * Se muestra antes de las tareas del grupo
 */

import React, {useState, useRef, useEffect, useCallback} from 'react';
import {ChevronRight, ChevronDown, Trash2} from 'lucide-react';
import type {GrupoTareas} from '../../../types/dashboard';
import {useGruposTareasStore} from '../../../stores/gruposTareasStore';

interface GrupoTareasHeaderProps {
    grupo: GrupoTareas;
    cantidadTareas: number;
}

export function GrupoTareasHeader({grupo, cantidadTareas}: GrupoTareasHeaderProps): JSX.Element {
    const {editarGrupo, toggleColapsarGrupo, eliminarGrupo} = useGruposTareasStore();
    const [editando, setEditando] = useState(false);
    const [nombreEditado, setNombreEditado] = useState(grupo.nombre);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editando && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editando]);

    const guardarEdicion = useCallback(() => {
        const nombreLimpio = nombreEditado.trim();
        if (nombreLimpio.length > 0 && nombreLimpio !== grupo.nombre) {
            editarGrupo(grupo.id, nombreLimpio);
        } else {
            setNombreEditado(grupo.nombre);
        }
        setEditando(false);
    }, [nombreEditado, grupo.id, grupo.nombre, editarGrupo]);

    const manejarTecla = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
                guardarEdicion();
            } else if (e.key === 'Escape') {
                setNombreEditado(grupo.nombre);
                setEditando(false);
            }
        },
        [guardarEdicion, grupo.nombre]
    );

    const manejarEliminar = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            /* TO-DO: Agregar confirmación antes de eliminar */
            eliminarGrupo(grupo.id);
        },
        [grupo.id, eliminarGrupo]
    );

    return (
        <div className={`grupoTareasHeader ${grupo.colapsado ? 'grupoTareasHeader--colapsado' : ''}`}>
            <button className="grupoTareasToggle" onClick={() => toggleColapsarGrupo(grupo.id)} title={grupo.colapsado ? 'Expandir grupo' : 'Colapsar grupo'}>
                {grupo.colapsado ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            </button>

            {editando ? (
                <input ref={inputRef} type="text" className="grupoTareasInputNombre" value={nombreEditado} onChange={e => setNombreEditado(e.target.value)} onKeyDown={manejarTecla} onBlur={guardarEdicion} />
            ) : (
                <span className={`grupoTareasNombre ${grupo.esSistema ? 'grupoTareasNombre--sistema' : ''}`} onClick={() => !grupo.esSistema && setEditando(true)} title={grupo.esSistema ? 'Grupo del sistema' : 'Click para editar'}>
                    {grupo.nombre}
                </span>
            )}

            {!grupo.esSistema && (
                <button className="grupoTareasEliminar" onClick={manejarEliminar} title="Eliminar grupo">
                    <Trash2 size={12} />
                </button>
            )}
        </div>
    );
}
