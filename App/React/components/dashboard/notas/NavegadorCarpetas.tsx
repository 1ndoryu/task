/*
 * NavegadorCarpetas
 * Componente para navegar y gestionar carpetas de notas
 * TAREA 2.1: Sistema de Carpetas para Notas
 */

import {useState, useCallback} from 'react';
import {Folder, FolderPlus, ChevronRight, Trash2, Edit3, Check, X} from 'lucide-react';
import type {CarpetaNota} from '../../../types/notas';

interface NavegadorCarpetasProps {
    carpetas: CarpetaNota[];
    onSeleccionar: (id: number | null) => void;
    onCrear: (nombre: string) => Promise<void>;
    onRenombrar: (id: number, nombre: string) => Promise<void>;
    onEliminar: (id: number) => Promise<void>;
    cargando: boolean;
}

export function NavegadorCarpetas({carpetas, onSeleccionar, onCrear, onRenombrar, onEliminar, cargando}: NavegadorCarpetasProps): JSX.Element {
    const [creando, setCreando] = useState(false);
    const [nombreNueva, setNombreNueva] = useState('');
    const [editandoId, setEditandoId] = useState<number | null>(null);
    const [nombreEditando, setNombreEditando] = useState('');

    /* Crear nueva carpeta */
    const manejarCrear = useCallback(async () => {
        if (!nombreNueva.trim()) return;

        await onCrear(nombreNueva.trim());
        setNombreNueva('');
        setCreando(false);
    }, [nombreNueva, onCrear]);

    /* Iniciar edición */
    const iniciarEdicion = useCallback((carpeta: CarpetaNota) => {
        if (carpeta.esVirtual || carpeta.id === null) return;
        setEditandoId(carpeta.id);
        setNombreEditando(carpeta.nombre);
    }, []);

    /* Guardar edición */
    const manejarGuardarEdicion = useCallback(async () => {
        if (!editandoId || !nombreEditando.trim()) return;

        await onRenombrar(editandoId, nombreEditando.trim());
        setEditandoId(null);
        setNombreEditando('');
    }, [editandoId, nombreEditando, onRenombrar]);

    /* Cancelar edición */
    const cancelarEdicion = useCallback(() => {
        setEditandoId(null);
        setNombreEditando('');
    }, []);

    /* Eliminar carpeta */
    const manejarEliminar = useCallback(
        async (id: number) => {
            if (!confirm('¿Eliminar carpeta? Las notas se moverán a General.')) return;
            await onEliminar(id);
        },
        [onEliminar]
    );

    return (
        <div className="navegadorCarpetas">
            <div className="navegadorCarpetasHeader">
                <h3 className="navegadorCarpetasTitulo">Carpetas</h3>
                <button className="navegadorCarpetasBotonNueva" onClick={() => setCreando(true)} title="Nueva carpeta" disabled={creando}>
                    <FolderPlus size={14} />
                </button>
            </div>

            {/* Formulario crear nueva carpeta */}
            {creando && (
                <div className="navegadorCarpetasFormulario">
                    <input type="text" className="navegadorCarpetasInput" value={nombreNueva} onChange={e => setNombreNueva(e.target.value)} placeholder="Nombre de carpeta" autoFocus onKeyDown={e => e.key === 'Enter' && manejarCrear()} />
                    <button className="navegadorCarpetasBotonAccion navegadorCarpetasBotonAccion--confirmar" onClick={manejarCrear} disabled={!nombreNueva.trim()}>
                        <Check size={12} />
                    </button>
                    <button
                        className="navegadorCarpetasBotonAccion navegadorCarpetasBotonAccion--cancelar"
                        onClick={() => {
                            setCreando(false);
                            setNombreNueva('');
                        }}>
                        <X size={12} />
                    </button>
                </div>
            )}

            {/* Lista de carpetas */}
            <div className="navegadorCarpetasLista">
                {cargando && carpetas.length === 0 ? (
                    <div className="navegadorCarpetasCargando">Cargando...</div>
                ) : (
                    carpetas.map(carpeta => (
                        <div key={carpeta.id ?? 'general'} className={`navegadorCarpetaItem ${carpeta.esVirtual ? 'navegadorCarpetaItem--virtual' : ''}`}>
                            {editandoId !== null && editandoId === carpeta.id ? (
                                /* Modo edición */
                                <div className="navegadorCarpetasFormulario navegadorCarpetasFormulario--inline">
                                    <input type="text" className="navegadorCarpetasInput" value={nombreEditando} onChange={e => setNombreEditando(e.target.value)} autoFocus onKeyDown={e => e.key === 'Enter' && manejarGuardarEdicion()} />
                                    <button className="navegadorCarpetasBotonAccion navegadorCarpetasBotonAccion--confirmar" onClick={manejarGuardarEdicion}>
                                        <Check size={12} />
                                    </button>
                                    <button className="navegadorCarpetasBotonAccion navegadorCarpetasBotonAccion--cancelar" onClick={cancelarEdicion}>
                                        <X size={12} />
                                    </button>
                                </div>
                            ) : (
                                /* Modo normal */
                                <>
                                    <button className="navegadorCarpetaBoton" onClick={() => onSeleccionar(carpeta.id)}>
                                        <Folder size={14} className="navegadorCarpetaIcono" />
                                        <span className="navegadorCarpetaNombre">{carpeta.nombre}</span>
                                        <span className="navegadorCarpetaContador">{carpeta.totalNotas}</span>
                                        <ChevronRight size={12} className="navegadorCarpetaFlecha" />
                                    </button>

                                    {/* Acciones (solo para carpetas no virtuales) */}
                                    {!carpeta.esVirtual && carpeta.id !== null && (
                                        <div className="navegadorCarpetaAcciones">
                                            <button className="navegadorCarpetaAccionBoton" onClick={() => iniciarEdicion(carpeta)} title="Renombrar">
                                                <Edit3 size={12} />
                                            </button>
                                            <button className="navegadorCarpetaAccionBoton navegadorCarpetaAccionBoton--peligro" onClick={() => manejarEliminar(carpeta.id!)} title="Eliminar">
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
